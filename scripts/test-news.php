<?php
require __DIR__ . '/../api/_bootstrap.php';
require __DIR__ . '/../api/news.php';
function internal_storage_path(string $source, string $bucket): string { return $source; }
$path = $argv[1] ?? '';
if ($path === '' || is_file($path)) throw new Exception('Provide a new temporary test filename');
putenv('NEWS_DATA_PATH=' . $path);
try {
    $draft = news_save(['title'=>'Черновик', 'body'=>'Не публиковать', 'published'=>false])['post'];
    if (news_public(news_read())) throw new Exception('Draft leaked');
    $published = news_save(array_merge($draft, ['published'=>true, 'kind'=>'tips']))['post'];
    if (count(news_public(news_read())) !== 1) throw new Exception('Published post missing');
    $edited = news_save(array_merge($published, ['title'=>'Изменённый заголовок']))['post'];
    if ($edited['date'] !== $published['date']) throw new Exception('Date changed during edit');
    try { news_save(array_merge($published,['body'=>'Stale edit'])); throw new Exception('Stale update accepted'); }
    catch (ApiError $error) { if ($error->httpStatus !== 409) throw $error; }
    news_save(array_merge($edited,['published'=>false]));
    if (news_public(news_read())) throw new Exception('Unpublish failed');
    $future=array_merge($edited,['published'=>true,'date'=>gmdate('c',time()+86400)]);
    if(news_public([$future])) throw new Exception('Future post leaked');
    $mixed=news_save(['title'=>'Статья с иллюстрациями','blocks'=>[
        ['type'=>'text','text'=>'Первый текст'],
        ['type'=>'image','src'=>'https://example.com/one.jpg','alt'=>'Первая картинка','caption'=>'Подпись 1'],
        ['type'=>'text','text'=>'Второй текст'],
        ['type'=>'image','src'=>'https://example.com/two.jpg','caption'=>'Подпись 2']
    ]])['post'];
    if(array_column($mixed['blocks'],'type')!==['text','image','text','image'])throw new Exception('Block order changed');
    if($mixed['body']!=="Первый текст\n\nВторой текст")throw new Exception('Legacy plain text');
    $client=news_client($mixed);
    if($client['blocks'][1]['caption']!=='Подпись 1')throw new Exception('Caption lost');
    try { news_blocks(['blocks'=>[['type'=>'image','src'=>'javascript:alert(1)']]]);throw new Exception('Unsafe image accepted'); }
    catch(ApiError $expected){}
    $reordered=$mixed['blocks'];$reordered=array_reverse($reordered);
    $saved=news_save(array_merge($mixed,['blocks'=>$reordered]))['post'];
    if($saved['blocks'][0]['src']!=='https://example.com/two.jpg')throw new Exception('Reorder failed');
    echo "PASS: draft privacy, publish, edit, stale-write protection, unpublish and dates\n";
    echo "PASS: interleaved text/image blocks, captions, reorder, legacy text and URL validation\n";
} finally { if(is_file($path))unlink($path); }
