(() => {
  const fallbackImages = {
    1: "https://media.adeo.com/media/2719703/media.png",
    2: "https://media.siniat.de/pi57691/preview/471426647/siniat-cd-profil",
    3: "https://mobileimages.lowes.com/productimages/63528a1b-80c9-4744-96fc-8c8a5a5e2e5a/73851761.jpeg?size=xl",
    4: "https://d3usa7hclic8la.cloudfront.net/Y44882JLB/conversions/P9-cropper.webp",
    5: "https://www.ivd.ru/uploads/58d9218bd35f9.jpg",
    6: "https://cdn11.bigcommerce.com/s-vj1x2fqj2l/images/stencil/1280x1280/products/12519/27393/OMNI_Variant_GLL3-300_Hero_Off__48193.1698873684.jpg?c=1",
    7: "https://f.cdnmp.net/857735795/p/l/4/elite-steel-kuhinjska-slavina-u-grafit-crnoj-boji~10855574.jpg",
    8: "https://cdn.mathaus.ro/medias/sys_master/images/hc6/h13/h00/9710315667486.jpg"
  };
  const labels = { ru: "позиций", kz: "позиция", en: "items" };
  let catalogCategories = [];
  let catalogState = "loading";
  const escapeHtml = value => String(value == null ? "" : value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  const nameFor = (product, locale) => {
    if (typeof product.name === "string" && product.name.trim()) return product.name;
    if (product.name && typeof product.name === "object") return product.name[locale] || product.name.ru || product.name.kz || product.name.en || product.title || "Товар без названия";
    return product.title || "Товар без названия";
  };
  const brandFor = product => product.brand || product.manufacturer || "";
  const localProductImages = {
    "https://media.adeo.com/media/2719703/media.png": "assets/product-block.jpg",
    "https://media.siniat.de/pi57691/preview/471426647/siniat-cd-profil": "assets/product-profile.jpg",
    "https://mobileimages.lowes.com/productimages/63528a1b-80c9-4744-96fc-8c8a5a5e2e5a/73851761.jpeg?size=xl": "assets/product-drill.jpg"
  };
  const imageFor = product => product.thumbnail || localProductImages[product.image] || product.image || fallbackImages[product.id] || "assets/building-materials-hero.png";
  const productUrl = product => "product.html?id=" + encodeURIComponent(product.id);
  const isProductActive = product => product && product.active !== false;

  function categoryIds(categoryId) {
    const ids = new Set([categoryId]);
    const pending = [categoryId];
    while (pending.length) {
      const parent = pending.pop();
      catalogCategories.filter(category => category.parent === parent).forEach(category => {
        if (!ids.has(category.id)) {
          ids.add(category.id);
          pending.push(category.id);
        }
      });
    }
    return ids;
  }

  function categoryMatches(product, categoryId) {
    return categoryId === "all" || categoryIds(categoryId).has(product.cat);
  }

  function updateCounts() {
    const locale = typeof lang === "string" ? lang : "ru";
    document.querySelectorAll(".category-card[data-category]").forEach(card => {
      const countLabel = card.querySelector("small");
      if (catalogState === "loading") {
        if (countLabel) countLabel.textContent = "…";
        return;
      }
      const category = card.dataset.category;
      const count = products.filter(product => isProductActive(product) && categoryMatches(product, category)).length;
      if (countLabel) countLabel.textContent = count + " " + (labels[locale] || labels.ru);
    });
  }

  function productCard(product, locale) {
    const name = nameFor(product, locale);
    const image = imageFor(product);
    const url = productUrl(product);
    const badge = product.badge ? '<span class="product-badge">' + escapeHtml(product.badge) + "</span>" : "";
    return '<article class="product-card" data-category="' + escapeHtml(product.cat || "materials") + '">' +
      '<div class="product-media has-photo">' +
      '<a class="product-media__link" href="' + url + '" aria-label="Открыть товар: ' + escapeHtml(name) + '">' +
      '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(name) + '" width="640" height="480" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'assets/building-materials-hero.png\'"></a>' +
      badge +
      '<button class="product-card__add" data-add="' + escapeHtml(product.id) + '" aria-label="Добавить в корзину" title="Добавить в корзину"></button>' +
      "</div>" +
      '<div class="product-info"><small>' + escapeHtml(brandFor(product)) + '</small><h3><a class="product-title-link" href="' + url + '">' + escapeHtml(name) + "</a></h3></div>" +
      "</article>";
  }

  function renderHomeProducts() {
    const grid = document.getElementById("productGrid");
    const search = document.getElementById("searchInput");
    if (!grid || !Array.isArray(products)) return;
    if (catalogState === "loading") {
      grid.innerHTML = '<div class="catalog-loading" role="status" aria-live="polite"><span class="catalog-loading__spinner" aria-hidden="true"></span><b>Загружаем актуальные товары</b><p>Пожалуйста, подождите.</p></div>';
      updateCounts();
      return;
    }
    if (catalogState === "error") {
      grid.innerHTML = '<div class="catalog-loading catalog-loading--error" role="alert"><b>Не удалось загрузить каталог</b><p>Обновите страницу или попробуйте немного позже.</p></div>';
      updateCounts();
      return;
    }
    const locale = typeof lang === "string" ? lang : "ru";
    const query = (search && search.value ? search.value : "").trim().toLowerCase();
    const matched = products.filter(product => isProductActive(product) && categoryMatches(product, activeFilter) && (nameFor(product, locale) + " " + brandFor(product)).toLowerCase().includes(query));
    const shown = matched.slice(0, 8);
    grid.innerHTML = shown.map(product => productCard(product, locale)).join("") || '<div class="empty-state" style="grid-column:1/-1"><b>Ничего не найдено</b><p>Попробуйте изменить запрос.</p></div>';
    grid.querySelectorAll("[data-add]").forEach(button => button.onclick = () => {
      const id = button.dataset.add;
      if (window.CartStore) {
        window.CartStore.add(id, 1, products.find(product=>String(product.id)===id));
        if (typeof window.renderQuote === "function") window.renderQuote();
        if (typeof window.showToast === "function") window.showToast("Товар добавлен в корзину.");
        return;
      }
      addToQuote(id);
    });
    updateCounts();
  }

  function renderSearchSuggestions() {
    const search = document.getElementById("searchInput");
    const wrap = search && search.closest(".search");
    if (!search || !wrap) return;

    let box = wrap.querySelector(".search-suggestions");
    if (!box) {
      box = document.createElement("div");
      box.className = "search-suggestions";
      wrap.appendChild(box);
    }

    const locale = typeof lang === "string" ? lang : "ru";
    if (catalogState !== "ready") {
      box.classList.remove("is-open");
      return;
    }
    const query = search.value.trim().toLowerCase();
    if (!query) {
      box.classList.remove("is-open");
      return;
    }

    const matches = products.filter(product => {
      return isProductActive(product) && (nameFor(product, locale) + " " + brandFor(product)).toLowerCase().includes(query);
    }).slice(0, 5);

    box.innerHTML = matches.length
      ? matches.map(product => '<a href="' + productUrl(product) + '"><span>' +
        escapeHtml(nameFor(product, locale)) + '</span><small>' +
        escapeHtml(brandFor(product)) + "</small></a>").join("")
      : '<div class="search-empty">Ничего не найдено</div>';
    box.classList.add("is-open");
  }

  renderProducts = renderHomeProducts;
  const homeSearch = document.getElementById("searchInput");
  if (homeSearch) {
    homeSearch.oninput = renderHomeProducts;
    homeSearch.addEventListener("input", renderSearchSuggestions);
  }
  renderHomeProducts();
  Promise.all([
    fetch("/api/products", { cache: "no-store" }),
    fetch("/api/categories", { cache: "no-store" })
  ])
    .then(async responses => {
      if (!responses.every(response => response.ok)) throw new Error("Catalogue is unavailable");
      return Promise.all(responses.map(response => response.json()));
    })
    .then(([productsData, categoriesData]) => {
      if (!Array.isArray(productsData && productsData.products) || !Array.isArray(categoriesData && categoriesData.categories)) throw new Error("Invalid catalogue response");
      products.splice(0, products.length, ...productsData.products.filter(isProductActive));
      catalogCategories = categoriesData.categories;
      catalogState = "ready";
      renderHomeProducts();
    })
    .catch(() => {
      catalogState = "error";
      renderHomeProducts();
    });
})();
