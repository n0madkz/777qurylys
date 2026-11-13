const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
  let stored=JSON.stringify([{id:'NaN',quantity:2}]);
  let buttons=[];
  const grid={innerHTML:'',querySelectorAll(){
    buttons=[...this.innerHTML.matchAll(/data-add="([^"]+)"/g)].map(match=>({dataset:{add:match[1]}}));
    return buttons;
  }};
  const product={id:'onec-0686d986-6c8a-11f1-aee4-a0ad9f27f6e2',name:'Ceresit',active:true};
  const context={
    products:[],activeFilter:'all',lang:'ru',renderProducts(){},
    document:{readyState:'complete',querySelectorAll:()=>[],getElementById:id=>id==='productGrid'?grid:null,dispatchEvent(){}},
    window:{addEventListener(){}},localStorage:{getItem:()=>stored,setItem:(key,value)=>{stored=value;}},
    CustomEvent:class{},fetch:async url=>({ok:true,json:async()=>url.includes('products')?{products:[product]}:{categories:[]}})
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('cart-store.js','utf8'),context);
  assert.equal(context.window.CartStore.get().length,0,'Corrupt NaN ID must not stay in cart');
  vm.runInContext(fs.readFileSync('home-catalog.js','utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(buttons[0].dataset.add,product.id,'Homepage must preserve string ID');
  buttons[0].onclick();buttons[0].onclick();
  assert.equal(JSON.parse(stored)[0].id,product.id);
  assert.equal(JSON.parse(stored)[0].quantity,2);
  context.window.CartStore.add(NaN);
  assert.equal(JSON.parse(stored).length,1,'Reject numeric NaN');
  console.log('Homepage click → CartStore persistence: 1C string IDs, quantity and corrupt-ID guard passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
