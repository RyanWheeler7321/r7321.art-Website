#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import ftplib
import hashlib
import json
import secrets
import ssl
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP_ROOT = ROOT / "server" / "support"
FTP_ENV = ROOT / "local" / "ftp.env"
SUPPORT_ENV = ROOT / "local" / "support.env"


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def connect_ftp(values: dict[str, str]):
    mode = values.get("FTP_MODE", "explicit-ftps").lower()
    cls = ftplib.FTP_TLS if mode in {"explicit-ftps", "ftps", "ftp_tls"} else ftplib.FTP
    ftp = cls(timeout=30)
    ftp.connect(values["FTP_HOST"], int(values.get("FTP_PORT", "21")))
    ftp.login(values["FTP_USER"], values["FTP_PASS"])
    if isinstance(ftp, ftplib.FTP_TLS):
        ftp.prot_p()
    ftp.cwd(values.get("FTP_REMOTE_ROOT", "/"))
    return ftp


def collect_release() -> tuple[str, dict[str, dict[str, str]]]:
    files: dict[str, dict[str, str]] = {}
    digest = hashlib.sha256()
    for path in sorted(APP_ROOT.rglob("*")):
        if not path.is_file() or path.name == "config.example.php":
            continue
        relative = path.relative_to(APP_ROOT).as_posix()
        data = path.read_bytes()
        file_hash = hashlib.sha256(data).hexdigest()
        files[relative] = {
            "sha256": file_hash,
            "data": base64.b64encode(data).decode("ascii"),
        }
        digest.update(relative.encode("utf-8") + b"\0" + bytes.fromhex(file_hash))
    return digest.hexdigest()[:20], files


def php_string(value: str) -> str:
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


def build_config(values: dict[str, str]) -> str:
    required = [
        "SUPPORT_APP_SECRET",
        "TURNSTILE_SITE_KEY",
        "TURNSTILE_SECRET",
        "SMTP_PASSWORD",
    ]
    missing = [key for key in required if not values.get(key)]
    if missing:
        raise RuntimeError("Missing support env keys: " + ", ".join(missing))
    if len(values["SUPPORT_APP_SECRET"]) < 32:
        raise RuntimeError("SUPPORT_APP_SECRET must be at least 32 characters")

    smtp_user = values.get("SMTP_USERNAME", "forms@r7321.art")
    return f"""<?php
declare(strict_types=1);
return [
    'app_secret' => {php_string(values['SUPPORT_APP_SECRET'])},
    'turnstile_site_key' => {php_string(values['TURNSTILE_SITE_KEY'])},
    'turnstile_secret' => {php_string(values['TURNSTILE_SECRET'])},
    'turnstile_hostname' => 'r7321.art',
    'allowed_origins' => ['https://r7321.art'],
    'cookie_secure' => true,
    'recipients' => ['feedback' => 'ryan@r7321.art', 'bug' => 'bugs@r7321.art'],
    'smtp' => [
        'host' => {php_string(values.get('SMTP_HOST', 'r7321.art'))},
        'port' => {int(values.get('SMTP_PORT', '465'))},
        'username' => {php_string(smtp_user)},
        'password' => {php_string(values['SMTP_PASSWORD'])},
        'from_email' => {php_string(values.get('SMTP_FROM_EMAIL', smtp_user))},
        'from_name' => {php_string(values.get('SMTP_FROM_NAME', 'r7321 Support'))},
    ],
];
"""


