<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/commerce-import.php';
require __DIR__ . '/photo-search.php';
require_once __DIR__ . '/product-brands.php';
require_once __DIR__ . '/exchange.php';
require_once __DIR__ . '/news.php';

function category_row(array $value): array {
    return [
        'id' => strtolower(text_value($value['id'] ?? '', 100)),
        'parent_id' => strtolower(text_value($value['parent'] ?? $value['parent_id'] ?? '', 100)) ?: null,
        'name' => text_value($value['name'] ?? '', 160),
        'translations' => json_object_value($value['translations'] ?? []),
        'icon' => text_value($value['icon'] ?? '', 120) ?: null,
        'sort_order' => (int)($value['sort_order'] ?? 0),
        'is_active' => !str_starts_with((string)($value['id'] ?? ''), 'onec-') && bool_value($value['active'] ?? $value['is_active'] ?? true, true)
    ];
}

function category_client(array $row): array {
    return [
        'id' => (string)$row['id'],
        'name' => (string)$row['name'],
        'parent' => (string)($row['parent_id'] ?? ''),
        'active' => bool_value($row['is_active'] ?? true, true),
        'icon' => (string)($row['icon'] ?? '')
    ];
}

function product_row(array $value): array {
    $id = text_value($value['id'] ?? '', 120);
    if ($id === '') $id = bin2hex(random_bytes(8));
    $known = ['id', 'cat', 'category', 'category_id', 'name', 'title', 'brand', 'manufacturer', 'sku', 'description', 'specs', 'specifications', 'image', 'image_path', 'thumbnail', 'thumbnail_path', 'image_alt', 'badge', 'sort_order', 'active', 'is_active', 'translations', 'metadata'];
    $metadata = json_value($value['metadata'] ?? []);
    foreach ($value as $key => $item) if (!in_array($key, $known, true)) $metadata[$key] = $item;
    $image = internal_storage_path(text_value($value['image'] ?? $value['image_path'] ?? '', 2200000), 'product-images');
    if ($image !== '') $image = persist_image_source($image, 'product-images', 'products/' . preg_replace('/[^a-z0-9-]/i', '-', $id));
    $thumbnail = internal_storage_path(text_value($value['thumbnail'] ?? $value['thumbnail_path'] ?? $metadata['thumbnail'] ?? '', 2200000), 'product-images');
    if ($thumbnail !== '') $thumbnail = persist_image_source($thumbnail, 'product-images', 'previews/' . preg_replace('/[^a-z0-9-]/i', '-', $id));
    if ($thumbnail !== '') $metadata['thumbnail'] = $thumbnail;
    else unset($metadata['thumbnail']);
    $name = $value['name'] ?? $value['title'] ?? '';
    if (is_array($name)) $name = $name['ru'] ?? $name['kz'] ?? $name['en'] ?? '';
    return [
        'id' => $id,
        'category_id' => text_value($value['cat'] ?? $value['category'] ?? $value['category_id'] ?? '', 100) ?: null,
        'name' => text_value($name, 300),
        'translations' => json_object_value($value['translations'] ?? []),
        'brand' => text_value($value['brand'] ?? $value['manufacturer'] ?? '', 160),
        'sku' => text_value($value['sku'] ?? '', 120) ?: null,
        'description' => text_value($value['description'] ?? '', 6000),
        'specifications' => json_value($value['specs'] ?? $value['specifications'] ?? []),
        'image_path' => $image ?: null,
        'image_alt' => text_value($value['image_alt'] ?? '', 300),
        'badge' => text_value($value['badge'] ?? '', 80) ?: null,
        'sort_order' => (int)($value['sort_order'] ?? 0),
        'is_active' => bool_value($value['active'] ?? $value['is_active'] ?? false),
        // Supabase requires metadata to be a JSON object; an empty PHP array encodes as [].
        'metadata' => json_object_value($metadata)
    ];
}

