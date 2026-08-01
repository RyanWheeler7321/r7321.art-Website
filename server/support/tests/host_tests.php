<?php
declare(strict_types=1);

use R7321\Support\ImageSanitizer;
use R7321\Support\SanitizedUploadBatch;
use R7321\Support\SupportException;
use R7321\Support\SupportLogger;
use R7321\Support\SupportMailerInterface;
use R7321\Support\SupportService;
use R7321\Support\SupportStore;
use R7321\Support\TokenSigner;
use R7321\Support\TurnstileVerifierInterface;

require_once dirname(__DIR__) . '/vendor/phpmailer/Exception.php';
require_once dirname(__DIR__) . '/vendor/phpmailer/PHPMailer.php';
require_once dirname(__DIR__) . '/vendor/phpmailer/SMTP.php';
require_once dirname(__DIR__) . '/src/SupportException.php';
require_once dirname(__DIR__) . '/src/Contracts.php';
require_once dirname(__DIR__) . '/src/TokenSigner.php';
require_once dirname(__DIR__) . '/src/SupportStore.php';
require_once dirname(__DIR__) . '/src/ImageSanitizer.php';
require_once dirname(__DIR__) . '/src/SupportLogger.php';
require_once dirname(__DIR__) . '/src/SupportService.php';

final class TestTurnstile implements TurnstileVerifierInterface
{
    public int $calls = 0;

    public function verify(string $token, string $remoteAddress): void
    {
        $this->calls++;
        if ($token !== 'valid') throw new SupportException('turnstile_invalid', 'Spam protection failed.', 403);
    }
}

final class TestMailer implements SupportMailerInterface
{
    public int $accepted = 0;
    public bool $failNext = false;
    /** @var list<array<string, string>> */
    public array $submissions = [];
    /** @var list<string> */
    public array $lastPaths = [];

    public function send(array $submission, SanitizedUploadBatch $images): string
    {
        $this->lastPaths = array_column($images->attachments, 'path');
        foreach ($this->lastPaths as $path) test_assert(is_file($path), 'sanitized attachment exists during mail');
        if ($this->failNext) {
            $this->failNext = false;
            throw new SupportException('mail_unavailable', 'Mail failed.', 503);
        }
        $this->accepted++;
        $this->submissions[] = $submission;
        return '<test-' . $this->accepted . '@r7321.art>';
    }
}

function test_assert(bool $condition, string $message): void
{
    if (!$condition) throw new RuntimeException($message);
}

function test_expect(string $code, callable $action): void
{
    try {
        $action();
    } catch (SupportException $error) {
        test_assert($error->errorCode === $code, 'expected ' . $code . ', got ' . $error->errorCode);
        return;
    }
    throw new RuntimeException('expected SupportException ' . $code);
}

/** @return array{service:SupportService,signer:TokenSigner,store:SupportStore,turnstile:TestTurnstile,mailer:TestMailer,root:string} */
function make_test_service(string $base, string $name): array
{
    $root = $base . '/' . $name;
    mkdir($root, 0700, true);
    $secret = str_repeat($name . '-', 8) . '0123456789abcdef';
    $signer = new TokenSigner($secret);
    $store = new SupportStore($root . '/support.sqlite', $secret);
    $turnstile = new TestTurnstile();
    $mailer = new TestMailer();
    $logger = new SupportLogger($root . '/support.log');
    $config = ['recipients' => ['feedback' => 'ryan@r7321.art', 'bug' => 'bugs@r7321.art']];
    $service = new SupportService(
        $config,
        $signer,
        $turnstile,
        $store,
        new ImageSanitizer($root . '/tmp', true),
        $mailer,
        $logger
    );
    return compact('service', 'signer', 'store', 'turnstile', 'mailer', 'root');
}

/** @return array<string, string> */
function test_post(TokenSigner $signer, string $browser, string $key, array $changes = []): array
{
    return array_merge([
        'category' => 'feedback',
        'name' => '',
        'email' => '',
        'message' => 'Test message ' . $key,
        'website' => '',
        'formToken' => $signer->issue($browser, time() - 4),
        'turnstileToken' => 'valid',
        'idempotencyKey' => $key,
    ], $changes);
}

