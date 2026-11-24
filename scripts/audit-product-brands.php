<?php
require dirname(__DIR__).'/api/product-brands.php';
if(empty($argv[1])){fwrite(STDERR,"Provide import.xml path\n");exit(1);}
$root=simplexml_load_file($argv[1]);$brands=[];$total=0;$unknown=0;
foreach($root->xpath('//*[local-name()="Товар"]/*[local-name()="Наименование"]') as $name){
    $total++;$brand=product_brand_from_name((string)$name);
    if($brand===''){$unknown++;continue;}$brands[$brand]=($brands[$brand]??0)+1;
}
arsort($brands);echo json_encode(['total'=>$total,'recognized'=>$total-$unknown,'unknown'=>$unknown,'brands'=>$brands],JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT).PHP_EOL;
