(() => {
  const icons = {
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4 4"/></svg>',
    arrowUpRight: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>',
    arrowRight: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    arrowLeft: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></svg>',
    upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4M8 8l4-4 4 4M5 15v4h14v-4"/></svg>'
  };
  const setIcon = (element, name) => { if (element && element.dataset.icon !== name) { element.innerHTML = icons[name]; element.dataset.icon = name; element.classList.add("ui-icon"); } };
  const replaceTextArrow = element => {
    if (!element || element.querySelector(".quote-count, input, svg")) return;
    if (element.dataset.iconified === "true") return;
    const text = element.textContent.trim();
    const match = text.match(/^(←|→)?\s*(.*?)(↗|→)?$/);
    if (!match || !/[←→↗]/.test(text)) return;
    const [, before, label, after] = match;
    const icon = before === "←" ? "arrowLeft" : after === "→" ? "arrowRight" : "arrowUpRight";
    element.innerHTML = `${before ? icons[icon] : ""}<span>${label.trim()}</span>${after ? icons[icon] : ""}`;
    element.dataset.iconified = "true";
    element.classList.add("has-inline-icon");
  };
  const apply = () => {
    document.querySelectorAll(".menu-toggle").forEach(element => setIcon(element, "menu"));
    document.querySelectorAll(".catalog-button").forEach(element => { if (!element.querySelector("svg") && element.textContent.includes("☷")) { element.innerHTML = `${icons.grid}<span>${element.textContent.replace("☷", "").trim()}</span>`; element.classList.add("has-inline-icon"); } });
    document.querySelectorAll(".catalog-button span:first-child").forEach(element => setIcon(element, "grid"));
    document.querySelectorAll(".search > span:first-child").forEach(element => setIcon(element, "search"));
    document.querySelectorAll(".quote-button__icon").forEach(element => setIcon(element, "arrowUpRight"));
    document.querySelectorAll(".drawer__close, .modal__close, .quote-item__remove").forEach(element => setIcon(element, "close"));
    document.querySelectorAll(".hero-card__arrow").forEach(element => setIcon(element, "arrowUpRight"));
    document.querySelectorAll(".hero-card--small > span:first-child").forEach(element => setIcon(element, "star"));
    document.querySelectorAll(".file-drop__icon").forEach(element => setIcon(element, "upload"));
    document.querySelectorAll(".empty-state > span:first-child").forEach(element => setIcon(element, "arrowUpRight"));
    document.querySelectorAll(".button, .quote-button, .text-link, .service-grid a, .footer__bottom a, .admin-header a:last-child").forEach(replaceTextArrow);
  };
  apply();
  let refreshQueued = false;
  new MutationObserver(() => {
    if (refreshQueued) return;
    refreshQueued = true;
    queueMicrotask(() => {
      refreshQueued = false;
      apply();
    });
  }).observe(document.body, { childList: true, subtree: true });
})();
