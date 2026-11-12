<?php
// Local transport fixture only. Never accepts requests under production PHP.
if (PHP_SAPI !== 'cli-server' || !in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true)) { http_response_code(404); exit; }
$_SERVER['HTTPS'] = 'on';
class ApiError extends RuntimeException {
    public function __construct(string $message, public int $httpStatus = 500) { parent::__construct($message); }
}
function config_value($key) { return ['ONEC_EXCHANGE_USER'=>'test_exchange','ONEC_EXCHANGE_PASSWORD'=>'local-test-password-1234567890'][$key] ?? ''; }
function require_method($method) { if ($_SERVER['REQUEST_METHOD'] !== $method) throw new ApiError('Wrong method', 405); }
function commerce_xml($xml) { if (simplexml_load_string($xml) === false) throw new ApiError('Bad XML', 400); }
function commerce_import($body, $offset, $limit) {
    commerce_xml($body['catalogXml']); commerce_xml($body['offersXml']);
    return ['next'=>min(50, $offset + $limit), 'total'=>50];
}
require __DIR__ . '/../api/exchange.php';
exchange_run();
