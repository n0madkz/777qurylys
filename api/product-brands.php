<?php
declare(strict_types=1);

// Match explicit brand names only; model codes (CE33, SDS, etc.) are not brands.
function product_brand_from_name(string $name): string {
    $brands = [
        'Ремоколор' => ['ремоколор','remocolor','ремо колор'],
        'Ultra Lines' => ['ultra lines'], 'STATUS' => ['status'],
        'Alina Paint' => ['alina paint'], 'TEKLED' => ['tekled'],
        'ARTECO' => ['arteco'], 'Marshall' => ['marshall','маршалл'],
        'Remalux' => ['remalux'], 'Marseille' => ['marseille'],
        'Farbitex' => ['farbitex','fabritex'], 'Dali' => ['dali','дали'],
        'Dekoral' => ['dekoral'], 'DARMIX' => ['darmix'],
        'Fawori' => ['fawori'], 'GNS' => ['gns'],
        'Shijing' => ['shijing'], 'Glanzepol' => ['glanzepol'],
        'ART DEC' => ['art dec'], 'Сибртех' => ['сибртех','sibrtech'],
        'Старатели' => ['старатели'], 'Ресанта' => ['ресанта','resanta'],
        'DeWalt' => ['dewalt'], 'Bosch' => ['bosch','бош'],
        'Makita' => ['makita','макита'], 'INGCO' => ['ingco'],
        'KENDO' => ['kendo'], 'Dulux' => ['dulux'],
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

function product_brand_is_empty(mixed $value): bool {
    return in_array(trim((string)$value),['','-','—'],true);
}

function product_fill_brands(int $offset): array {
    $offset=max(0,$offset);$size=50;
    $rows=supabase_json('GET',rest_path('products','?select=id,name,brand&order=id.asc&offset='.$offset.'&limit='.$size));
    $groups=[];$unknown=0;$existing=0;
    foreach($rows as $row){
        if(!product_brand_is_empty($row['brand']??'')){$existing++;continue;}
        $brand=product_brand_from_name((string)$row['name']);
        if($brand===''){$unknown++;continue;}
        $groups[$brand][]=(string)$row['id'];
    }
    $updated=0;
    foreach($groups as $brand=>$ids){
        $quoted=array_map(fn($id)=>'"'.str_replace(['\\','"'],['\\\\','\\"'],$id).'"',$ids);
        $result=supabase_json('PATCH',rest_path('products','?id=in.'.rawurlencode('('.implode(',',$quoted).')').'&or=(brand.is.null,brand.eq.,brand.eq.-,brand.eq.'.rawurlencode('—').')&select=id'),['brand'=>$brand],['Prefer: return=representation']);
        $updated+=is_array($result)?count($result):0;
    }
    return ['done'=>count($rows)<$size,'next'=>$offset+count($rows),'updated'=>$updated,'unknown'=>$unknown,'existing'=>$existing];
}
