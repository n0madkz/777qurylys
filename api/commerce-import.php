<?php
declare(strict_types=1);

// Only explicitly selected fields cross the XML -> database boundary. Prices and
// the original XML are never persisted, returned, or logged by this importer.
function commerce_xml(string $xml): SimpleXMLElement {
    if (strlen($xml) > 20 * 1024 * 1024 || preg_match('/<!DOCTYPE|<!ENTITY/i', $xml)) {
        throw new ApiError('XML слишком большой или содержит запрещённые объявления', 400);
    }
    if (!function_exists('simplexml_load_string')) throw new ApiError('На сервере требуется PHP SimpleXML', 503);
    $previous = libxml_use_internal_errors(true);
    try {
        $root = simplexml_load_string($xml, SimpleXMLElement::class, LIBXML_NONET);
        if ($root === false || $root->getName() !== 'КоммерческаяИнформация') throw new ApiError('Некорректный CommerceML XML', 400);
        return $root;
    } finally {
        libxml_clear_errors();
        libxml_use_internal_errors($previous);
    }
}

function commerce_nodes(SimpleXMLElement $node, string $name): array {
    return $node->xpath('./*[local-name()="' . $name . '"]') ?: [];
}
function commerce_text(SimpleXMLElement $node, string $name): string {
    return trim((string)(commerce_nodes($node, $name)[0] ?? ''));
}
function commerce_number(string $value): float {
    if (!preg_match('/^-?\d+(?:\.\d+)?$/D', $value) || !is_finite((float)$value)) throw new ApiError('Некорректное количество в XML', 400);
    return (float)$value;
}

function commerce_parse(string $catalogXml, string $offersXml): array {
    $catalog = commerce_xml($catalogXml);
    $offers = commerce_xml($offersXml);
    $warehouses = [];
    foreach ($offers->xpath('//*[local-name()="Склады"]/*[local-name()="Склад"]') ?: [] as $warehouse) {
        $warehouses[commerce_text($warehouse, 'Ид')] = commerce_text($warehouse, 'Наименование');
    }
    $stocks = [];
    foreach ($offers->xpath('//*[local-name()="Предложение"]') ?: [] as $offer) {
        $id = commerce_text($offer, 'Ид');
        if ($id === '' || isset($stocks[$id])) throw new ApiError('Пустой или повторяющийся идентификатор предложения', 400);
        $balances = [];
        foreach (commerce_nodes($offer, 'Склад') as $warehouse) {
            $wid = (string)$warehouse['ИдСклада'];
            if (!isset($warehouses[$wid])) throw new ApiError('Неизвестный склад в предложении', 400);
            $balances[] = ['id' => $wid, 'name' => $warehouses[$wid], 'quantity' => commerce_number((string)$warehouse['КоличествоНаСкладе'])];
        }
        if (!$balances) throw new ApiError('Включите разбивку остатков по складам в 1С', 400);
        $stocks[$id] = $balances;
    }
    $categories = [];
    $properties = [];
    $propertyValues = [];
    foreach ($catalog->xpath('//*[local-name()="Свойства"]/*[local-name()="Свойство"]') ?: [] as $property) {
        $pid = commerce_text($property, 'Ид');
        $properties[$pid] = commerce_text($property, 'Наименование');
        foreach ($property->xpath('.//*[local-name()="Справочник"]') ?: [] as $value) {
            $propertyValues[$pid][commerce_text($value, 'ИдЗначения')] = commerce_text($value, 'Значение');
        }
    }
    $walk = function(SimpleXMLElement $node, ?string $parent = null) use (&$walk, &$categories): void {
        foreach (commerce_nodes($node, 'Группы') as $groups) foreach (commerce_nodes($groups, 'Группа') as $group) {
            $id = 'onec-' . sha1(commerce_text($group, 'Ид'));
            $categories[$id] = ['id' => $id, 'name' => commerce_text($group, 'Наименование'), 'parent_id' => $parent];
            $walk($group, $id);
        }
    };
    foreach ($catalog->xpath('//*[local-name()="Классификатор"]') ?: [] as $classifier) $walk($classifier);
    $products = [];
    foreach ($catalog->xpath('//*[local-name()="Товар"]') ?: [] as $item) {
        $id = commerce_text($item, 'Ид');
        $name = commerce_text($item, 'Наименование');
        if ($id === '' || $name === '' || isset($products[$id])) throw new ApiError('Некорректный или повторяющийся товар', 400);
        if (!isset($stocks[$id])) throw new ApiError('Для части товаров отсутствуют предложения. Выполните полную выгрузку обоих файлов', 400);
        $groups = commerce_nodes($item, 'Группы');
        $category = $groups ? 'onec-' . sha1(commerce_text($groups[0], 'Ид')) : null;
        if ($category !== null && !isset($categories[$category])) $category = null;
        $unit = commerce_nodes($item, 'БазоваяЕдиница')[0] ?? null;
        $specs = [];
        foreach ($item->xpath('./*[local-name()="ЗначенияСвойств"]/*[local-name()="ЗначенияСвойства"]') ?: [] as $property) {
            $pid = commerce_text($property, 'Ид');
            $label = $properties[$pid] ?? '';
            // Extra price-like properties must not enter specifications either.
            if ($label === '' || preg_match('/цен|стоим|price|cost/iu', $label)) continue;
            foreach (commerce_nodes($property, 'Значение') as $value) {
                $value = trim((string)$value);
                $value = $propertyValues[$pid][$value] ?? $value;
                if ($value !== '') $specs[] = ['label' => $label, 'value' => $value];
            }
        }
        $products[$id] = [
            'id' => 'onec-' . $id, 'name' => $name, 'category_id' => $category,
            'sku' => commerce_text($item, 'Артикул') ?: commerce_text($item, 'Код'),
            'description' => commerce_text($item, 'Описание'),
            'specifications' => $specs,
            'metadata' => ['onec_id' => $id, 'code' => commerce_text($item, 'Код'),
                'barcode' => commerce_text($item, 'Штрихкод'), 'unit' => $unit ? (string)$unit['НаименованиеПолное'] : '',
                'warehouseStocks' => $stocks[$id], 'stockUpdatedAt' => gmdate('c')]
        ];
    }
    if (!$products || count($products) > 5000 || count($stocks) !== count($products)) throw new ApiError('Нужны согласованные файлы каталога и предложений, до 5000 товаров', 400);
    return ['categories' => array_values($categories), 'products' => array_values($products)];
}