function product_client(array $row): array {
    $metadata = json_value($row['metadata'] ?? []);
    if (isset($metadata['warehouseStocks']) && is_array($metadata['warehouseStocks'])) {
        $metadata['warehouseStocks'] = commerce_visible_stocks($metadata['warehouseStocks']);
    }
    if (!empty($metadata['thumbnail'])) {
        $metadata['thumbnail'] = storage_source((string)$metadata['thumbnail'], 'product-images');
    }
    $product = array_merge($metadata, [
        'id' => (string)$row['id'],
        'cat' => (string)($row['category_id'] ?? ''),
        'name' => (string)$row['name'],
        'brand' => trim((string)($row['brand'] ?? '')) ?: product_brand_from_name((string)$row['name']),
        'sku' => (string)($row['sku'] ?? ''),
        'description' => (string)($row['description'] ?? ''),
        'specs' => json_value($row['specifications'] ?? []),
        'image' => storage_source((string)($row['image_path'] ?? ''), 'product-images'),
        'badge' => (string)($row['badge'] ?? ''),
        'active' => bool_value($row['is_active'] ?? false)
    ]);
    $category = $row['categories'] ?? null;
    $categoryName = is_array($category) ? text_value($category['name'] ?? ($category[0]['name'] ?? ''), 160) : '';
    if ($categoryName !== '') $product['categoryName'] = $categoryName;
    if (json_value($row['translations'] ?? [])) $product['translations'] = json_value($row['translations']);
    return $product;
}

function category_menu_cache_path(): string {
    return rtrim(sys_get_temp_dir(), '/\\') . '/777-category-menu-' . hash('sha256', supabase_url()) . '.json';
}

function get_categories(bool $publicOnly = false): array {
    $cachePath = $publicOnly ? category_menu_cache_path() : '';
    if ($publicOnly && is_file($cachePath) && filemtime($cachePath) > time() - 60) {
        $cached = json_decode((string)@file_get_contents($cachePath), true);
        if (is_array($cached)) return $cached;
    }
    $query = '?select=*&order=sort_order.asc,name.asc';
    if ($publicOnly) $query .= '&is_active=eq.true';
    $rows = supabase_json('GET', rest_path('categories', $query));
    $rows = is_array($rows) ? $rows : [];
    if ($publicOnly) $rows = array_values(array_filter($rows, fn($row) => !str_starts_with((string)$row['id'], 'onec-')));
    $result = array_map('category_client', $rows);
    if ($publicOnly) @file_put_contents($cachePath, json_encode($result, JSON_UNESCAPED_UNICODE), LOCK_EX);
    return $result;
}

function get_products(bool $publicOnly = false): array {
  $query = '?select=*&order=sort_order.asc,created_at.desc,id.asc';
  if ($publicOnly) $query .= '&is_active=eq.true';
  $rows = [];
  for ($offset = 0; ; $offset += 500) {
      $page = supabase_json('GET', rest_path('products', $query . '&limit=500&offset=' . $offset));
      $rows = array_merge($rows, $page);
      if (count($page) < 500) break;
  }
  return array_map('product_client', is_array($rows) ? $rows : []);
}

function get_product_by_id(string $id, bool $publicOnly = true): ?array {
    $id = text_value($id, 120);
    if ($id === '') return null;
    $query = '?select=*,categories(name)&id=eq.' . rawurlencode($id) . '&limit=1';
    if ($publicOnly) $query .= '&is_active=eq.true';
    $rows = supabase_json('GET', rest_path('products', $query));
    return is_array($rows) && isset($rows[0]) && is_array($rows[0]) ? product_client($rows[0]) : null;
}

function get_settings(): array {
    $rows = supabase_json('GET', rest_path('site_settings', '?key=eq.site&select=value'));
    return is_array($rows) && isset($rows[0]['value']) && is_array($rows[0]['value']) ? $rows[0]['value'] : [];
}

/** Store the single editable site-settings record without relying on upsert
 * preferences that are not enabled on every shared-hosting Supabase setup. */
function persist_site_settings(array $settings): void {
    $value = json_object_value($settings);
    $existing = supabase_json('GET', rest_path('site_settings', '?key=eq.site&select=key&limit=1'));
    if (is_array($existing) && isset($existing[0])) {
        supabase_json('PATCH', rest_path('site_settings', '?key=eq.site'), ['value' => $value], ['Prefer: return=representation']);
        return;
    }
    supabase_json('POST', rest_path('site_settings'), [['key' => 'site', 'value' => $value]], ['Prefer: return=representation']);
}

