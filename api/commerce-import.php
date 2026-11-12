<?php
declare(strict_types=1);
require_once __DIR__ . '/product-brands.php';
require_once __DIR__ . '/product-taxonomy.php';

function commerce_visible_stocks(array $stocks): array {
    return array_values(array_filter($stocks, fn($stock) => is_array($stock)
        && (string)($stock['id'] ?? '') !== '8dbb6398-5f47-11f1-aee3-a0ad9f27f6e2'
        && !preg_match('/^магазин\s*склад\s*1$/iu', trim((string)($stock['name'] ?? '')))));
}

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
        $stocks[$id] = commerce_visible_stocks($balances);
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
            $categories[$id] = ['id' => $id, 'name' => commerce_text($group, 'Наименование'), 'parent_id' => $parent, 'is_active' => false];
            $walk($group, $id);
        }
    };
    foreach ($catalog->xpath('//*[local-name()="Классификатор"]') ?: [] as $classifier) $walk($classifier);
    $products = []; $seenCodes = [];
    foreach ($catalog->xpath('//*[local-name()="Товар"]') ?: [] as $item) {
        $id = commerce_text($item, 'Ид');
        $name = commerce_text($item, 'Наименование');
        if ($id === '' || $name === '' || isset($products[$id])) throw new ApiError('Некорректный или повторяющийся товар', 400);
        if (!isset($stocks[$id])) throw new ApiError('Для части товаров отсутствуют предложения. Выполните полную выгрузку обоих файлов', 400);
        $groups = commerce_nodes($item, 'Группы');
        $category = $groups ? 'onec-' . sha1(commerce_text($groups[0], 'Ид')) : null;
        if ($category !== null && !isset($categories[$category])) $category = null;
        $sourceCategory = $category;
        $sourcePath = ''; $ancestor = $category; $trail = [];
        while ($ancestor !== null && isset($categories[$ancestor]) && !isset($trail[$ancestor])) {
            $trail[$ancestor] = true; $sourcePath = $categories[$ancestor]['name'] . ' / ' . $sourcePath;
            $ancestor = $categories[$ancestor]['parent_id'];
        }
        $assigned = product_taxonomy_match($name, $sourcePath);
        $category = $assigned['id'];
        $code = commerce_text($item, 'Код');
        if ($code === '' || isset($seenCodes[$code])) throw new ApiError('Пустой или повторяющийся код товара 1С: ' . $code, 400);
        $seenCodes[$code] = true;
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
            'sku' => commerce_text($item, 'Артикул') ?: $code,
            'brand' => product_brand_from_name($name),
            'description' => commerce_text($item, 'Описание'),
            'specifications' => $specs,
            'metadata' => ['onec_id' => $id, 'onec_category_id' => $sourceCategory, 'code' => $code,
                'onec_category_path' => $sourcePath, 'suggested_category' => $category, 'category_review' => $assigned['review'],
                'barcode' => commerce_text($item, 'Штрихкод'), 'unit' => $unit ? (string)$unit['НаименованиеПолное'] : '',
                'warehouseStocks' => $stocks[$id], 'stockUpdatedAt' => gmdate('c')]
        ];
    }
    if (!$products || count($products) > 5000 || count($stocks) !== count($products)) throw new ApiError('Нужны согласованные файлы каталога и предложений, до 5000 товаров', 400);
    return ['categories' => array_merge(array_values($categories), product_taxonomy_categories()), 'products' => array_values($products)];
}

function commerce_all_rows(string $table): array {
    $all = [];
    for ($offset = 0; ; $offset += 500) {
        $rows = supabase_json('GET', rest_path($table, '?select=*&order=id.asc&limit=500&offset=' . $offset));
        $all = array_merge($all, $rows);
        if (count($rows) < 500) return $all;
    }
}

function commerce_import(array $body, int $offset = 0, ?int $limit = null): array {
    // A large initial import may outlive the default PHP request time limit.
    @set_time_limit(300);
    $parsed = commerce_parse((string)($body['catalogXml'] ?? ''), (string)($body['offersXml'] ?? ''));
    return commerce_apply($parsed, $offset, $limit);
}

