/* Use the canonical route and avoid an unnecessary Cloudflare redirect. */
(function () {
  const catalogButton = document.querySelector(".catalog-button");
  if (!catalogButton) return;

  catalogButton.onclick = function () {
    window.location.assign("/catalog");
  };
}());