/** @return array{name:string,tmp_name:string,error:int,size:int} */
function test_file(string $path, ?string $name = null): array
{
    return ['name' => $name ?? basename($path), 'tmp_name' => $path, 'error' => UPLOAD_ERR_OK, 'size' => (int)filesize($path)];
}

function write_test_images(string $root): array
{
    $image = imagecreatetruecolor(32, 24);
    $pink = imagecolorallocate($image, 238, 40, 140);
    imagefill($image, 0, 0, $pink);
    $png = $root . '/valid.png';
    $jpeg = $root . '/valid.jpg';
    $webp = $root . '/valid.webp';
    imagepng($image, $png);
    imagejpeg($image, $jpeg, 90);
    imagewebp($image, $webp, 90);
    imagedestroy($image);
    return compact('png', 'jpeg', 'webp');
}

function write_header_png(string $path, int $width, int $height): void
{
    $chunk = static function (string $type, string $data): string {
        return pack('N', strlen($data)) . $type . $data . pack('N', crc32($type . $data));
    };
    $ihdr = pack('NNCCCCC', $width, $height, 8, 2, 0, 0, 0);
    file_put_contents($path, "\x89PNG\r\n\x1a\n" . $chunk('IHDR', $ihdr) . $chunk('IEND', ''));
}

