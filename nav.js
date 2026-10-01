if (/\/index\.html$/.test(window.location.pathname)) {
  const cleanPath = window.location.pathname.replace(/index\.html$/, '');
  window.history.replaceState(null, '', cleanPath + window.location.search + window.location.hash);
}

document.addEventListener('DOMContentLoaded', function () {
  const brand = document.querySelector('.brand');
  if (brand) brand.setAttribute('href', './');

  const menu = document.querySelector('.mobile-menu');
  if (!menu) return;

  menu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      menu.removeAttribute('open');
    });
  });

  document.addEventListener('click', function (event) {
    if (menu.open && !menu.contains(event.target)) menu.removeAttribute('open');
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && menu.open) {
      menu.removeAttribute('open');
      const summary = menu.querySelector('summary');
      if (summary) summary.focus();
    }
  });
});
