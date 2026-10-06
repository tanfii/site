(function () {
  const SETTINGS_URL = 'https://raw.githubusercontent.com/tanfii/site/main/data/site-settings.json';

  function formatMoney(value, currency) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '';
    return new Intl.NumberFormat('ru-RU').format(number) + ' ' + (currency || '₽');
  }

  function isPromoActive(promo) {
    if (!promo || promo.enabled !== true || Number(promo.consultation_price) <= 0) return false;
    if (!promo.valid_until) return true;

    const end = new Date(promo.valid_until + 'T23:59:59');
    return !Number.isNaN(end.getTime()) && end >= new Date();
  }

  function renderPromoCard(promo, basePrice, currency, bookingUrl) {
    const host = document.querySelector('#format .format-list');
    if (!host) return;

    const existing = document.querySelector('.cms-promo-card');
    if (existing) existing.remove();
    const existingStandardLabel = document.querySelector('.cms-standard-label');
    if (existingStandardLabel) existingStandardLabel.remove();

    if (!isPromoActive(promo)) return;

    const card = document.createElement('aside');
    card.className = 'cms-promo-card';
    card.setAttribute('aria-label', 'Временное предложение');

    const kicker = document.createElement('p');
    kicker.className = 'cms-promo-kicker';
    kicker.textContent = 'Сейчас отдельно';

    const main = document.createElement('div');
    main.className = 'cms-promo-main';

    const copy = document.createElement('div');
    copy.className = 'cms-promo-copy';

    const title = document.createElement('h3');
    title.textContent = (promo.label || 'Специальная стоимость консультации')
      .replace(/^Акция[.:]?\s*/i, '');

    const meta = document.createElement('p');
    meta.className = 'cms-promo-meta';

    const metaParts = [];
    if (promo.valid_until) {
      const promoDate = new Date(promo.valid_until + 'T00:00:00');
      const now = new Date();
      const dateOptions = promoDate.getFullYear() === now.getFullYear()
        ? { day: 'numeric', month: 'long' }
        : { day: 'numeric', month: 'long', year: 'numeric' };
      metaParts.push('до ' + new Intl.DateTimeFormat('ru-RU', dateOptions).format(promoDate));
    }
    if (Number(basePrice) > Number(promo.consultation_price)) {
      metaParts.push('обычная стоимость ' + formatMoney(basePrice, currency));
    }
    meta.textContent = metaParts.join(' · ');

    copy.append(title);
    if (meta.textContent) copy.appendChild(meta);

    const price = document.createElement('strong');
    price.className = 'cms-promo-price';
    price.textContent = formatMoney(promo.consultation_price, currency);

    main.append(copy, price);
    card.append(kicker, main);

    if (bookingUrl) {
      const link = document.createElement('a');
      link.className = 'cms-promo-link';
      link.href = bookingUrl;
      link.textContent = 'Написать про этот запрос →';
      card.appendChild(link);
    }

    host.insertAdjacentElement('beforebegin', card);
  }

  function setAllLinks(oldHref, newHref) {
    if (!newHref) return;
    document.querySelectorAll('a[href="' + oldHref + '"]').forEach(function (link) {
      link.href = newHref;
    });
  }

  function findCard(sectionSelector, title) {
    return Array.from(document.querySelectorAll(sectionSelector)).find(function (item) {
      const heading = item.querySelector('h3');
      return heading && heading.textContent.trim() === title;
    });
  }

  function applySettings(data) {
    if (!data || typeof data !== 'object') return;

    const contacts = data.contacts || {};
    const practice = data.practice || {};
    const services = data.services || {};
    const promo = data.promo || {};

    setAllLinks('https://t.me/VeronikaSukhareva', contacts.booking_telegram);
    setAllLinks('https://t.me/sukhareva_psy', contacts.channel);

    const finalCopy = document.querySelector('.final .final-grid > div');
    if (finalCopy && contacts.email) {
      let emailNote = finalCopy.querySelector('.cms-email-note');
      if (!emailNote) {
        emailNote = document.createElement('p');
        emailNote.className = 'cms-email-note';
        finalCopy.appendChild(emailNote);
      }
      emailNote.replaceChildren(document.createTextNode('Можно также написать на '));
      const emailLink = document.createElement('a');
      emailLink.href = 'mailto:' + contacts.email;
      emailLink.textContent = contacts.email;
      emailNote.appendChild(emailLink);
    }

    const audienceParagraphs = document.querySelectorAll('#audience .practical-grid > div:nth-child(2) p');
    if (audienceParagraphs[0] && practice.audience_text) audienceParagraphs[0].textContent = practice.audience_text;
    if (audienceParagraphs[1] && practice.not_work_with) audienceParagraphs[1].textContent = practice.not_work_with;

    const online = services.consultation_online || {};
    const offline = services.consultation_offline || {};
    const supervision = services.supervision || {};
    const onlinePrice = Number(online.price);
    const offlinePrice = Number(offline.price);

    const heroFacts = document.querySelectorAll('.hero-facts span');
    if (heroFacts[0]) {
      const labels = [];
      if (online.enabled !== false) labels.push('Онлайн');
      if (offline.enabled !== false) labels.push(practice.city || 'Москва');
      if (labels.length) heroFacts[0].textContent = labels.join(' и ');
    }
    if (heroFacts[1] && online.duration) heroFacts[1].textContent = online.duration;
    if (heroFacts[2] && Number.isFinite(onlinePrice)) heroFacts[2].textContent = formatMoney(onlinePrice, online.currency);

    const formatRows = document.querySelectorAll('#format .format-row');
    if (formatRows[0]) {
      formatRows[0].hidden = online.enabled === false;
      const h3 = formatRows[0].querySelector('h3');
      const p = formatRows[0].querySelector('p');
      const money = formatRows[0].querySelector('.money');
      if (h3 && online.title) h3.textContent = online.title;
      if (p) p.textContent = [online.platform, online.duration].filter(Boolean).join(', ');
      if (money && Number.isFinite(onlinePrice)) money.textContent = formatMoney(onlinePrice, online.currency);
    }
    if (formatRows[1]) {
      formatRows[1].hidden = offline.enabled === false;
      const h3 = formatRows[1].querySelector('h3');
      const p = formatRows[1].querySelector('p');
      const money = formatRows[1].querySelector('.money');
      if (h3) h3.textContent = (offline.title || 'Очно') + (practice.city ? ' в ' + practice.city : '');
      if (p) p.textContent = [offline.location, offline.duration].filter(Boolean).join(', ');
      if (money && Number.isFinite(offlinePrice)) money.textContent = formatMoney(offlinePrice, offline.currency);
    }

    const paymentNote = document.querySelector('#format .payment-note');
    if (paymentNote && data.payment_note) paymentNote.textContent = data.payment_note;

    const supervisionSection = document.querySelector('#supervision');
    if (supervisionSection) {
      supervisionSection.hidden = supervision.enabled === false;
      const meta = supervisionSection.querySelector('.supervision-meta');
      if (meta) {
        const parts = [];
        if (supervision.platform) parts.push(supervision.platform);
        if (supervision.duration) parts.push(supervision.duration);
        if (Number(supervision.price) > 0) parts.push(formatMoney(supervision.price, supervision.currency));
        meta.textContent = parts.join(' · ');
      }
    }

    const organization = data.organization || {};
    const orgMap = {
      'Запись': organization.booking,
      'Перенос и отмена': organization.cancellation,
      'Оплата': organization.payment,
      'Если встречу переношу я': organization.therapist_cancellation,
      'Связь и данные': organization.data,
      'О консультации': organization.consultation
    };
    Object.keys(orgMap).forEach(function (title) {
      const card = findCard('#org .org-item', title);
      const p = card && card.querySelector('p');
      if (p && orgMap[title]) p.textContent = orgMap[title];
    });
    const orgNote = document.querySelector('#org .org-notes p');
    if (orgNote && organization.note) orgNote.textContent = organization.note;

    const education = data.education || {};
    const masterRow = Array.from(document.querySelectorAll('#education .format-row')).find(function (row) {
      const h3 = row.querySelector('h3');
      return h3 && h3.textContent.trim() === 'Магистратура';
    });
    if (masterRow) {
      const h3 = masterRow.querySelector('h3');
      const p = masterRow.querySelector('p');
      if (h3 && education.master_title) h3.textContent = education.master_title;
      if (p && education.master_text) p.textContent = education.master_text;
    }

    const photo = data.photo || {};
    const portrait = document.querySelector('#portrait');
    if (portrait && photo.portrait) portrait.src = photo.portrait;
    if (portrait && photo.portrait_alt) portrait.alt = photo.portrait_alt;

    renderPromoCard(
      promo,
      online.price,
      online.currency,
      contacts.booking_telegram
    );
  }

  async function boot() {
    try {
      const response = await fetch(SETTINGS_URL + '?v=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) throw new Error(String(response.status));
      applySettings(await response.json());
    } catch (error) {
      console.error('Не удалось загрузить настройки сайта', error);
    }
  }

  document.addEventListener('DOMContentLoaded', boot, { once: true });
})();
