<?php
require __DIR__ . '/../api/_bootstrap.php';
require __DIR__ . '/../api/commerce-import.php';
$catalogPath = $argv[1] ?? 'C:/Users/Aidos/Desktop/import.xml';
$offersPath = $argv[2] ?? 'C:/Users/Aidos/Desktop/offers.xml';
$result = commerce_parse(file_get_contents($catalogPath), file_get_contents($offersPath));
if (count($result['products']) !== 1268) throw new Exception('Product count');
foreach ($result['products'] as $product) {
    if (count($product['metadata']['warehouseStocks']) !== 2) throw new Exception('Warehouses');
    if (preg_match('/ЦенаЗаЕдиницу|ИдТипаЦены|Валюта/u', json_encode($product, JSON_UNESCAPED_UNICODE))) throw new Exception('Price leak');
}
try { commerce_xml('<!DOCTYPE test><test/>'); throw new Exception('DTD accepted'); } catch (ApiError $expected) {}
echo 'PASS: 1268 products, warehouse balances, price exclusion, DTD rejection; categories: ' . count($result['categories']) . PHP_EOL;
