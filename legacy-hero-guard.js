/* Prevent the retired gallery in app.js from starting a second interval. */
(function () {
  const hero = document.querySelector(".hero");
  if (!hero) return;

  hero.classList.remove("hero");
  hero.dataset.galleryGuard = "true";
}());
