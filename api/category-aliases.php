<?php
declare(strict_types=1);

function category_aliases(): array {
    return [
        'materials'=>'shop-materials','finishing'=>'shop-materials',
        'tools'=>'shop-hand','hand-tools'=>'shop-hand','power-tools'=>'shop-power',
        'measuring-tools'=>'shop-hand-measuring','bity-i-golovki'=>'shop-accessories-bits',
        'plumbing'=>'shop-plumbing','pipes-fittings'=>'shop-plumbing','faucets'=>'shop-plumbing-faucets',
        'electrics'=>'shop-electrical','paint'=>'shop-paint',
        'dry-mixes'=>'shop-materials-drymix','waterproofing'=>'shop-materials-waterproof',
        'insulation'=>'shop-materials-insulation','roofing'=>'shop-materials-roof',
        'lumber'=>'shop-materials-wood','fasteners'=>'shop-fasteners',
        'tile'=>'shop-materials-tile','flooring'=>'shop-materials-floor',
        'sredstva-individualnoy-zaschity'=>'shop-safety'
    ];
}
function canonical_category_id(string $id): string { return category_aliases()[$id] ?? $id; }

function category_merge_step(int $offset): array {
    if($offset<0)throw new ApiError('Некорректный шаг',400);
    $rows=array_column(commerce_all_rows('categories'),null,'id');
    if($offset===0){
        $roots=[];$children=[];
        foreach(product_taxonomy_categories() as $row)if(!isset($rows[$row['id']])){
            if($row['parent_id']===null)$roots[]=$row;else $children[]=$row;
        }
        if($roots)batch_upsert('categories',$roots);
        if($children)batch_upsert('categories',$children);
    }
    $plan=array_filter(category_aliases(),fn($target,$source)=>isset($rows[$source]),ARRAY_FILTER_USE_BOTH);
    $step=array_slice($plan,$offset,5,true);
    foreach($step as $source=>$target){
        // Move references before archiving; IDs and all other product fields stay unchanged.
        supabase_json('PATCH',rest_path('products','?category_id=eq.'.rawurlencode($source)),['category_id'=>$target],['Prefer: return=minimal']);
        supabase_json('PATCH',rest_path('categories','?parent_id=eq.'.rawurlencode($source)),['parent_id'=>$target],['Prefer: return=minimal']);
        supabase_json('PATCH',rest_path('categories','?id=eq.'.rawurlencode($source)),['is_active'=>false],['Prefer: return=minimal']);
    }
    $cache=category_menu_cache_path();if(is_file($cache))@unlink($cache);
    return ['ok'=>true,'next'=>$offset+count($step),'total'=>count($plan),'done'=>$offset+count($step)>=count($plan)];
}
