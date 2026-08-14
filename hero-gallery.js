(() => {
  const guardedHero = document.querySelector("[data-gallery-guard]");
  if (guardedHero) guardedHero.classList.add("hero");
  const hero = document.querySelector(".hero");
  if (!hero || hero.dataset.animatedGallery === "true") return;
  hero.dataset.animatedGallery = "true";

  const fallbackSlides = [
    { id: "standard-materials", src: "assets/building-materials-hero.png", width: 1920, height: 1080, label: "Стандартный фон" }
  ];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const safeBackground = source => 'url("' + String(source || "").replace(/["\\\n\r]/g, "") + '")';
  const normaliseSlides = value => (Array.isArray(value) ? value : []).map(item => ({
    id: String(item?.id || ""),
    src: String(item?.src || ""),
    label: String(item?.label || "Фон баннера")
  })).filter(item => item.id && item.src).slice(0, 5);

  let slides = fallbackSlides.slice();
  let index = 0;
  let timer;
  hero.querySelector(".hero-gallery-controls")?.remove();
  hero.style.backgroundImage = "";

  const firstLayer = document.createElement("div");
  const secondLayer = document.createElement("div");
  firstLayer.className = "hero-gallery-layer is-visible";
  secondLayer.className = "hero-gallery-layer";
  firstLayer.setAttribute("aria-hidden", "true");
  secondLayer.setAttribute("aria-hidden", "true");
  hero.insertBefore(secondLayer, hero.firstChild);
  hero.insertBefore(firstLayer, hero.firstChild);
  let visibleLayer = firstLayer;

  const controls = document.createElement("div");
  controls.className = "hero-gallery-controls";
  controls.innerHTML =
    '<button type="button" class="hero-gallery-button" data-direction="-1" aria-label="Предыдущий фон">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg></button>' +
    '<div class="hero-gallery-dots" role="tablist" aria-label="Фоны главного баннера"></div>' +
    '<button type="button" class="hero-gallery-button" data-direction="1" aria-label="Следующий фон">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>';
  hero.appendChild(controls);
  const dots = controls.querySelector(".hero-gallery-dots");

  function preload() {
    slides.slice(1).forEach(slide => {
      const image = new Image();
      image.src = slide.src;
    });
  }

  function updateDots() {
    dots.querySelectorAll("button").forEach((dot, dotIndex) => {
      const active = dotIndex === index;
      dot.classList.toggle("active", active);
      dot.setAttribute("aria-selected", String(active));
    });
  }

  function drawDots() {
    dots.innerHTML = "";
    slides.forEach((slide, dotIndex) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-label", "Показать фон " + (dotIndex + 1) + ": " + slide.label);
      dot.addEventListener("click", () => {
        show(dotIndex);
        restart();
      });
      dots.appendChild(dot);
    });
    controls.hidden = slides.length < 2;
    updateDots();
  }

  function show(nextIndex) {
    index = (nextIndex + slides.length) % slides.length;
    const nextLayer = visibleLayer === firstLayer ? secondLayer : firstLayer;
    nextLayer.style.backgroundImage = safeBackground(slides[index].src);
    nextLayer.classList.add("is-visible");
    visibleLayer.classList.remove("is-visible");
    visibleLayer = nextLayer;
    updateDots();
  }

  function setSlides(value) {
    const next = normaliseSlides(value);
    slides = next.length ? next : fallbackSlides.slice();
    index = 0;
    visibleLayer = firstLayer;
    firstLayer.style.backgroundImage = safeBackground(slides[0].src);
    firstLayer.classList.add("is-visible");
    secondLayer.classList.remove("is-visible");
    secondLayer.style.backgroundImage = "";
    drawDots();
    preload();
  }

  function stop() {
    window.clearInterval(timer);
    timer = undefined;
  }

  function start() {
    if (reduceMotion || document.hidden || timer || slides.length < 2) return;
    timer = window.setInterval(() => show(index + 1), 6000);
  }

  function restart() {
    stop();
    start();
  }

  controls.querySelectorAll("[data-direction]").forEach(button => {
    button.addEventListener("click", () => {
      show(index + Number(button.dataset.direction));
      restart();
    });
  });
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());
  hero.addEventListener("mouseenter", stop);
  hero.addEventListener("mouseleave", start);
  hero.addEventListener("focusin", stop);
  hero.addEventListener("focusout", event => {
    if (!hero.contains(event.relatedTarget)) start();
  });

  setSlides(fallbackSlides);
  start();

  fetch("/api/hero-slides", { cache: "no-store" })
    .then(response => response.ok ? response.json() : null)
    .then(data => {
      if (Array.isArray(data?.slides)) {
        setSlides(data.slides);
        restart();
      }
    })
    .catch(() => undefined);
})();
