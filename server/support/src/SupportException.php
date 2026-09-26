<?php
declare(strict_types=1);

namespace R7321\Support;

final class SupportException extends \RuntimeException
{
    public function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly int $httpStatus = 400,
        public readonly int $retryAfter = 0,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, 0, $previous);
    }
}
