<?php
declare(strict_types=1);

use R7321\Support\ImageSanitizer;
use R7321\Support\SupportLogger;
use R7321\Support\SupportMailer;
use R7321\Support\SupportService;
use R7321\Support\SupportStore;
use R7321\Support\TokenSigner;
use R7321\Support\TurnstileVerifier;

umask(0077);

require_once __DIR__ . '/vendor/phpmailer/Exception.php';
require_once __DIR__ . '/vendor/phpmailer/PHPMailer.php';
require_once __DIR__ . '/vendor/phpmailer/SMTP.php';
require_once __DIR__ . '/src/SupportException.php';
require_once __DIR__ . '/src/Contracts.php';
require_once __DIR__ . '/src/TokenSigner.php';
require_once __DIR__ . '/src/SupportStore.php';
require_once __DIR__ . '/src/ImageSanitizer.php';
require_once __DIR__ . '/src/TurnstileVerifier.php';
require_once __DIR__ . '/src/SupportLogger.php';
require_once __DIR__ . '/src/SupportMailer.php';
require_once __DIR__ . '/src/SupportService.php';

/** @return array<string, mixed> */
function r7321_support_bootstrap(string $privateRoot): array
{
    $configPath = $privateRoot . '/shared/config.php';
    if (!is_file($configPath)) throw new RuntimeException('Support configuration is missing.');
    $config = require $configPath;
    if (!is_array($config)) throw new RuntimeException('Support configuration is invalid.');

    foreach (['app_secret', 'turnstile_secret', 'turnstile_site_key', 'turnstile_hostname', 'recipients', 'smtp'] as $key) {
        if (!isset($config[$key]) || $config[$key] === '') throw new RuntimeException('Support configuration is incomplete.');
    }
    $sharedVar = $privateRoot . '/shared/var';
    $logger = new SupportLogger($sharedVar . '/support.log');
    $signer = new TokenSigner((string)$config['app_secret']);
    $store = new SupportStore($sharedVar . '/support.sqlite', (string)$config['app_secret']);
    $images = new ImageSanitizer($sharedVar . '/tmp');
    $turnstile = new TurnstileVerifier(
        (string)$config['turnstile_secret'],
        (string)$config['turnstile_hostname']
    );
    $mailer = new SupportMailer((array)$config['smtp']);
    $service = new SupportService($config, $signer, $turnstile, $store, $images, $mailer, $logger);

    return [
        'config' => $config,
        'logger' => $logger,
        'signer' => $signer,
        'store' => $store,
        'service' => $service,
    ];
}
