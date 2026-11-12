(() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const url = id => 'catalog.html?category=' + encodeURIComponent(id);
  const nav=document.querySelector('.main-nav');
  if(nav && !nav.querySelector('[href="news.html"]')) {
    const link=document.createElement('a');link.href='news.html';link.textContent='Новости и советы';
    if(location.pathname.endsWith('/news.html'))link.setAttribute('aria-current','page');
    nav.append(link);
  }
  for(const button of document.querySelectorAll('.catalog-button')) {
    const row=button.closest('.header__nav-row') || button.parentElement;
    row.classList.add('catalog-dropdown-host');
    const menu=document.createElement('section');menu.className='catalog-dropdown';menu.hidden=true;menu.id='catalogDropdown';menu.setAttribute('aria-label','Разделы каталога');row.append(menu);
    button.setAttribute('aria-controls',menu.id);button.setAttribute('aria-expanded','false');
    let loaded=false;
    function close(){menu.hidden=true;button.setAttribute('aria-expanded','false');}
    function renderMenu(categories) {
        const map=new Map(categories.map(item=>[item.id,item]));
        function branch(item,trail=new Set()) {
          if(trail.has(item.id))return '';
          const next=new Set(trail);next.add(item.id);
          const children=categories.filter(child=>child.parent===item.id);
          const link='<a href="'+url(item.id)+'">'+escape(item.name)+'</a>';
          if(!children.length)return link;
          return '<details><summary>'+escape(item.name)+'</summary><div><a class="catalog-dropdown-all" href="'+url(item.id)+'">Все товары раздела</a>'+children.map(child=>branch(child,next)).join('')+'</div></details>';
        }
        menu.innerHTML='<div class="catalog-dropdown-top"><b>Каталог товаров</b><a href="catalog.html">Все товары →</a></div><div class="catalog-dropdown-grid">'+categories.filter(item=>!item.parent || !map.has(item.parent)).map(item=>'<div>'+branch(item)+'</div>').join('')+'</div>';
        loaded=true;
    }
    const cache=window.StoreCategoryCache;
    if(cache?.data)renderMenu(cache.data);
    cache?.subscribe(renderMenu);
    cache?.ready.then(categories=>{
      if(categories)renderMenu(categories);
      else if(!loaded)menu.innerHTML='<a href="catalog.html">Открыть весь каталог →</a><p>Список разделов временно недоступен.</p>';
    });
    button.addEventListener('click',event=>{
      event.preventDefault();event.stopImmediatePropagation();
      if(!menu.hidden){close();return;}
      menu.hidden=false;button.setAttribute('aria-expanded','true');
      if(!loaded&&!menu.innerHTML)menu.innerHTML='<a href="catalog.html">Открыть весь каталог →</a><p role="status">Получаем актуальные разделы…</p>';
    },true);
    document.addEventListener('click',event=>{if(!menu.contains(event.target)&&!button.contains(event.target))close();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden){close();button.focus();}});
  }
  const date = value => new Date(value).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Almaty'});
  function card(post) {
    const article=document.createElement('article');article.className='news-card';
    const href='news.html?id='+encodeURIComponent(post.id);
    article.innerHTML=(post.image?'<a href="'+href+'" tabindex="-1" aria-hidden="true"><img src="'+escape(post.image)+'" alt="" loading="lazy" width="640" height="400"></a>':'')+
      '<div class="news-card-content"><span class="news-kind">'+(post.kind==='tips'?'Полезный совет':'Новости магазина')+'</span><time datetime="'+escape(post.date)+'">'+escape(date(post.date))+'</time><h3><a href="'+href+'">'+escape(post.title)+'</a></h3><p>'+escape(post.summary)+'</p><a class="text-link" href="'+href+'">Читать →</a></div>';
    return article;
  }
  const mount=document.getElementById('newsFeed');
  const articleMount=document.getElementById('newsArticle');
  const home=document.getElementById('productGrid');
  async function loadNews(){
    const id=new URLSearchParams(location.search).get('id');
    if(mount&&id){
      document.querySelector('.news-page .page-hero').hidden=true;
      mount.hidden=true;document.getElementById('newsFilters').hidden=true;articleMount.hidden=false;
      articleMount.textContent='Загружаем публикацию…';
      try {
        const response=await fetch('/api/news?id='+encodeURIComponent(id));const data=await response.json();if(!response.ok)throw new Error(data.error||'Публикация недоступна');
        const post=data.post;document.title=post.title+' — 777';
        articleMount.replaceChildren();
        const back=document.createElement('a');back.href='news.html';back.textContent='← Все публикации';
        const heading=document.createElement('h1');heading.textContent=post.title;
        const time=document.createElement('time');time.dateTime=post.date;time.textContent=date(post.date);
        articleMount.append(back,heading,time);
        if(post.image){const image=document.createElement('img');image.src=post.image;image.alt=post.title;image.className='news-article-cover';articleMount.append(image);}
        for(const text of post.body.split(/\n\s*\n/)){const paragraph=document.createElement('p');paragraph.textContent=text;articleMount.append(paragraph);}
      }catch(error){articleMount.textContent=error.message;}
      return;
    }
    if(!mount&&!home)return;
    let target=mount;
    if(home){
      const section=document.createElement('section');section.className='container news-home';
      section.innerHTML='<div class="section-heading"><div><p class="eyebrow">Практика и события</p><h2>Новости и полезные советы</h2></div><a class="text-link" href="news.html">Все публикации →</a></div><div class="news-grid"></div>';
      home.closest('section').insertAdjacentElement('afterend',section);target=section.querySelector('.news-grid');
    }
    target.textContent='Загружаем публикации…';
    try {
      const response=await fetch('/api/news'+(home?'?limit=3':''),{cache:'no-store'});if(!response.ok)throw new Error();
      const {posts}=await response.json();
      if(!Array.isArray(posts))throw new Error();
      let filter='all'; let shown=12;
      const more=document.getElementById('newsMore');
      function render(){
        const list=posts.filter(post=>filter==='all'||post.kind===filter);
        target.replaceChildren();
        for(const post of list.slice(0,home?3:shown))target.append(card(post));
        if(!list.length)target.textContent='Здесь скоро появятся новости магазина и полезные советы.';
        if(more)more.hidden=list.length<=shown;
      }
      document.querySelectorAll('[data-news-kind]').forEach(button=>button.addEventListener('click',()=>{
        filter=button.dataset.newsKind;shown=12;
        document.querySelectorAll('[data-news-kind]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));render();
      }));
      more?.addEventListener('click',()=>{shown+=12;render();});render();
    }catch(_){target.textContent='Публикации временно недоступны. Попробуйте обновить страницу позже.';}
  }
  loadNews();
})();