function get_slides(bool $publicOnly = true): array {
    $query = '?select=*&order=sort_order.asc,created_at.asc';
    if ($publicOnly) $query .= '&is_active=eq.true';
    $rows = supabase_json('GET', rest_path('hero_slides', $query));
    return array_map(fn($row) => [
        'id' => (string)$row['id'],
        'src' => storage_source((string)$row['storage_path'], 'hero-images'),
        'width' => (int)$row['width'],
        'height' => (int)$row['height'],
        'label' => (string)($row['label'] ?? '')
    ], is_array($rows) ? $rows : []);
}

function delete_by_id(string $table, string $id): void {
    supabase_json('DELETE', rest_path($table, '?id=eq.' . rawurlencode($id)), null, ['Prefer: return=minimal']);
}

function batch_upsert(string $table, array $rows, string $conflict = 'id'): void {
    foreach (array_chunk($rows, 100) as $batch) {
        supabase_json('POST', rest_path($table, '?on_conflict=' . rawurlencode($conflict)), $batch, ['Prefer: resolution=merge-duplicates,return=representation']);
    }
}

function store_catalog(array $body): array {
    if (!isset($body['products']) || !is_array($body['products'])) throw new ApiError('Нужен массив товаров', 400);
    $categories = array_values(array_filter(array_map('category_row', json_value($body['categories'] ?? [])), fn($row) => $row['id'] !== '' && $row['name'] !== ''));
    if ($categories) batch_upsert('categories', $categories);
    $products = array_values(array_filter(array_map('product_row', $body['products']), fn($row) => $row['name'] !== ''));
    $existingProducts = supabase_json('GET', rest_path('products', '?select=id'));
    $wantedProductIds = array_column($products, 'id');
    foreach (is_array($existingProducts) ? $existingProducts : [] as $existing) {
        if (!in_array((string)$existing['id'], $wantedProductIds, true)) delete_by_id('products', (string)$existing['id']);
    }
    if ($products) batch_upsert('products', $products);

    $settings = array_merge(get_settings(), json_value($body['settings'] ?? []));
    $slides = json_value($settings['heroSlides'] ?? []);
    unset($settings['heroSlides']);
    persist_site_settings($settings);

    $slideRows = [];
    foreach (array_slice($slides, 0, 5) as $index => $slide) {
        if (!is_array($slide)) continue;
        $id = text_value($slide['id'] ?? '', 100);
        $source = text_value($slide['src'] ?? '', 2200000);
        if ($id === '' || $source === '') continue;
        $slideRows[] = [
            'id' => $id,
            'storage_path' => persist_image_source($source, 'hero-images', 'hero/' . preg_replace('/[^a-z0-9-]/i', '-', $id)),
            'width' => max(1, min(3840, (int)($slide['width'] ?? 1920))),
            'height' => max(1, min(2160, (int)($slide['height'] ?? 1080))),
            'label' => text_value($slide['label'] ?? 'Фон баннера', 100),
            'translations' => json_object_value($slide['translations'] ?? []),
            'sort_order' => $index,
            'is_active' => true
        ];
    }
    $existingSlides = supabase_json('GET', rest_path('hero_slides', '?select=id'));
    $wantedSlideIds = array_column($slideRows, 'id');
    foreach (is_array($existingSlides) ? $existingSlides : [] as $existing) {
        if (!in_array((string)$existing['id'], $wantedSlideIds, true)) delete_by_id('hero_slides', (string)$existing['id']);
    }
    if ($slideRows) batch_upsert('hero_slides', $slideRows);
    return ['ok' => true, 'products' => get_products(false), 'settings' => array_merge(get_settings(), ['heroSlides' => get_slides(false)]), 'categories' => get_categories(false)];
}

/** Persist only product records. Settings, slides and categories are deliberately
 * not touched here: a phone-number edit must never be able to overwrite a
 * product import (and vice versa). */