function commerce_all_rows(string $table): array {
    $all = [];
    for ($offset = 0; ; $offset += 500) {
        $rows = supabase_json('GET', rest_path($table, '?select=*&order=id.asc&limit=500&offset=' . $offset));
        $all = array_merge($all, $rows);
        if (count($rows) < 500) return $all;
    }
}

function commerce_import(array $body): array {
    // A large initial import may outlive the default PHP request time limit.
    @set_time_limit(300);
    $parsed = commerce_parse((string)($body['catalogXml'] ?? ''), (string)($body['offersXml'] ?? ''));
    $existing = array_column(commerce_all_rows('products'), null, 'id');
    $categories = array_column(commerce_all_rows('categories'), null, 'id');
    // Batch each depth separately so parent foreign keys exist before children.
    $categoryDepths = []; $categoryBatches = [];
    foreach ($parsed['categories'] as $category) {
        $depth = $category['parent_id'] === null ? 0 : ($categoryDepths[$category['parent_id']] ?? 0) + 1;
        $categoryDepths[$category['id']] = $depth;
        if (!isset($categories[$category['id']])) $categoryBatches[$depth][] = $category;
    }
    ksort($categoryBatches);
    foreach ($categoryBatches as $batch) batch_upsert('categories', $batch);
    $created = 0; $updated = 0; $inserts = [];
    foreach ($parsed['products'] as $product) {
        $id = $product['id'];
        if (isset($existing[$id])) {
            $old = $existing[$id];
            $product['metadata'] = json_object_value(array_merge(json_value($old['metadata'] ?? []), $product['metadata']));
            if (!$product['specifications']) unset($product['specifications']);
            // PATCH leaves active status, images, translations and manual specs intact.
            supabase_json('PATCH', rest_path('products', '?id=eq.' . rawurlencode($id)), $product, ['Prefer: return=minimal']);
            $updated++;
        } else {
            $product['metadata'] = json_object_value($product['metadata']);
            $product['is_active'] = false;
            // Ignore an insert conflict so a concurrent import cannot reset activation.
            $inserts[] = $product;
            $created++;
        }
    }
    foreach (array_chunk($inserts, 100) as $batch) {
        supabase_json('POST', rest_path('products', '?on_conflict=id'), $batch, ['Prefer: resolution=ignore-duplicates,return=minimal']);
    }
    return ['ok' => true, 'created' => $created, 'updated' => $updated];
}
