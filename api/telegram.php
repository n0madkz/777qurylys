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
    if (!$handle) return; // Same request is queued only once.
    try {
        $data = json_encode(['messages'=>telegram_request_messages($request,$items,$files),'next'=>0], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        if (fwrite($handle, $data) !== strlen($data)) throw new RuntimeException('Telegram queue write failed');
    } finally { fclose($handle); }
    @chmod($path, 0600);
}

function telegram_send_message(string $text): void {
    $token = config_value('TELEGRAM_BOT_TOKEN');
    $chat = config_value('TELEGRAM_CHAT_ID');
    if (!preg_match('/^\d+:[A-Za-z0-9_-]+$/', $token) || !preg_match('/^-100\d+$/', $chat)) throw new RuntimeException('Telegram not configured');
    $context = stream_context_create(['http'=>[
        'method'=>'POST', 'timeout'=>8, 'ignore_errors'=>true,
        'header'=>"Content-Type: application/json\r\n",
        'content'=>json_encode(['chat_id'=>$chat,'text'=>$text,'protect_content'=>true,'link_preview_options'=>['is_disabled'=>true]], JSON_UNESCAPED_UNICODE)
    ]]);
    // Never log the URL: it contains the bot token.
    $result = @file_get_contents('https://api.telegram.org/bot' . $token . '/sendMessage', false, $context);
    $body = $result === false ? null : json_decode($result, true);
    if (!is_array($body) || ($body['ok'] ?? false) !== true) throw new RuntimeException('Telegram delivery failed');
}

function telegram_drain_queue(int $limit = 10, ?callable $send = null): int {
    if ($send === null && (config_value('TELEGRAM_BOT_TOKEN') === '' || config_value('TELEGRAM_CHAT_ID') === '')) return 0;
    $directory = telegram_queue_directory();
    $lock = fopen($directory . '/.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) { if ($lock) fclose($lock); return 0; }
    $sent = 0;
    try {
        foreach (glob($directory . '/*.json') ?: [] as $path) {
            $job = json_decode((string)file_get_contents($path), true);
            if (!is_array($job) || !isset($job['messages'], $job['next'])) continue;
            while ($job['next'] < count($job['messages']) && $sent < $limit) {
                ($send ?? 'telegram_send_message')($job['messages'][$job['next']]);
                $job['next']++; $sent++;
                file_put_contents($path, json_encode($job, JSON_UNESCAPED_UNICODE), LOCK_EX);
            }
            if ($job['next'] >= count($job['messages'])) unlink($path);
            if ($sent >= $limit) break;
        }
    } finally { flock($lock, LOCK_UN); fclose($lock); }
    return $sent;
}
