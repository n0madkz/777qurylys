<?php
class ApiError extends RuntimeException {}
function json_value($value){return is_array($value)?$value:[];}
function json_object_value($value){return (object)$value;}
function rest_path($table,$query=''){return $table.$query;}
$db=['categories'=>[],'products'=>[
 'a'=>['id'=>'a','name'=>'Мультиметр цифровой','category_id'=>'shop-other','image_path'=>'keep.webp','metadata'=>['code'=>'001','warehouseStocks'=>[['quantity'=>7]]]],
 'b'=>['id'=>'b','name'=>'Смеситель DAIVA','category_id'=>'onec-old','metadata'=>['code'=>'002']],
 'c'=>['id'=>'c','name'=>'Ручная категория','category_id'=>'shop-other','metadata'=>['code'=>'003','category_manual'=>true]]
]];
function batch_upsert($table,$rows){global $db;foreach($rows as $row)$db[$table][$row['id']]=$row;}
function supabase_json($method,$path,$payload=null,$headers=[]){
 global $db;$table=strtok($path,'?');parse_str(parse_url($path,PHP_URL_QUERY)??'',$query);
 if($method==='GET')return array_slice(array_values($db[$table]),(int)($query['offset']??0),(int)($query['limit']??500));
 if($method==='PATCH'){$id=substr($query['id'],3);if(array_diff(array_keys($payload),['category_id','metadata']))throw new Exception('Unexpected product mutation');$db[$table][$id]=array_merge($db[$table][$id],$payload);return [];}
 throw new Exception('Unexpected operation');
}
require __DIR__.'/../api/commerce-import.php';
$result=commerce_categorize_step(0);
if($result['next']!==3||$result['updated']!==2||!$result['done'])throw new Exception('Wrong progress');
if($db['products']['a']['category_id']!=='shop-electrical-meters'||$db['products']['b']['category_id']!=='shop-plumbing-faucets')throw new Exception('Categories not repaired');
if($db['products']['c']['category_id']!=='shop-other')throw new Exception('Manual category lost');
if($db['products']['a']['image_path']!=='keep.webp'||((array)$db['products']['a']['metadata'])['warehouseStocks'][0]['quantity']!==7)throw new Exception('Product data lost');
echo "PASS: repair old automatic categories, assign imported groups, preserve manual categories, photos and stocks\n";
