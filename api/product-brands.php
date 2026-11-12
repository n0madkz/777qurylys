<?php
declare(strict_types=1);

// Match explicit brand names only; model codes (CE33, SDS, etc.) are not brands.
function product_brand_from_name(string $name): string {
    $brands = [
        'Ceresit' => ['ceresit', 'сeresit', 'церезит', 'цересит'],
        'Rollingdog' => ['rollingdog'], 'IVT' => ['ivt'], 'DENIZ' => ['deniz'],
        'HOWARD' => ['howard'], 'Letenant' => ['letenant'], 'Matrix' => ['matrix', 'матрица'],
        'ExProfil' => ['exprofil'], 'OKYANUS' => ['okyanus'], 'TULEX' => ['tulex'],
        'XtechPert' => ['xtechpert'], 'Jakko' => ['jakko'], 'Denzel' => ['denzel'],
        'AKFIX' => ['akfix'], 'Metylan' => ['metylan', 'метилан'], 'PROSVET' => ['prosvet'],
        'EKF' => ['ekf'], 'RODEX' => ['rodex'], 'Klingspor' => ['klingspor'],
        'Hardex' => ['hardex'], 'Remospace' => ['remospace'], 'TYTAN' => ['tytan'],
        'BOLIAN' => ['bolian'], 'Knauf' => ['knauf', 'кнауф'], 'Soudal' => ['soudal'],
        'Lider Prof' => ['lider prof'], 'Paragon' => ['paragon'], 'Maxmum' => ['maxmum'],
        'Xfinepert' => ['xfinepert'], 'Platus' => ['platus'], 'Технорез' => ['технорез'],
        'ИЭК' => ['иэк', 'iek'], 'ЧАЗ' => ['чаз'], 'Ракета' => ['ракета'],
        // These names also occur after another explicit product brand in the export.
        'Эрадо' => ['эрадо']
    ];
    foreach ($brands as $brand => $aliases) foreach ($aliases as $alias) {
        if (preg_match('/(?<![\p{L}])' . preg_quote($alias, '/') . '(?![\p{L}])/iu', $name)) return $brand;
    }
    return '';
}
