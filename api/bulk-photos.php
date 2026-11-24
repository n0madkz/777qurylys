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

function bulk_photo_name_words(string $text): array {
    $text=mb_strtolower(str_replace('ё','е',$text),'UTF-8');
    $text=preg_replace('/\s*[-–]\s*/u',' ',$text);
    preg_match_all('/[\pL][\pL\pN]*/u',$text,$matches);
    return array_values(array_unique(array_filter($matches[0],fn($word)=>mb_strlen($word,'UTF-8')>=3)));
}

function bulk_photo_measures(string $text): array {
    preg_match_all('/(?<!\d)(\d+(?:[.,]\d+)?)\s*(кг|kg|мл|ml|мм|mm|л|l|г|g)(?![\pL])/iu',$text,$matches,PREG_SET_ORDER);
    $units=['kg'=>'кг','ml'=>'мл','mm'=>'мм','l'=>'л','g'=>'г'];$result=[];
    foreach($matches as $match){$unit=mb_strtolower($match[2],'UTF-8');$result[]=((float)str_replace(',','.',$match[1])).($units[$unit]??$unit);}
    return array_unique($result);
}

function bulk_photo_name_matches(string $title,string $brand,string $name): bool {
    $compact=fn($value)=>mb_strtolower(preg_replace('/[^\pL\pN]/u','',$value),'UTF-8');
    if($brand!=='' && !str_contains($compact($title),$compact($brand)))return false;
    $brandWords=bulk_photo_name_words($brand);
    $words=array_values(array_diff(bulk_photo_name_words($name),$brandWords));
    // A short generic name such as "Краска Dali" cannot identify the product.
    if(count($words)<3)return false;
    $titleWords=bulk_photo_name_words($title);
    foreach($words as $word)if(!in_array($word,$titleWords,true))return false;
    foreach(bulk_photo_measures($name) as $measure)if(!in_array($measure,bulk_photo_measures($title),true))return false;
    // Range and size numbers (6-12, 3.5x30) are significant even without units.
    $numbers=function($text){preg_match_all('/\d+(?:[.,]\d+)?/u',$text,$matches);return array_map(fn($value)=>(string)(float)str_replace(',','.',$value),$matches[0]);};
    if(array_diff($numbers($name),$numbers($title)))return false;
    return true;
}

function bulk_photo_step(int $offset): array {
    if (config_value('BRAVE_SEARCH_API_KEY')==='' && (config_value('GOOGLE_SEARCH_API_KEY')==='' || config_value('GOOGLE_SEARCH_ENGINE_ID')==='')) throw new ApiError('Добавьте BRAVE_SEARCH_API_KEY в приватный файл .777qurylys.env на сервере. Существующие фото сохранены.',503);
    $offset=max(0,$offset);
    $rows=supabase_json('GET',rest_path('products','?select=*&order=id.asc&limit=1&offset='.$offset));
    if (!$rows) return ['done'=>true,'next'=>$offset,'message'=>'Проверка каталога завершена'];
    $row=$rows[0];$brand=trim((string)($row['brand']??''));
    if (product_brand_is_empty($brand)) $brand=product_brand_from_name((string)$row['name']);
    $result=['done'=>false,'next'=>$offset+1,'name'=>$row['name'],'status'=>'skipped'];
    if (!empty($row['image_path'])) { $result['reason']='Фото уже есть';return $result; }
    $model=bulk_photo_model($row);
    if ($brand==='' && !bulk_photo_name_matches((string)$row['name'],'',(string)$row['name'])) { $result['reason']='Слишком общее название: недостаточно характеристик для выбора фото';return $result; }
    $identity=$model!==''?$model:'name:'.hash('sha256',(string)$row['name']);
    $metadata=json_value($row['metadata']??[]);
    if (($metadata['auto_photo_check']['identity']??$metadata['auto_photo_check']['model']??'')===$identity && strtotime($metadata['auto_photo_check']['at']??'1970-01-01')>time()-7*86400) { $result['reason']='Уже проверен за последние 7 дней';return $result; }
    $found=photo_search($brand.' '.$model.' '.$row['name']);
    $picked=null;
    foreach($found['results'] as $item) {
        $matches=$model!=='' && $brand!==''?bulk_photo_matches($item['title'],$brand,$model):bulk_photo_name_matches($item['title'],$brand,(string)$row['name']);
        if (!$matches) continue;
        if ($model!=='' && preg_match('/краск|эмал|грунт|затирк/iu',(string)$row['name']) && !bulk_photo_name_matches($item['title'],$brand,(string)$row['name'])) continue;
        // Never substitute another pack size, even when the model is identical.
        if(array_diff(bulk_photo_measures((string)$row['name']),bulk_photo_measures($item['title'])))continue;
        try { $image=photo_fetch_image($item['url']);$picked=$item;break; }
        catch(ApiError $error) { if ($error->httpStatus!==422) throw $error; }
    }
    // Re-read the row to preserve edits made while the search was running.
    $fresh=supabase_json('GET',rest_path('products','?id=eq.'.rawurlencode((string)$row['id']).'&select=*&limit=1'));
    if (!$fresh || !empty($fresh[0]['image_path']) || $fresh[0]['name']!==$row['name'] || $fresh[0]['brand']!==$row['brand']) { $result['reason']='Карточка изменилась во время поиска';return $result; }
    $metadata=json_value($fresh[0]['metadata']??[]);
    $metadata['auto_photo_check']=['model'=>$model,'identity'=>$identity,'at'=>gmdate('c'),'matched'=>$picked!==null];
    $patch=['metadata'=>json_object_value($metadata)];
    if ($picked) {
        $extension=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'][$image['mime']];
        $path='auto/'.hash('sha256',(string)$row['id'].'|'.$picked['url']).'.'.$extension;
        storage_upload('product-images',$path,$image['bytes'],$image['mime']);
        $metadata['photo_source']=['page'=>$picked['page'],'image'=>$picked['url'],'brand'=>$brand,'model'=>$model,'verified_at'=>gmdate('c'),'method'=>$brand===''?'full-name-specification-match':($model!==''?'brand-model-match':'brand-full-name-match')];
        unset($metadata['thumbnail']);
        $patch=['image_path'=>$path,'image_alt'=>$row['name'],'metadata'=>json_object_value($metadata)];
        $result['status']='saved';$result['reason']='Фото загружено';
    } else $result['reason']=$model!==''?'Совпадение модели и фасовки не найдено':'Не найдено совпадение названия, характеристик и фасовки';
    // Conditional write prevents a new manually selected image being overwritten.
    supabase_json('PATCH',rest_path('products','?id=eq.'.rawurlencode((string)$row['id']).'&or=(image_path.is.null,image_path.eq.)'),$patch,['Prefer: return=minimal']);
    return $result;
}
