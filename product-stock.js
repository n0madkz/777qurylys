((root)=>{
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function markup(product){
    const stocks=product?.warehouseStocks??product?.metadata?.warehouseStocks;
    if(!Array.isArray(stocks)||!stocks.length)return '<p class="product-stock">Наличие уточняется</p>';
    const visible=stocks.filter(s=>s && s.id!=='8dbb6398-5f47-11f1-aee3-a0ad9f27f6e2' && !/^магазин\s*склад\s*1$/iu.test(String(s.name||'').trim()));
    if(!visible.length)return '<p class="product-stock">Наличие уточняется</p>';
    const unit=escape(product.unit??product.metadata?.unit??'шт.');
    return '<div class="product-stock">'+visible.map(s=>{
      const number=Number(s.quantity);
      if(s.quantity===null||s.quantity===''||!Number.isFinite(number))return '<p>'+escape(s.name)+': наличие уточняется</p>';
      return '<p class="'+(number>0?'product-stock--available':'product-stock--empty')+'">'+escape(s.name)+': <strong>'+(number>0?new Intl.NumberFormat('ru-RU',{maximumFractionDigits:3}).format(number)+' '+unit:'Нет в наличии')+'</strong></p>';
    }).join('')+'</div>';
  }
  root.ProductStock={markup};
})(typeof window!=='undefined'?window:globalThis);
