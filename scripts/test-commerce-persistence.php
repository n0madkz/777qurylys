<?php
class ApiError extends RuntimeException {}
function json_value($v) { return is_array($v) ? $v : []; }
function json_object_value($v) { return (object)$v; }
function rest_path($table, $query='') { return $table . $query; }
$db=['products'=>[], 'categories'=>[]];
function batch_upsert($table,$rows) { global $db; foreach($rows as $row) $db[$table][$row['id']]=$row; }
function supabase_json($method,$path,$payload=null,$headers=[]) {
 global $db; $table=strtok($path,'?'); parse_str(parse_url($path,PHP_URL_QUERY) ?? '', $q);
 if($method==='GET') return array_slice(array_values($db[$table]),(int)($q['offset']??0),500);
 if($method==='POST') { foreach($payload as $row) if(!isset($db[$table][$row['id']])) $db[$table][$row['id']]=$row; return []; }
 if($method==='PATCH') { $id=substr($q['id'],3); $db[$table][$id]=array_merge($db[$table][$id],$payload); return []; }
 throw new Exception('Unexpected mutation');
}
require __DIR__.'/../api/commerce-import.php';
$body=['catalogXml'=>file_get_contents($argv[1]),'offersXml'=>file_get_contents($argv[2])];
commerce_import($body);
$id=array_key_first($db['products']);
if($db['products'][$id]['is_active']!==false) throw new Exception('New active');
$db['products'][$id]['is_active']=true; $db['products'][$id]['image_path']='keep.webp';
$db['products']['manual']=['id'=>'manual','name'=>'Keep'];
commerce_import($body);
if(count($db['products'])!==1269 || !$db['products'][$id]['is_active'] || $db['products'][$id]['image_path']!=='keep.webp') throw new Exception('Repeat corrupted data');
echo 'PASS: inactive insert, repeat without duplicates, active/image preservation, manual record preserved'.PHP_EOL;
