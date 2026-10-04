const EDUCATION_COLLECTIONS = [
  {
    preview: 'images/diplomas/psychology-consulting-retraining-2019.svg',
    title: 'Профессиональная переподготовка',
    note: 'Психология и психологическое консультирование, 2019',
    pages: [
      {
        src: 'images/diplomas/readable/psychology-consulting-retraining-2019.svg',
        label: 'Профессиональная переподготовка, 2019'
      }
    ]
  },
  {
    preview: 'images/diplomas/eot-stages-1-3-2018-2019.svg',
    title: 'Эмоционально-образная терапия',
    note: '1–3 ступени, 2018–2019; 3-я ступень повторно в 2021',
    pages: [
      {
        data: 'images/diplomas/data/full/eot-stage-1.b64',
        label: '1-я ступень, 2018'
      },
      {
        src: 'images/diplomas/eot-stages-1-3-2018-2019.svg',
        label: '2-я ступень - в общей подборке 1–3 ступеней'
      },
      {
        data: 'images/diplomas/data/full/eot-stage-3.b64',
        label: '3-я ступень, 2019'
      },
      {
        data: 'images/diplomas/data/full/eot-stage-3-repeat-320.b64',
        label: '3-я ступень, повторное прохождение, 2021'
      }
    ]
  },
  {
    preview: 'images/diplomas/eot-inner-child-stages-1-3-2020-2021.svg',
    title: 'Внутренний ребёнок и внутренний родитель',
    note: '3 ступени в рамках ЭОТ, 2020–2021',
    pages: [
      {
        data: 'images/diplomas/data/full/inner-child-stage-1-320.b64',
        label: '1-я ступень, 2020'
      },
      {
        data: 'images/diplomas/data/full/inner-child-stage-2-320.b64',
        label: '2-я ступень, 2020'
      },
      {
        data: 'images/diplomas/data/full/inner-child-stage-3-320.b64',
        label: '3-я ступень, 2021'
      }
    ]
  },
  {
    preview: 'images/diplomas/orkt-solution-focused-72h-2024.svg',
    title: 'ОРКТ',
    note: 'Краткосрочное консультирование, ориентированное на решение, 72 часа, 2024',
    pages: [
      {
        src: 'images/diplomas/readable/orkt-solution-focused-72h-2024.svg',
        label: 'Повышение квалификации, 2024'
      }
    ]
  },
  {
    preview: 'images/diplomas/supervision-training-190h-2025.svg',
    title: 'Супервизия',
    note: 'Обучение супервизии, 190 часов, 2025',
    pages: [
      {
        src: 'images/diplomas/readable/supervision-training-190h-2025.svg',
        label: 'Повышение квалификации, 2025'
      }
    ]
  }
];

const EDUCATION_IMAGE_CACHE = new Map();

