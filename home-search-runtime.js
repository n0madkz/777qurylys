/*
 * app.js used to register a legacy search listener which expects product.name
 * to be a language object. Products from the admin panel use a plain string.
 * Intercept the input before that listener runs and delegate to the current
 * catalogue renderer installed by home-catalog.js.
 */
(() => {
  const search = document.getElementById("searchInput");
  if (!search) return;

  const clearLegacySuggestions = () => {
    const box = search.closest(".search")?.querySelector(".search-suggestions");
    if (!box) return;
    box.classList.remove("is-open");
    box.replaceChildren();
  };

  const renderCurrentCatalog = () => {
    if (typeof renderProducts === "function") renderProducts();
    clearLegacySuggestions();
  };

  document.addEventListener("input", event => {
    if (event.target !== search) return;
    event.stopImmediatePropagation();
    renderCurrentCatalog();
  }, true);

  document.addEventListener("focus", event => {
    if (event.target === search) clearLegacySuggestions();
  }, true);
})();
