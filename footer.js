(() => {
  const footer = document.querySelector(".footer");
  if (!footer) return;

  footer.innerHTML = `
    <div class="container footer__grid">
      <div>
        <img src="assets/footer-logo.svg" alt="777" class="footer__logo">
        <p class="footer__muted">Строим отношения, которые держат крепче бетона.</p>
      </div>
      <div>
        <b>Навигация</b>
        <a href="catalog.html">Товары</a>
        <a href="services.html">Сервисы</a>
        <a href="about.html">О компании</a>
      </div>
      <div>
        <b>Связаться</b>
        <a href="tel:+77758244380">+7 775 824 43 80</a>
        <a href="mailto:info@777.kz">info@777.kz</a>
        <span>г. Атырау, ул. Гинаят Абдрахманов, 85в</span>
      </div>
    </div>
    <div class="container footer__bottom">
      <span>© 2026 777 Строительный гипермаркет</span>
      <a href="admin-login.html">Вход для администратора</a>
    </div>`;

  const navigation = footer.querySelector(".footer__grid > div:nth-child(2)");
  if (navigation && !navigation.querySelector('[href="contacts.html"]')) {
    const contactsLink = document.createElement("a");
    contactsLink.href = "contacts.html";
    contactsLink.textContent = "Контакты";
    navigation.appendChild(contactsLink);
  }

  document.querySelectorAll(".main-nav a:last-child").forEach(link => {
    link.href = "contacts.html";
  });

  const logo = footer.querySelector(".footer__logo");
  logo?.style.setProperty("content", "url('assets/footer-logo.svg')", "important");
  logo?.style.setProperty("filter", "none", "important");
  logo?.style.setProperty("background", "transparent", "important");
})();

(() => {
  const clean = value => String(value == null ? "" : value).trim();
  const phoneHref = value => "tel:" + clean(value).replace(/[^+\d]/g, "");
  const mapHref = value => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(clean(value));

  function replaceContactText(link, selector, value) {
    const target = link.querySelector(selector);
    if (target) target.textContent = value;
    else if (!link.children.length) link.textContent = value;
  }

  function applyContacts(settings) {
    if (!settings || typeof settings !== "object") return;
    const phone = clean(settings.phone);
    const email = clean(settings.email);
    const address = clean(settings.address);

    if (phone) {
      document.querySelectorAll('a[href^="tel:"]').forEach(link => {
        link.href = phoneHref(phone);
        replaceContactText(link, "b", phone);
      });
    }
    if (email) {
      document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
        link.href = "mailto:" + email;
        replaceContactText(link, "b", email);
      });
    }
    if (address) {
      document.querySelectorAll(".contact-card[href*='google.com/maps']").forEach(link => {
        link.href = mapHref(address);
        replaceContactText(link, "b", address);
      });
      const footerAddress = document.querySelector(".footer .footer__grid > div:nth-child(3) span");
      if (footerAddress) footerAddress.textContent = address;
    }
  }

  window.KurylysSiteContacts = { apply: applyContacts };
  fetch("/api/settings", { cache: "no-store" })
    .then(response => response.ok ? response.json() : Promise.reject(new Error("settings")))
    .then(data => {
      applyContacts(data.settings);
      document.dispatchEvent(new CustomEvent("kurylys:site-settings", { detail: data.settings || {} }));
    })
    .catch(() => { /* Static contact values remain as an offline fallback. */ });
})();

if (!document.querySelector('script[src^="brand-tagline.js"]')) {
  const brandTagline = document.createElement("script");
  brandTagline.src = "brand-tagline.js?v=20260811-brand-signature";
  document.body.appendChild(brandTagline);
}

if (!document.querySelector('link[href^="motion.css"]')) {
  const motionStyles = document.createElement("link");
  motionStyles.rel = "stylesheet";
  motionStyles.href = "motion.css?v=20260811-site-motion";
  document.head.appendChild(motionStyles);
}

if (!document.querySelector('script[src^="motion.js"]')) {
  const motionScript = document.createElement("script");
  motionScript.src = "motion.js?v=20260811-site-motion";
  document.body.appendChild(motionScript);
}
