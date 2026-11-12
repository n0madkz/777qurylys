<?php
declare(strict_types=1);

function news_path(): string {
    return config_value('NEWS_DATA_PATH') ?: dirname(__DIR__, 2) . '/.777-news.json';
}
function news_read(): array {
    $path = news_path();
    if (!is_file($path)) return [];
    $handle = fopen($path, 'r');
    if (!$handle || !flock($handle, LOCK_SH)) throw new ApiError('Не удалось прочитать публикации', 503);
    try { $data = json_decode(stream_get_contents($handle), true, 512, JSON_THROW_ON_ERROR); }
    finally { flock($handle, LOCK_UN); fclose($handle); }
    return is_array($data) ? $data : [];
}
function news_public(array $posts): array {
    $posts = array_values(array_filter($posts, fn($post) => !empty($post['published']) && strtotime($post['date']) <= time()));
    usort($posts, fn($a, $b) => strcmp($b['date'], $a['date']));
    return $posts;
}
function news_save(array $body): array {
    $title = text_value($body['title'] ?? '', 180);
    $content = text_value($body['body'] ?? '', 40000);
    if ($title === '' || $content === '') throw new ApiError('Заполните заголовок и текст', 400);
    $id = (string)($body['id'] ?? '');
    if ($id !== '' && !preg_match('/^[a-f0-9]{24}$/D', $id)) throw new ApiError('Некорректный ID публикации', 400);
    $image = text_value($body['image'] ?? '', 2200000);
    $image = internal_storage_path($image, 'product-images');
    if ($image !== '' && !str_starts_with($image, 'data:image/') && !preg_match('#^(https://|assets/)#', $image) && !storage_path_valid($image)) throw new ApiError('Некорректная обложка', 400);
    $id = $id ?: bin2hex(random_bytes(12));
    $image = persist_image_source(internal_storage_path($image, 'product-images'), 'product-images', 'news/' . $id);
    $post = ['id'=>$id, 'title'=>$title, 'summary'=>text_value($body['summary'] ?? '', 450),
        'body'=>$content, 'image'=>$image, 'kind'=>($body['kind'] ?? '') === 'tips' ? 'tips' : 'news',
        'published'=>bool_value($body['published'] ?? false), 'date'=>gmdate('c')];
    $path = news_path();
    $handle = @fopen($path, 'c+');
    if (!$handle || !flock($handle, LOCK_EX)) throw new ApiError('Нет доступа к файлу новостей. Проверьте права NEWS_DATA_PATH в Plesk.', 503);
    try {
        $text = stream_get_contents($handle);
        $posts = $text === '' ? [] : json_decode($text, true, 512, JSON_THROW_ON_ERROR);
        $index = array_search($id, array_column($posts, 'id'), true);
        $old = $index === false ? null : $posts[$index];
        if ($old && ($body['version'] ?? '') !== ($old['version'] ?? '')) throw new ApiError('Публикация изменилась в другой вкладке. Обновите список.', 409);
        if (!$old && count($posts) >= 1000) throw new ApiError('Достигнут лимит 1000 публикаций', 400);
        // Keep publication time stable while editing. Drafts receive a new date on publish.
        if ($old && !empty($old['published'])) $post['date'] = $old['date'];
        $post['version'] = bin2hex(random_bytes(12));
        if ($index === false) $posts[] = $post; else $posts[$index] = $post;
        $encoded = json_encode($posts, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        rewind($handle);
        if (fwrite($handle, $encoded) !== strlen($encoded) || !ftruncate($handle, strlen($encoded))) throw new ApiError('Не удалось сохранить публикацию', 503);
        fflush($handle); @chmod($path, 0600);
    } finally { flock($handle, LOCK_UN); fclose($handle); }
    return ['ok'=>true, 'post'=>$post];
}
function news_client(array $post): array {
    $post['image'] = storage_source((string)($post['image'] ?? ''), 'product-images');
    return $post;
}
