<?php
declare(strict_types=1);

namespace R7321\Support;

use PHPMailer\PHPMailer\PHPMailer;

final class SupportMailer implements SupportMailerInterface
{
    /** @param array<string, mixed> $config */
    public function __construct(private readonly array $config) {}

    public function send(array $submission, SanitizedUploadBatch $images): string
    {
        $mail = new PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host = (string)$this->config['host'];
            $mail->Port = (int)$this->config['port'];
            $mail->SMTPAuth = true;
            $mail->Username = (string)$this->config['username'];
            $mail->Password = (string)$this->config['password'];
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            $mail->Timeout = 20;
            $mail->SMTPKeepAlive = false;
            $mail->CharSet = PHPMailer::CHARSET_UTF8;
            $mail->XMailer = 'r7321 Support';

            $fromEmail = (string)$this->config['from_email'];
            $fromName = (string)($this->config['from_name'] ?? 'r7321 Support');
            $mail->setFrom($fromEmail, $fromName, false);
            $mail->Sender = $fromEmail;
            $mail->addAddress($submission['recipient']);
            if ($submission['email'] !== '') $mail->addReplyTo($submission['email'], $submission['name']);

            $mail->Subject = $submission['category'] === 'bug'
                ? 'r7321.art Bug Report'
                : 'r7321.art Feedback';
            $mail->isHTML(false);
            $mail->Body = $this->buildBody($submission, count($images->attachments));
            foreach ($images->attachments as $attachment) {
                $mail->addAttachment($attachment['path'], $attachment['name'], PHPMailer::ENCODING_BASE64, $attachment['mime']);
            }
            $mail->send();
            return $mail->getLastMessageID();
        } catch (\Throwable $error) {
            throw new SupportException(
                'mail_unavailable',
                'Your message could not be sent right now. Please try again.',
                503,
                0,
                $error
            );
        }
    }

    /** @param array<string, string> $submission */
    private function buildBody(array $submission, int $imageCount): string
    {
        $name = $submission['name'] !== '' ? $submission['name'] : 'Anonymous';
        $email = $submission['email'] !== '' ? $submission['email'] : 'No reply address';
        $type = $submission['category'] === 'bug' ? 'Bug' : 'Feedback';
        return implode("\r\n", [
            $type . ' submitted through r7321.art',
            'Message ID: ' . $submission['messageId'],
            '',
            'Name: ' . $name,
            'Email: ' . $email,
            'Images: ' . $imageCount,
            '',
            $submission['message'],
        ]);
    }
}
