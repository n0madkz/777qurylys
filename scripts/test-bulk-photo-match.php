<?php
require dirname(__DIR__).'/api/bulk-photos.php';
function check_photo(bool $ok):void {if(!$ok)throw new RuntimeException('Photo match failed');}
check_photo(bulk_photo_model(['name'=>'Перфоратор RHM-1000\\2F BMC IVT'])==='RHM-1000/2F');
check_photo(bulk_photo_model(['name'=>'Кисть 25мм','sku'=>'НФ-00000123'])==='');
check_photo(bulk_photo_matches('IVT RHM-1000/2F BMC','IVT','RHM-1000/2F'));
check_photo(!bulk_photo_matches('IVT RHM-1000/3F BMC','IVT','RHM-1000/2F'));
check_photo(!bulk_photo_matches('IVT RHM-1000/2F2 BMC','IVT','RHM-1000/2F'));
check_photo(!bulk_photo_matches('BOSCH RHM-1000/2F','IVT','RHM-1000/2F'));
echo "Brand, manufacturer model and 1C code exclusions passed.\n";
