const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
async function scenario(fail) {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id,{value:'individual',innerHTML:'',textContent:'',files:[],addEventListener(){},querySelector(){return {textContent:''};}});
    return nodes.get(id);
  };
  const entries = [{id:'onec-actual-product',quantity:4}];
  const urls = [];
  const context = {
    document:{querySelector:node,querySelectorAll:()=>[],addEventListener(){}},
    window:{CartStore:{get:()=>entries},addEventListener(){}},
    AbortController,setTimeout,clearTimeout,
    fetch:async url => {
      urls.push(url);
      if(fail) throw Error('offline');
      return {ok:true,json:async()=>({product:{id:entries[0].id,name:'Реальный товар',brand:'Бренд'}})};
    }
  };
  vm.runInNewContext(fs.readFileSync('cart.js','utf8'),context);
  assert.match(node('#cartItems').innerHTML,/Загружаем товар/);
  assert.doesNotMatch(node('#cartItems').innerHTML,/Корзина пока пуста/);
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(urls,['/api/product?id=onec-actual-product']);
  assert.equal(node('#cartItemsCount').textContent,'4 товара');
  assert.doesNotMatch(node('#cartItems').innerHTML,/Корзина пока пуста/);
  if(fail){
    assert.match(node('#cartItems').innerHTML,/Повторить загрузку/);
    assert.equal(node('#cartSubmit').disabled,true);
  }else{
    assert.match(node('#cartItems').innerHTML,/Реальный товар/);
    assert.match(node('#cartItems').innerHTML,/value="4"/);
    assert.equal(node('#cartSubmit').disabled,false);
  }
}
(async()=>{await scenario(false);await scenario(true);console.log('Cart selected-ID loading, quantities and failure visibility passed.');})().catch(e=>{console.error(e);process.exitCode=1});
