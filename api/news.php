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
    $blocks = news_blocks($body);
    $content = implode("\n\n", array_column(array_filter($blocks, fn($block) => $block['type'] === 'text'), 'text'));
    if ($title === '' || !$blocks) throw new ApiError('Заполните заголовок и добавьте текст или изображение', 400);
    $id = (string)($body['id'] ?? '');
    if ($id !== '' && !preg_match('/^[a-f0-9]{24}$/D', $id)) throw new ApiError('Некорректный ID публикации', 400);
    $image = text_value($body['image'] ?? '', 2200000);
    $image = internal_storage_path($image, 'product-images');
    if ($image !== '' && !str_starts_with($image, 'data:image/') && !preg_match('#^(https://|assets/)#', $image) && !storage_path_valid($image)) throw new ApiError('Некорректная обложка', 400);
    $id = $id ?: bin2hex(random_bytes(12));
    $image = persist_image_source(internal_storage_path($image, 'product-images'), 'product-images', 'news/' . $id);
    $post = ['id'=>$id, 'title'=>$title, 'summary'=>text_value($body['summary'] ?? '', 450),
        'body'=>$content, 'blocks'=>$blocks, 'image'=>$image, 'kind'=>($body['kind'] ?? '') === 'tips' ? 'tips' : 'news',
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
    if(isset($post['blocks']))foreach($post['blocks'] as &$block)if($block['type']==='image')$block['src']=storage_source($block['src'],'product-images');
    return $post;
}

function news_blocks(array $body): array {
    $input = $body['blocks'] ?? [['type'=>'text','text'=>(string)($body['body'] ?? '')]];
    if(!is_array($input) || count($input)>60)throw new ApiError('В публикации может быть до 60 блоков',400);
    $blocks=[];$length=0;
    foreach($input as $block){
        if(!is_array($block))throw new ApiError('Некорректный блок',400);
        if(($block['type']??'')==='text'){
            $text=text_value($block['text']??'',40000);$length+=strlen($text);
            if($text!=='')$blocks[]=['type'=>'text','text'=>$text];
        }elseif(($block['type']??'')==='image'){
            $src=internal_storage_path(text_value($block['src']??'',3000),'product-images');
            if($src==='')continue;
            if(str_starts_with($src,'data:') || (!preg_match('#^(https://|assets/)#',$src)&&!storage_path_valid($src)))throw new ApiError('Загрузите изображение или укажите HTTPS-ссылку',400);
            $blocks[]=['type'=>'image','src'=>$src,'alt'=>text_value($block['alt']??'',300),'caption'=>text_value($block['caption']??'',500)];
        }else throw new ApiError('Неизвестный тип блока',400);
    }
    if($length>160000)throw new ApiError('Слишком много текста в публикации',400);
    return $blocks;
}

function news_upload_image(array $body): array {
    $source=(string)($body['image']??'');
    if(!str_starts_with($source,'data:image/'))throw new ApiError('Нужно загруженное изображение',400);
    $path=persist_image_source($source,'product-images','news/inline-'.bin2hex(random_bytes(12)));
    return ['ok'=>true,'image'=>storage_source($path,'product-images')];
}
