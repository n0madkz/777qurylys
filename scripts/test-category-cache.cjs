const assert = require('node:assert/strict');
const vm = require('node:vm'); const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname,'../category-cache.js'),'utf8');
async function test(saved) {
 let resolveFetch, calls=0, stored;
 const context = {window:{},AbortController,Date,JSON,Set,setTimeout,clearTimeout,
   localStorage:{getItem:()=>saved,setItem:(_,value)=>{stored=JSON.parse(value);}},
   fetch:()=>{calls++;return new Promise(resolve=>{resolveFetch=resolve;});}};
 vm.runInNewContext(source,context);
 assert.equal(calls,1,'Must prefetch before clicks');
 const cache=context.window.StoreCategoryCache;
 if(saved)assert.equal(cache.data[0].name,'Cached category','Immediate cached menu');
 else assert.equal(cache.data,null);
 let updates=0;cache.subscribe(()=>updates++);
 resolveFetch({ok:true,json:async()=>({categories:[{id:'fresh',name:'Fresh category'}, {id:'onec-private',name:'Hidden import'}]})});
 await cache.ready;
 assert.equal(cache.data.length,1);assert.equal(cache.data[0].name,'Fresh category');
 assert.equal(updates,1);assert.equal(stored.data[0].id,'fresh');
}
(async()=>{await test(null);await test(JSON.stringify({time:Date.now(),data:[{id:'cached',name:'Cached category'}]}));console.log('PASS: early prefetch, immediate cached data, background refresh, hidden import filtering');})().catch(error=>{console.error(error);process.exitCode=1;});
