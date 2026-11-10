<?php
declare(strict_types=1);

function photo_public_url(string $url): bool {
    $parts = parse_url($url);
    return is_array($parts) && ($parts['scheme'] ?? '') === 'https' && !empty($parts['host'])
        && !isset($parts['user']) && !isset($parts['pass'])
        && (!isset($parts['port']) || $parts['port'] === 443)
        && !preg_match('/[\x00-\x20\x7f]/', $url);
}
function photo_signature(string $url, int $expires): string {
    return hash_hmac('sha256', $expires . "\n" . $url, supabase_key());
}
function photo_search(string $query): array {
    $key = config_value('BRAVE_SEARCH_API_KEY');
    if ($key === '') throw new ApiError('Поиск внутри админки пока не подключён. Можно открыть поиск в интернете ниже.', 503);
    $query = text_value($query, 350);
    if ($query === '') throw new ApiError('Введите название товара', 400);
    if (count(preg_split('/\s+/u', $query) ?: []) > 50) throw new ApiError('Сократите запрос до 50 слов', 400);
    $context = stream_context_create(['http' => ['method' => 'GET', 'timeout' => 15, 'ignore_errors' => true,
        'header' => "Accept: application/json\r\nX-Subscription-Token: " . $key]]);
    $body = @file_get_contents('https://api.search.brave.com/res/v1/images/search?' . http_build_query([
        'q' => $query, 'count' => 12, 'safesearch' => 'strict', 'search_lang' => 'ru', 'spellcheck' => 'false'
    ]), false, $context);
    $status = response_status($http_response_header ?? []);
    if ($status === 429) throw new ApiError('Достигнут лимит поиска. Попробуйте позже.', 429);
    if ($status !== 200 || $body === false) throw new ApiError('Сервис поиска недоступен. Проверьте подключение и тариф API.', 502);
    $data = json_decode($body, true);
    if (!is_array($data) || !isset($data['results']) || !is_array($data['results'])) throw new ApiError('Некорректный ответ поиска', 502);
    $results = []; $expires = time() + 900;
    foreach (array_slice($data['results'], 0, 12) as $item) {
        $url = (string)($item['properties']['url'] ?? '');
        $page = (string)($item['url'] ?? '');
        $thumbnail = (string)($item['thumbnail']['src'] ?? '');
        if (!photo_public_url($url) || !photo_public_url($page) || !photo_public_url($thumbnail)) continue;
        $results[] = ['url' => $url, 'page' => $page, 'thumbnail' => $thumbnail,
            'title' => text_value($item['title'] ?? 'Фото товара', 200),
            'source' => (string)parse_url($page, PHP_URL_HOST), 'expires' => $expires,
            'signature' => photo_signature($url, $expires)];
    }
    return ['results' => $results];
}

function photo_download(array $body): never {
    $url = (string)($body['url'] ?? ''); $expires = (int)($body['expires'] ?? 0);
    if (!photo_public_url($url) || $expires < time() || $expires > time() + 900
        || !hash_equals(photo_signature($url, $expires), (string)($body['signature'] ?? ''))) {
        throw new ApiError('Результат устарел. Повторите поиск.', 400);
    }
    if (!function_exists('curl_init')) throw new ApiError('На сервере требуется PHP cURL', 503);
    $host = (string)parse_url($url, PHP_URL_HOST);
    // Resolve first, reject private/reserved addresses, then pin cURL to that IP.
    // Redirects are disabled, preventing downloads from reaching internal services.
    if (filter_var($host, FILTER_VALIDATE_IP)) $addresses = [$host];
    else $addresses = gethostbynamel($host) ?: [];
    if (!$addresses) throw new ApiError('Не удалось найти сервер изображения', 422);
    foreach ($addresses as $address) if (!filter_var($address, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
        throw new ApiError('Адрес изображения недоступен для загрузки', 422);
    }
    $bytes = ''; $tooLarge = false; $curl = curl_init($url);
    curl_setopt_array($curl, [CURLOPT_FOLLOWLOCATION => false, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 20,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS, CURLOPT_PROXY => '',
        CURLOPT_RESOLVE => [$host . ':443:' . $addresses[0]],
        CURLOPT_USERAGENT => '777qurylys product photo importer',
        CURLOPT_WRITEFUNCTION => function($handle, string $chunk) use (&$bytes, &$tooLarge): int {
            if (strlen($bytes) + strlen($chunk) > 10 * 1024 * 1024) { $tooLarge = true; return 0; }
            $bytes .= $chunk; return strlen($chunk);
        }]);
    $ok = curl_exec($curl); $status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE); curl_close($curl);
    if ($tooLarge) throw new ApiError('Фото больше 10 МБ. Выберите другое.', 422);
    if ($ok === false || $status !== 200) throw new ApiError('Источник не разрешил загрузку. Выберите другое фото или загрузите файл вручную.', 422);
    $info = @getimagesizefromstring($bytes);
    if (!$info || !in_array($info['mime'] ?? '', ['image/jpeg', 'image/png', 'image/webp'], true)
        || $info[0] * $info[1] > 40000000) throw new ApiError('Нужен JPG, PNG или WebP до 40 мегапикселей', 422);
    header('Content-Type: ' . $info['mime']); header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff'); echo $bytes; exit;
}
