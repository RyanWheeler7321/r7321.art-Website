<?php
declare(strict_types=1);

namespace R7321\Support;

final class TokenSigner
{
    public function __construct(
        private readonly string $secret,
        private readonly int $minimumAgeSeconds = 3,
        private readonly int $maximumAgeSeconds = 7200
    ) {
        if (strlen($secret) < 32) {
            throw new \InvalidArgumentException('Support application secret must be at least 32 characters.');
        }
    }

    public function issue(string $browserId, ?int $now = null): string
    {
        $payload = json_encode([
            'v' => 1,
            'iat' => $now ?? time(),
            'nonce' => bin2hex(random_bytes(16)),
            'browser' => $browserId,
        ], JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        $encoded = self::base64UrlEncode($payload);
        return $encoded . '.' . self::base64UrlEncode(hash_hmac('sha256', $encoded, $this->secret, true));
    }

    public function verify(string $token, string $browserId, ?int $now = null): void
    {
        $parts = explode('.', $token, 2);
        if (count($parts) !== 2 || $parts[0] === '' || $parts[1] === '') {
            throw new SupportException('form_invalid', 'Please refresh the page and try again.', 403);
        }

        $expected = self::base64UrlEncode(hash_hmac('sha256', $parts[0], $this->secret, true));
        if (!hash_equals($expected, $parts[1])) {
            throw new SupportException('form_invalid', 'Please refresh the page and try again.', 403);
        }

        try {
            $payload = json_decode(self::base64UrlDecode($parts[0]), true, 8, JSON_THROW_ON_ERROR);
        } catch (\Throwable $error) {
            throw new SupportException('form_invalid', 'Please refresh the page and try again.', 403, 0, $error);
        }

        $issuedAt = (int)($payload['iat'] ?? 0);
        $currentTime = $now ?? time();
        if (($payload['v'] ?? null) !== 1 || !is_string($payload['browser'] ?? null)) {
            throw new SupportException('form_invalid', 'Please refresh the page and try again.', 403);
        }
        if (!hash_equals($browserId, $payload['browser'])) {
            throw new SupportException('form_invalid', 'Please refresh the page and try again.', 403);
        }
        if ($issuedAt <= 0 || $currentTime - $issuedAt > $this->maximumAgeSeconds) {
            throw new SupportException('form_expired', 'This form expired. Please try sending again.', 403);
        }
        if ($issuedAt > $currentTime + 30 || $currentTime - $issuedAt < $this->minimumAgeSeconds) {
            throw new SupportException('form_too_fast', 'Please take a moment before sending your message.', 429, max(1, $this->minimumAgeSeconds - ($currentTime - $issuedAt)));
        }
    }

    private static function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $value): string
    {
        $padding = strlen($value) % 4;
        if ($padding) $value .= str_repeat('=', 4 - $padding);
        $decoded = base64_decode(strtr($value, '-_', '+/'), true);
        if ($decoded === false) throw new \RuntimeException('Invalid base64url value.');
        return $decoded;
    }
}
