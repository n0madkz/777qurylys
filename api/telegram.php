<?php
declare(strict_types=1);

function telegram_queue_directory(): string {
    $path = config_value('TELEGRAM_QUEUE_PATH') ?: dirname(__DIR__, 2) . '/.777-telegram-queue';
    if (!is_dir($path) && !@mkdir($path, 0700, true) && !is_dir($path)) throw new RuntimeException('Telegram queue unavailable');
    return $path;
}

function telegram_request_messages(array $request, array $items, array $files): array {
    $lines = ['Новая заявка №' . $request['id'], 'Имя: ' . $request['name'], 'Телефон: ' . $request['phone']];
    foreach (['email'=>'Email', 'company_name'=>'Компания', 'description'=>'Комментарий'] as $key=>$label) {
        if (!empty($request[$key])) $lines[] = $label . ': ' . $request[$key];
    }
    if ($items) $lines[] = "\nТовары:";
    foreach ($items as $i=>$item) $lines[] = ($i+1) . '. ' . $item['product_name'] . ' — ' . $item['quantity'] . ' шт.';
    if ($files) $lines[] = "\nПрикреплены файлы: " . implode(', ', $files);
    $lines[] = "\nЗаявка и файлы в админке: https://777qurylys.kz/admin.html";
    // Also fits the limit when characters occupy two UTF-16 code units (emoji).
    $text = implode("\n", $lines);
    preg_match_all('/.{1,1800}/us', $text, $matches);
    return $matches[0];
}

