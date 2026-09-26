<?php
declare(strict_types=1);

use R7321\Support\SupportException;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function support_json(int $status, array $payload, int $retryAfter = 0): never
{
    http_response_code($status);
    if ($retryAfter > 0) header('Retry-After: ' . $retryAfter);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function support_browser_id(array $config, bool $create): string
{
    $name = '__Host-r7_support';
    $value = (string)($_COOKIE[$name] ?? '');
    if (preg_match('/^[a-f0-9]{64}$/', $value)) return $value;
    if (!$create) throw new SupportException('browser_session_missing', 'Please refresh the page and try again.', 403);

    $value = bin2hex(random_bytes(32));
    setcookie($name, $value, [
        'expires' => time() + 31536000,
        'path' => '/',
        'secure' => (bool)($config['cookie_secure'] ?? true),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    return $value;
}

function support_check_origin(array $config): void
{
    $origin = trim((string)($_SERVER['HTTP_ORIGIN'] ?? ''));
    $allowed = array_map('strval', (array)($config['allowed_origins'] ?? []));
    if ($origin === '' || !in_array($origin, $allowed, true)) {
        throw new SupportException('origin_invalid', 'Please use the support page to send your message.', 403);
    }
}

/** @return list<array{name:string,tmp_name:string,error:int,size:int}> */
function support_flatten_files(array $files): array
{
    if (!isset($files['images'])) return [];
    $images = $files['images'];
    $names = is_array($images['name'] ?? null) ? $images['name'] : [$images['name'] ?? ''];
    $paths = is_array($images['tmp_name'] ?? null) ? $images['tmp_name'] : [$images['tmp_name'] ?? ''];
    $errors = is_array($images['error'] ?? null) ? $images['error'] : [$images['error'] ?? UPLOAD_ERR_NO_FILE];
    $sizes = is_array($images['size'] ?? null) ? $images['size'] : [$images['size'] ?? 0];
    $result = [];
    foreach ($names as $index => $name) {
        $result[] = [
            'name' => (string)$name,
            'tmp_name' => (string)($paths[$index] ?? ''),
            'error' => (int)($errors[$index] ?? UPLOAD_ERR_NO_FILE),
            'size' => (int)($sizes[$index] ?? 0),
        ];
    }
    return $result;
}

try {
    $privateRoot = (string)(getenv('R7321_SUPPORT_ROOT') ?: dirname((string)($_SERVER['DOCUMENT_ROOT'] ?? '')) . '/r7321-support');
    $currentPath = $privateRoot . '/current.php';
    if (!is_file($currentPath)) throw new RuntimeException('Support service is not installed.');
    $releaseRoot = require $currentPath;
    if (!is_string($releaseRoot) || !is_file($releaseRoot . '/bootstrap.php')) throw new RuntimeException('Support release is invalid.');
    require_once $releaseRoot . '/bootstrap.php';
    $app = r7321_support_bootstrap($privateRoot);
    $config = $app['config'];

    $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if ($method === 'GET' && (string)($_GET['action'] ?? '') === 'init') {
        $browserId = support_browser_id($config, true);
        support_json(200, [
            'ok' => true,
            'formToken' => $app['signer']->issue($browserId),
            'turnstileSiteKey' => (string)$config['turnstile_site_key'],
        ]);
    }
    if ($method !== 'POST') {
        header('Allow: GET, POST');
        support_json(405, ['ok' => false, 'code' => 'method_not_allowed', 'message' => 'Method not allowed.']);
    }

    support_check_origin($config);
    $contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($contentLength > 22 * 1024 * 1024) {
        throw new SupportException('request_too_large', 'The selected images are larger than 20 MB combined.', 413);
    }
    $browserId = support_browser_id($config, false);
    $result = $app['service']->submit($_POST, support_flatten_files($_FILES), $_SERVER, $browserId);
    support_json(200, $result);
} catch (SupportException $error) {
    support_json($error->httpStatus, [
        'ok' => false,
        'code' => $error->errorCode,
        'message' => $error->getMessage(),
        'retryAfter' => $error->retryAfter,
    ], $error->retryAfter);
} catch (Throwable $error) {
    if (isset($app['logger'])) {
        $app['logger']->write('controller_error', ['error_type' => get_class($error)]);
    }
    support_json(500, [
        'ok' => false,
        'code' => 'internal_error',
        'message' => 'The message service is unavailable. Please try again.',
    ]);
}
