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
  const api = { field, values, matches, visibleStocks };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AdminProductFields = api;
})(typeof window !== 'undefined' ? window : globalThis);
