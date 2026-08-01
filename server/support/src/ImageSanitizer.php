<?php
declare(strict_types=1);

namespace R7321\Support;

final class SanitizedUploadBatch
{
    /** @param list<array{path:string,name:string,mime:string,size:int}> $attachments */
    public function __construct(
        public readonly array $attachments,
        public readonly int $inputBytes,
        public readonly int $outputBytes,
        private readonly string $directory
    ) {}

    public function cleanup(): void
    {
        foreach ($this->attachments as $attachment) @unlink($attachment['path']);
        @rmdir($this->directory);
    }
}

final class ImageSanitizer
{
    private const MAX_FILES = 4;
    private const MAX_FILE_BYTES = 8 * 1024 * 1024;
    private const MAX_INPUT_BYTES = 20 * 1024 * 1024;
    private const MAX_OUTPUT_BYTES = 12 * 1024 * 1024;
    private const MAX_PIXELS = 25_000_000;

    /** @var array<string, array{type:int,extension:string,decode:string,encode:string}> */
    private const TYPES = [
        'image/png' => ['type' => IMAGETYPE_PNG, 'extension' => 'png', 'decode' => 'imagecreatefrompng', 'encode' => 'imagepng'],
        'image/jpeg' => ['type' => IMAGETYPE_JPEG, 'extension' => 'jpg', 'decode' => 'imagecreatefromjpeg', 'encode' => 'imagejpeg'],
        'image/webp' => ['type' => IMAGETYPE_WEBP, 'extension' => 'webp', 'decode' => 'imagecreatefromwebp', 'encode' => 'imagewebp'],
    ];

    public function __construct(
        private readonly string $temporaryRoot,
        private readonly bool $allowNonUploadedFiles = false
    ) {}

