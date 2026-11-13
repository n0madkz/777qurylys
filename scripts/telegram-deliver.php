<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__) . '/api/_bootstrap.php';
require dirname(__DIR__) . '/api/telegram.php';
try { echo 'Delivered messages: ' . telegram_drain_queue(20) . PHP_EOL; }
catch (Throwable $error) { fwrite(STDERR, "Telegram delivery pending; check bot configuration and connectivity.\n"); exit(1); }
