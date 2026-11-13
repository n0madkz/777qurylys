/* Shared cart drawer for the home page. */
(() => {
  const fallbackImage = "assets/building-materials-hero.png";
  const copy = {
    ru: {
      cart: "\u041c\u043e\u044f \u043a\u043e\u0440\u0437\u0438\u043d\u0430", yourCart: "\u0412\u0430\u0448\u0430 \u043a\u043e\u0440\u0437\u0438\u043d\u0430", quantity: "\u041a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e", added: "\u0422\u043e\u0432\u0430\u0440 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d \u0432 \u043a\u043e\u0440\u0437\u0438\u043d\u0443.", increase: "\u0423\u0432\u0435\u043b\u0438\u0447\u0438\u0442\u044c \u043a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e", decrease: "\u0423\u043c\u0435\u043d\u044c\u0448\u0438\u0442\u044c \u043a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e", remove: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0442\u043e\u0432\u0430\u0440" },
    kz: {
      cart: "\u041c\u0435\u043d\u0456\u04a3 \u0441\u0435\u0431\u0435\u0442\u0456\u043c", yourCart: "\u0421\u0456\u0437\u0434\u0456\u04a3 \u0441\u0435\u0431\u0435\u0442\u0456\u04a3\u0456\u0437", quantity: "\u0421\u0430\u043d\u044b", added: "\u0422\u0430\u0443\u0430\u0440 \u0441\u0435\u0431\u0435\u0442\u043a\u0435 \u049b\u043e\u0441\u044b\u043b\u0434\u044b.", increase: "\u0421\u0430\u043d\u044b\u043d \u043a\u04e9\u0431\u0435\u0439\u0442\u0443", decrease: "\u0421\u0430\u043d\u044b\u043d \u0430\u0437\u0430\u0439\u0442\u0443", remove: "\u0422\u0430\u0443\u0430\u0440\u0434\u044b \u04e9\u0448\u0456\u0440\u0443" },
    en: {
      cart: "My cart", yourCart: "Your cart", quantity: "Quantity", added: "Product added to cart.", increase: "Increase quantity", decrease: "Decrease quantity", remove: "Remove product" }
  };
  const esc = value => String(value == null ? "" : value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
  const currentLanguage = () => copy[document.documentElement.lang] ? document.documentElement.lang : "ru";
  const text = () => copy[currentLanguage()];
  const imageFor = product => product?.image || fallbackImage;
  const valueFor = (value, fallback = "") => {
    if (typeof value === "string" && value.trim()) return value;
    if (value && typeof value === "object") return value[currentLanguage()] || value.ru || value.kz || value.en || fallback;
    return fallback;
  };
  const productName = product => valueFor(product?.name, product?.title || "Product from catalog");
  const productBrand = product => valueFor(product?.brand, "777");
  const productsList = () => typeof products !== "undefined" && Array.isArray(products) ? products : [];
  const findProduct = id => productsList().find(product => String(product.id) === String(id));

  function installStyles() {
    if (document.getElementById("home-cart-styles")) return;
    const stylesheet = document.createElement("link");
    stylesheet.id = "home-cart-styles";
    stylesheet.rel = "stylesheet";
    stylesheet.href = "home-cart.css?v=20260811-cart-controls";
    document.head.appendChild(stylesheet);
  }

  function setTranslations() {
    if (typeof translations === "undefined") return;
    Object.assign(translations.ru, { quote: copy.ru.cart, quoteTitle: copy.ru.cart, quoteEyebrow: copy.ru.yourCart });
    Object.assign(translations.kz, { quote: copy.kz.cart, quoteTitle: copy.kz.cart, quoteEyebrow: copy.kz.yourCart });
    Object.assign(translations.en, { quote: copy.en.cart, quoteTitle: copy.en.cart, quoteEyebrow: copy.en.yourCart });
  }

  function emptyState() {
    const dictionary = typeof translations !== "undefined" ? (translations[currentLanguage()] || {}) : {};
    return '<div class="empty-state"><span class="ui-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 6h14l-1 12H6L5 6Z"/><path d="M9 10h6M9 14h4"/><path d="M8 6a4 4 0 0 1 8 0"/></svg></span><b>' +
      esc(dictionary.emptyQuote || "Your cart is empty") + '</b><p>' +
      esc(dictionary.emptyQuoteText || "Add products from the catalog to send a request.") + '</p></div>';
  }

  function renderHomeCart() {
    const box = document.getElementById("quoteItems");
    const entries = window.CartStore ? window.CartStore.get() : [];
    const ui = text();
    const total = entries.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
    document.querySelectorAll(".quote-count").forEach(node => {
      node.textContent = String(total);
      node.hidden = total === 0;
    });
    if (!box) return;
    if (!entries.length) {
      box.innerHTML = emptyState();
      return;
    }

    box.innerHTML = entries.map(entry => {
      const product = findProduct(entry.id);
      const id = encodeURIComponent(entry.id);
      const name = productName(product);
      const brand = productBrand(product);
      const quantity = Math.max(1, Number(entry.quantity) || 1);
      return '<article class="quote-item quote-item--cart">' +
        '<a class="quote-item__media has-photo" href="product.html?id=' + id + '" aria-label="Open product: ' + esc(name) + '">' +
          '<img src="' + esc(imageFor(product)) + '" alt="' + esc(name) + '" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'' + fallbackImage + '\'">' +
        '</a>' +
        '<div class="quote-item__content"><span class="quote-item__brand">' + esc(brand) + '</span>' +
          '<div class="quote-item__name"><a href="product.html?id=' + id + '">' + esc(name) + '</a></div>' +
          '<div class="quote-item__quantity"><span>' + esc(ui.quantity) + ':</span><span class="quote-item__stepper" role="group" aria-label="' + esc(ui.quantity) + '">' +
            '<button type="button" data-quantity-id="' + id + '" data-quantity-change="-1" aria-label="' + esc(ui.decrease) + '">−</button><output>' + quantity + '</output><button type="button" data-quantity-id="' + id + '" data-quantity-change="1" aria-label="' + esc(ui.increase) + '">+</button>' +
          '</span></div></div>' +
        '<button class="quote-item__remove ui-icon" type="button" data-remove="' + id + '" aria-label="' + esc(ui.remove) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
      '</article>';
    }).join("");

    box.querySelectorAll("[data-remove]").forEach(button => {
      button.addEventListener("click", () => window.CartStore?.remove(decodeURIComponent(button.dataset.remove)));
    });
    box.querySelectorAll("[data-quantity-id]").forEach(button => {
      button.addEventListener("click", () => {
        const id = decodeURIComponent(button.dataset.quantityId);
        const next = window.CartStore?.quantity(id) + Number(button.dataset.quantityChange);
        if (next && next > 0) window.CartStore.update(id, next);
      });
    });
  }

  installStyles();
  setTranslations();
  window.addToQuote = id => {
    if (!window.CartStore) return;
    window.CartStore.add(id, 1, findProduct(id));
    renderHomeCart();
    if (typeof window.showToast === "function") window.showToast(text().added);
  };
  renderQuote = renderHomeCart;
  window.renderQuote = renderHomeCart;
  document.addEventListener("kurylys:cart-change", renderHomeCart);
  new MutationObserver(renderHomeCart).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  renderHomeCart();
  if (typeof applyLanguage === "function") applyLanguage();

  fetch("/api/catalog", { cache: "no-store" })
    .then(response => response.ok ? response.json() : null)
    .then(data => {
      if (!Array.isArray(data?.products) || !Array.isArray(productsList())) return;
      products.splice(0, products.length, ...data.products);
      renderHomeCart();
    })
    .catch(renderHomeCart);
})();
