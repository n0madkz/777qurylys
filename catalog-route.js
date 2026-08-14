/* Use the static page path used by the Plesk deployment. */
(function () {
  const catalogButton = document.querySelector(".catalog-button");
  if (!catalogButton) return;

  catalogButton.onclick = function () {
    window.location.assign("catalog.html");
  };
}());
