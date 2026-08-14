document.querySelectorAll(".site-header").forEach(header => {
  if (header.querySelector(".main-nav")) return;
  const row = document.createElement("div");
  row.className = "container header__nav-row";
  row.innerHTML = '<a class="catalog-button" href="catalog.html"><span aria-hidden="true">☷</span> Каталог</a><nav class="main-nav"><a href="catalog.html">Товары</a><a href="services.html">Сервисы</a><a href="about.html">О компании</a><a href="index.html#contacts">Контакты</a></nav><label class="search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Поиск товаров и материалов" aria-label="Поиск товаров и материалов"></label>';
  header.appendChild(row);
});

document.querySelectorAll(".search").forEach(search => {
  const input = search.querySelector("input");
  if (!input) return;
  const box = document.createElement("div");
  box.className = "search-suggestions";
  search.appendChild(box);
  const products = ["Керамзитобетонный блок", "Профиль гипсокартонный", "Перфоратор аккумуляторный", "Краска интерьерная", "Утеплитель Rockwool", "Лазерный уровень", "Смеситель Graphite", "Ламинат дуб натуральный"];
  function draw() {
    const query = input.value.trim().toLowerCase();
    if (!query) { box.classList.remove("is-open"); box.innerHTML = ""; return; }
    const matches = products.filter(product => product.toLowerCase().includes(query)).slice(0, 5);
    box.innerHTML = matches.length ? matches.map(product => `<a href="catalog.html?search=${encodeURIComponent(product)}"><span aria-hidden="true">⌕</span>${product}<b aria-hidden="true">↗</b></a>`).join("") : '<div class="search-empty">Ничего не найдено</div>';
    box.classList.add("is-open");
  }
  input.addEventListener("input", draw);
  input.addEventListener("focus", draw);
  input.addEventListener("keydown", event => { if (event.key === "Enter" && input.value.trim()) { event.preventDefault(); location.href = `catalog.html?search=${encodeURIComponent(input.value.trim())}`; } });
  document.addEventListener("click", event => { if (!search.contains(event.target)) box.classList.remove("is-open"); });
});
if (!document.querySelector('script[src^="icons.js"]')) { const iconScript = document.createElement("script"); iconScript.src = "icons.js?v=20260811-stable"; document.body.appendChild(iconScript); }