function store_products(array $body): array {
    if (!isset($body['products']) || !is_array($body['products'])) throw new ApiError('Нужен массив товаров', 400);
    $products = array_values(array_filter(array_map('product_row', $body['products']), fn($row) => $row['name'] !== ''));
    $existingProducts = supabase_json('GET', rest_path('products', '?select=id'));
    $wantedProductIds = array_column($products, 'id');
    foreach (is_array($existingProducts) ? $existingProducts : [] as $existing) {
        if (!in_array((string)$existing['id'], $wantedProductIds, true)) delete_by_id('products', (string)$existing['id']);
    }
    if ($products) batch_upsert('products', $products);
    return ['ok' => true, 'products' => get_products(false)];
}

function category_depth(string $id, array $byId, array &$memo = [], array $trail = []): int {
    if (isset($memo[$id])) return $memo[$id];
    if (isset($trail[$id])) throw new ApiError('Категории не могут образовывать цикл', 400);
    $parent = (string)($byId[$id]['parent_id'] ?? '');
    if ($parent === '' || !isset($byId[$parent])) return $memo[$id] = 0;
    $trail[$id] = true;
    return $memo[$id] = category_depth($parent, $byId, $memo, $trail) + 1;
}

function store_categories(array $body): array {
    if (!isset($body['categories']) || !is_array($body['categories'])) throw new ApiError('Нужен список категорий', 400);
    $categories = array_values(array_filter(array_map('category_row', $body['categories']), fn($row) => $row['id'] !== '' && $row['name'] !== ''));
    $byId = [];
    foreach ($categories as $row) $byId[$row['id']] = $row;
    $memo = [];
    usort($categories, fn($a, $b) => category_depth($a['id'], $byId, $memo) <=> category_depth($b['id'], $byId, $memo));
    $existing = supabase_json('GET', rest_path('categories', '?select=id,parent_id'));
    $wantedIds = array_column($categories, 'id');
    $removed = array_values(array_filter(is_array($existing) ? $existing : [], fn($row) => !in_array((string)$row['id'], $wantedIds, true)));
    usort($removed, fn($a, $b) => strlen((string)$b['parent_id']) <=> strlen((string)$a['parent_id']));
    foreach ($removed as $row) delete_by_id('categories', (string)$row['id']);
    if ($categories) batch_upsert('categories', $categories);
    $cachePath = category_menu_cache_path();
    if (is_file($cachePath)) @unlink($cachePath);
    return ['ok' => true, 'categories' => get_categories(false)];
}

function internal_storage_path(string $source, string $bucket): string {
    if (str_starts_with($source, '/api/media?')) {
        $query = [];
        parse_str((string)parse_url($source, PHP_URL_QUERY), $query);
        $path = text_value($query['path'] ?? '', 2200000);
        if (($query['bucket'] ?? '') === $bucket && storage_path_valid($path)) return $path;
    }
    return $source;
}

function store_hero_slides(array $slides): void {
    $slideRows = [];
    foreach (array_slice($slides, 0, 5) as $index => $slide) {
        if (!is_array($slide)) continue;
        $id = text_value($slide['id'] ?? '', 100);
        $source = internal_storage_path(text_value($slide['src'] ?? '', 2200000), 'hero-images');
        if ($id === '' || $source === '') continue;
        $slideRows[] = [
            'id' => $id,
            'storage_path' => persist_image_source($source, 'hero-images', 'hero/' . preg_replace('/[^a-z0-9-]/i', '-', $id)),
            'width' => max(1, min(3840, (int)($slide['width'] ?? 1920))),
            'height' => max(1, min(2160, (int)($slide['height'] ?? 1080))),
            'label' => text_value($slide['label'] ?? 'Фон баннера', 100),
            'translations' => json_object_value($slide['translations'] ?? []),
            'sort_order' => $index,
            'is_active' => true
        ];
    }
    $existingSlides = supabase_json('GET', rest_path('hero_slides', '?select=id'));
    $wantedSlideIds = array_column($slideRows, 'id');
    foreach (is_array($existingSlides) ? $existingSlides : [] as $existing) {
        if (!in_array((string)$existing['id'], $wantedSlideIds, true)) delete_by_id('hero_slides', (string)$existing['id']);
    }
    if ($slideRows) batch_upsert('hero_slides', $slideRows);
}

