(() => {
  const button = document.querySelector('#commerceImportButton');
  const input = document.querySelector('#commerceImportInput');
  const status = document.querySelector('#productImportStatus');
  button.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const files = [...input.files];
    if (!files.length) return;
    button.disabled = true;
    try {
      const catalog = files.find(file => file.name.toLowerCase() === 'import.xml');
      const offers = files.find(file => file.name.toLowerCase() === 'offers.xml');
      if (files.length !== 2 || !catalog || !offers) throw new Error('Выберите вместе import.xml и offers.xml (Ctrl + щелчок).');
      if (files.some(file => file.size > 20 * 1024 * 1024)) throw new Error('Каждый XML должен быть не больше 20 МБ.');
      if (!window.confirm('Импортировать товары и остатки? Новые товары будут скрыты. Названия, описания, категории и остатки существующих обновятся. Статусы и фото сохранятся. Цены не сохраняются.')) return;
      status.textContent = 'Импортируем из 1С… Не закрывайте страницу. При ошибке импорт можно повторить.';
      const [catalogXml, offersXml] = await Promise.all([catalog.text(), offers.text()]);
      const response = await fetch('/api/admin/commerce-import', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalogXml, offersXml })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Ошибка импорта');
      window.alert(`Импорт завершён. Создано: ${data.created}, обновлено: ${data.updated}. Цены исключены.`);
      window.location.reload();
    } catch (error) {
      status.textContent = error.message || 'Не удалось импортировать. Импорт мог выполниться частично; повторите те же файлы.';
    } finally {
      button.disabled = false;
      input.value = '';
    }
  });
})();