async function resolveEducationImage(page) {
  if (page.src) return page.src;
  if (!page.data) throw new Error('Источник документа не указан');

  if (EDUCATION_IMAGE_CACHE.has(page.data)) {
    return EDUCATION_IMAGE_CACHE.get(page.data);
  }

  const response = await fetch(page.data, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Не удалось загрузить документ: ${response.status}`);

  const encoded = (await response.text()).trim();
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

  const url = URL.createObjectURL(new Blob([bytes], { type: 'image/webp' }));
  EDUCATION_IMAGE_CACHE.set(page.data, url);
  return url;
}

function buildEducationDialog() {
  const dialog = document.createElement('dialog');
  dialog.className = 'diploma-dialog';
  dialog.setAttribute('aria-label', 'Просмотр документа об образовании');
  dialog.innerHTML = `
    <div class="diploma-dialog-shell">
      <button class="diploma-dialog-close" type="button" aria-label="Закрыть">Закрыть</button>
      <div class="diploma-dialog-head">
        <p class="diploma-dialog-title"></p>
        <p class="diploma-dialog-meta"></p>
      </div>
      <div class="diploma-dialog-media">
        <p class="diploma-loading">Загрузка документа...</p>
        <img alt="" hidden>
      </div>
      <div class="diploma-dialog-nav">
        <button class="diploma-prev" type="button">← Предыдущий</button>
        <span class="diploma-counter"></span>
        <button class="diploma-next" type="button">Следующий →</button>
      </div>
      <a class="diploma-open-file" href="#" target="_blank" rel="noopener">Открыть изображение отдельно</a>
    </div>
  `;
  document.body.appendChild(dialog);

  const close = dialog.querySelector('.diploma-dialog-close');
  const prev = dialog.querySelector('.diploma-prev');
  const next = dialog.querySelector('.diploma-next');
  const title = dialog.querySelector('.diploma-dialog-title');
  const meta = dialog.querySelector('.diploma-dialog-meta');
  const counter = dialog.querySelector('.diploma-counter');
  const img = dialog.querySelector('.diploma-dialog-media img');
  const loading = dialog.querySelector('.diploma-loading');
  const openFile = dialog.querySelector('.diploma-open-file');

  let collection = null;
  let pageIndex = 0;
  let requestId = 0;

  async function renderPage() {
    const localRequest = ++requestId;
    const page = collection.pages[pageIndex];

    title.textContent = collection.title;
    meta.textContent = page.label || collection.note || '';
    counter.textContent = `${pageIndex + 1} / ${collection.pages.length}`;
    prev.disabled = pageIndex === 0;
    next.disabled = pageIndex === collection.pages.length - 1;
    prev.hidden = collection.pages.length === 1;
    next.hidden = collection.pages.length === 1;
    counter.hidden = collection.pages.length === 1;

    img.hidden = true;
    loading.hidden = false;
    loading.textContent = 'Загрузка документа...';
    openFile.hidden = true;

    try {
      const src = await resolveEducationImage(page);
      if (localRequest !== requestId) return;
      img.src = src;
      img.alt = `${collection.title}. ${page.label || ''}`.trim();
      openFile.href = src;
      openFile.hidden = false;

      if (img.complete) {
        loading.hidden = true;
        img.hidden = false;
      } else {
        img.onload = () => {
          loading.hidden = true;
          img.hidden = false;
        };
        img.onerror = () => {
          img.hidden = true;
          loading.hidden = false;
          loading.textContent = 'Документ не загрузился. Попробуйте открыть его отдельно.';
        };
      }
    } catch (error) {
      if (localRequest !== requestId) return;
      img.hidden = true;
      openFile.hidden = true;
      loading.hidden = false;
      loading.textContent = 'Документ не загрузился.';
      console.error(error);
    }
  }

  function openCollection(nextCollection) {
    collection = nextCollection;
    pageIndex = 0;
    renderPage();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  close.addEventListener('click', () => dialog.close());
  prev.addEventListener('click', () => {
    if (pageIndex > 0) {
      pageIndex -= 1;
      renderPage();
    }
  });
  next.addEventListener('click', () => {
    if (pageIndex < collection.pages.length - 1) {
      pageIndex += 1;
      renderPage();
    }
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  return { openCollection };
}

function enhanceContactOptions() {
  const bookingCard = Array.from(document.querySelectorAll('.org-item')).find((item) => {
    const heading = item.querySelector('h3');
    return heading && heading.textContent.trim() === 'Запись';
  });

  if (bookingCard) {
    const paragraph = bookingCard.querySelector('p');
    if (paragraph) {
      paragraph.innerHTML = 'Основной способ записи - <a href="https://t.me/VeronikaSukhareva">Telegram</a>. Если удобнее, можно написать на <a href="mailto:v.sukhareva@gmail.com">v.sukhareva@gmail.com</a>. Я предложу варианты времени, и после подтверждения время закрепляется за вами. Для онлайн-встречи нужен стабильный интернет, камера и возможность спокойно разговаривать.';
    }
  }

  const finalGrid = document.querySelector('.final .final-grid');
  const telegramButton = finalGrid && finalGrid.querySelector('a.btn.primary');
  if (finalGrid && telegramButton && !finalGrid.querySelector('.final-actions')) {
    const actions = document.createElement('div');
    actions.className = 'final-actions';
    telegramButton.replaceWith(actions);
    actions.appendChild(telegramButton);

    const alternative = document.createElement('p');
    alternative.className = 'contact-alt';
    alternative.innerHTML = 'Telegram - основной способ связи. Если удобнее, можно написать на <a href="mailto:v.sukhareva@gmail.com">v.sukhareva@gmail.com</a>.';
    actions.appendChild(alternative);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  enhanceContactOptions();

  const section = document.querySelector('.education');
  if (!section) return;

  const wrap = section.querySelector('.wrap');
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="section-head">
      <p class="eyebrow">Образование</p>
      <h2>Образование и квалификация</h2>
      <p>Основная подготовка и дополнительное обучение, на которое я опираюсь в работе.</p>
    </div>

    <div class="education-groups">
      <section class="education-group" aria-labelledby="education-base">
        <div class="education-group-head">
          <p class="education-label">Базовая подготовка</p>
          <h3 id="education-base">Психология</h3>
        </div>
        <div class="education-items">
          <article class="education-item">
            <h4>Психология и психологическое консультирование</h4>
            <p>Профессиональная переподготовка, АНО ДПО «Высшая школа психологии», 742 часа, 2019.</p>
          </article>
          <article class="education-item">
            <h4>Психология</h4>
            <p>Магистратура, профиль «Коучинг и психологическое консультирование». В процессе.</p>
          </article>
        </div>
      </section>

      <section class="education-group" aria-labelledby="education-methods">
        <div class="education-group-head">
          <p class="education-label">Методы и специализация</p>
          <h3 id="education-methods">Дополнительное обучение</h3>
        </div>
        <div class="education-items">
          <article class="education-item">
            <h4>Эмоционально-образная терапия</h4>
            <p>Три ступени обучения в Центре эмоционально-образной терапии Линде Н. Д., по 72 академических часа каждая, 2018–2019. Третья ступень повторно пройдена в 2021.</p>
            <p class="education-detail">Отдельный курс «Клиническая эмоционально-образная терапия в работе с невротическими адаптациями», 2019.</p>
          </article>
          <article class="education-item">
            <h4>Работа с внутренним ребёнком и внутренним родителем методами ЭОТ</h4>
            <p>Три ступени, по 72 академических часа каждая, 2020–2021.</p>
          </article>
          <article class="education-item">
            <h4>Краткосрочное психологическое консультирование, ориентированное на решение</h4>
            <p>Повышение квалификации, Международная академия профессионального обучения, 72 часа, 2024.</p>
          </article>
        </div>
      </section>

      <section class="education-group" aria-labelledby="education-supervision">
        <div class="education-group-head">
          <p class="education-label">Для работы с практикой</p>
          <h3 id="education-supervision">Супервизия</h3>
        </div>
        <div class="education-items">
          <article class="education-item">
            <h4>Обучение супервизии</h4>
            <p>Повышение квалификации, ООО «Психодемия», 190 часов, 2025.</p>
          </article>
        </div>
      </section>
    </div>

    <details class="education-documents">
      <summary>
        <span>Документы об образовании</span>
        <span class="education-documents-note">5 подборок · 10 документов</span>
      </summary>
      <p class="education-documents-help">Откройте подборку, чтобы посмотреть документы крупно.</p>
      <div class="diploma-grid" aria-label="Документы об образовании"></div>
    </details>
  `;

  const details = wrap.querySelector('.education-documents');
  const grid = wrap.querySelector('.diploma-grid');
  if (!details || !grid) return;

  const viewer = buildEducationDialog();

  function renderCollections() {
    if (grid.dataset.rendered === '1') return;
    grid.dataset.rendered = '1';

    EDUCATION_COLLECTIONS.forEach(function (item) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'diploma-card';

      const frame = document.createElement('div');
      frame.className = 'diploma-frame';

      const img = document.createElement('img');
      img.src = item.preview;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';

      frame.appendChild(img);
      card.appendChild(frame);

      const caption = document.createElement('p');
      caption.className = 'diploma-caption';
      caption.append(document.createTextNode(item.title));

      const note = document.createElement('span');
      note.className = 'diploma-note';
      note.textContent = item.note;
      caption.appendChild(note);

      const open = document.createElement('span');
      open.className = 'diploma-open';
      open.textContent = item.pages.length > 1 ? `Посмотреть документы (${item.pages.length})` : 'Посмотреть крупно';
      caption.appendChild(open);

      card.appendChild(caption);
      card.addEventListener('click', () => viewer.openCollection(item));
      grid.appendChild(card);
    });
  }

  details.addEventListener('toggle', function () {
    if (details.open) renderCollections();
  });
});
