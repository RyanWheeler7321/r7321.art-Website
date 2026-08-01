<?php
declare(strict_types=1);

namespace R7321\Support;

final class SupportService
{
    /** @param array<string, mixed> $config */
    public function __construct(
        private readonly array $config,
        private readonly TokenSigner $tokenSigner,
        private readonly TurnstileVerifierInterface $turnstile,
        private readonly SupportStore $store,
        private readonly ImageSanitizer $images,
        private readonly SupportMailerInterface $mailer,
        private readonly SupportLogger $logger
    ) {}

    /**
     * @param array<string, mixed> $post
     * @param list<array{name:string,tmp_name:string,error:int,size:int}> $files
     * @param array<string, mixed> $server
     * @return array{ok:true,duplicate:bool}
     */
    public function submit(array $post, array $files, array $server, string $browserId): array
    {
        $started = hrtime(true);
        $requestId = bin2hex(random_bytes(8));
        $reserved = false;
        $mailAccepted = false;
        $keyHash = '';
        $batch = null;
        $submission = [];

        try {
            $submission = $this->validateSubmission($post);
            $this->tokenSigner->verify($submission['formToken'], $browserId);

            $keyHash = $this->store->hash('idempotency', $submission['idempotencyKey']);
            $existing = $this->store->getIdempotency($keyHash);
            if (($existing['state'] ?? '') === 'sent') {
                $this->logger->write('duplicate_success', [
                    'request' => $requestId,
                    'category' => $submission['category'],
                    'elapsed_ms' => $this->elapsedMilliseconds($started),
                ]);
                return ['ok' => true, 'duplicate' => true];
            }

            $remoteAddress = (string)($server['REMOTE_ADDR'] ?? 'unknown');
            $this->turnstile->verify($submission['turnstileToken'], $remoteAddress);

            $subjects = [
                ['scope' => 'browser', 'hash' => $this->store->hash('browser', $browserId)],
                ['scope' => 'ip', 'hash' => $this->store->hash('ip', $remoteAddress)],
            ];
            if ($submission['email'] !== '') {
                $subjects[] = ['scope' => 'email', 'hash' => $this->store->hash('email', $submission['email'])];
            }
            if ($this->store->reserve($keyHash, $subjects, time()) === 'sent') {
                return ['ok' => true, 'duplicate' => true];
            }
            $reserved = true;

            $batch = $this->images->sanitize($files);
            $this->mailer->send($submission, $batch);
            $mailAccepted = true;
            try {
                $this->store->markSent($keyHash, time());
            } catch (\Throwable $stateError) {
                $this->logger->write('accepted_state_failed', [
                    'request' => $requestId,
                    'category' => $submission['category'],
                    'error_type' => get_class($stateError),
                ]);
            }

            $this->logger->write('sent', [
                'request' => $requestId,
                'category' => $submission['category'],
                'anonymous' => $submission['email'] === '',
                'images' => count($batch->attachments),
                'input_bytes' => $batch->inputBytes,
                'output_bytes' => $batch->outputBytes,
                'elapsed_ms' => $this->elapsedMilliseconds($started),
            ]);
            return ['ok' => true, 'duplicate' => false];
        } catch (\Throwable $error) {
            if ($reserved && !$mailAccepted && $keyHash !== '') {
                try {
                    $this->store->markFailed($keyHash, time());
                } catch (\Throwable $ignored) {
                    // The original failure remains the useful result.
                }
            }
            $this->logger->write('rejected', [
                'request' => $requestId,
                'category' => (string)($submission['category'] ?? 'unknown'),
                'error_code' => $error instanceof SupportException ? $error->errorCode : 'internal_error',
                'error_type' => get_class($error),
                'elapsed_ms' => $this->elapsedMilliseconds($started),
            ]);
            throw $error;
        } finally {
            if ($batch instanceof SanitizedUploadBatch) $batch->cleanup();
        }
    }

    /** @param array<string, mixed> $post @return array<string, string> */
    private function validateSubmission(array $post): array
    {
        if (trim((string)($post['website'] ?? '')) !== '') {
            throw new SupportException('spam_rejected', 'Your message could not be sent. Please try again.', 400);
        }

        $category = strtolower(trim((string)($post['category'] ?? '')));
        if (!in_array($category, ['feedback', 'bug'], true)) {
            throw new SupportException('category_invalid', 'Choose Feedback or Bug.', 400);
        }
        $name = trim(str_replace(["\r", "\n", "\0"], '', (string)($post['name'] ?? '')));
        if ($this->textLength($name, 'name_invalid', 'Name contains invalid text.') > 100) {
            throw new SupportException('name_too_long', 'Name is too long.', 400);
        }

        $email = strtolower(trim(str_replace(["\r", "\n", "\0"], '', (string)($post['email'] ?? ''))));
        if (strlen($email) > 254 || ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false)) {
            throw new SupportException('email_invalid', 'Enter a valid email address or leave it blank.', 400);
        }

        $message = trim(str_replace("\0", '', (string)($post['message'] ?? '')));
        if ($message === '') throw new SupportException('message_required', 'Write a message before sending.', 400);
        if ($this->textLength($message, 'message_invalid', 'Your message contains invalid text.') > 12000) {
            throw new SupportException('message_too_long', 'Your message is longer than 12,000 characters.', 400);
        }

        $formToken = trim((string)($post['formToken'] ?? ''));
        $turnstileToken = trim((string)($post['turnstileToken'] ?? ''));
        $idempotencyKey = trim((string)($post['idempotencyKey'] ?? ''));
        if (!preg_match('/^[A-Za-z0-9_-]{16,100}$/', $idempotencyKey)) {
            throw new SupportException('idempotency_invalid', 'Please refresh the page and try again.', 400);
        }

        $recipients = (array)$this->config['recipients'];
        $recipient = (string)($recipients[$category] ?? '');
        if (filter_var($recipient, FILTER_VALIDATE_EMAIL) === false) {
            throw new \RuntimeException('Support recipient is not configured.');
        }

        return [
            'category' => $category,
            'name' => $name,
            'email' => $email,
            'message' => $message,
            'formToken' => $formToken,
            'turnstileToken' => $turnstileToken,
            'idempotencyKey' => $idempotencyKey,
            'recipient' => $recipient,
        ];
    }

    private function elapsedMilliseconds(int $started): int
    {
        return (int)round((hrtime(true) - $started) / 1_000_000);
    }

    private function textLength(string $value, string $errorCode, string $errorMessage): int
    {
        if (preg_match('//u', $value) !== 1) {
            throw new SupportException($errorCode, $errorMessage, 400);
        }
        if (function_exists('mb_strlen')) return mb_strlen($value, 'UTF-8');
        $length = preg_match_all('/./us', $value, $matches);
        if ($length === false) throw new SupportException($errorCode, $errorMessage, 400);
        return $length;
    }
}
