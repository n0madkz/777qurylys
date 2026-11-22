<?php
declare(strict_types=1);

function apply_verified_photo(): array {
    require_method('POST');
    admin_required();
    // Pilot: match the stable 1C code, never the list position or a guessed name.
    $rows = supabase_json('GET', rest_path('products','?select=*&metadata->>code=eq.'.rawurlencode('НФ-00000560').'&limit=2'));
    if (!is_array($rows) || count($rows)!==1) throw new ApiError('Не найден единственный товар с кодом 1С НФ-00000560.',409);
    $row=$rows[0];
    if (strcasecmp(trim((string)$row['brand']),'IVT')!==0 || !preg_match('#RHM-1000[\\\\/]+2F#i',(string)$row['name'])) throw new ApiError('Бренд или модель товара не совпадают с проверенной фотографией.',409);
    $image='assets/product-photos/ivt-rhm-1000-2f-bmc.png';
    if (!in_array((string)($row['image_path']??''),['','https://ivt.kz/userfiles/item/5459/smallimage1.png',$image],true)) throw new ApiError('У товара другое фото, добавленное вручную. Оно сохранено без изменений.',409);
    $metadata=json_value($row['metadata']??[]);
    $metadata['thumbnail']=$image;
    $metadata['photo_source']=['page'=>'https://ivt.kz/catalog/powertools/perforator/item/5459','image'=>'https://ivt.kz/userfiles/item/5459/fullimage1.png','brand'=>'IVT','model'=>'RHM-1000/2F BMC','verified_at'=>'2026-11-22'];
    supabase_json('PATCH',rest_path('products','?id=eq.'.rawurlencode((string)$row['id'])),['image_path'=>$image,'image_alt'=>'Перфоратор IVT RHM-1000/2F BMC','metadata'=>json_object_value($metadata)],['Prefer: return=minimal']);
    return ['ok'=>true,'message'=>'Оригинальное фото IVT установлено для товара НФ-00000560. Обновите таблицу товаров.'];
}
