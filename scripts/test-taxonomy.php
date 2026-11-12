<?php
require __DIR__.'/../api/product-taxonomy.php';
$cases=[
 'Пистолет для монтажной пены'=>'shop-hand-guns',
 'Клей плиточный 25кг'=>'shop-materials-drymix',
 'Клемма 30А'=>'shop-electrical-junction',
 'Ceresit CE 33 Comfort 2кг'=>'shop-materials-drymix',
 'Смеситель DAIVA'=>'shop-plumbing-faucets',
 'Сифон для мойки'=>'shop-plumbing-siphons',
 'Алмазная коронка 25мм'=>'shop-accessories-drillbits',
 'Саморез 3,5*30'=>'shop-fasteners-screws',
 'Уровень алюминиевый'=>'shop-hand-measuring',
 'Присоска с помпой'=>'shop-hand-tiletools'
];
foreach($cases as $name=>$id)if(product_taxonomy_match($name)['id']!==$id)throw new Exception('Wrong category: '.$name);
$ids=array_column(product_taxonomy_categories(),'id');
if(count($ids)!==count(array_unique($ids)))throw new Exception('Duplicate categories');
echo "PASS: specific product categories and unique taxonomy IDs\n";
