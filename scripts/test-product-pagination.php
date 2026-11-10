<?php
// Exercise the actual list function without running the HTTP router or a live DB.
$source = file_get_contents(__DIR__ . '/../api/index.php');
$start = strpos($source, 'function get_products(');
$end = strpos($source, 'function get_product_by_id(', $start);
eval(substr($source, $start, $end - $start));
function rest_path($table, $query = '') { return $table . $query; }
function product_client($row) { return $row; }
function supabase_json($method, $path) {
    global $fixture;
    parse_str(parse_url($path, PHP_URL_QUERY), $query);
    $rows = isset($query['is_active']) ? array_values(array_filter($fixture, fn($row) => $row['is_active'])) : $fixture;
    return array_slice($rows, (int)($query['offset'] ?? 0), min(1000, (int)($query['limit'] ?? 1000)));
}
foreach ([0, 500, 1000, 1268, 1500] as $size) {
    $fixture = [];
    for ($i = 0; $i < $size; $i++) $fixture[] = ['id' => (string)$i, 'is_active' => $i % 2 === 0];
    $all = get_products(false);
    if (count($all) !== $size || count(array_unique(array_column($all, 'id'))) !== $size) throw new Exception('Incomplete admin list: ' . $size);
    if (count(get_products(true)) !== (int)ceil($size / 2)) throw new Exception('Public filter broken');
}
echo "PASS: full admin list, unique IDs, public active filter (0 to 1500 rows)\n";
