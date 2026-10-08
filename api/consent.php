<?php
/**
 * Organizr - cookie consent log.
 *
 * Receives the choice made in the cookie banner (assets/js/cookie-consent.js) and appends it
 * to a monthly JSON Lines file in /_private/consents/ (blocked by .htaccess), so a consent can
 * be proven later. Stored per record: UTC time, random consent ID, policy version, action,
 * per-category choices, language, page path and an anonymised IP. Nothing else.
 * Records are kept for 24 months, then removed automatically.
 */

declare(strict_types=1);

const ALLOWED_HOSTS = ['organizr.it', 'www.organizr.it', 'localhost', '127.0.0.1'];
const CATEGORIES = ['necessary', 'preferences', 'statistics', 'marketing'];
const ACTIONS = ['accept', 'reject', 'save', 'close'];
const RETENTION_MONTHS = 24;
const MAX_BODY = 4096;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
header('X-Content-Type-Options: nosniff');

function finish(int $status, array $payload = []): void
{
    http_response_code($status);
    if ($status !== 204) {
        echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    }
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    finish(405, ['error' => 'method_not_allowed']);
}

// Same-site requests only: the banner always sends Origin on fetch POST.
$origin = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
$originHost = $origin !== '' ? strtolower((string) parse_url($origin, PHP_URL_HOST)) : '';
if (!in_array($originHost, ALLOWED_HOSTS, true)) {
    finish(403, ['error' => 'forbidden']);
}

if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
    finish(415, ['error' => 'unsupported_media_type']);
}

$raw = file_get_contents('php://input', false, null, 0, MAX_BODY + 1);
if ($raw === false || $raw === '' || strlen($raw) > MAX_BODY) {
    finish(413, ['error' => 'invalid_body']);
}

try {
    $data = json_decode($raw, true, 8, JSON_THROW_ON_ERROR);
} catch (JsonException $e) {
    finish(400, ['error' => 'invalid_json']);
}
if (!is_array($data)) {
    finish(400, ['error' => 'invalid_json']);
}

$id = (string) ($data['id'] ?? '');
if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/', $id)) {
    finish(400, ['error' => 'invalid_id']);
}

$version = $data['version'] ?? null;
if (!is_int($version) || $version < 1 || $version > 1000) {
    finish(400, ['error' => 'invalid_version']);
}

$action = (string) ($data['action'] ?? '');
if (!in_array($action, ACTIONS, true)) {
    finish(400, ['error' => 'invalid_action']);
}

$choicesIn = $data['choices'] ?? null;
if (!is_array($choicesIn) || $choicesIn === []) {
    finish(400, ['error' => 'invalid_choices']);
}
$choices = [];
foreach ($choicesIn as $category => $value) {
    if (!in_array($category, CATEGORIES, true) || !is_bool($value)) {
        finish(400, ['error' => 'invalid_choices']);
    }
    $choices[$category] = $value;
}
$choices['necessary'] = true;

$lang = in_array($data['lang'] ?? '', ['it', 'en'], true) ? $data['lang'] : 'en';
$page = (string) ($data['page'] ?? '/');
if (!preg_match('#^/[A-Za-z0-9/_\-.]{0,199}$#', $page)) {
    $page = '/';
}

/** Keeps the network part only: /24 for IPv4, /48 for IPv6. */
function anonymize_ip(string $ip): string
{
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        return preg_replace('/\.\d+$/', '.0', $ip);
    }
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
        $packed = inet_pton($ip);
        return inet_ntop(substr($packed, 0, 6) . str_repeat("\0", 10)) ?: '';
    }
    return '';
}

// Behind Cloudflare the visitor address arrives in CF-Connecting-IP.
$clientIp = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? ($_SERVER['REMOTE_ADDR'] ?? '');

$record = [
    'ts' => gmdate('Y-m-d\TH:i:s\Z'),
    'id' => $id,
    'version' => $version,
    'action' => $action,
    'choices' => $choices,
    'lang' => $lang,
    'page' => $page,
    'ip' => anonymize_ip((string) $clientIp),
];

$dir = dirname(__DIR__) . '/_private/consents';
if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) {
    finish(500, ['error' => 'storage_unavailable']);
}

$file = $dir . '/consents-' . gmdate('Y-m') . '.jsonl';
$line = json_encode($record, JSON_UNESCAPED_SLASHES) . "\n";
if (file_put_contents($file, $line, FILE_APPEND | LOCK_EX) === false) {
    finish(500, ['error' => 'write_failed']);
}

// Occasional clean-up of months past the retention period.
if (random_int(1, 50) === 1) {
    $limit = gmdate('Y-m', strtotime('-' . RETENTION_MONTHS . ' months'));
    foreach (glob($dir . '/consents-*.jsonl') ?: [] as $old) {
        if (preg_match('/consents-(\d{4}-\d{2})\.jsonl$/', $old, $m) && $m[1] < $limit) {
            @unlink($old);
        }
    }
}

finish(204);
