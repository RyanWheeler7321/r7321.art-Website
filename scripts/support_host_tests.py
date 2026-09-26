#!/usr/bin/env python3
from __future__ import annotations

import json
import secrets
import ssl
import urllib.request
from io import BytesIO

from support_deploy import FTP_ENV, connect_ftp, load_env, php_string


def runner_source(token: str) -> bytes:
    return f"""<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
register_shutdown_function(static function (): void {{ @unlink(__FILE__); }});
function fail_test(int $status, string $message): never {{ http_response_code($status); echo json_encode(['ok'=>false,'message'=>$message]); exit; }}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail_test(405, 'method');
if (!hash_equals({php_string(token)}, (string)($_SERVER['HTTP_X_R7_TEST_TOKEN'] ?? ''))) fail_test(403, 'denied');
$root = dirname((string)($_SERVER['DOCUMENT_ROOT'] ?? '')) . '/r7321-support';
$current = $root . '/current.php';
if (!is_file($current)) fail_test(500, 'missing_release');
$release = require $current;
if (!is_string($release) || !is_file($release . '/tests/host_tests.php')) fail_test(500, 'invalid_release');
require $release . '/tests/host_tests.php';
try {{
    echo json_encode(r7321_run_host_tests($root . '/shared/var'), JSON_UNESCAPED_SLASHES);
}} catch (Throwable $error) {{
    fail_test(500, get_class($error) . ': ' . $error->getMessage());
}}
""".encode()


def run() -> dict[str, object]:
    ftp_values = load_env(FTP_ENV)
    token = secrets.token_urlsafe(32)
    remote_name = f"r7-support-test-{secrets.token_hex(12)}.php"
    try:
        with connect_ftp(ftp_values) as ftp:
            ftp.storbinary(f"STOR {remote_name}", BytesIO(runner_source(token)))
        request = urllib.request.Request(
            f"https://r7321.art/{remote_name}",
            data=b"",
            method="POST",
            headers={
                "Cache-Control": "no-store",
                "X-R7-Test-Token": token,
                "User-Agent": "r7-support-host-test/1",
            },
        )
        with urllib.request.urlopen(request, timeout=120, context=ssl.create_default_context()) as response:
            result = json.loads(response.read().decode())
        if result.get("ok") is not True:
            raise RuntimeError("Support host tests did not pass")
        return result
    finally:
        try:
            with connect_ftp(ftp_values) as ftp:
                ftp.delete(remote_name)
        except Exception:
            pass


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
