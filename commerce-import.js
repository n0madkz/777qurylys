(() => {
  const button = document.querySelector('#commerceImportButton');
  const input = document.querySelector('#commerceImportInput');
  const status = document.querySelector('#productImportStatus');
  button.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const files = [...input.files];
    if (!files.length) return;
    button.disabled = true;
    status.className = 'form-status is-success';
    try {
      const catalog = files.find(file => file.name.toLowerCase() === 'import.xml');
      const offers = files.find(file => file.name.toLowerCase() === 'offers.xml');
      if (files.length !== 2 || !catalog || !offers) throw new Error('Выберите вместе import.xml и offers.xml (Ctrl + щелчок).');
      if (files.some(file => file.size > 20 * 1024 * 1024)) throw new Error('Каждый XML должен быть не больше 20 МБ.');
      if (!window.confirm('Импортировать товары и остатки? Новые товары будут скрыты. У существующих обновятся остатки, коды 1С, штрихкоды и единицы измерения. Названия, описания, характеристики, бренды, артикулы, категории, статусы и фото сохранятся. Цены не сохраняются.')) return;
      status.textContent = 'Импортируем из 1С… Не закрывайте страницу. При ошибке импорт можно повторить.';
      const request = async body => {
      const response = await fetch('/api/admin/commerce-import', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (response.status === 413) throw new Error('Хостинг отклонил даже небольшую часть файла. Сообщите об этой ошибке для проверки ограничений сервера.');
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (_) { throw new Error('Сервер прервал запрос (HTTP ' + response.status + '). Импорт мог выполниться частично. Обновите страницу и проверьте количество товаров.'); }
      if (!response.ok || !data.ok) throw new Error(data.error || 'Ошибка импорта');
      return data;
      };
      status.scrollIntoView({ block: 'center', behavior: 'smooth' });
      status.textContent = 'Начинаем передачу файлов небольшими частями…';
      const upload = await request({action:'start_upload', sizes:{'import.xml':catalog.size,'offers.xml':offers.size}});
      const totalBytes = catalog.size + offers.size;
      let sent = 0;
      for (const file of [catalog, offers]) {
        for (let offset = 0; offset < file.size;) {
          const bytes = new Uint8Array(await file.slice(offset, offset + 128 * 1024).arrayBuffer());
          let binary = '';
          for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
          const result = await request({action:'upload_chunk', token:upload.token, name:file.name.toLowerCase(), offset, data:btoa(binary)});
          if (result.next !== offset + bytes.length) throw new Error('Сервер не подтвердил получение части XML');
          offset = result.next; sent += bytes.length;
          status.textContent = `Передаём XML: ${Math.round(sent / totalBytes * 100)}%. Не закрывайте страницу.`;
        }
      }
      status.textContent = 'Файлы переданы. Проверяем данные товаров…';
      const prepared = await request({action:'prepare_upload',token:upload.token});
      let data = { next:0, total:prepared.total };
      do {
        status.textContent = `Обработано ${data.next} из ${data.total}. Не закрывайте страницу.`;
        data = await request({ action:'step', token:prepared.token });
      } while (!data.done);
      window.alert(`Импорт завершён. Создано: ${data.created}, обновлено: ${data.updated}. Цены исключены.`);
      window.location.reload();
    } catch (error) {
      status.className = 'form-status is-error';
      status.textContent = (error.message || 'Не удалось импортировать.') + ' Импорт мог выполниться частично; после проверки можно повторить те же файлы без дублей.';
    } finally {
      button.disabled = false;
      input.value = '';
    }
  });
})();
