(() => {
  const content = document.querySelector('.hero__content');
  if (!content || typeof translations === 'undefined') return;
  const selectors = ['.eyebrow', 'h1', '.hero__text', '.hero__actions', '.hero__trust'];
  let frame;
  function reserveTranslations() {
    const width = content.getBoundingClientRect().width;
    if (!width) return;
    const heights = selectors.map(() => 0);
    for (const language of Object.keys(translations)) {
      const shell = document.createElement('div');
      shell.lang = language;
      shell.setAttribute('aria-hidden', 'true');
      shell.inert = true;
      shell.style.cssText = 'position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none;width:' + width + 'px';
      const copy = content.cloneNode(true);
      copy.querySelectorAll('h1, .button').forEach(el => {
        el.style.setProperty('font-family', language === 'kz' ? '"Segoe UI",Arial,sans-serif' : '"Space Grotesk",Manrope,Arial,sans-serif', 'important');
        el.style.setProperty('font-weight', language === 'kz' || el.matches('.button') ? '800' : '700', 'important');
      });
      copy.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      copy.querySelectorAll('[data-i18n]').forEach(el => {
        const value = translations[language][el.dataset.i18n];
        if (value !== undefined) el.innerHTML = value;
      });
      selectors.forEach(selector => { copy.querySelector(selector).style.minHeight = '0'; });
      shell.append(copy);
      document.body.append(shell);
      selectors.forEach((selector, i) => {
        heights[i] = Math.max(heights[i], Math.ceil(copy.querySelector(selector).getBoundingClientRect().height));
      });
      shell.remove();
    }
    selectors.forEach((selector, i) => { content.querySelector(selector).style.minHeight = heights[i] + 'px'; });
  }
  function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(reserveTranslations); }
  reserveTranslations();
  window.addEventListener('resize', schedule);
  document.fonts?.ready.then(schedule);
})();
