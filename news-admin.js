(() => {
  const $ = id => document.getElementById(id);
  let posts = []; let editing = null; let cover = null;
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
    editing=post; cover=null; $('newsForm').hidden=false;
    $('newsFormTitle').textContent=post?'Редактирование публикации':'Новая публикация';
    for (const [id,key] of [['newsTitle','title'],['newsSummary','summary'],['newsBody','body'],['newsKind','kind']]) $(id).value=post?.[key] || (key==='kind'?'news':'');
    $('newsImage').value=post?.image?.startsWith('https://')?post.image:'';
    $('newsImageFile').value=''; $('newsPublished').checked=!!post?.published;
    $('newsImagePreview').hidden=!post?.image; $('newsImagePreview').src=post?.image || '';
    $('newsSaveStatus').className='form-status';
    $('newsForm').scrollIntoView({block:'start',behavior:'smooth'}); $('newsTitle').focus();
  }
  document.querySelector('[data-tab="news"]').addEventListener('click',load);
  $('newNews').addEventListener('click',()=>open());
  $('cancelNews').addEventListener('click',()=>{ $('newsForm').hidden=true; cover=null; });
  $('newsImageFile').addEventListener('change',async event=>{
    const file=event.target.files[0]; cover=null;
    if(!file) return;
    const submit=$('newsForm').querySelector('[type="submit"]'); submit.disabled=true;
    try {
      if(!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size>10*1024*1024) throw new Error('Выберите JPG, PNG или WebP до 10 МБ');
      const url=URL.createObjectURL(file); const image=new Image();
      try { image.src=url; await image.decode(); } finally { URL.revokeObjectURL(url); }
      if(image.naturalWidth*image.naturalHeight>40000000) throw new Error('Изображение слишком большое');
      const scale=Math.min(1,1600/image.naturalWidth,1200/image.naturalHeight);
      const canvas=document.createElement('canvas'); canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);
      const context=canvas.getContext('2d');context.drawImage(image,0,0,canvas.width,canvas.height);
      cover=canvas.toDataURL('image/webp',.82); $('newsImagePreview').src=cover; $('newsImagePreview').hidden=false;
      status('newsSaveStatus','Обложка подготовлена. Сохраните публикацию.',true);
    } catch(error) { status('newsSaveStatus',error.message,false);event.target.value=''; }
    finally { submit.disabled=false; }
  });
  $('newsForm').addEventListener('submit',async event=>{
    event.preventDefault(); const submit=event.submitter;submit.disabled=true;
    try {
      const result=await request({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        id:editing?.id || '', version:editing?.version || '', title:$('newsTitle').value, summary:$('newsSummary').value,
        body:$('newsBody').value, kind:$('newsKind').value, published:$('newsPublished').checked,
        image:cover || $('newsImage').value || editing?.image || ''
      })});
      editing=result.post;cover=null;$('newsForm').hidden=true;await load();status('newsAdminStatus','Публикация сохранена.',true);
    } catch(error) {status('newsSaveStatus',error.message,false);}
    finally {submit.disabled=false;}
  });
})();
