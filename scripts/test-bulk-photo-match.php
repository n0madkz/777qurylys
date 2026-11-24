<?php
require dirname(__DIR__).'/api/bulk-photos.php';
function check_photo(bool $ok):void {if(!$ok)throw new RuntimeException('Photo match failed');}
check_photo(bulk_photo_model(['name'=>'Перфоратор RHM-1000\\2F BMC IVT'])==='RHM-1000/2F');
check_photo(bulk_photo_model(['name'=>'Кисть 25мм','sku'=>'НФ-00000123'])==='');
check_photo(bulk_photo_matches('IVT RHM-1000/2F BMC','IVT','RHM-1000/2F'));
check_photo(!bulk_photo_matches('IVT RHM-1000/3F BMC','IVT','RHM-1000/2F'));
check_photo(!bulk_photo_matches('IVT RHM-1000/2F2 BMC','IVT','RHM-1000/2F'));
check_photo(!bulk_photo_matches('BOSCH RHM-1000/2F','IVT','RHM-1000/2F'));
$name='Fawori ULTRA силиконовая шелковисто - матовая интерьерная краска 2,5л';
check_photo(bulk_photo_name_matches('Купить Fawori Ultra силиконовая шелковисто-матовая интерьерная краска 2.5 л','Fawori',$name));
check_photo(!bulk_photo_name_matches('Fawori Ultra силиконовая шелковисто-матовая интерьерная краска 9 л','Fawori',$name));
check_photo(!bulk_photo_name_matches('Fawori Ultra силиконовая фасадная краска 2.5 л','Fawori',$name));
check_photo(bulk_photo_name_matches('Dali краска резиновая коричневый 3 кг','Dali','краска резиновая Dali коричневый 3кг'));
check_photo(!bulk_photo_name_matches('Dali краска резиновая белый 3 кг','Dali','краска резиновая Dali коричневый 3кг'));
check_photo(!bulk_photo_name_matches('Dali краска резиновая коричневый 12 кг','Dali','краска резиновая Dali коричневый 3кг'));
check_photo(!bulk_photo_name_matches('Dali краска','Dali','краска Dali'));
check_photo(bulk_photo_name_matches('Дюбель-хомут 6–12 черный купить','','Дюбель хомут 6-12 черный'));
check_photo(!bulk_photo_name_matches('Дюбель хомут 12-16 черный','','Дюбель хомут 6-12 черный'));
check_photo(!bulk_photo_name_matches('Дюбель хомут 6-12 белый','','Дюбель хомут 6-12 черный'));
check_photo(!bulk_photo_name_matches('Дюбель хомут черный','','Дюбель хомут 6-12 черный'));
check_photo(!bulk_photo_name_matches('Краска 3л','','Краска 3л'));
echo "Brand, model, brandless names, size ranges, colour and pack-size checks passed.\n";
