<?php
declare(strict_types=1);

namespace R7321\Support;

final class SupportLogger
{
    public function __construct(private readonly string $path)
    {
        $directory = dirname($path);
        if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
            throw new \RuntimeException('Could not create support log directory.');
        }
        chmod($directory, 0700);
    }

    /** @param array<string, int|string|bool|null> $fields */
    public function write(string $event, array $fields = []): void
    {
        $record = array_merge([
            'time' => gmdate('c'),
            'event' => $event,
        ], $fields);
        $line = json_encode($record, JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE) . "\n";
        $handle = @fopen($this->path, 'ab');
        if ($handle === false) return;
        try {
            if (flock($handle, LOCK_EX)) {
                fwrite($handle, $line);
                fflush($handle);
                flock($handle, LOCK_UN);
            }
        } finally {
            fclose($handle);
        }
        @chmod($this->path, 0600);
    }
}
