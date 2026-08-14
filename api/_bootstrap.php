<?php
declare(strict_types=1);

final class ApiError extends RuntimeException {
    public int $httpStatus;

    public function __construct(string $message, int $httpStatus = 500) {
        parent::__construct($message, $httpStatus);
        $this->httpStatus = $httpStatus;
    }
}

function config_value(string $key): string {
    static $values = null;
    if ($values === null) {
        $values = [];
        foreach ([dirname(__DIR__, 2) . '/.777qurylys.env', dirname(__DIR__) . '/.777qurylys.env'] as $path) {
            if (is_readable($path)) {
                $loaded = parse_ini_file($path, false, INI_SCANNER_RAW);
                if (is_array($loaded)) $values = array_merge($values, $loaded);
            }
        }
    }
    $value = getenv($key);
    if ($value !== false && $value !== '') return trim((string)$value);
    return trim((string)($values[$key] ?? ''));
}

function app_url(): string {
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = preg_replace('/[^a-z0-9.:-]/i', '', (string)($_SERVER['HTTP_HOST'] ?? '777qurylys.kz'));
    return $scheme . '://' . $host;
}

function send_json(array $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function require_method(string $method): void {
    if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== $method) {
        throw new ApiError('Method not allowed', 405);
    }
}

function request_json(): array {
    $body = file_get_contents('php://input');
    $data = json_decode($body ?: '', true);
    if (!is_array($data)) throw new ApiError('Некорректный JSON', 400);
    return $data;
}

function text_value(mixed $value, int $limit = 3000): string {
    $text = trim((string)($value ?? ''));
    return function_exists('mb_substr') ? mb_substr($text, 0, $limit) : substr($text, 0, $limit);
}

function bool_value(mixed $value, bool $fallback = false): bool {
    if (is_bool($value)) return $value;
    if (is_numeric($value)) return (bool)$value;
    if (is_string($value)) return in_array(strtolower(trim($value)), ['1', 'true', 'yes', 'on'], true);
    return $fallback;
}

function json_value(mixed $value, array $fallback = []): array {
    return is_array($value) ? $value : $fallback;
}

/** Supabase stores translations as a JSON object; an empty PHP array would otherwise become [] instead of {}. */
function json_object_value(mixed $value): object {
    return (object)(is_array($value) ? $value : []);
}

function supabase_url(): string {
    $url = rtrim(config_value('SUPABASE_URL'), '/');
    if ($url === '') throw new ApiError('Supabase не настроен на сервере', 503);
    return $url;
}

function supabase_key(): string {
    $key = config_value('SUPABASE_SERVICE_ROLE_KEY');
    if ($key === '') throw new ApiError('Серверный ключ Supabase не настроен', 503);
    return $key;
}

function response_status(array $headers): int {
    foreach ($headers as $header) {
        if (preg_match('#^HTTP/\S+\s+(\d{3})#i', $header, $matches)) return (int)$matches[1];
    }
    return 502;
}

function header_value(array $headers, string $name): string {
    foreach ($headers as $header) {
        if (stripos($header, $name . ':') === 0) return trim(substr($header, strlen($name) + 1));
    }
    return '';
}

/** @return array{status:int,body:string,headers:array<int,string>} */
function supabase_http(string $method, string $path, ?string $payload = null, array $headers = []): array {
    $key = supabase_key();
    $requestHeaders = [
        'apikey: ' . $key,
        'Authorization: Bearer ' . $key,
        'Accept: application/json'
    ];
    foreach ($headers as $header) $requestHeaders[] = $header;
    if ($payload !== null && !array_filter($requestHeaders, fn($header) => stripos($header, 'Content-Type:') === 0)) {
        $requestHeaders[] = 'Content-Type: application/json; charset=utf-8';
    }
    $context = stream_context_create(['http' => [
        'method' => strtoupper($method),
        'header' => implode("\r\n", $requestHeaders),
        'content' => $payload ?? '',
        'ignore_errors' => true,
        'timeout' => 30
    ]]);
    $body = @file_get_contents(supabase_url() . '/' . ltrim($path, '/'), false, $context);
    $responseHeaders = $http_response_header ?? [];
    if ($body === false) $body = '';
    return ['status' => response_status($responseHeaders), 'body' => $body, 'headers' => $responseHeaders];
}