function remove_tree(string $path): void
{
    if (!is_dir($path)) return;
    $items = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($path, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($items as $item) {
        $item->isDir() ? @rmdir($item->getPathname()) : @unlink($item->getPathname());
    }
    @rmdir($path);
}

/** @return array{ok:bool,tests:list<string>} */
function r7321_run_host_tests(string $base): array
{
    umask(0077);
    $tests = [];
    $root = $base . '/support-test-' . bin2hex(random_bytes(8));
    mkdir($root, 0700, true);
    try {
        $images = write_test_images($root);
        file_put_contents($root . '/renamed.png', "GIF89a" . str_repeat("\0", 64));
        file_put_contents($root . '/invalid.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
        write_header_png($root . '/corrupt.png', 32, 24);
        write_header_png($root . '/huge-pixels.png', 5001, 5000);

        $basic = make_test_service($root, 'basic');
        $browser = str_repeat('a', 64);
        $post = test_post($basic['signer'], $browser, 'basic-message-key-0001');
        $result = $basic['service']->submit($post, [], ['REMOTE_ADDR' => '203.0.113.10'], $browser);
        test_assert($result['ok'] && !$result['duplicate'], 'basic anonymous feedback sends');
        test_assert($basic['mailer']->accepted === 1, 'basic mail accepted once');
        test_assert($basic['mailer']->submissions[0]['recipient'] === 'ryan@r7321.art', 'feedback routes to Ryan');
        $duplicate = $basic['service']->submit($post, [], ['REMOTE_ADDR' => '203.0.113.10'], $browser);
        test_assert($duplicate['duplicate'] && $basic['mailer']->accepted === 1, 'idempotent replay does not resend');
        $tests[] = 'anonymous routing and idempotency';

        $bug = make_test_service($root, 'bug');
        $bugBrowser = str_repeat('b', 64);
        $bugPost = test_post($bug['signer'], $bugBrowser, 'bug-message-key-00001', [
            'category' => 'bug',
            'name' => 'Preview User',
            'email' => 'preview@example.com',
            'message' => 'Private unique body 9380',
        ]);
        $bugFiles = [test_file($images['png']), test_file($images['jpeg']), test_file($images['webp'])];
        $bug['service']->submit($bugPost, $bugFiles, ['REMOTE_ADDR' => '198.51.100.88'], $bugBrowser);
        test_assert($bug['mailer']->submissions[0]['recipient'] === 'bugs@r7321.art', 'bug routes to bug mailbox');
        test_assert($bug['mailer']->submissions[0]['email'] === 'preview@example.com', 'reply email retained for mail only');
        foreach ($bug['mailer']->lastPaths as $path) test_assert(!file_exists($path), 'sanitized attachment deleted after send');
        $stored = file_get_contents($bug['root'] . '/support.sqlite') . file_get_contents($bug['root'] . '/support.log');
        foreach (['preview@example.com', '198.51.100.88', 'Private unique body 9380'] as $privateValue) {
            test_assert(!str_contains($stored, $privateValue), 'private value absent from DB and log');
        }
        $tests[] = 'bug routing, three formats, cleanup, private state';

        $invalid = make_test_service($root, 'invalid');
        $invalidCases = [
            ['image_type_invalid', [test_file($root . '/invalid.svg')]],
            ['image_type_invalid', [test_file($root . '/renamed.png')]],
            ['image_decode_invalid', [test_file($root . '/corrupt.png')]],
            ['image_pixels_too_large', [test_file($root . '/huge-pixels.png')]],
            ['too_many_images', array_fill(0, 5, test_file($images['png']))],
        ];
        foreach ($invalidCases as $index => [$code, $files]) {
            $caseBrowser = str_repeat(dechex($index + 1), 64);
            $casePost = test_post($invalid['signer'], $caseBrowser, 'invalid-case-key-' . str_pad((string)$index, 6, '0'));
            test_expect($code, fn() => $invalid['service']->submit(
                $casePost,
                $files,
                ['REMOTE_ADDR' => '192.0.2.' . ($index + 10)],
                $caseBrowser
            ));
        }
        $oversize = $root . '/oversize.png';
        copy($images['png'], $oversize);
        $handle = fopen($oversize, 'ab');
        ftruncate($handle, 8 * 1024 * 1024 + 1);
        fclose($handle);
        test_expect('image_too_large', fn() => $invalid['service']->submit(
            test_post($invalid['signer'], str_repeat('a', 64), 'oversize-case-key-0001'),
            [test_file($oversize)],
            ['REMOTE_ADDR' => '192.0.2.30'],
            str_repeat('a', 64)
        ));
        $combined = [];
        for ($index = 0; $index < 3; $index++) {
            $path = $root . '/combined-' . $index . '.png';
            copy($images['png'], $path);
            $handle = fopen($path, 'ab');
            ftruncate($handle, 7 * 1024 * 1024);
            fclose($handle);
            $combined[] = test_file($path);
        }
        test_expect('images_too_large', fn() => $invalid['service']->submit(
            test_post($invalid['signer'], str_repeat('b', 64), 'combined-case-key-001'),
            $combined,
            ['REMOTE_ADDR' => '192.0.2.31'],
            str_repeat('b', 64)
        ));
        test_assert($invalid['mailer']->accepted === 0, 'invalid images never mail');
        $tests[] = 'server image rejection boundaries';

        $failure = make_test_service($root, 'failure');
        $failureBrowser = str_repeat('d', 64);
        $failurePost = test_post($failure['signer'], $failureBrowser, 'mail-retry-key-000001');
        $failure['mailer']->failNext = true;
        test_expect('mail_unavailable', fn() => $failure['service']->submit(
            $failurePost,
            [test_file($images['png'])],
            ['REMOTE_ADDR' => '203.0.113.50'],
            $failureBrowser
        ));
        foreach ($failure['mailer']->lastPaths as $path) test_assert(!file_exists($path), 'sanitized attachment deleted after mail failure');
        $retried = $failure['service']->submit($failurePost, [test_file($images['png'])], ['REMOTE_ADDR' => '203.0.113.50'], $failureBrowser);
        test_assert($retried['ok'] && $failure['mailer']->accepted === 1, 'same idempotency key can retry a known failure');
        $tests[] = 'mail failure cleanup and retry';

        $unicode = make_test_service($root, 'unicode');
        $unicodeBrowser = str_repeat('c', 64);
        $unicodeResult = $unicode['service']->submit(
            test_post($unicode['signer'], $unicodeBrowser, 'unicode-valid-key-0001', [
                'name' => str_repeat('é', 100),
                'message' => str_repeat('界', 12000),
            ]),
            [],
            ['REMOTE_ADDR' => '198.51.100.42'],
            $unicodeBrowser
        );
        test_assert($unicodeResult['ok'] && $unicode['mailer']->accepted === 1, 'valid Unicode character boundaries send');
        $longNameBrowser = str_repeat('d', 64);
        test_expect('name_too_long', fn() => $unicode['service']->submit(
            test_post($unicode['signer'], $longNameBrowser, 'unicode-name-long-0001', ['name' => str_repeat('é', 101)]),
            [],
            ['REMOTE_ADDR' => '198.51.100.43'],
            $longNameBrowser
        ));
        $longMessageBrowser = str_repeat('e', 64);
        test_expect('message_too_long', fn() => $unicode['service']->submit(
            test_post($unicode['signer'], $longMessageBrowser, 'unicode-message-long-1', ['message' => str_repeat('界', 12001)]),
            [],
            ['REMOTE_ADDR' => '198.51.100.44'],
            $longMessageBrowser
        ));
        test_assert($unicode['mailer']->accepted === 1, 'overlong Unicode fields never mail');
        $tests[] = 'Unicode character boundaries';

        $rate = make_test_service($root, 'rate');
        $rateBrowser = str_repeat('e', 64);
        for ($index = 0; $index < 3; $index++) {
            $rate['service']->submit(
                test_post($rate['signer'], $rateBrowser, 'rate-case-key-' . str_pad((string)$index, 8, '0')),
                [],
                ['REMOTE_ADDR' => '203.0.113.75'],
                $rateBrowser
            );
        }
        test_expect('rate_limited', fn() => $rate['service']->submit(
            test_post($rate['signer'], $rateBrowser, 'rate-case-key-99999999'),
            [],
            ['REMOTE_ADDR' => '203.0.113.75'],
            $rateBrowser
        ));
        test_assert($rate['mailer']->accepted === 3, 'rate limit does not discard an accepted fourth message');
        $tests[] = 'burst limit boundary';

        $directStore = new SupportStore($root . '/daily.sqlite', str_repeat('daily-secret-', 4));
        $dailySubject = [['scope' => 'browser', 'hash' => $directStore->hash('browser', 'daily-browser')]];
        $baseTime = 1_800_000_000;
        for ($index = 0; $index < 20; $index++) {
            $key = $directStore->hash('idempotency', 'daily-key-' . $index);
            test_assert($directStore->reserve($key, $dailySubject, $baseTime + $index * 601) === 'reserved', 'no daily cap');
            $directStore->markSent($key, $baseTime + $index * 601);
        }
        $tests[] = 'no daily or global cap';

        $guards = make_test_service($root, 'guards');
        $guardBrowser = str_repeat('f', 64);
        $fast = test_post($guards['signer'], $guardBrowser, 'fast-form-key-000001');
        $fast['formToken'] = $guards['signer']->issue($guardBrowser, time());
        test_expect('form_too_fast', fn() => $guards['service']->submit($fast, [], ['REMOTE_ADDR' => '192.0.2.22'], $guardBrowser));
        $honeypot = test_post($guards['signer'], $guardBrowser, 'honeypot-key-000001', ['website' => 'https://spam.invalid']);
        test_expect('spam_rejected', fn() => $guards['service']->submit($honeypot, [], ['REMOTE_ADDR' => '192.0.2.22'], $guardBrowser));
        $badTurnstile = test_post($guards['signer'], $guardBrowser, 'turnstile-key-00001', ['turnstileToken' => 'spent']);
        test_expect('turnstile_invalid', fn() => $guards['service']->submit($badTurnstile, [], ['REMOTE_ADDR' => '192.0.2.22'], $guardBrowser));
        test_assert($guards['mailer']->accepted === 0, 'guards never mail');
        $tests[] = 'signed minimum time, honeypot, Turnstile failure';

        return ['ok' => true, 'tests' => $tests];
    } finally {
        remove_tree($root);
    }
}
