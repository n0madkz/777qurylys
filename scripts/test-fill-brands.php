<?php
require dirname(__DIR__).'/api/product-brands.php';
$products=[];
for($i=0;$i<3954;$i++)$products[]=['id'=>sprintf('item-%04d',$i),'name'=>$i%2?'Ключ Ремоколор':'Эмаль Ultra Lines','brand'=>$i%10===0?'Мой бренд':''];
function rest_path($table,$query){return $table.$query;}
function supabase_json($method,$path,$payload=null,$headers=[]){
    global $products;parse_str(parse_url($path,PHP_URL_QUERY),$query);
    if($method==='GET')return array_slice($products,(int)$query['offset'],(int)$query['limit']);
    if(array_keys($payload)!==['brand'])throw new Exception('Unexpected product edits');
    if(!isset($query['or']))throw new Exception('Missing conditional write');
    $ids=json_decode('['.substr($query['id'],4,-1).']',true);
    if(!is_array($ids))throw new Exception('Invalid ID filter');
    $changed=[];
    foreach($products as &$product)if(in_array($product['id'],$ids,true)&&product_brand_is_empty($product['brand'])){
        $product['brand']=$payload['brand'];$changed[]=['id'=>$product['id']];
    }
    return $changed;
}
$offset=0;$updated=0;
do{$result=product_fill_brands($offset);$offset=$result['next'];$updated+=$result['updated'];}while(!$result['done']);
if($offset!==3954||$updated!==3558)throw new Exception('Did not cover entire catalogue');
foreach($products as $i=>$row)if($row['brand']!==($i%10===0?'Мой бренд':($i%2?'Ремоколор':'Ultra Lines')))throw new Exception('Brand mismatch');
if(product_fill_brands(0)['updated']!==0)throw new Exception('Repeated pass changed existing brands');
echo "PASS: all 3954 rows processed, 3558 empty brands filled, manual brands preserved, repeat safe.\n";
