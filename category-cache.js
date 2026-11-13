(() => {
  const key = '777-public-categories-v3';
  let data = null;
  const listeners = new Set();
  const normalize = value => {
    if (!Array.isArray(value)) throw new Error('Invalid categories');
    return value.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string' &&
      item.active !== false && !item.id.startsWith('onec-')).map(item => ({id:item.id,name:item.name,parent:String(item.parent || '')}));
  };
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved && Date.now() - saved.time < 86400000 && saved.time <= Date.now()) data = normalize(saved.data);
  } catch (_) {}
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  // Runs in <head>: do not wait for a user click or the product catalogue.
  const ready = fetch('/api/categories', {credentials:'same-origin',signal:controller.signal})
    .then(response => { if (!response.ok) throw new Error('Categories unavailable'); return response.json(); })
    .then(result => {
      data = normalize(result.categories);
      try { localStorage.setItem(key,JSON.stringify({time:Date.now(),data})); } catch (_) {}
      listeners.forEach(listener => listener(data)); return data;
    }).catch(() => data).finally(() => clearTimeout(timer));
  window.StoreCategoryCache = {get data(){return data;},ready,subscribe(listener){listeners.add(listener);}};
})();