function telegram_enqueue_request(array $request, array $items, array $files): void {
    $id = preg_replace('/[^a-zA-Z0-9-]/', '', (string)$request['id']);
    $path = telegram_queue_directory() . '/' . $id . '.json';
    $handle = @fopen($path, 'x');
    if (!$handle) {
        if (is_file($path)) return;
        throw new RuntimeException('Нет прав на запись очереди Telegram');
    }
    try {
        $names = array_map(fn($file)=>is_array($file) ? $file['original_name'] : $file,$files);
        $documents = array_values(array_filter($files,'is_array'));
        $data = json_encode(['messages'=>telegram_request_messages($request,$items,$names),'next'=>0,'documents'=>$documents,'next_document'=>0,'request_id'=>$id], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        if (fwrite($handle, $data) !== strlen($data)) throw new RuntimeException('Telegram queue write failed');
    } finally { fclose($handle); }
    @chmod($path, 0600);
}

function telegram_send_message(string $text): void {
    telegram_api('sendMessage', ['chat_id'=>config_value('TELEGRAM_CHAT_ID'),'text'=>$text,'protect_content'=>true,'link_preview_options'=>['is_disabled'=>true]]);
}

function telegram_api(string $method, array $payload = [], bool $multipart = false): array {
    $token = config_value('TELEGRAM_BOT_TOKEN');
    $chat = config_value('TELEGRAM_CHAT_ID');
    if (!preg_match('/^\d+:[A-Za-z0-9_-]+$/', $token)) throw new RuntimeException('TELEGRAM_BOT_TOKEN не задан или имеет неверный формат. Проверьте .777qurylys.env выше httpdocs.');
    if (!preg_match('/^-100\d+$/', $chat)) throw new RuntimeException('TELEGRAM_CHAT_ID не задан или имеет неверный формат: нужен числовой ID -100…');
    if ($multipart && !function_exists('curl_init')) throw new RuntimeException('Для отправки файлов включите расширение PHP cURL в Plesk.');
    $context = stream_context_create(['http'=>[
        'method'=>'POST', 'timeout'=>8, 'ignore_errors'=>true,
        'header'=>"Content-Type: application/json\r\n",
        'content'=>json_encode($payload, JSON_UNESCAPED_UNICODE)
    ]]);
    // Never log the URL: it contains the bot token.
    $url = 'https://api.telegram.org/bot' . $token . '/' . $method;
    if (function_exists('curl_init')) {
        $curl = curl_init($url);
        curl_setopt_array($curl,[CURLOPT_POST=>true,CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>5,CURLOPT_TIMEOUT=>$multipart ? 60 : 8,CURLOPT_HTTPHEADER=>$multipart ? [] : ['Content-Type: application/json'],CURLOPT_POSTFIELDS=>$multipart ? $payload : json_encode($payload,JSON_UNESCAPED_UNICODE)]);
        $result = curl_exec($curl);
        curl_close($curl);
    } else $result = @file_get_contents($url, false, $context);
    $body = $result === false ? null : json_decode($result, true);
    if (!is_array($body)) throw new RuntimeException('Сервер не получил ответ Telegram. Проверьте исходящий HTTPS и PHP cURL.');
    if (($body['ok'] ?? false) !== true) {
        $description = str_replace($token,'[скрыто]',(string)($body['description'] ?? 'Ошибка Telegram'));
        throw new RuntimeException('Telegram: ' . substr($description,0,300));
    }
    return $body['result'] ?? [];
}

function telegram_send_document(array $document, string $requestId): void {
    if (!class_exists('CURLFile')) throw new RuntimeException('Для отправки файлов включите расширение PHP cURL в Plesk.');
    $path = (string)($document['storage_path'] ?? '');
    if (!storage_path_valid($path) || !str_starts_with($path,'requests/' . $requestId . '/')) throw new RuntimeException('Некорректный путь документа заявки.');
    $response = supabase_http('GET','storage/v1/object/request-documents/' . str_replace('%2F','/',rawurlencode($path)));
    if ($response['status'] < 200 || $response['status'] >= 300) throw new RuntimeException('Не удалось скачать документ заявки из хранилища.');
    $temporary = tempnam(telegram_queue_directory(),'upload-');
    if ($temporary === false) throw new RuntimeException('Не удалось подготовить документ Telegram.');
    @chmod($temporary,0600);
    try {
        if (file_put_contents($temporary,$response['body']) !== strlen($response['body'])) throw new RuntimeException('Ошибка записи документа Telegram.');
        telegram_api('sendDocument',[
            'chat_id'=>config_value('TELEGRAM_CHAT_ID'),'protect_content'=>'true',
            'caption'=>'Документ к заявке №' . $requestId,
            'document'=>new CURLFile($temporary,(string)($document['mime_type'] ?? 'application/octet-stream'),basename((string)$document['original_name']))
        ],true);
    } finally { unlink($temporary); }
}

function telegram_admin(string $method): array {
    if ($method !== 'POST') throw new ApiError('Method not allowed',405);
    $body = request_json();
    try {
        $bot = telegram_api('getMe');
        $chat = telegram_api('getChat',['chat_id'=>config_value('TELEGRAM_CHAT_ID')]);
        $member = telegram_api('getChatMember',['chat_id'=>config_value('TELEGRAM_CHAT_ID'),'user_id'=>$bot['id']]);
        if (($member['status'] ?? '') !== 'administrator' || empty($member['can_post_messages'])) throw new RuntimeException('Боту нужно право публикации сообщений в канале.');
        $directory = telegram_queue_directory();
        if (!is_writable($directory)) throw new RuntimeException('PHP не может записывать в папку очереди Telegram.');
        if (($body['action'] ?? '') === 'retry') $sent = telegram_drain_queue(20);
        $pending = count(glob($directory . '/*.json') ?: []);
        return ['ok'=>true,'message'=>'Бот @' . ($bot['username'] ?? '') . ', канал «' . ($chat['title'] ?? '') . '». Ожидают отправки: ' . $pending . (isset($sent) ? '. Отправлено сообщений: ' . $sent : '')];
    } catch (Throwable $error) { throw new ApiError($error->getMessage(),502); }
}

function telegram_drain_queue(int $limit = 10, ?callable $send = null, ?callable $sendDocument = null): int {
    if ($send === null && (config_value('TELEGRAM_BOT_TOKEN') === '' || config_value('TELEGRAM_CHAT_ID') === '')) return 0;
    $directory = telegram_queue_directory();
    $lock = fopen($directory . '/.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) { if ($lock) fclose($lock); return 0; }
    $sent = 0;
    try {
        foreach (glob($directory . '/*.json') ?: [] as $path) {
            $job = json_decode((string)file_get_contents($path), true);
            if (!is_array($job) || !isset($job['messages'], $job['next'])) continue;
            $requestId = $job['request_id'] ?? basename($path,'.json');
            if (!isset($job['documents'])) {
                $job['documents'] = supabase_json('GET',rest_path('request_documents','?request_id=eq.'.rawurlencode($requestId).'&select=storage_path,original_name,mime_type'));
            }
            $job['next_document'] = $job['next_document'] ?? 0;
            while ($job['next'] < count($job['messages']) && $sent < $limit) {
                ($send ?? 'telegram_send_message')($job['messages'][$job['next']]);
                $job['next']++; $sent++;
                file_put_contents($path, json_encode($job, JSON_UNESCAPED_UNICODE), LOCK_EX);
            }
            while ($job['next'] >= count($job['messages']) && $job['next_document'] < count($job['documents']) && $sent < $limit) {
                ($sendDocument ?? 'telegram_send_document')($job['documents'][$job['next_document']],$requestId);
                $job['next_document']++; $sent++;
                file_put_contents($path,json_encode($job,JSON_UNESCAPED_UNICODE),LOCK_EX);
            }
            if ($job['next'] >= count($job['messages']) && $job['next_document'] >= count($job['documents'])) unlink($path);
            if ($sent >= $limit) break;
        }
    } finally { flock($lock, LOCK_UN); fclose($lock); }
    return $sent;
}
