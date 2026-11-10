(() => {
  const $ = selector => document.querySelector(selector);
  const panel = $('#photoSearchPanel');
  const results = $('#photoSearchResults');
  const status = $('#photoSearchStatus');
  const query = $('#photoSearchQuery');
  let controller = null;
  let generation = 0;
  let selection = null;
  const context = () => $('#editId').value + '\n' + $('#productName').value;
  const updateLink = () => { $('#externalPhotoSearch').href = 'https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(query.value); };
  function reset() {
    generation++;
    controller?.abort(); selection?.abort();
    results.replaceChildren(); status.textContent = ''; panel.hidden = true;
    $('#runPhotoSearch').disabled = false;
  }
  document.addEventListener('product-photo-reset', reset);
  $('#closePhotoSearch').addEventListener('click', reset);
  $('#findProductPhoto').addEventListener('click', () => {
    reset(); panel.hidden = false;
    query.value = [$('#productName').value, $('#productBrand').value, $('#productForm').dataset.sku || ''].filter(Boolean).join(' ').slice(0, 350);
    updateLink(); query.focus();
  });
  query.addEventListener('input', updateLink);
  query.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); $('#runPhotoSearch').click(); }
  });
  $('#runPhotoSearch').addEventListener('click', async () => {
    if (!query.value.trim()) { status.textContent = 'Введите название товара.'; return; }
    controller?.abort(); controller = new AbortController();
    const signal = controller.signal; const current = ++generation; const product = context();
    const timer = setTimeout(() => controller?.abort(), 20000);
    $('#runPhotoSearch').disabled = true; results.replaceChildren(); status.textContent = 'Ищем фотографии…';
    try {
      const response = await fetch('/api/admin/photo-search', { method:'POST', credentials:'same-origin', signal,
        headers:{'Content-Type':'application/json'}, body:JSON.stringify({query:query.value.trim()}) });
      const data = await response.json();
      if (current !== generation || product !== context()) return;
      if (!response.ok) throw new Error(data.error || 'Не удалось выполнить поиск');
      status.textContent = data.results.length ? 'Выберите точное совпадение и проверьте источник.' : 'Ничего не найдено. Уточните название или артикул.';
      for (const item of data.results) {
        const card = document.createElement('article'); card.className = 'photo-search-card';
        const image = document.createElement('img'); image.src = item.thumbnail; image.alt = item.title; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer';
        const title = document.createElement('p'); title.textContent = item.title;
        const link = document.createElement('a'); link.href = item.page; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Источник: ' + item.source;
        const button = document.createElement('button'); button.type = 'button'; button.className = 'button button--ghost'; button.textContent = 'Выбрать фото';
        button.addEventListener('click', async () => {
          if (product !== context()) { reset(); return; }
          if (!window.confirm('Подтверждаете, что фото соответствует товару и его можно использовать?')) return;
          selection?.abort(); selection = new AbortController();
          const downloadSignal = selection.signal;
          const downloadTimer = setTimeout(() => selection?.abort(), 25000);
          const submit = $('#productForm button[type="submit"]');
          const wasDisabled = submit.disabled; submit.disabled = true;
          const buttons = [...results.querySelectorAll('button')]; buttons.forEach(b => { b.disabled = true; });
          status.textContent = 'Загружаем и подготавливаем фото…';
          try {
            const response = await fetch('/api/admin/photo-download', { method:'POST', credentials:'same-origin', signal:downloadSignal,
              headers:{'Content-Type':'application/json'}, body:JSON.stringify(item) });
            if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Не удалось загрузить фото'); }
            const blob = await response.blob();
            if (product !== context() || current !== generation) return;
            await new Promise((resolve,reject) => document.dispatchEvent(new CustomEvent('product-photo-picked', {
              detail:{blob, context:product, page:item.page, resolve,reject}
            })));
            status.textContent = 'Фото выбрано. Нажмите «Сохранить товар», чтобы сохранить его на сайте.';
          } catch (error) {
            if (current === generation) status.textContent = error.name === 'AbortError' ? 'Загрузка прервана. Выберите другое фото.' : error.message;
          } finally {
            clearTimeout(downloadTimer); submit.disabled = wasDisabled; buttons.forEach(b => { b.disabled = false; });
          }
        });
        card.append(image,title,link,button); results.append(card);
      }
    } catch (error) {
      if (current === generation) status.textContent = error.name === 'AbortError' ? 'Поиск не ответил вовремя. Попробуйте ещё раз.' : error.message;
    } finally {
      clearTimeout(timer); if (current === generation) $('#runPhotoSearch').disabled = false;
    }
  });
})();
