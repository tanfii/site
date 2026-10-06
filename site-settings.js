(function () {
  const SETTINGS_URL = 'https://raw.githubusercontent.com/tanfii/site/main/data/site-settings.json';

  function formatMoney(value, currency) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '';
    return new Intl.NumberFormat('ru-RU').format(number) + ' ' + (currency || '₽');
  }

  function localDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function isPromotionActive(promotion, todayKey) {
    if (!promotion || promotion.enabled !== true) return false;
    if (!promotion.label || Number(promotion.consultation_price) <= 0) return false;

    const start = promotion.start_date || '';
    const end = promotion.end_date || '';
    if (start && todayKey < start) return false;
    if (end && todayKey > end) return false;
    return true;
  }

  function formatPromotionEnd(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    if (Number.isNaN(date.getTime())) return '';

    const now = new Date();
    const options = date.getFullYear() === now.getFullYear()
      ? { day: 'numeric', month: 'long' }
      : { day: 'numeric', month: 'long', year: 'numeric' };

    return new Intl.DateTimeFormat('ru-RU', options).format(date);
  }

  function renderPromotions(promotions, basePrice, currency, bookingUrl) {
    const host = document.querySelector('#format .format-list');
    if (!host) return;

    document.querySelectorAll('.cms-promo-section, .cms-other-topics').forEach(function (node) {
      node.remove();
    });

    const list = Array.isArray(promotions) ? promotions : [];
    const todayKey = localDateKey(new Date());
    const active = list
      .filter(function (promotion) {
        return isPromotionActive(promotion, todayKey);
      })
      .sort(function (a, b) {
        return String(a.start_date || '').localeCompare(String(b.start_date || ''));
      });

    if (!active.length) return;

    const section = document.createElement('div');
    section.className = 'cms-promo-section';
    section.setAttribute('aria-label', 'Акция');

    const heading = document.createElement('p');
    heading.className = 'cms-promo-heading';
    heading.textContent = 'Акция';
    section.appendChild(heading);

    active.forEach(function (promotion) {
      const row = document.createElement('div');
      row.className = 'cms-promo-row';

      const copy = document.createElement('div');
      copy.className = 'cms-promo-copy';

      const title = document.createElement('h3');
      title.textContent = String(promotion.label || '').replace(/^Акция[.:]?\s*/i, '');

      const meta = document.createElement('p');
      meta.className = 'cms-promo-meta';
      const metaParts = [];
      const endLabel = formatPromotionEnd(promotion.end_date);
      if (endLabel) metaParts.push('до ' + endLabel);
      if (Number(basePrice) > Number(promotion.consultation_price)) {
        metaParts.push('обычная стоимость ' + formatMoney(basePrice, currency));
      }
      meta.textContent = metaParts.join(' · ');

      copy.appendChild(title);
      if (meta.textContent) copy.appendChild(meta);

      if (bookingUrl) {
        const link = document.createElement('a');
        link.className = 'cms-promo-link';
        link.href = bookingUrl;
        link.textContent = 'Написать про этот запрос →';
        copy.appendChild(link);
      }

      const price = document.createElement('strong');
      price.className = 'cms-promo-price';
      price.textContent = formatMoney(promotion.consultation_price, currency);

      row.append(copy, price);
      section.appendChild(row);
    });

    const otherHeading = document.createElement('p');
    otherHeading.className = 'cms-other-topics';
    otherHeading.textContent = 'Другие темы';

    host.insertAdjacentElement('beforebegin', otherHeading);
    otherHeading.insertAdjacentElement('beforebegin', section);
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
    const promotions = Array.isArray(data.promotions) ? data.promotions : [];

    setAllLinks('https://t.me/VeronikaSukhareva', contacts.booking_telegram);
    setAllLinks('https://t.me/sukhareva_psy', contacts.channel);

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

    const bookingCard = findCard('#org .org-item', 'Запись');
    const bookingParagraph = bookingCard && bookingCard.querySelector('p');
    if (bookingParagraph && organization.booking) {
      let bookingText = organization.booking;
      if (contacts.email && !bookingText.includes(contacts.email)) {
        const marker = 'Telegram';
        const markerIndex = bookingText.indexOf(marker);
        if (markerIndex >= 0) {
          const insertAt = markerIndex + marker.length;
          bookingText = bookingText.slice(0, insertAt) + ' или на почту ' + contacts.email + bookingText.slice(insertAt);
        } else {
          bookingText += ' Для записи можно также написать на ' + contacts.email + '.';
        }
      }

      const tokens = [
        contacts.booking_telegram && { label: 'Telegram', href: contacts.booking_telegram },
        contacts.email && { label: contacts.email, href: 'mailto:' + contacts.email }
      ].filter(Boolean);
      const pattern = tokens.length
        ? new RegExp('(' + tokens.map(function (token) {
            return token.label.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&');
          }).join('|') + ')', 'g')
        : null;

      bookingParagraph.replaceChildren();
      (pattern ? bookingText.split(pattern) : [bookingText]).forEach(function (part) {
        const token = tokens.find(function (item) { return item.label === part; });
        if (!token) {
          bookingParagraph.append(document.createTextNode(part));
          return;
        }
        const link = document.createElement('a');
        link.href = token.href;
        link.textContent = token.label;
        bookingParagraph.appendChild(link);
      });
    }
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

    renderPromotions(
      promotions,
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
