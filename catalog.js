(() => {
  const fallbackProducts = [
    { id: 1, cat: "materials", name: "Керамзитобетонный блок 390×190×188", brand: "KZ Build", image: "assets/product-block.jpg", badge: "Хит" },
    { id: 2, cat: "materials", name: "Профиль гипсокартонный 60×27", brand: "Knauf", image: "assets/product-profile.jpg" },
    { id: 3, cat: "tools", name: "Перфоратор аккумуляторный PRO 20V", brand: "DeWalt", image: "assets/product-drill.jpg", badge: "Новинка" }
  ];

  const defaultCategories = [
    { id: "materials", name: "Стройматериалы", parent: "" },
    { id: "dry-mixes", name: "Сухие смеси", parent: "materials" },
    { id: "cement", name: "Цемент и добавки", parent: "materials" },
    { id: "brick-blocks", name: "Кирпич и блоки", parent: "materials" },
    { id: "lumber", name: "Пиломатериалы", parent: "materials" },
    { id: "sheet-materials", name: "Листовые материалы", parent: "materials" },
    { id: "insulation", name: "Утеплители и изоляция", parent: "materials" },
    { id: "waterproofing", name: "Гидроизоляция", parent: "materials" },
    { id: "roofing", name: "Кровля и водосток", parent: "materials" },
    { id: "metal-products", name: "Металлопрокат", parent: "materials" },
    { id: "fasteners", name: "Крепёж", parent: "materials" },
    { id: "masonry", name: "Кладочные материалы", parent: "materials" },
    { id: "tools", name: "Инструменты", parent: "" },
    { id: "power-tools", name: "Электроинструмент", parent: "tools" },
    { id: "hand-tools", name: "Ручной инструмент", parent: "tools" },
    { id: "measuring-tools", name: "Измерительный инструмент", parent: "tools" },
    { id: "finishing", name: "Отделка", parent: "" },
    { id: "paint", name: "Краски и покрытия", parent: "finishing" },
    { id: "tile", name: "Плитка и затирка", parent: "finishing" },
    { id: "flooring", name: "Напольные покрытия", parent: "finishing" },
    { id: "plumbing", name: "Сантехника", parent: "" },
    { id: "pipes-fittings", name: "Трубы и фитинги", parent: "plumbing" },
    { id: "faucets", name: "Смесители", parent: "plumbing" },
    { id: "electrics", name: "Электрика", parent: "" },
    { id: "lighting", name: "Освещение", parent: "electrics" }
  ];

  const $ = selector => document.querySelector(selector);
  const grid = $("#catalogGrid");
  const filterMount = $("#catalogFilters");
  const search = $("#catalogSearch");
  const sort = $("#sortProducts");
  const resultCount = $("#resultCount");
  const pagination = $("#catalogPagination");
  const pageSize = 24;
  let products = fallbackProducts.slice();
  let categories = defaultCategories.slice();
  const params = new URLSearchParams(window.location.search);
  let activeCategory = params.get("category") || "all";
  let currentPage = Math.max(1, Number(params.get("page")) || 1);
  let searchTimer = 0;

  const escapeHtml = value => String(value == null ? "" : value).replace(/[&<>'"]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[char]));

  const nameFor = product => {
    if (product && typeof product.name === "object") {
      return product.name.ru || product.name.kz || product.name.en || product.title || "Товар без названия";
    }
    return product && (product.name || product.title) || "Товар без названия";
  };

  const brandFor = product => product && (product.brand || product.manufacturer) || "777";
  const imageFor = product => product && product.image || "assets/building-materials-hero.png";
  const productUrl = product => "product.html?id=" + encodeURIComponent(product.id);
  const isProductActive = product => product && product.active !== false;

  function categoryMap() {
    return new Map(categories.map(category => [category.id, category]));
  }

  function roots() {
    const map = categoryMap();
    return categories.filter(category => !category.parent || !map.has(category.parent));
  }

  function childrenOf(id) {
    return categories.filter(category => category.parent === id);
  }

  function descendantsOf(id) {
    const found = new Set([id]);
    let frontier = [id];
    while (frontier.length) {
      const current = frontier.pop();
      childrenOf(current).forEach(category => {
        if (!found.has(category.id)) {
          found.add(category.id);
          frontier.push(category.id);
        }
      });
    }
    return found;
  }

  function matchesCategory(product, categoryId) {
    if (categoryId === "all") return true;
    return descendantsOf(categoryId).has(product.cat);
  }

  function itemsWord(value) {
    const lastTwo = value % 100;
    const last = value % 10;
    if (lastTwo > 10 && lastTwo < 20) return "товаров";
    if (last === 1) return "товар";
    if (last > 1 && last < 5) return "товара";
    return "товаров";
  }

  function countFor(categoryId) {
    return products.filter(product => isProductActive(product) && matchesCategory(product, categoryId)).length;
  }

  function categoryButton(category, child) {
    const active = activeCategory === category.id ? " active" : "";
    const childClass = child ? " catalog-filter--child" : "";
    return '<button class="catalog-filter' + active + childClass + '" type="button" data-cat="' +
      escapeHtml(category.id) + '"><span>' + escapeHtml(category.name) + "</span><small>" +
      countFor(category.id) + "</small></button>";
  }

  function renderFilters() {
    const knownIds = new Set(categories.map(category => category.id));
    if (activeCategory !== "all" && !knownIds.has(activeCategory)) activeCategory = "all";

    let markup = '<button class="catalog-filter' + (activeCategory === "all" ? " active" : "") +
      '" type="button" data-cat="all"><span>Все товары</span><small>' + products.filter(isProductActive).length + "</small></button>";

    roots().forEach(root => {
      markup += categoryButton(root, false);
      const children = childrenOf(root.id);
      if (children.length) {
        markup += '<div class="catalog-filter-children">' +
          children.map(child => categoryButton(child, true)).join("") + "</div>";
      }
    });
    filterMount.innerHTML = markup;
  }

  function productCard(product) {
    const name = nameFor(product);
    const url = productUrl(product);
    const badge = product.badge
      ? '<span class="product-badge">' + escapeHtml(product.badge) + "</span>"
      : "";

    return '<article class="product-card">' +
      '<div class="product-media has-photo">' +
      '<a class="product-media__link" href="' + url + '" aria-label="Открыть товар: ' + escapeHtml(name) + '">' +
      '<img src="' + escapeHtml(imageFor(product)) + '" alt="' + escapeHtml(name) +
      '" width="640" height="480" loading="lazy" decoding="async" fetchpriority="low" ' +
      'onerror="this.onerror=null;this.src=\'assets/building-materials-hero.png\'"></a>' +
      badge +
      '<button class="product-card__add" type="button" data-add-cart="' + encodeURIComponent(product.id) +
      '" aria-label="Добавить товар в корзину" title="Добавить в корзину"></button>' +
      "</div>" +
      '<div class="product-info"><small>' + escapeHtml(brandFor(product)) +
      '</small><h3><a class="product-title-link" href="' + url + '">' + escapeHtml(name) +
      "</a></h3></div></article>";
  }

  function visibleProducts() {
    const query = search.value.trim().toLocaleLowerCase("ru");
    let list = products.filter(product => {
      const text = (nameFor(product) + " " + brandFor(product)).toLocaleLowerCase("ru");
      return isProductActive(product) && matchesCategory(product, activeCategory) && text.includes(query);
    });
    if (sort.value === "name") {
      list = list.slice().sort((first, second) => {
        return nameFor(first).localeCompare(nameFor(second), "ru");
      });
    }
    return list;
  }

  function pageMarkup(page, pages) {
    if (pages < 2) return "";
    const values = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(pages, page + 2);
    if (start > 1) {
      values.push(1);
      if (start > 2) values.push("…");
    }
    for (let value = start; value <= end; value += 1) values.push(value);
    if (end < pages) {
      if (end < pages - 1) values.push("…");
      values.push(pages);
    }

    let markup = '<button type="button" data-page="' + (page - 1) + '" ' +
      (page === 1 ? "disabled" : "") + ' aria-label="Предыдущая страница">Назад</button>';
    values.forEach(value => {
      if (value === "…") {
        markup += '<span class="catalog-pagination__ellipsis" aria-hidden="true">…</span>';
      } else {
        markup += '<button type="button" data-page="' + value + '"' +
          (value === page ? ' class="active" aria-current="page"' : "") + ">" + value + "</button>";
      }
    });
    markup += '<button type="button" data-page="' + (page + 1) + '" ' +
      (page === pages ? "disabled" : "") + ' aria-label="Следующая страница">Далее</button>';
    return markup;
  }

  function syncUrl() {
    const next = new URLSearchParams();
    if (activeCategory !== "all") next.set("category", activeCategory);
    if (search.value.trim()) next.set("search", search.value.trim());
    if (currentPage > 1) next.set("page", currentPage);
    const query = next.toString();
    history.replaceState({}, "", "catalog.html" + (query ? "?" + query : ""));
  }

  function draw() {
    const list = visibleProducts();
    const pages = Math.max(1, Math.ceil(list.length / pageSize));
    currentPage = Math.min(currentPage, pages);
    const start = (currentPage - 1) * pageSize;
    const shown = list.slice(start, start + pageSize);

    renderFilters();

    if (!list.length) {
      resultCount.textContent = "По запросу ничего не найдено";
      grid.innerHTML = '<div class="empty-state"><b>Товары не найдены</b><p>Попробуйте изменить запрос или выбрать другую категорию.</p></div>';
      pagination.innerHTML = "";
      syncUrl();
      return;
    }

    const first = start + 1;
    const last = start + shown.length;
    resultCount.textContent = "Показано " + first + "–" + last + " из " + list.length + " " + itemsWord(list.length);
    grid.innerHTML = shown.map(productCard).join("");
    pagination.innerHTML = pageMarkup(currentPage, pages);
    syncUrl();
  }

  function applySearchFromUrl() {
    const value = params.get("search");
    if (value) search.value = value;
  }

  async function loadCatalog() {
    try {
      const response = await fetch("/api/catalog", { cache: "no-store" });
      if (!response.ok) throw new Error("Каталог временно недоступен");
      const data = await response.json();
      if (Array.isArray(data.products)) products = data.products.filter(isProductActive);
      if (Array.isArray(data.categories) && data.categories.length) categories = data.categories;
      draw();
    } catch (error) {
      console.warn(error);
    }
  }

  filterMount.addEventListener("click", event => {
    const button = event.target.closest("[data-cat]");
    if (!button) return;
    activeCategory = button.dataset.cat;
    currentPage = 1;
    draw();
  });

  grid.addEventListener("click", event => {
    const button = event.target.closest("[data-add-cart]");
    if (!button || !window.CartStore) return;
    const added = window.CartStore.add(button.dataset.addCart);
    button.setAttribute("aria-label", added ? "Товар добавлен в корзину" : "Товар уже в корзине");
    button.title = added ? "Товар добавлен" : "Уже в корзине";
    button.classList.toggle("is-added", true);
  });

  pagination.addEventListener("click", event => {
    const button = event.target.closest("[data-page]");
    if (!button || button.disabled) return;
    currentPage = Number(button.dataset.page) || 1;
    draw();
    grid.scrollIntoView({ block: "start", behavior: "smooth" });
  });

  search.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      currentPage = 1;
      draw();
    }, 150);
  });

  sort.addEventListener("change", () => {
    currentPage = 1;
    draw();
  });

  applySearchFromUrl();
  draw();
  loadCatalog();
})();
