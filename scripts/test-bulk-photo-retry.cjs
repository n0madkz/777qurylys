const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
  const nodes=[];const calls=[];let offline=true;
  const node=()=>({append(){},setAttribute(){},className:'',textContent:''});
  const context={AbortController,TypeError,Error,CustomEvent:class{},
    document:{querySelector:()=>node(),createElement:()=>{const n=node();nodes.push(n);return n;},dispatchEvent(){}},
    sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},
    setTimeout:(fn,delay)=>{if(delay<60000)queueMicrotask(fn);return 1;},clearTimeout(){},
    fetch:async(url,options)=>{
      if(url.endsWith('session'))return {ok:true};
      calls.push({url,body:JSON.parse(options.body)});
      if(offline){offline=false;throw new TypeError('Failed to fetch');}
      return {ok:true,json:async()=>url.endsWith('fill-brands')?{done:true,next:3954,updated:1852,unknown:2102}:{done:true}};
    }
  };
  vm.runInNewContext(fs.readFileSync('bulk-photos-admin.js','utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls.length,3);
  assert.deepEqual(calls[0],calls[1],'Network failure must retry same brand offset');
  assert.ok(calls[2].url.endsWith('bulk-photos'),'Brand scan must precede photo search');
  assert.ok(nodes.some(n=>n.textContent.includes('проверено товаров 3954')),'Show full-catalog count');
  console.log('PASS: network retry resumes same offset, full brand scan precedes photos.');
})().catch(error=>{console.error(error);process.exitCode=1});