def installer_source(token: str) -> str:
    return f"""<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
register_shutdown_function(static function (): void {{ @unlink(__FILE__); }});
function fail_install(int $status, string $message): never {{ http_response_code($status); echo json_encode(['ok'=>false,'message'=>$message]); exit; }}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail_install(405, 'method');
if (!hash_equals({php_string(token)}, (string)($_SERVER['HTTP_X_R7_INSTALL_TOKEN'] ?? ''))) fail_install(403, 'denied');
$payload = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($payload)) fail_install(400, 'payload');
$release = (string)($payload['release'] ?? '');
if (!preg_match('/^[a-f0-9]{{20}}$/', $release)) fail_install(400, 'release');
$files = $payload['files'] ?? null;
if (!is_array($files) || count($files) < 1 || count($files) > 30) fail_install(400, 'files');
$root = dirname((string)($_SERVER['DOCUMENT_ROOT'] ?? '')) . '/r7321-support';
$releaseDir = $root . '/releases/' . $release;
foreach ([$root, $root.'/releases', $root.'/shared', $root.'/shared/var', $root.'/shared/var/tmp'] as $dir) {{
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) fail_install(500, 'mkdir');
    @chmod($dir, 0700);
}}
if (!is_dir($releaseDir) && !mkdir($releaseDir, 0700, true) && !is_dir($releaseDir)) fail_install(500, 'release_dir');
$written = 0;
$total = 0;
foreach ($files as $path => $entry) {{
    if (!is_string($path) || !preg_match('#^[A-Za-z0-9._/-]+$#', $path) || str_contains($path, '..') || str_starts_with($path, '/')) fail_install(400, 'path');
    if (!is_array($entry) || !is_string($entry['data'] ?? null) || !is_string($entry['sha256'] ?? null)) fail_install(400, 'entry');
    $data = base64_decode($entry['data'], true);
    if ($data === false || !hash_equals($entry['sha256'], hash('sha256', $data))) fail_install(400, 'hash');
    $total += strlen($data);
    if ($total > 5 * 1024 * 1024) fail_install(413, 'size');
    $target = $releaseDir . '/' . $path;
    $dir = dirname($target);
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) fail_install(500, 'file_dir');
    $temp = $target . '.tmp-' . bin2hex(random_bytes(4));
    if (file_put_contents($temp, $data, LOCK_EX) !== strlen($data)) fail_install(500, 'write');
    @chmod($temp, 0600);
    if (!rename($temp, $target)) fail_install(500, 'rename');
    $written++;
}}
if (is_string($payload['config'] ?? null) && $payload['config'] !== '') {{
    $config = base64_decode($payload['config'], true);
    if ($config === false || strlen($config) > 65536) fail_install(400, 'config');
    $configTemp = $root . '/shared/config.php.tmp-' . bin2hex(random_bytes(4));
    if (file_put_contents($configTemp, $config, LOCK_EX) !== strlen($config)) fail_install(500, 'config_write');
    @chmod($configTemp, 0600);
    if (!rename($configTemp, $root . '/shared/config.php')) fail_install(500, 'config_rename');
}}
$pointer = '<?php return ' . var_export($releaseDir, true) . ';' . PHP_EOL;
$pointerTemp = $root . '/current.php.tmp-' . bin2hex(random_bytes(4));
if (file_put_contents($pointerTemp, $pointer, LOCK_EX) !== strlen($pointer)) fail_install(500, 'pointer_write');
@chmod($pointerTemp, 0600);
if (!rename($pointerTemp, $root . '/current.php')) fail_install(500, 'pointer_rename');
echo json_encode(['ok'=>true,'release'=>$release,'files'=>$written]);
"""


def install(include_config: bool) -> dict[str, object]:
    ftp_values = load_env(FTP_ENV)
    release, files = collect_release()
    support_values = load_env(SUPPORT_ENV) if include_config else {}
    config = build_config(support_values) if include_config else ""
    token = secrets.token_urlsafe(32)
    remote_name = f"r7-support-install-{secrets.token_hex(12)}.php"
    installer = installer_source(token).encode("utf-8")
    try:
        with connect_ftp(ftp_values) as ftp:
            from io import BytesIO
            ftp.storbinary(f"STOR {remote_name}", BytesIO(installer))
        payload = json.dumps({
            "release": release,
            "files": files,
            "config": base64.b64encode(config.encode("utf-8")).decode("ascii") if config else "",
        }).encode("utf-8")
        request = urllib.request.Request(
            f"https://r7321.art/{remote_name}",
            data=payload,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
                "X-R7-Install-Token": token,
                "User-Agent": "r7-support-deploy/1",
            },
        )
        with urllib.request.urlopen(request, timeout=60, context=ssl.create_default_context()) as response:
            result = json.loads(response.read().decode("utf-8"))
        if not result.get("ok") or result.get("release") != release:
            raise RuntimeError("Private support install did not verify")
        return result
    finally:
        try:
            with connect_ftp(ftp_values) as ftp:
                ftp.delete(remote_name)
        except Exception:
            pass


def main() -> int:
    parser = argparse.ArgumentParser(description="Install the private r7321 support service through a one-time HTTPS bootstrap.")
    parser.add_argument("command", choices=["dry-run", "install"])
    parser.add_argument("--with-config", action="store_true", help="Install ignored local/support.env secrets too.")
    args = parser.parse_args()
    release, files = collect_release()
    if args.command == "dry-run":
        print(json.dumps({
            "release": release,
            "files": len(files),
            "bytes": sum(len(base64.b64decode(item["data"])) for item in files.values()),
            "with_config": args.with_config,
            "config_available": SUPPORT_ENV.exists(),
        }, indent=2))
        return 0
    result = install(args.with_config)
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
