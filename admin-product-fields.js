/* Shared product identifiers, including legacy records with nested metadata. */
((root) => {
  const field = (product, name) => product?.[name] ?? product?.metadata?.[name] ?? '';
  const values = value => Array.isArray(value) ? value.map(values).join(' ') : String(value ?? '');
  const visibleStocks = product => {
    const stocks = field(product, 'warehouseStocks');
    return Array.isArray(stocks) ? stocks.filter(stock => stock &&
      stock.id !== '8dbb6398-5f47-11f1-aee3-a0ad9f27f6e2' && !/^магазин\s*склад\s*1$/iu.test(String(stock.name || '').trim())) : [];
  };
  const matches = (product, name, query) => {
    const needle = String(query || '').trim().toLocaleLowerCase();
    if (!needle) return true;
    return [name, product.brand || product.manufacturer, field(product, 'sku'),
      field(product, 'barcode'), field(product, 'code'), product.id, field(product, 'onec_id')]
      .some(value => values(value).toLocaleLowerCase().includes(needle));
  };
  const collator = new Intl.Collator('ru', {numeric:true,sensitivity:'base'});
  const sortRows = (rows, valueFor, direction = 1) => rows.map((row,index)=>({row,index,value:valueFor(row)}))
    .sort((a,b)=>{
      const empty = value => value === null || value === undefined || String(value).trim() === '';
      const ae=empty(a.value),be=empty(b.value);
      if(ae!==be)return ae?1:-1;
      const comparison=typeof a.value==='number' && typeof b.value==='number'
        ? a.value-b.value : collator.compare(String(a.value ?? ''),String(b.value ?? ''));
      return comparison*(direction<0?-1:1)||a.index-b.index;
    }).map(item=>item.row);
  const api = { field, values, matches, visibleStocks, sortRows };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AdminProductFields = api;
})(typeof window !== 'undefined' ? window : globalThis);
