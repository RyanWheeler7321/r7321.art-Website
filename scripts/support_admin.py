#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
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
function fail_admin(int $status, string $message): never {{ http_response_code($status); echo json_encode(['ok'=>false,'message'=>$message]); exit; }}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail_admin(405, 'method');
if (!hash_equals({php_string(token)}, (string)($_SERVER['HTTP_X_R7_ADMIN_TOKEN'] ?? ''))) fail_admin(403, 'denied');
$payload = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($payload)) fail_admin(400, 'payload');
$root = dirname((string)($_SERVER['DOCUMENT_ROOT'] ?? '')) . '/r7321-support';
$current = $root . '/current.php';
if (!is_file($current)) fail_admin(500, 'missing_release');
$release = require $current;
if (!is_string($release) || !is_file($release . '/bootstrap.php')) fail_admin(500, 'invalid_release');
require_once $release . '/bootstrap.php';
try {{
    $app = r7321_support_bootstrap($root);
    $action = (string)($payload['action'] ?? '');
    $messageId = (string)($payload['message_id'] ?? '');
    if ($action === 'block') {{
        $result = $app['store']->blockMessage($messageId, (string)($payload['reason'] ?? ''), time());
        echo json_encode(['ok'=>true,'action'=>'block','result'=>$result], JSON_UNESCAPED_SLASHES);
    }} elseif ($action === 'unblock') {{
        $removed = $app['store']->unblockMessage($messageId);
        echo json_encode(['ok'=>true,'action'=>'unblock','message_id'=>strtoupper($messageId),'removed'=>$removed], JSON_UNESCAPED_SLASHES);
    }} else {{
        fail_admin(400, 'action');
    }}
}} catch (Throwable $error) {{
    fail_admin(400, $error->getMessage());
}}
""".encode()


def run_admin(action: str, message_id: str, reason: str = "") -> dict[str, object]:
    message_id = message_id.strip().upper()
    if not re.fullmatch(r"R7-[A-F0-9]{12}", message_id):
        raise SystemExit("Message ID must look like R7-1234ABCDEF56")

    ftp_values = load_env(FTP_ENV)
    token = secrets.token_urlsafe(32)
    remote_name = f"r7-support-admin-{secrets.token_hex(12)}.php"
    try:
        with connect_ftp(ftp_values) as ftp:
            ftp.storbinary(f"STOR {remote_name}", BytesIO(runner_source(token)))
        payload = json.dumps({
            "action": action,
            "message_id": message_id,
            "reason": reason,
        }).encode("utf-8")
        request = urllib.request.Request(
            f"https://r7321.art/{remote_name}",
            data=payload,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
                "X-R7-Admin-Token": token,
                "User-Agent": "r7-support-admin/1",
            },
        )
        with urllib.request.urlopen(request, timeout=60, context=ssl.create_default_context()) as response:
            result = json.loads(response.read().decode("utf-8"))
        if result.get("ok") is not True:
            raise RuntimeError("Support admin action did not succeed")
        return result
    finally:
        try:
            with connect_ftp(ftp_values) as ftp:
                ftp.delete(remote_name)
        except Exception:
            pass


def main() -> int:
    parser = argparse.ArgumentParser(description="Privately block or unblock an r7321.art message sender by message ID.")
    subparsers = parser.add_subparsers(dest="action", required=True)
    block = subparsers.add_parser("block")
    block.add_argument("message_id")
    block.add_argument("--reason", default="manual abuse block")
    unblock = subparsers.add_parser("unblock")
    unblock.add_argument("message_id")
    args = parser.parse_args()

    result = run_admin(args.action, args.message_id, getattr(args, "reason", ""))
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