function commerce_apply(array $parsed, int $offset = 0, ?int $limit = null): array {
    $total = count($parsed['products']);
    $parsed['products'] = array_slice($parsed['products'], $offset, $limit);
    if ($limit !== null && $parsed['products']) {
        $ids = implode(',', array_map(fn($row) => json_encode($row['id'], JSON_THROW_ON_ERROR), $parsed['products']));
        $existingRows = supabase_json('GET', rest_path('products', '?select=*&id=in.' . rawurlencode('(' . $ids . ')')));
        $codes = implode(',', array_map(fn($row) => json_encode($row['metadata']['code'], JSON_THROW_ON_ERROR), $parsed['products']));
        $byCodeRows = supabase_json('GET', rest_path('products', '?' . http_build_query(['select'=>'*','metadata->>code'=>'in.(' . $codes . ')'])));
        $existingRows = array_values(array_column(array_merge($existingRows, $byCodeRows), null, 'id'));
    } else $existingRows = commerce_all_rows('products');
    $existing = array_column($existingRows, null, 'id');
    $existingByCode = [];
    foreach ($existingRows as $row) {
        $source = json_value($row['metadata'] ?? []);
        if (!str_starts_with((string)$row['id'], 'onec-') && empty($source['onec_id'])) continue;
        $code = (string)($source['code'] ?? '');
        if ($code === '') continue;
        if (isset($existingByCode[$code]) && $existingByCode[$code]['id'] !== $row['id']) throw new ApiError('В базе несколько товаров с кодом 1С ' . $code . '. Требуется проверка дублей.', 409);
        $existingByCode[$code] = $row;
    }
    $categories = $offset === 0 ? array_column(commerce_all_rows('categories'), null, 'id') : [];
    if ($offset !== 0) $parsed['categories'] = [];
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
        $code = (string)$product['metadata']['code'];
        $old = $existingByCode[$code] ?? $existing[$id] ?? null;
        if (isset($existing[$id]) && isset($existingByCode[$code]) && $existingByCode[$code]['id'] !== $id) throw new ApiError('Конфликт ID и кода 1С ' . $code, 409);
        if ($old !== null) {
            $id = (string)$old['id']; $product['id'] = $id;
            // Existing cards belong to the site editor. Import only refreshes
            // source identifiers, units and balances, never editorial fields.
            foreach (['name', 'description', 'specifications', 'brand', 'sku'] as $field) unset($product[$field]);
            $oldMeta=json_value($old['metadata']??[]);
            if(!empty($oldMeta['category_manual']) || (!empty($old['category_id'])&&!str_starts_with((string)$old['category_id'],'onec-')&&!str_starts_with((string)$old['category_id'],'shop-')))unset($product['category_id']);
            $product['metadata'] = json_object_value(array_merge(json_value($old['metadata'] ?? []), $product['metadata']));
            // PATCH also leaves photos, thumbnails, status and translations intact.
            supabase_json('PATCH', rest_path('products', '?id=eq.' . rawurlencode($id)), $product, ['Prefer: return=minimal']);
            $updated++;
        } else {
            $product['brand'] = $product['brand'] ?? '';
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
    return ['ok' => true, 'created' => $created, 'updated' => $updated, 'next' => $offset + count($parsed['products']), 'total' => $total];
}

function commerce_admin_import(array $body): array {
    $action = (string)($body['action'] ?? '');
    // Session ID is available after admin_required releases its write lock.
    $dir = rtrim(sys_get_temp_dir(), '/\\') . '/777-admin-import-' . hash('sha256', session_id());
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) throw new ApiError('Не удалось создать временную папку импорта', 503);
    foreach (glob($dir . '/*') ?: [] as $file) if (is_file($file) && filemtime($file) < time() - 7200) @unlink($file);
    if (in_array($action, ['start_upload', 'upload_chunk', 'prepare_upload'], true)) return commerce_admin_upload($dir, $body);
    if ($action === 'prepare') {
        $parsed = commerce_parse((string)($body['catalogXml'] ?? ''), (string)($body['offersXml'] ?? ''));
        $token = bin2hex(random_bytes(16));
        $state = ['parsed' => $parsed, 'next' => 0, 'created' => 0, 'updated' => 0];
        // Store only allowlisted parsed fields; no prices or original XML.
        $path = $dir . '/' . $token . '.json';
        if (file_put_contents($path, json_encode($state, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), LOCK_EX) === false) throw new ApiError('Не удалось подготовить импорт', 503);
        chmod($path, 0600);
        return ['ok' => true, 'token' => $token, 'total' => count($parsed['products'])];
    }
    if ($action !== 'step') throw new ApiError('Обновите страницу админки перед импортом', 400);
    $token = (string)($body['token'] ?? '');
    if (!preg_match('/^[a-f0-9]{32}$/D', $token)) throw new ApiError('Некорректный идентификатор импорта', 400);
    $path = $dir . '/' . $token . '.json';
    if (!is_file($path)) throw new ApiError('Подготовленный импорт истёк. Выберите файлы заново.', 410);
    $handle = fopen($path, 'r+');
    if (!$handle || !flock($handle, LOCK_EX | LOCK_NB)) throw new ApiError('Предыдущий шаг ещё выполняется. Подождите.', 409);
    try {
        $state = json_decode(stream_get_contents($handle), true, 512, JSON_THROW_ON_ERROR);
        if (!isset($state['parsed'])) throw new ApiError('Сначала завершите передачу файлов', 400);
        $total = count($state['parsed']['products']);
        if ($state['next'] < $total) {
            @set_time_limit(60);
            $result = commerce_apply($state['parsed'], $state['next'], 25);
            $state['next'] = $result['next'];
            $state['created'] += $result['created']; $state['updated'] += $result['updated'];
            rewind($handle);
            $encoded = json_encode($state, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
            if (fwrite($handle, $encoded) !== strlen($encoded) || !ftruncate($handle, strlen($encoded))) throw new ApiError('Не удалось сохранить прогресс импорта', 503);
            fflush($handle);
        }
        return ['ok' => true, 'next' => $state['next'], 'total' => $total, 'created' => $state['created'], 'updated' => $state['updated'], 'done' => $state['next'] >= $total];
    } finally { flock($handle, LOCK_UN); fclose($handle); }
}

function commerce_admin_upload(string $dir, array $body): array {
    $action = (string)$body['action'];
    if ($action === 'start_upload') {
        $sizes = $body['sizes'] ?? [];
        foreach (['import.xml', 'offers.xml'] as $name) {
            if (!isset($sizes[$name]) || !is_int($sizes[$name]) || $sizes[$name] < 1 || $sizes[$name] > 20 * 1024 * 1024) throw new ApiError('Нужны оба XML до 20 МБ каждый', 400);
        }
        $token = bin2hex(random_bytes(16));
        $path = $dir . '/' . $token . '.json';
        if (file_put_contents($path, json_encode(['upload' => $sizes]), LOCK_EX) === false) throw new ApiError('Не удалось начать загрузку', 503);
        chmod($path, 0600);
        return ['ok' => true, 'token' => $token];
    }
    $token = (string)($body['token'] ?? '');
    if (!preg_match('/^[a-f0-9]{32}$/D', $token)) throw new ApiError('Некорректный идентификатор загрузки', 400);
    $path = $dir . '/' . $token . '.json';
    if (!is_file($path)) throw new ApiError('Загрузка истекла. Выберите файлы заново.', 410);
    $handle = fopen($path, 'r+');
    if (!$handle || !flock($handle, LOCK_EX | LOCK_NB)) throw new ApiError('Предыдущий шаг ещё выполняется', 409);
    try {
        $state = json_decode(stream_get_contents($handle), true, 512, JSON_THROW_ON_ERROR);
        // Finalize can be safely retried after the XML has already been parsed.
        if ($action === 'prepare_upload' && isset($state['parsed'])) return ['ok'=>true,'token'=>$token,'total'=>count($state['parsed']['products'])];
        if (!isset($state['upload'])) throw new ApiError('Загрузка уже завершена', 409);
        if ($action === 'upload_chunk') {
            $name = (string)($body['name'] ?? '');
            if (!in_array($name, ['import.xml', 'offers.xml'], true)) throw new ApiError('Некорректное имя XML', 400);
            $offset = $body['offset'] ?? -1;
            $data = (string)($body['data'] ?? '');
            if (!is_int($offset) || $offset < 0 || strlen($data) > 262144) throw new ApiError('Некорректная часть файла', 400);
            $bytes = base64_decode($data, true);
            if ($bytes === false || $bytes === '' || strlen($bytes) > 196608 || $offset + strlen($bytes) > $state['upload'][$name]) throw new ApiError('Некорректный размер части XML', 400);
            $part = $dir . '/' . $token . '.' . $name . '.part';
            clearstatcache(true, $part);
            $size = is_file($part) ? filesize($part) : 0;
            if ($size === $offset) {
                if (file_put_contents($part, $bytes, FILE_APPEND | LOCK_EX) !== strlen($bytes)) throw new ApiError('Не удалось записать XML', 503);
                chmod($part, 0600);
            } elseif ($size < $offset + strlen($bytes) || file_get_contents($part, false, null, $offset, strlen($bytes)) !== $bytes) {
                throw new ApiError('Нарушен порядок частей XML. Повторите загрузку.', 409);
            }
            touch($path);
            return ['ok'=>true, 'next'=>$offset + strlen($bytes)];
        }
        $xml = [];
        foreach (['import.xml', 'offers.xml'] as $name) {
            $part = $dir . '/' . $token . '.' . $name . '.part';
            clearstatcache(true, $part);
            if (!is_file($part) || filesize($part) !== $state['upload'][$name]) throw new ApiError('XML передан не полностью', 400);
            $xml[$name] = file_get_contents($part);
        }
        $parsed = commerce_parse($xml['import.xml'], $xml['offers.xml']);
        $encoded = json_encode(['parsed'=>$parsed,'next'=>0,'created'=>0,'updated'=>0], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        rewind($handle);
        if (fwrite($handle, $encoded) !== strlen($encoded) || !ftruncate($handle, strlen($encoded))) throw new ApiError('Не удалось подготовить импорт', 503);
        fflush($handle);
        // Original XML (including price blocks) exists only while assembling the
        // upload in private temp storage. Keep only parsed non-price fields.
        foreach (['import.xml','offers.xml'] as $name) unlink($dir . '/' . $token . '.' . $name . '.part');
        return ['ok'=>true,'token'=>$token,'total'=>count($parsed['products'])];
    } finally { flock($handle, LOCK_UN); fclose($handle); }
}

function commerce_categorize_step(int $offset): array {
    if($offset < 0)throw new ApiError('Некорректный шаг',400);
    $categories=array_column(commerce_all_rows('categories'),null,'id');
    if($offset===0){
        $roots=[];$children=[];
        foreach(product_taxonomy_categories() as $row)if(!isset($categories[$row['id']])){
            if($row['parent_id']===null)$roots[]=$row;else $children[]=$row;
        }
        if($roots)batch_upsert('categories',$roots);
        if($children)batch_upsert('categories',$children);
        if(function_exists('category_menu_cache_path')){ $cache=category_menu_cache_path();if(is_file($cache))@unlink($cache); }
    }
    $rows=supabase_json('GET',rest_path('products','?select=id,name,category_id,metadata&order=id.asc&limit=25&offset='.$offset));
    $updated=0;$review=0;
    foreach($rows as $row){
        $category=(string)($row['category_id']??'');
        $meta=json_value($row['metadata']??[]);
        if(!empty($meta['category_manual']) || ($category!==''&&!str_starts_with($category,'onec-')&&!str_starts_with($category,'shop-')))continue;
        $path=(string)($meta['onec_category_path']??'');$ancestor=$category;$seen=[];
        while($path===''&&isset($categories[$ancestor])&&!isset($seen[$ancestor])){
            $seen[$ancestor]=true;$path=$categories[$ancestor]['name'];$ancestor=(string)($categories[$ancestor]['parent_id']??'');
            while(isset($categories[$ancestor])&&!isset($seen[$ancestor])){$seen[$ancestor]=true;$path=$categories[$ancestor]['name'].' / '.$path;$ancestor=(string)($categories[$ancestor]['parent_id']??'');}
        }
        $match=product_taxonomy_match((string)$row['name'],$path);
        $meta['category_review']=$match['review'];$meta['suggested_category']=$match['id'];$meta['category_auto']=true;
        supabase_json('PATCH',rest_path('products','?id=eq.'.rawurlencode($row['id'])),['category_id'=>$match['id'],'metadata'=>json_object_value($meta)],['Prefer: return=minimal']);
        $updated++;if($match['review'])$review++;
    }
    return ['ok'=>true,'next'=>$offset+count($rows),'done'=>count($rows)<25,'updated'=>$updated,'review'=>$review];
}
