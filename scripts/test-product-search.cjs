const assert = require('node:assert/strict');
const { matches, visibleStocks } = require('../admin-product-fields.js');
const product = { id: 'onec-abc', sku: 'AB-25', barcode: '0012345678901', code: '01-00001167', brand: 'Brand' };
for (const query of ['AB-25', 'ab-25', '0012345678901', '00001167', '01-00001167', 'brand', 'коронка', 'onec-abc', '']) {
  assert.equal(matches(product, 'Алмазная коронка', query), true, query);
}
assert.equal(matches(product, 'Алмазная коронка', 'не существует'), false);
assert.equal(matches({ metadata: { barcode: '000123', code: 'K-77', sku: 'X-55' } }, '', '000123'), true);
assert.equal(matches({ barcode: ['12345', '67890'] }, '', '67890'), true);
assert.equal(matches({}, '', '123'), false);
assert.deepEqual(visibleStocks({ warehouseStocks: [{ id:'changed', name:'Магазин склад1', quantity:0 }, { id:'keep',name:'Магазин склад',quantity:3 }] }).map(stock => stock.id), ['keep']);
console.log('PASS: name, brand, SKU, barcode, product code, ID, leading zeros and legacy metadata');
