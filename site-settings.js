(function () {
  const SETTINGS_URL = 'https://raw.githubusercontent.com/tanfii/site/main/data/site-settings.json';

  function formatMoney(value, currency) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '';
    return new Intl.NumberFormat('ru-RU').format(number) + ' ' + (currency || '₽');
  }

  function effectivePrice(service, promo) {
    if (promo && promo.enabled && Number(promo.consultation_price) > 0) {
      return Number(promo.consultation_price);
    }
    return Number(service && service.price);
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

    const audienceParagraphs = document.querySelectorAll('#audience .practical-grid > div:nth-child(2) p');
    if (audienceParagraphs[0] && practice.audience_text) audienceParagraphs[0].textContent = practice.audience_text;
    if (audienceParagraphs[1] && practice.not_work_with) audienceParagraphs[1].textContent = practice.not_work_with;

    const online = services.consultation_online || {};
    const offline = services.consultation_offline || {};
    const supervision = services.supervision || {};
    const onlinePrice = effectivePrice(online, promo);
    const offlinePrice = effectivePrice(offline, promo);

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
      if (h3 && offline.title) h3.textContent = offline.title;
      if (p) p.textContent = [offline.location || practice.offline_place, offline.duration].filter(Boolean).join(', ');
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

    const existingPromo = document.querySelector('.cms-promo-note');
    if (existingPromo) existingPromo.remove();
    if (promo.enabled) {
      const formatIntro = document.querySelector('#format .section-note');
      if (formatIntro) {
        const note = document.createElement('p');
        note.className = 'section-note cms-promo-note';
        const bits = [promo.label];
        if (promo.valid_until) bits.push('до ' + new Intl.DateTimeFormat('ru-RU').format(new Date(promo.valid_until + 'T00:00:00')));
        note.textContent = bits.filter(Boolean).join(' · ');
        formatIntro.insertAdjacentElement('afterend', note);
      }
    }
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
