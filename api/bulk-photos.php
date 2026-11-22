<?php
declare(strict_types=1);

function bulk_photo_model(array $row): string {
    // 1C inventory codes and measurements are not manufacturer model identifiers.
    if (preg_match('~(?<![\pL\pN])([a-zа-я][a-zа-я0-9]*[-/][a-zа-я0-9/-]*\d[a-zа-я0-9/-]*)(?![\pL\pN])~iu',str_replace('\\','/',(string)$row['name']),$match)) return $match[1];
    $sku=trim((string)($row['sku']??''));
    if ($sku!=='' && !preg_match('/^(?:НФ-|01-|\d{8,})/u',$sku) && preg_match('/[a-zа-я]/iu',$sku) && preg_match('/\d/',$sku)) return $sku;
    return '';
}

function bulk_photo_matches(string $title,string $brand,string $model): bool {
    $normalize=fn($value)=>mb_strtolower(preg_replace('/[^\pL\pN]/u','',$value),'UTF-8');
    $tokens=array_map($normalize,preg_split('/\s+/u',$title)?:[]);
    $title=$normalize($title);$brand=$normalize($brand);$model=$normalize($model);
    return $brand!=='' && $model!=='' && str_contains($title,$brand) && in_array($model,$tokens,true);
}

function bulk_photo_step(int $offset): array {
    if (config_value('GOOGLE_SEARCH_API_KEY')==='' || config_value('GOOGLE_SEARCH_ENGINE_ID')==='') throw new ApiError('Автозагрузка фото ждёт GOOGLE_SEARCH_API_KEY и GOOGLE_SEARCH_ENGINE_ID в .777qurylys.env. Существующие фото сохранены.',503);
    $offset=max(0,$offset);
    $rows=supabase_json('GET',rest_path('products','?select=*&order=id.asc&limit=1&offset='.$offset));
    if (!$rows) return ['done'=>true,'next'=>$offset,'message'=>'Проверка каталога завершена'];
    $row=$rows[0];$brand=trim((string)($row['brand']??''));
    $result=['done'=>false,'next'=>$offset+1,'name'=>$row['name'],'status'=>'skipped'];
    if (!empty($row['image_path'])) { $result['reason']='Фото уже есть';return $result; }
    if ($brand==='' || $brand==='-') { $result['reason']='Не указан бренд';return $result; }
    $model=bulk_photo_model($row);
    if ($model==='') { $result['reason']='Нужен точный артикул производителя';return $result; }
    $metadata=json_value($row['metadata']??[]);
    if (($metadata['auto_photo_check']['model']??'')===$model && strtotime($metadata['auto_photo_check']['at']??'1970-01-01')>time()-7*86400) { $result['reason']='Уже проверен за последние 7 дней';return $result; }
    $found=google_photo_search($brand.' '.$model.' '.$row['name']);
    $picked=null;
    foreach($found['results'] as $item) {
        if (!bulk_photo_matches($item['title'],$brand,$model)) continue;
        try { $image=photo_fetch_image($item['url']);$picked=$item;break; }
        catch(ApiError $error) { if ($error->httpStatus!==422) throw $error; }
    }
    // Re-read the row to preserve edits made while the search was running.
    $fresh=supabase_json('GET',rest_path('products','?id=eq.'.rawurlencode((string)$row['id']).'&select=*&limit=1'));
    if (!$fresh || !empty($fresh[0]['image_path']) || $fresh[0]['name']!==$row['name'] || $fresh[0]['brand']!==$row['brand']) { $result['reason']='Карточка изменилась во время поиска';return $result; }
    $metadata=json_value($fresh[0]['metadata']??[]);
    $metadata['auto_photo_check']=['model'=>$model,'at'=>gmdate('c'),'matched'=>$picked!==null];
    $patch=['metadata'=>json_object_value($metadata)];
    if ($picked) {
        $extension=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'][$image['mime']];
        $path='auto/'.hash('sha256',(string)$row['id'].'|'.$picked['url']).'.'.$extension;
        storage_upload('product-images',$path,$image['bytes'],$image['mime']);
        $metadata['photo_source']=['page'=>$picked['page'],'image'=>$picked['url'],'brand'=>$brand,'model'=>$model,'verified_at'=>gmdate('c'),'method'=>'brand-model-match'];
        unset($metadata['thumbnail']);
        $patch=['image_path'=>$path,'image_alt'=>$row['name'],'metadata'=>json_object_value($metadata)];
        $result['status']='saved';$result['reason']='Фото загружено';
    } else $result['reason']='Точное совпадение не найдено';
    // Conditional write prevents a new manually selected image being overwritten.
    supabase_json('PATCH',rest_path('products','?id=eq.'.rawurlencode((string)$row['id']).'&or=(image_path.is.null,image_path.eq.)'),$patch,['Prefer: return=minimal']);
    return $result;
}
