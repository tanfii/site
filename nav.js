document.addEventListener('DOMContentLoaded', function () {
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