    /** @param list<array{name:string,tmp_name:string,error:int,size:int}> $files */
    public function sanitize(array $files): SanitizedUploadBatch
    {
        if (count($files) > self::MAX_FILES) {
            throw new SupportException('too_many_images', 'You can add up to 4 images.', 413);
        }
        if (!is_dir($this->temporaryRoot) && !mkdir($this->temporaryRoot, 0700, true) && !is_dir($this->temporaryRoot)) {
            throw new \RuntimeException('Could not create support temporary directory.');
        }
        chmod($this->temporaryRoot, 0700);

        $directory = $this->temporaryRoot . '/' . bin2hex(random_bytes(16));
        if (!mkdir($directory, 0700)) throw new \RuntimeException('Could not create submission temporary directory.');

        $attachments = [];
        $inputBytes = 0;
        $outputBytes = 0;
        try {
            foreach ($files as $index => $file) {
                $name = $this->displayName((string)($file['name'] ?? 'image'));
                $error = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
                if ($error === UPLOAD_ERR_NO_FILE) continue;
                if ($error !== UPLOAD_ERR_OK) {
                    throw new SupportException('image_upload_failed', $name . ' could not be uploaded. Please try again.', 400);
                }

                $path = (string)($file['tmp_name'] ?? '');
                $size = is_file($path) ? (int)filesize($path) : (int)($file['size'] ?? 0);
                if ($path === '' || !is_file($path) || (!$this->allowNonUploadedFiles && !is_uploaded_file($path))) {
                    throw new SupportException('image_upload_invalid', $name . ' could not be read as an upload.', 400);
                }
                if ($size <= 0 || $size > self::MAX_FILE_BYTES) {
                    throw new SupportException('image_too_large', $name . ' is larger than 8 MB.', 413);
                }
                $inputBytes += $size;
                if ($inputBytes > self::MAX_INPUT_BYTES) {
                    throw new SupportException('images_too_large', 'The selected images are larger than 20 MB combined.', 413);
                }

                $finfo = new \finfo(FILEINFO_MIME_TYPE);
                $mime = (string)$finfo->file($path);
                $definition = self::TYPES[$mime] ?? null;
                if (!$definition) {
                    throw new SupportException('image_type_invalid', $name . ' must be a PNG, JPEG, or WebP image.', 400);
                }

                $dimensions = @getimagesize($path);
                $width = (int)($dimensions[0] ?? 0);
                $height = (int)($dimensions[1] ?? 0);
                $actualType = (int)($dimensions[2] ?? 0);
                if ($width <= 0 || $height <= 0 || $actualType !== $definition['type']) {
                    throw new SupportException('image_decode_invalid', $name . ' could not be read as an image.', 400);
                }
                if ($width * $height > self::MAX_PIXELS) {
                    throw new SupportException('image_pixels_too_large', $name . ' is larger than 25 megapixels.', 413);
                }
                $this->assertMemoryBudget($width, $height, $size, $name);

                $decode = $definition['decode'];
                $image = @$decode($path);
                if (!$image instanceof \GdImage) {
                    throw new SupportException('image_decode_invalid', $name . ' could not be read as an image.', 400);
                }

                $outputPath = $directory . '/image-' . ($index + 1) . '.' . $definition['extension'];
                $encoded = false;
                try {
                    if ($mime === 'image/png') {
                        imagealphablending($image, false);
                        imagesavealpha($image, true);
                        $encoded = imagepng($image, $outputPath, 9);
                    } elseif ($mime === 'image/jpeg') {
                        imageinterlace($image, true);
                        $encoded = imagejpeg($image, $outputPath, 88);
                    } else {
                        imagealphablending($image, true);
                        imagesavealpha($image, true);
                        $encoded = imagewebp($image, $outputPath, 88);
                    }
                } finally {
                    imagedestroy($image);
                }
                if (!$encoded || !is_file($outputPath)) {
                    throw new SupportException('image_sanitize_failed', $name . ' could not be cleaned for email.', 500);
                }
                chmod($outputPath, 0600);
                $sanitizedSize = (int)filesize($outputPath);
                $outputBytes += $sanitizedSize;
                if ($outputBytes > self::MAX_OUTPUT_BYTES) {
                    throw new SupportException(
                        'sanitized_images_too_large',
                        'The cleaned images are too large for email. Remove one and try again.',
                        413
                    );
                }
                $attachments[] = [
                    'path' => $outputPath,
                    'name' => 'image-' . ($index + 1) . '.' . $definition['extension'],
                    'mime' => $mime,
                    'size' => $sanitizedSize,
                ];
            }

            return new SanitizedUploadBatch($attachments, $inputBytes, $outputBytes, $directory);
        } catch (\Throwable $error) {
            foreach ($attachments as $attachment) @unlink($attachment['path']);
            foreach (glob($directory . '/*') ?: [] as $leftover) @unlink($leftover);
            @rmdir($directory);
            throw $error;
        }
    }

    private function assertMemoryBudget(int $width, int $height, int $fileBytes, string $name): void
    {
        $limit = $this->iniBytes((string)ini_get('memory_limit'));
        if ($limit < 0) return;
        $estimated = $width * $height * 5 + $fileBytes * 2 + 32 * 1024 * 1024;
        if (memory_get_usage(true) + $estimated >= $limit) {
            throw new SupportException('image_memory_too_large', $name . ' is too large for the server to process safely.', 413);
        }
    }

    private function iniBytes(string $value): int
    {
        $value = trim($value);
        if ($value === '-1') return -1;
        $unit = strtolower(substr($value, -1));
        $number = (float)$value;
        return match ($unit) {
            'g' => (int)($number * 1024 * 1024 * 1024),
            'm' => (int)($number * 1024 * 1024),
            'k' => (int)($number * 1024),
            default => (int)$number,
        };
    }

    private function displayName(string $name): string
    {
        $name = basename(str_replace("\0", '', $name));
        $name = preg_replace('/[^\pL\pN._ -]+/u', '', $name) ?: 'image';
        return function_exists('mb_substr') ? mb_substr($name, 0, 120) : substr($name, 0, 120);
    }
}
