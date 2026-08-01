<?php
declare(strict_types=1);

return [
    'app_secret' => 'replace-with-at-least-32-random-characters',
    'turnstile_site_key' => 'replace-with-public-site-key',
    'turnstile_secret' => 'replace-with-private-secret-key',
    'turnstile_hostname' => 'r7321.art',
    'allowed_origins' => ['https://r7321.art'],
    'cookie_secure' => true,
    'recipients' => [
        'feedback' => 'ryan@r7321.art',
        'bug' => 'bugs@r7321.art',
    ],
    'smtp' => [
        'host' => 'r7321.art',
        'port' => 465,
        'username' => 'forms@r7321.art',
        'password' => 'replace-with-smtp-password',
        'from_email' => 'forms@r7321.art',
        'from_name' => 'r7321 Support',
    ],
];
