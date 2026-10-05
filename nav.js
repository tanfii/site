if (/\/index\.html$/.test(window.location.pathname)) {
  const cleanPath = window.location.pathname.replace(/index\.html$/, '');
  window.history.replaceState(null, '', cleanPath + window.location.search + window.location.hash);
}

document.addEventListener('DOMContentLoaded', function () {
  const brand = document.querySelector('.brand');
  if (brand) brand.setAttribute('href', './');

  const footerLinks = document.querySelector('.foot span:last-child');
  if (footerLinks && !footerLinks.querySelector('a[href="/offer.html"]')) {
    footerLinks.append(document.createTextNode(' · '));
    const offerLink = document.createElement('a');
    offerLink.href = '/offer.html';
    offerLink.textContent = 'оферта';
    footerLinks.appendChild(offerLink);
  }

  document.querySelectorAll('.org-item').forEach(function (item) {
    const heading = item.querySelector('h3');
    const paragraph = item.querySelector('p');
    if (!heading || !paragraph) return;

    if (heading.textContent.trim() === 'Перенос и отмена') {
      paragraph.textContent = 'Если встречу нужно перенести или отменить, пожалуйста, напишите как можно раньше, желательно не меньше чем за 24 часа. При отказе от ещё не оказанной встречи оплачиваются только фактически понесённые расходы, если они возникли. Для очной встречи это может быть невозвратная аренда кабинета.';
    }

    if (heading.textContent.trim() === 'Связь и данные') {
      paragraph.textContent = 'На сайте нет форм записи, личного кабинета, аналитики и рекламных cookie. Для записи вы сами переходите в Telegram или пишете на почту. Отдельную базу клиентских анкет, электронные медицинские карты и аудио- или видеозаписи сессий я не веду. Для записи не нужно присылать диагнозы или подробные сведения о здоровье.';
    }
  });

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
