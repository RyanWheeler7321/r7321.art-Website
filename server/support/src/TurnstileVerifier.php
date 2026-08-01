<?php
declare(strict_types=1);

namespace R7321\Support;

final class TurnstileVerifier implements TurnstileVerifierInterface
{
    public function __construct(
        private readonly string $secret,
        private readonly string $expectedHostname,
        private readonly string $expectedAction = 'support_message'
    ) {}

    public function verify(string $token, string $remoteAddress): void
    {
        if ($token === '' || strlen($token) > 2048) {
            throw new SupportException('turnstile_invalid', 'Spam protection failed. Please try again.', 403);
        }

        $handle = curl_init('https://challenges.cloudflare.com/turnstile/v0/siteverify');
        if ($handle === false) throw new SupportException('turnstile_unavailable', 'Spam protection is unavailable. Please try again.', 503);
        curl_setopt_array($handle, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query([
                'secret' => $this->secret,
                'response' => $token,
                'remoteip' => $remoteAddress,
                'idempotency_key' => bin2hex(random_bytes(16)),
            ]),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_TIMEOUT => 8,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);
        $body = curl_exec($handle);
        $status = (int)curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        $curlError = curl_error($handle);
        curl_close($handle);

        if (!is_string($body) || $status < 200 || $status >= 300) {
            throw new SupportException(
                'turnstile_unavailable',
                'Spam protection is unavailable. Please try again.',
                503,
                0,
                new \RuntimeException($curlError ?: 'Turnstile Siteverify HTTP ' . $status)
            );
        }

        try {
            $result = json_decode($body, true, 32, JSON_THROW_ON_ERROR);
        } catch (\Throwable $error) {
            throw new SupportException('turnstile_unavailable', 'Spam protection is unavailable. Please try again.', 503, 0, $error);
        }
        if (
            ($result['success'] ?? false) !== true
            || !hash_equals($this->expectedHostname, (string)($result['hostname'] ?? ''))
            || !hash_equals($this->expectedAction, (string)($result['action'] ?? ''))
        ) {
            throw new SupportException('turnstile_invalid', 'Spam protection failed. Please try again.', 403);
        }
    }
}
