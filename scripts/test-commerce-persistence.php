<?php
class ApiError extends RuntimeException {}
function json_value($v) { return is_array($v) ? $v : []; }
function json_object_value($v) { return (object)$v; }
function rest_path($table, $query='') { return $table . $query; }
$db=['products'=>[], 'categories'=>[]];
function batch_upsert($table,$rows) { global $db; foreach($rows as $row) $db[$table][$row['id']]=$row; }
function supabase_json($method,$path,$payload=null,$headers=[]) {
 global $db; $table=strtok($path,'?'); parse_str(parse_url($path,PHP_URL_QUERY) ?? '', $q);
 if($method==='GET') {
  $rows=array_values($db[$table]);
  if(isset($q['id']) && str_starts_with($q['id'],'in.(')) {
   $ids=json_decode('['.substr($q['id'],4,-1).']',true);
   $rows=array_values(array_filter($rows,fn($row)=>in_array($row['id'],$ids,true)));
  }
  return array_slice($rows,(int)($q['offset']??0),500);
 }
 if($method==='POST') { foreach($payload as $row) if(!isset($db[$table][$row['id']])) $db[$table][$row['id']]=$row; return []; }
 if($method==='PATCH') { $id=substr($q['id'],3); $db[$table][$id]=array_merge($db[$table][$id],$payload); return []; }
 throw new Exception('Unexpected mutation');
}
require __DIR__.'/../api/commerce-import.php';
$body=['catalogXml'=>file_get_contents($argv[1]),'offersXml'=>file_get_contents($argv[2])];
commerce_import($body);
$importedCount=count($db['products']);
$id=array_key_first($db['products']);
if($db['products'][$id]['is_active']!==false) throw new Exception('New active');
$db['products'][$id]['is_active']=true; $db['products'][$id]['image_path']='keep.webp';
$db['products'][$id]['category_id']='manual-tools';
foreach($db['categories'] as $category) if($category['is_active']!==false) throw new Exception('Imported category visible');
$db['products']['manual']=['id'=>'manual','name'=>'Keep'];
commerce_import($body);
if(count($db['products'])!==$importedCount+1 || !$db['products'][$id]['is_active'] || $db['products'][$id]['image_path']!=='keep.webp') throw new Exception('Repeat corrupted data');
if($db['products'][$id]['category_id']!=='manual-tools') throw new Exception('Manual category overwritten');
$batch = commerce_import($body, 0, 25);
if ($batch['next'] !== 25 || $batch['total'] !== $importedCount || $batch['updated'] !== 25) throw new Exception('Import batching');
if (($argv[3] ?? '') === '--staged') {
 $prepared=commerce_admin_import(array_merge($body,['action'=>'prepare']));
 $previous=0;
 do {
  $step=commerce_admin_import(['action'=>'step','token'=>$prepared['token']]);
  if($step['next'] <= $previous || $step['next']-$previous > 25) throw new Exception('Invalid staged progress');
  $previous=$step['next'];
 } while(!$step['done']);
 $repeat=commerce_admin_import(['action'=>'step','token'=>$prepared['token']]);
 if($repeat['next']!==$importedCount || $repeat['created']!==0 || $repeat['updated']!==$importedCount) throw new Exception('Staged replay failed');
 if(count($db['products'])!==$importedCount+1 || $db['products'][$id]['category_id']!=='manual-tools') throw new Exception('Staged import corrupted records');
 echo 'PASS: full staged import and completion replay: '.$importedCount.' products'.PHP_EOL;
}
echo 'PASS: inactive insert, repeat without duplicates, active/image preservation, manual record preserved'.PHP_EOL;
