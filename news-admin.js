(() => {
  const $ = id => document.getElementById(id);
  let posts = []; let editing = null; let cover = null; let blocks=[];let generation=0;let uploads=0;
  function status(id, message, ok) { $(id).className = 'form-status ' + (ok ? 'is-success':'is-error'); $(id).textContent = message; }
  async function request(options) {
    const response = await fetch('/api/admin/news', {credentials:'same-origin',cache:'no-store',...options});
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Ошибка загрузки'); return data;
  }
  async function load() {
    status('newsAdminStatus','Загружаем публикации…',true);
    try {
      posts = (await request()).posts;
      $('newsAdminList').replaceChildren();
      for (const post of [...posts].reverse()) {
        const row = document.createElement('article'); row.className = 'category-admin-row';
        const text = document.createElement('div'); const title = document.createElement('b'); title.textContent = post.title;
        const info = document.createElement('small'); info.textContent = (post.kind === 'tips'?'Совет':'Новость') + ' · ' + (post.published?'Опубликовано':'Черновик');
        text.append(title,info);
        const edit = document.createElement('button'); edit.type='button'; edit.className='table-action'; edit.textContent='Редактировать'; edit.addEventListener('click',()=>open(post));
        row.append(text,edit); $('newsAdminList').append(row);
      }
      status('newsAdminStatus', posts.length ? 'Публикаций: '+posts.length : 'Публикаций пока нет. Создайте первую новость или совет.', true);
    } catch(error) { status('newsAdminStatus',error.message,false); }
  }
  function open(post=null) {
    generation++;uploads=0;editing=post; cover=null; $('newsForm').hidden=false;syncSubmit();
    $('newsFormTitle').textContent=post?'Редактирование публикации':'Новая публикация';
    for (const [id,key] of [['newsTitle','title'],['newsSummary','summary'],['newsKind','kind']]) $(id).value=post?.[key] || (key==='kind'?'news':'');
    blocks=post?.blocks?.length?post.blocks.map(block=>({...block})):[{type:'text',text:post?.body||''}];
    renderBlocks();
    $('newsImage').value=post?.image?.startsWith('https://')?post.image:'';
    $('newsImageFile').value=''; $('newsPublished').checked=!!post?.published;
    $('newsImagePreview').hidden=!post?.image; $('newsImagePreview').src=post?.image || '';
    $('newsSaveStatus').className='form-status';
    $('newsForm').scrollIntoView({block:'start',behavior:'smooth'}); $('newsTitle').focus();
  }
  document.querySelector('[data-tab="news"]').addEventListener('click',load);
  $('newNews').addEventListener('click',()=>open());
  $('cancelNews').addEventListener('click',()=>{ generation++;uploads=0;$('newsForm').hidden=true; cover=null;syncSubmit(); });
  function syncSubmit(){ $('newsForm').querySelector('[type="submit"]').disabled=uploads>0; }
  async function uploadImage(file){
      if(!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size>10*1024*1024) throw new Error('Выберите JPG, PNG или WebP до 10 МБ');
      const url=URL.createObjectURL(file); const image=new Image();
      try { image.src=url; await image.decode(); } finally { URL.revokeObjectURL(url); }
      if(image.naturalWidth*image.naturalHeight>40000000) throw new Error('Изображение слишком большое');
      const scale=Math.min(1,1400/image.naturalWidth,1100/image.naturalHeight);
      const canvas=document.createElement('canvas'); canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);
      const context=canvas.getContext('2d');context.drawImage(image,0,0,canvas.width,canvas.height);
      let quality=.82;let encoded=canvas.toDataURL('image/webp',quality);
      while(encoded.length>550000 && quality>.4){quality-=.08;encoded=canvas.toDataURL('image/webp',quality);}
      if(encoded.length>550000)throw new Error('Изображение слишком сложное. Уменьшите размер файла.');
      const result=await request({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'upload_image',image:encoded})});
      return result.image;
  }
  async function handleUpload(file, apply){
    if(!file)return;
    const current=generation;uploads++;syncSubmit();status('newsSaveStatus','Загружаем изображение…',true);
    try{const image=await uploadImage(file);if(current===generation){apply(image);status('newsSaveStatus','Изображение загружено. Сохраните публикацию.',true);}}
    catch(error){if(current===generation)status('newsSaveStatus',error.message,false);}
    finally{if(current===generation){uploads--;syncSubmit();}}
  }
  $('newsImageFile').addEventListener('change',event=>{
    handleUpload(event.target.files[0],image=>{cover=image;$('newsImagePreview').src=image;$('newsImagePreview').hidden=false;});
  });
  function renderBlocks(){
    const mount=$('newsBlocks');mount.replaceChildren();
    blocks.forEach((block,index)=>{
      const section=document.createElement('section');section.className='news-editor-block';
      const tools=document.createElement('div');tools.className='news-block-tools';
      const heading=document.createElement('b');heading.textContent=(index+1)+'. '+(block.type==='text'?'Текст':'Изображение');tools.append(heading);
      for(const [text,label,action,disabled] of [
        ['↑','Переместить блок вверх',()=>{[blocks[index-1],blocks[index]]=[blocks[index],blocks[index-1]];renderBlocks();},index===0],
        ['↓','Переместить блок вниз',()=>{[blocks[index+1],blocks[index]]=[blocks[index],blocks[index+1]];renderBlocks();},index===blocks.length-1],
        ['Удалить','Удалить блок',()=>{if(block.type==='image'||block.text?.trim()){if(!confirm('Удалить этот блок из публикации?'))return;}blocks.splice(index,1);renderBlocks();},false]
      ]){const button=document.createElement('button');button.type='button';button.textContent=text;button.setAttribute('aria-label',label);button.disabled=disabled;button.addEventListener('click',action);tools.append(button);}
      section.append(tools);
      const field=(label,key,multiline=false)=>{
        const wrapper=document.createElement('label');wrapper.textContent=label;
        const input=document.createElement(multiline?'textarea':'input');if(multiline)input.rows=6;
        input.value=block[key]||'';input.maxLength=key==='text'?40000:key==='caption'?500:key==='alt'?300:3000;
        input.addEventListener('input',()=>{block[key]=input.value;});wrapper.append(input);section.append(wrapper);return input;
      };
      if(block.type==='text')field('Текст блока','text',true);
      else{
        const preview=document.createElement('img');preview.className='news-block-preview';preview.alt=block.alt||'Изображение в публикации';preview.hidden=!block.src;if(block.src)preview.src=block.src;
        section.append(preview);
        const source=field('Ссылка на изображение','src');source.addEventListener('change',()=>{preview.src=source.value;preview.hidden=!source.value;});
        const label=document.createElement('label');label.textContent='Или загрузить файл';const file=document.createElement('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';label.append(file);section.append(label);
        file.addEventListener('change',()=>handleUpload(file.files[0],image=>{if(blocks.includes(block)){block.src=image;source.value=image;preview.src=image;preview.hidden=false;}}));
        field('Описание изображения для доступности','alt');field('Подпись под изображением','caption');
      }
      mount.append(section);
    });
  }
  function addBlock(block){if(blocks.length>=60){status('newsSaveStatus','Можно добавить до 60 блоков.',false);return;}blocks.push(block);renderBlocks();$('newsBlocks').lastElementChild.querySelector('textarea,input')?.focus();}
  $('addNewsText').addEventListener('click',()=>addBlock({type:'text',text:''}));
  $('addNewsImage').addEventListener('click',()=>addBlock({type:'image',src:'',alt:'',caption:''}));
  $('newsForm').addEventListener('submit',async event=>{
    event.preventDefault();if(uploads)return; const submit=event.submitter;submit.disabled=true;
    try {
      const result=await request({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        id:editing?.id || '', version:editing?.version || '', title:$('newsTitle').value, summary:$('newsSummary').value,
        blocks, kind:$('newsKind').value, published:$('newsPublished').checked,
        image:cover || $('newsImage').value || editing?.image || ''
      })});
      editing=result.post;cover=null;$('newsForm').hidden=true;await load();status('newsAdminStatus','Публикация сохранена.',true);
    } catch(error) {status('newsSaveStatus',error.message,false);}
    finally {submit.disabled=false;}
  });
})();
