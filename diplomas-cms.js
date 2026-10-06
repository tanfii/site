const EDUCATION_MANIFEST_URL = '/data/education-documents.json';

const EDUCATION_COLLECTION_META = [
  {
    title: 'Профессиональная переподготовка',
    note: 'Психология и психологическое консультирование, 2019',
    pages: [
      { path: ['retraining', 'document'], label: 'Профессиональная переподготовка, 2019' }
    ]
  },
  {
    title: 'Эмоционально-образная терапия',
    note: '1–3 ступени, 2018–2019; 3-я ступень повторно в 2021',
    pages: [
      { path: ['eot', 'stage1'], label: '1-я ступень, 2018' },
      { path: ['eot', 'stage2'], label: '2-я ступень, 2018' },
      { path: ['eot', 'stage3'], label: '3-я ступень, 2019' },
      { path: ['eot', 'stage3_repeat'], label: '3-я ступень, повторное прохождение, 2021' }
    ]
  },
  {
    title: 'Внутренний ребёнок и внутренний родитель',
    note: '3 ступени в рамках ЭОТ, 2020–2021',
    pages: [
      { path: ['inner_child', 'stage1'], label: '1-я ступень, 2020' },
      { path: ['inner_child', 'stage2'], label: '2-я ступень, 2020' },
      { path: ['inner_child', 'stage3'], label: '3-я ступень, 2021' }
    ]
  },
  {
    title: 'ОРКТ',
    note: 'Краткосрочное консультирование, ориентированное на решение, 72 часа, 2024',
    pages: [
      { path: ['orkt', 'document'], label: 'Повышение квалификации, 2024' }
    ]
  },
  {
    title: 'Супервизия',
    note: 'Обучение супервизии, 190 часов, 2025',
    pages: [
      { path: ['supervision', 'document'], label: 'Повышение квалификации, 2025' }
    ]
  }
];

function valueAtPath(object, path) {
  return path.reduce((value, key) => (value && typeof value === 'object' ? value[key] : ''), object) || '';
}

function normalizeImagePath(path) {
  if (typeof path !== 'string') return '';
  const trimmed = path.trim();
  if (!trimmed) return '';
  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return trimmed;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed.replace(/^\.\//, '')}`;
}

async function loadEducationCollections() {
  const response = await fetch(EDUCATION_MANIFEST_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Не удалось загрузить список документов: ${response.status}`);
  const manifest = await response.json();

  return EDUCATION_COLLECTION_META.map((collection) => ({
    title: collection.title,
    note: collection.note,
    pages: collection.pages
      .map((page) => ({
        src: normalizeImagePath(valueAtPath(manifest, page.path)),
        label: page.label
      }))
      .filter((page) => page.src)
  })).filter((collection) => collection.pages.length > 0);
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

  function renderPage() {
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
    openFile.href = page.src;

    img.onload = () => {
      loading.hidden = true;
      img.hidden = false;
    };
    img.onerror = () => {
      img.hidden = true;
      loading.hidden = false;
      loading.textContent = 'Документ не загрузился.';
    };
    img.src = page.src;
    img.alt = `${collection.title}. ${page.label || ''}`.trim();
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

function renderEducationSection(collections) {
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
          </article>
          <article class="education-item">
            <h4>Клиническая эмоционально-образная терапия в работе с невротическими адаптациями</h4>
            <p>Авторский курс Людмилы Ковалёвой, 2019.</p>
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
        <span class="education-documents-note">${collections.length} подборок · ${collections.reduce((sum, item) => sum + item.pages.length, 0)} документов</span>
      </summary>
      <p class="education-documents-help">Откройте подборку, чтобы посмотреть документы крупно.</p>
      <div class="diploma-grid" aria-label="Документы об образовании"></div>
    </details>
  `;

  const details = wrap.querySelector('.education-documents');
  const grid = wrap.querySelector('.diploma-grid');
  if (!details || !grid) return;

  const viewer = buildEducationDialog();
  let rendered = false;

  function renderCollections() {
    if (rendered) return;
    rendered = true;

    collections.forEach((item) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'diploma-card';

      const frame = document.createElement('div');
      frame.className = 'diploma-frame';

      const img = document.createElement('img');
      img.src = item.pages[0].src;
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

  details.addEventListener('toggle', () => {
    if (details.open) renderCollections();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  enhanceContactOptions();
  try {
    const collections = await loadEducationCollections();
    renderEducationSection(collections);
  } catch (error) {
    console.error(error);
  }
});
