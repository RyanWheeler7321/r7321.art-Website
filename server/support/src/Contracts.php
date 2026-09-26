<?php
declare(strict_types=1);

namespace R7321\Support;

interface TurnstileVerifierInterface
{
    public function verify(string $token, string $remoteAddress): void;
}

interface SupportMailerInterface
{
    /** @param array<string, string> $submission */
    public function send(array $submission, SanitizedUploadBatch $images): string;
}