function store_settings(array $body): array {
    if (!isset($body['settings']) || !is_array($body['settings'])) throw new ApiError('Нужны настройки сайта', 400);
    $incoming = json_value($body['settings']);
    $hasSlides = array_key_exists('heroSlides', $incoming) && is_array($incoming['heroSlides']);
    $slides = $hasSlides ? $incoming['heroSlides'] : [];
    unset($incoming['heroSlides']);
    $current = get_settings();
    $settings = array_merge($current, $incoming);
    persist_site_settings($settings);
    if ($hasSlides) store_hero_slides($slides);
    return ['ok' => true, 'settings' => array_merge(get_settings(), ['heroSlides' => get_slides(false)])];
}

function save_request(): array {
    require_method('POST');
    $name = text_value($_POST['name'] ?? '', 160);
    $phone = text_value($_POST['phone'] ?? '', 80);
    $email = text_value($_POST['email'] ?? '', 160);
    $clientType = text_value($_POST['clientType'] ?? 'individual', 20) === 'legal' ? 'legal' : 'individual';
    $company = text_value($_POST['companyName'] ?? '', 200);
    $bin = preg_replace('/\D/', '', text_value($_POST['bin'] ?? '', 20));
    $iik = preg_replace('/\s+/', '', strtoupper(text_value($_POST['iik'] ?? '', 34)));
    $bik = preg_replace('/\s+/', '', strtoupper(text_value($_POST['bik'] ?? '', 20)));
    $bankName = text_value($_POST['bankName'] ?? '', 160);
    $address = text_value($_POST['legalAddress'] ?? '', 400);
    $position = text_value($_POST['position'] ?? '', 160);
    $description = text_value($_POST['description'] ?? '', 3000);
    if ($name === '' || $phone === '') throw new ApiError('Укажите имя и телефон', 400);
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) throw new ApiError('Укажите корректный адрес электронной почты', 400);
    if ($clientType === 'legal' && ($company === '' || !preg_match('/^\d{12}$/', $bin) || $address === '')) throw new ApiError('Для юридического лица укажите компанию, БИН и юридический адрес', 400);
    $created = supabase_json('POST', rest_path('customer_requests', '?select=*'), [[
        'name' => $name, 'phone' => $phone, 'email' => $email ?: null, 'client_type' => $clientType,
        'company_name' => $company ?: null, 'bin' => $bin ?: null, 'iik' => $iik ?: null, 'bik' => $bik ?: null, 'bank_name' => $bankName ?: null, 'legal_address' => $address ?: null,
        'position' => $position ?: null, 'description' => $description
    ]], ['Prefer: return=representation']);
    $requestId = (string)($created[0]['id'] ?? '');
    if ($requestId === '') throw new ApiError('Не удалось сохранить заявку', 502);
    $items = json_decode((string)($_POST['products'] ?? '[]'), true);
    if (is_array($items) && $items) {
        $rows = [];
        foreach (array_slice($items, 0, 100) as $item) if (is_array($item)) $rows[] = [
            'request_id' => $requestId, 'product_id' => text_value($item['id'] ?? '', 120) ?: null,
            'product_name' => text_value($item['name'] ?? 'Товар без названия', 300),
            'brand' => text_value($item['brand'] ?? '', 160), 'category_id' => text_value($item['category'] ?? '', 100) ?: null,
            'quantity' => max(1, min(9999, (int)($item['quantity'] ?? 1))), 'product_snapshot' => $item
        ];
        if ($rows) supabase_json('POST', rest_path('request_items'), $rows, ['Prefer: return=representation']);
    }
    $files = request_files();
    if (count($files) > 10) throw new ApiError('Можно прикрепить не более 10 файлов', 400);
    $allowed = ['pdf', 'png', 'jpg', 'jpeg', 'xls', 'xlsx', 'doc', 'docx'];
    foreach ($files as $file) {
        if ($file['error'] !== UPLOAD_ERR_OK || $file['size'] < 1 || $file['size'] > 10 * 1024 * 1024) throw new ApiError('Каждый файл должен быть не больше 10 МБ', 400);
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($extension, $allowed, true)) throw new ApiError('Поддерживаются PDF, JPG, PNG, XLS, XLSX, DOC и DOCX', 400);
        $bytes = file_get_contents($file['tmp_name']);
        if ($bytes === false) throw new ApiError('Не удалось прочитать прикреплённый файл', 400);
        $path = 'requests/' . $requestId . '/' . bin2hex(random_bytes(8)) . '.' . $extension;
        storage_upload('request-documents', $path, $bytes, $file['type'] ?: 'application/octet-stream');
        supabase_json('POST', rest_path('request_documents'), [[
            'request_id' => $requestId, 'storage_path' => $path, 'original_name' => basename($file['name']),
            'mime_type' => $file['type'] ?: 'application/octet-stream', 'size_bytes' => $file['size']
        ]], ['Prefer: return=representation']);
    }
    return ['ok' => true, 'id' => $requestId];
}

