<?php
declare(strict_types=1);
$queue = sys_get_temp_dir() . '/777-telegram-test-' . bin2hex(random_bytes(6));
function config_value(string $key): string { global $queue; return $key === 'TELEGRAM_QUEUE_PATH' ? $queue : ''; }
require dirname(__DIR__) . '/api/telegram.php';
function check(bool $ok, string $message): void { if (!$ok) throw new RuntimeException($message); }
try {
    $request=['id'=>'request-123','name'=>'Клиент <тест>','phone'=>'+77001234567','description'=>str_repeat('😀',5000)];
    $messages=telegram_request_messages($request,[['product_name'=>'Дрель','quantity'=>2]],['смета.pdf']);
    check(count($messages)>1,'Long requests must split');
    foreach($messages as $message) { preg_match_all('/./us',$message,$chars); check(count($chars[0])<=1800,'Chunk too long'); }
    check(str_contains(implode('',$messages),'Дрель — 2 шт.'),'Missing item');
    telegram_enqueue_request($request,[],[]);
    telegram_enqueue_request($request,[],[]);
    check(count(glob($queue.'/*.json'))===1,'Duplicate queue entry');
    check(telegram_drain_queue()===0,'Disabled bot must not discard queue');
    try { telegram_drain_queue(1,function(){throw new RuntimeException('Offline');}); } catch(RuntimeException $e) {}
    check(count(glob($queue.'/*.json'))===1,'Failed delivery must stay queued');
    $sent=[];
    telegram_drain_queue(1,function($text)use(&$sent){$sent[]=$text;});
    check(count($sent)===1,'First delivery missing');
    telegram_drain_queue(20,function($text)use(&$sent){$sent[]=$text;});
    check(count($sent)===count(telegram_request_messages($request,[],[])),'Retry must resume after successful chunk');
    check(count(glob($queue.'/*.json'))===0,'Delivered queue entry retained');
    check(telegram_drain_queue(20,function(){throw new RuntimeException('Duplicate');})===0,'Repeated drain duplicated delivery');
    $request['id']='request-files'; $request['description']='Файлы';
    $documents=[['storage_path'=>'requests/request-files/a.pdf','original_name'=>'смета.pdf','mime_type'=>'application/pdf'],['storage_path'=>'requests/request-files/b.xlsx','original_name'=>'список.xlsx','mime_type'=>'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']];
    telegram_enqueue_request($request,[],$documents);
    $textCount=0;$documentCount=0;
    try {
        telegram_drain_queue(20,function()use(&$textCount){$textCount++;},function($document,$id)use(&$documentCount){
            check($id==='request-files','Wrong attachment request');
            if($documentCount===1)throw new RuntimeException('File upload interrupted');
            check($document['original_name']==='смета.pdf','Original filename lost');$documentCount++;
        });
    } catch(RuntimeException $error) { check($error->getMessage()==='File upload interrupted','Unexpected attachment failure'); }
    check($textCount===1 && $documentCount===1,'Text must precede files');
    telegram_drain_queue(20,function(){throw new RuntimeException('Repeated text');},function($document)use(&$documentCount){check($document['original_name']==='список.xlsx','Must resume at second file');$documentCount++;});
    check($documentCount===2 && count(glob($queue.'/*.json'))===0,'Attachment retry/cleanup failed');
    echo "Telegram formatting, queue, attachment order, failure, resume and deduplication checks passed.\n";
} finally {
    foreach(glob($queue.'/*')?:[] as $path)unlink($path);
    if(is_file($queue.'/.lock'))unlink($queue.'/.lock');
    if(is_dir($queue))rmdir($queue);
}
