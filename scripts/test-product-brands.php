<?php
require __DIR__ . '/../api/product-brands.php';
$cases = [
    'ключ трубный тип L 90Градус Ремоколор'=>'Ремоколор',
    'Кисть RemoColor professional'=>'Ремоколор',
    'Эмаль ПФ-115 STATUS желтая 0,8кг'=>'STATUS',
    'Эмаль ПФ-115 "Ultra lines" синяя 1,8кг'=>'Ultra Lines',
    'Розетка NIZMO, TEKLED ELECTRIC'=>'TEKLED',
    'BRITE Выключатель 10А ИЭК'=>'ИЭК',
    'Tintaly Концентрат Alina Paint'=>'Alina Paint',
    'Набор без бренда SDS CrV'=>'',
    'Ceresit ce 33 comfort Антрацит 2кг' => 'Ceresit',
    'Сeresit CE 33 Comfort Жасмин 2кг' => 'Ceresit',
    'Хомут нейлоновый 100шт EKF' => 'EKF',
    'Отвертка 5*150IVT' => 'IVT',
    'Шпатель Xtechpert синий Эрадо' => 'XtechPert',
    'Гвоздь строительный 3,0*80 5кг' => '',
    'CE33 Comfort Натура 2кг' => '',
    'Подвес прямой 05мм 10шт' => '',
    'Затирочная смесь LITOCHROM 1-6 EVO 2кг' => '',
    'SDS MAX сверло' => ''
];
foreach ($cases as $name => $expected) if (product_brand_from_name($name) !== $expected) throw new Exception('Brand mismatch: ' . $name);
if (isset($argv[1])) {
    $root = simplexml_load_file($argv[1]); $count = 0;
    foreach ($root->xpath('//*[local-name()="Товар"]/*[local-name()="Наименование"]') as $name) if (product_brand_from_name((string)$name) !== '') $count++;
    echo 'Explicit brands found: ' . $count . PHP_EOL;
}
echo "PASS: explicit brands, mixed alphabet, attached digits, unbranded products and model-code exclusions\n";