function request_client(array $row): array {
    $items = is_array($row['request_items'] ?? null) ? $row['request_items'] : [];
    $documents = is_array($row['request_documents'] ?? null) ? $row['request_documents'] : [];
    return [
        'id' => (string)$row['id'], 'name' => (string)$row['name'], 'phone' => (string)$row['phone'],
        'email' => (string)($row['email'] ?? ''), 'clientType' => (string)($row['client_type'] ?? 'individual'),
        'companyName' => (string)($row['company_name'] ?? ''), 'bin' => (string)($row['bin'] ?? ''),
        'iik' => (string)($row['iik'] ?? ''), 'bik' => (string)($row['bik'] ?? ''), 'bankName' => (string)($row['bank_name'] ?? ''),
        'legalAddress' => (string)($row['legal_address'] ?? ''), 'position' => (string)($row['position'] ?? ''),
        'description' => (string)($row['description'] ?? ''), 'createdAt' => (string)$row['created_at'], 'updatedAt' => (string)($row['updated_at'] ?? ''),
        'products' => array_map(fn($item) => ['id' => (string)($item['product_id'] ?? ''), 'name' => (string)$item['product_name'], 'brand' => (string)($item['brand'] ?? ''), 'category' => (string)($item['category_id'] ?? ''), 'quantity' => (int)$item['quantity']], $items),
        'documents' => array_map(fn($doc) => ['id' => (string)$doc['id'], 'name' => (string)$doc['original_name'], 'size' => (int)$doc['size_bytes'], 'type' => (string)$doc['mime_type'], 'url' => '/api/document?id=' . rawurlencode((string)$doc['id'])], $documents)
    ];
}

function all_requests(): array {
    $rows = supabase_json('GET', rest_path('customer_requests', '?select=*,request_items(*),request_documents(*)&order=created_at.desc'));
    return array_map('request_client', is_array($rows) ? $rows : []);
}

