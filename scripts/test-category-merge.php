<?php
require __DIR__.'/../api/product-taxonomy.php';
require __DIR__.'/../api/category-aliases.php';
class ApiError extends RuntimeException {}
function rest_path($table,$query=''){return $table.$query;}
function category_menu_cache_path(){return __DIR__.'/.nonexistent-category-test-cache';}
$db=['categories'=>[
 'plumbing'=>['id'=>'plumbing','name'=>'Сантехника','parent_id'=>null,'is_active'=>true],
 'faucets'=>['id'=>'faucets','name'=>'Смесители','parent_id'=>'plumbing','is_active'=>true],
 'custom'=>['id'=>'custom','name'=>'Уникальная категория','parent_id'=>'plumbing','is_active'=>true]
], 'products'=>[['id'=>'keep-id','category_id'=>'faucets','name'=>'Смеситель','image_path'=>'keep.webp','metadata'=>['code'=>'001']]]];
function commerce_all_rows($table){global $db;return array_values($db[$table]);}
function batch_upsert($table,$rows){global $db;foreach($rows as $row)$db[$table][$row['id']]=$row;}
function supabase_json($method,$path,$payload=null,$headers=[]){
 global $db;if($method!=='PATCH')throw new Exception('Unexpected request');
 $table=strtok($path,'?');parse_str(parse_url($path,PHP_URL_QUERY),$query);
 foreach($db[$table] as &$row){foreach($query as $field=>$condition)if(($row[$field]??null)!==substr($condition,3))continue 2;$row=array_merge($row,$payload);}return [];
}
$known=array_column(product_taxonomy_categories(),null,'id');
foreach(category_aliases() as $source=>$target)if(!isset($known[$target])||canonical_category_id($target)!==$target)throw new Exception('Invalid canonical target');
$result=category_merge_step(0);
if(!$result['done']||$result['next']!==2)throw new Exception('Wrong merge progress');
if($db['products'][0]['category_id']!=='shop-plumbing-faucets'||$db['products'][0]['image_path']!=='keep.webp'||$db['products'][0]['id']!=='keep-id')throw new Exception('Product lost');
if($db['categories']['custom']['parent_id']!=='shop-plumbing')throw new Exception('Custom child lost');
if($db['categories']['plumbing']['is_active']||$db['categories']['faucets']['is_active'])throw new Exception('Legacy category not archived');
category_merge_step(0);
if(count($db['products'])!==1)throw new Exception('Repeat damaged records');
echo "PASS: canonical targets, reference migration, child preservation, archiving and repeat safety\n";
