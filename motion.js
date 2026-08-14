(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const sectionSelector = [
    ".hero__content", ".page-hero", ".contacts-hero", ".request-page__intro", ".request-page__card",
    ".catalog-filters", ".catalog-results__top", ".catalog-pagination", ".cart-page__heading",
    ".cart-list-card", ".cart-form-card", ".contact-form-card", ".request-band__inner",
    ".benefits .section-heading", ".footer__grid", ".footer__bottom", ".product-detail", ".product-not-found"
  ].join(",");

  const groups = [
    [".category-grid", ".category-card"],
    [".product-grid", ".product-card"],
    [".benefits-grid", "article"],
    [".story-grid", "article"],
    [".service-grid", "article"],
    [".contacts-details", ".contact-card, .contact-hours"],
    [".cart-items", ".cart-item"]
  ];

  const observer = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -24px" }) : null;

  const prepare = (element, delay = 0, soft = false) => {
    if (!(element instanceof Element) || element.dataset.motionPrepared === "true") return;
    element.dataset.motionPrepared = "true";
    element.style.setProperty("--motion-delay", Math.min(delay, 320) + "ms");
    element.classList.add("motion-reveal");
    if (soft) element.classList.add("motion-reveal--soft");
    if (!observer) {
      element.classList.add("is-visible");
      return;
    }
    observer.observe(element);
  };

  const prepareGroups = root => {
    groups.forEach(([containerSelector, itemSelector]) => {
      const containers = [];
      if (root instanceof Element && root.matches(itemSelector) && root.parentElement?.matches(containerSelector)) {
        const siblings = [...root.parentElement.querySelectorAll(itemSelector)];
        prepare(root, Math.max(0, siblings.indexOf(root)) * 45, true);
      }
      if (root instanceof Element && root.matches(containerSelector)) containers.push(root);
      if (root.querySelectorAll) containers.push(...root.querySelectorAll(containerSelector));
      containers.forEach(container => {
        container.querySelectorAll(itemSelector).forEach((item, index) => prepare(item, index * 45, true));
      });
    });
  };

  const prepareRoot = root => {
    if (!root) return;
    if (root instanceof Element && root.matches(sectionSelector)) prepare(root);
    if (root.querySelectorAll) root.querySelectorAll(sectionSelector).forEach(element => prepare(element));
    prepareGroups(root);
  };

  prepareRoot(document);

  let refreshQueued = false;
  const mutations = new MutationObserver(records => {
    if (refreshQueued) return;
    const added = records.some(record => record.addedNodes.length);
    if (!added) return;
    refreshQueued = true;
    queueMicrotask(() => {
      refreshQueued = false;
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) prepareRoot(node);
      }));
    });
  });
  mutations.observe(document.body, { childList: true, subtree: true });
})();