function admin_requests(string $method): array {
    admin_required();
    if ($method === 'GET') return ['requests' => all_requests()];
    if ($method === 'DELETE') {
        $id = text_value($_GET['id'] ?? '', 100);
        if ($id === '') throw new ApiError('Не указана заявка для удаления', 400);
        delete_by_id('customer_requests', $id);
        return ['ok' => true, 'id' => $id, 'requests' => all_requests()];
    }
    if ($method !== 'PUT') throw new ApiError('Method not allowed', 405);
    $body = request_json(); $id = text_value($body['id'] ?? '', 100);
    $name = text_value($body['name'] ?? '', 160); $phone = text_value($body['phone'] ?? '', 80);
    if ($id === '' || $name === '' || $phone === '') throw new ApiError('Укажите имя и телефон клиента', 400);
    $email = text_value($body['email'] ?? '', 160);
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) throw new ApiError('Укажите корректный адрес электронной почты', 400);
    $type = text_value($body['clientType'] ?? 'individual', 20) === 'legal' ? 'legal' : 'individual';
    $company = text_value($body['companyName'] ?? '', 200); $bin = preg_replace('/\D/', '', text_value($body['bin'] ?? '', 20)); $iik = preg_replace('/\s+/', '', strtoupper(text_value($body['iik'] ?? '', 34))); $bik = preg_replace('/\s+/', '', strtoupper(text_value($body['bik'] ?? '', 20))); $bankName = text_value($body['bankName'] ?? '', 160); $address = text_value($body['legalAddress'] ?? '', 400);
    if ($type === 'legal' && ($company === '' || !preg_match('/^\d{12}$/', $bin) || $address === '')) throw new ApiError('Для юридического лица заполните компанию, БИН и адрес', 400);
    supabase_json('PATCH', rest_path('customer_requests', '?id=eq.' . rawurlencode($id)), [
        'name' => $name, 'phone' => $phone, 'email' => $email ?: null, 'client_type' => $type, 'company_name' => $company ?: null,
        'bin' => $bin ?: null, 'iik' => $iik ?: null, 'bik' => $bik ?: null, 'bank_name' => $bankName ?: null, 'legal_address' => $address ?: null, 'position' => text_value($body['position'] ?? '', 160) ?: null,
        'description' => text_value($body['description'] ?? '', 3000)
    ], ['Prefer: return=representation']);
    if (array_key_exists('products', $body)) {
        supabase_json('DELETE', rest_path('request_items', '?request_id=eq.' . rawurlencode($id)), null, ['Prefer: return=minimal']);
        $items = [];
        foreach (array_slice(json_value($body['products']), 0, 100) as $item) if (is_array($item)) $items[] = [
            'request_id' => $id, 'product_id' => text_value($item['id'] ?? '', 120) ?: null, 'product_name' => text_value($item['name'] ?? 'Товар без названия', 300),
            'brand' => text_value($item['brand'] ?? '', 160), 'category_id' => text_value($item['category'] ?? '', 100) ?: null,
            'quantity' => max(1, min(9999, (int)($item['quantity'] ?? 1))), 'product_snapshot' => $item
        ];
        if ($items) supabase_json('POST', rest_path('request_items'), $items, ['Prefer: return=representation']);
    }
    return ['ok' => true, 'requests' => all_requests()];
}

function serve_storage(string $bucket, string $path, bool $download = false): never {
    if (!in_array($bucket, ['product-images', 'hero-images', 'request-documents'], true) || !storage_path_valid($path)) throw new ApiError('Файл не найден', 404);
    $response = supabase_http('GET', 'storage/v1/object/' . rawurlencode($bucket) . '/' . str_replace('%2F', '/', rawurlencode($path)));
    if ($response['status'] < 200 || $response['status'] >= 300) throw new ApiError('Файл не найден', 404);
    http_response_code(200);
    header('Content-Type: ' . (header_value($response['headers'], 'Content-Type') ?: 'application/octet-stream'));
    header('Cache-Control: private, max-age=3600');
    if ($download) header('Content-Disposition: attachment');
    echo $response['body']; exit;
}

function login(): array {
    require_method('POST'); $body = request_json();
    $user = config_value('ADMIN_USER'); $password = config_value('ADMIN_PASSWORD');
    if ($user === '' || $password === '') throw new ApiError('Вход администратора не настроен на сервере', 503);
    if (!hash_equals($user, text_value($body['username'] ?? '', 160)) || !hash_equals($password, (string)($body['password'] ?? ''))) throw new ApiError('Неверный логин или пароль', 401);
    start_admin_session(); session_regenerate_id(true); $_SESSION['qurylys_admin'] = $user;
    return ['ok' => true];
}

function logout(): array { require_method('POST'); start_admin_session(); $_SESSION = []; session_destroy(); return ['ok' => true]; }

function sitemap(): never {
    $products = get_products(true); $urls = [app_url() . '/', app_url() . '/catalog.html', app_url() . '/contacts.html'];
    foreach ($products as $product) $urls[] = app_url() . '/product.html?id=' . rawurlencode((string)$product['id']);
    header('Content-Type: application/xml; charset=utf-8');
    echo '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    foreach ($urls as $url) echo '<url><loc>' . htmlspecialchars($url, ENT_XML1) . '</loc></url>';
    echo '</urlset>'; exit;
}