function supabase_json(string $method, string $path, mixed $payload = null, array $headers = []): mixed {
    $body = $payload === null ? null : json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $response = supabase_http($method, $path, $body, array_merge(['Content-Type: application/json; charset=utf-8'], $headers));
    if ($response['status'] < 200 || $response['status'] >= 300) {
        $error = json_decode($response['body'], true);
        $message = is_array($error) ? (string)($error['message'] ?? $error['error'] ?? $error['hint'] ?? '') : '';
        throw new ApiError($message !== '' ? $message : 'Ошибка обращения к Supabase', $response['status']);
    }
    if ($response['body'] === '') return [];
    $decoded = json_decode($response['body'], true);
    return json_last_error() === JSON_ERROR_NONE ? $decoded : [];
}

function rest_path(string $table, string $query = ''): string {
    return 'rest/v1/' . rawurlencode($table) . $query;
}

function storage_path_valid(string $path): bool {
    return $path !== '' && !str_contains($path, '..') && (bool)preg_match('#^[a-zA-Z0-9_./-]+$#', $path);
}

function storage_source(string $path, string $bucket): string {
    if ($path === '') return '';
    if (preg_match('#^(https?://|/|assets/)#i', $path)) return $path;
    return '/api/media?bucket=' . rawurlencode($bucket) . '&path=' . rawurlencode($path);
}

function storage_upload(string $bucket, string $path, string $bytes, string $mime): void {
    if (!storage_path_valid($path)) throw new ApiError('Некорректный путь к файлу', 400);
    $response = supabase_http('PUT', 'storage/v1/object/' . rawurlencode($bucket) . '/' . str_replace('%2F', '/', rawurlencode($path)), $bytes, [
        'Content-Type: ' . $mime,
        'x-upsert: true'
    ]);
    if ($response['status'] < 200 || $response['status'] >= 300) throw new ApiError('Не удалось загрузить файл в Supabase', 502);
}

function persist_image_source(string $source, string $bucket, string $prefix): string {
    if (!str_starts_with($source, 'data:image/')) return $source;
    if (!preg_match('#^data:(image/(?:jpeg|png|webp));base64,([a-z0-9+/=]+)$#i', $source, $matches)) {
        throw new ApiError('Поддерживаются только JPG, PNG и WebP изображения', 400);
    }
    $bytes = base64_decode($matches[2], true);
    if ($bytes === false || strlen($bytes) > 10 * 1024 * 1024) throw new ApiError('Размер изображения не должен превышать 10 МБ', 400);
    $extension = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'][strtolower($matches[1])] ?? 'jpg';
    $path = trim($prefix, '/') . '-' . bin2hex(random_bytes(6)) . '.' . $extension;
    storage_upload($bucket, $path, $bytes, strtolower($matches[1]));
    return $path;
}

function start_admin_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_name('qurylys_admin');
    session_set_cookie_params([
        'lifetime' => 28800,
        'path' => '/',
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'httponly' => true,
        'samesite' => 'Strict'
    ]);
    session_start();
}

function admin_required(): void {
    start_admin_session();
    if (empty($_SESSION['qurylys_admin']) || $_SESSION['qurylys_admin'] !== config_value('ADMIN_USER')) {
        throw new ApiError('Требуется вход администратора', 401);
    }
}

function request_files(): array {
    $files = $_FILES['documents'] ?? null;
    if (!is_array($files) || !isset($files['name'])) return [];
    $items = [];
    $names = is_array($files['name']) ? $files['name'] : [$files['name']];
    foreach ($names as $index => $name) {
        $items[] = [
            'name' => (string)$name,
            'type' => (string)(is_array($files['type']) ? ($files['type'][$index] ?? '') : $files['type']),
            'tmp_name' => (string)(is_array($files['tmp_name']) ? ($files['tmp_name'][$index] ?? '') : $files['tmp_name']),
            'error' => (int)(is_array($files['error']) ? ($files['error'][$index] ?? UPLOAD_ERR_NO_FILE) : $files['error']),
            'size' => (int)(is_array($files['size']) ? ($files['size'][$index] ?? 0) : $files['size'])
        ];
    }
    return array_values(array_filter($items, fn($file) => $file['error'] !== UPLOAD_ERR_NO_FILE));
}