try {
    $route = trim((string)($_GET['route'] ?? ''), '/');
    $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if ($route === '1c-exchange') exchange_run();
    if ($route === 'news') {
        require_method('GET');
        $posts = news_public(news_read());
        if (isset($_GET['id'])) {
            $matches = array_values(array_filter($posts, fn($post) => $post['id'] === (string)$_GET['id']));
            if (!$matches) throw new ApiError('Публикация не найдена', 404);
            send_json(['post'=>news_client($matches[0])]);
        }
        $posts = array_slice($posts, 0, max(1, min(1000, (int)($_GET['limit'] ?? 1000))));
        $posts = array_map(function($post) { unset($post['body'], $post['version']); return news_client($post); }, $posts);
        send_json(['posts'=>$posts]);
    }
    if ($route === 'admin/news') {
        admin_required();
        if ($method === 'GET') send_json(['posts'=>array_map('news_client', news_read())]);
        if ($method === 'POST') send_json(news_save(request_json()));
        throw new ApiError('Method not allowed', 405);
    }
    if ($route === 'catalog') { require_method('GET'); send_json(['products' => get_products(true), 'settings' => get_settings(), 'categories' => get_categories(true)]); }
    if ($route === 'settings') { require_method('GET'); send_json(['settings' => get_settings()]); }
    if ($route === 'products') { require_method('GET'); send_json(['products' => get_products(true)]); }
    if ($route === 'categories') { require_method('GET'); send_json(['categories' => get_categories(true)]); }
    if ($route === 'product') { require_method('GET'); send_json(['product' => get_product_by_id((string)($_GET['id'] ?? ''), true)]); }
    if ($route === 'hero-slides') { require_method('GET'); send_json(['slides' => get_slides(true)]); }
    if ($route === 'requests') send_json(save_request(), 201);
    if ($route === 'media') serve_storage((string)($_GET['bucket'] ?? ''), (string)($_GET['path'] ?? ''));
    if ($route === 'document') {
        admin_required(); $id = text_value($_GET['id'] ?? '', 100); if ($id === '') throw new ApiError('Файл не найден', 404);
        $rows = supabase_json('GET', rest_path('request_documents', '?id=eq.' . rawurlencode($id) . '&select=storage_path'));
        if (!is_array($rows) || empty($rows[0]['storage_path'])) throw new ApiError('Файл не найден', 404);
        serve_storage('request-documents', (string)$rows[0]['storage_path'], true);
    }
    if ($route === 'admin/login') send_json(login());
    if ($route === 'admin/logout') send_json(logout());
    if ($route === 'admin/session') {
        require_method('GET');
        admin_required();
        send_json(['ok' => true]);
    }
    if ($route === 'admin/products') {
        admin_required();
        if ($method === 'GET') send_json(['products' => get_products(false), 'settings' => array_merge(get_settings(), ['heroSlides' => get_slides(false)]), 'categories' => get_categories(false)]);
        if ($method === 'PUT') send_json(store_products(request_json()));
        throw new ApiError('Method not allowed', 405);
    }
    if ($route === 'admin/commerce-import') {
        require_method('POST');
        admin_required();
        send_json(commerce_admin_import(request_json()));
    }
    if ($route === 'admin/photo-search') {
        require_method('POST'); admin_required();
        send_json(photo_search((string)(request_json()['query'] ?? '')));
    }
    if ($route === 'admin/photo-download') {
        require_method('POST'); admin_required();
        photo_download(request_json());
    }
    if ($route === 'admin/categories') {
        admin_required();
        if ($method === 'GET') send_json(['categories' => get_categories(false)]);
        if ($method === 'PUT') send_json(store_categories(request_json()));
        throw new ApiError('Method not allowed', 405);
    }
    if ($route === 'admin/settings') {
        admin_required();
        if ($method === 'GET') send_json(['settings' => array_merge(get_settings(), ['heroSlides' => get_slides(false)])]);
        if ($method === 'PUT') send_json(store_settings(request_json()));
        throw new ApiError('Method not allowed', 405);
    }
    if ($route === 'admin/requests') send_json(admin_requests($method));
    if ($route === 'sitemap') sitemap();
    throw new ApiError('Not found', 404);
} catch (ApiError $error) {
    send_json(['error' => $error->getMessage()], $error->httpStatus);
} catch (Throwable $error) {
    error_log('[777 API] ' . $error->getMessage());
    send_json(['error' => 'Внутренняя ошибка сервера'], 500);
}
