const EDUCATION_DOCUMENTS = [
  {
    file: 'images/diplomas/psychology-consulting-retraining-2019.svg',
    title: 'Профессиональная переподготовка',
    note: 'Психология и психологическое консультирование, 2019'
  },
  {
    file: 'images/diplomas/eot-stages-1-3-2018-2019.svg',
    title: 'Эмоционально-образная терапия',
    note: '1–3 ступени, 2018–2019'
  },
  {
    file: 'images/diplomas/eot-stage-3-repeat-2021.svg',
    title: 'ЭОТ - 3-я ступень, повторное прохождение',
    note: 'Базовый курс, 72 академических часа, 2021'
  },
  {
    file: 'images/diplomas/eot-inner-child-stages-1-3-2020-2021.svg',
    title: 'Внутренний ребёнок и внутренний родитель',
    note: '1–3 ступени в рамках ЭОТ, 2020–2021'
  },
  {
    file: 'images/diplomas/orkt-solution-focused-72h-2024.svg',
    title: 'ОРКТ',
    note: 'Краткосрочное консультирование, ориентированное на решение, 72 часа, 2024'
  },
  {
    file: 'images/diplomas/supervision-training-190h-2025.svg',
    title: 'Супервизия',
    note: 'Повышение квалификации, 190 часов, 2025'
  }
];

document.addEventListener('DOMContentLoaded', function () {
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
            <p>Магистратура, профиль «Коучинг и психологическое консультирование», очно-заочная форма. Планируемый выпуск — 2027.</p>
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
        <span class="education-documents-note">6 документов</span>
      </summary>
      <p class="education-documents-help">Документы показаны крупно. Нажмите на изображение, чтобы открыть его отдельно.</p>
      <div class="diploma-grid" aria-label="Документы об образовании"></div>
    </details>
  `;

  const details = wrap.querySelector('.education-documents');
  const grid = wrap.querySelector('.diploma-grid');
  if (!details || !grid) return;

  function renderDocuments() {
    if (grid.dataset.rendered === '1') return;
    grid.dataset.rendered = '1';

    EDUCATION_DOCUMENTS.forEach(function (item, index) {
      const card = document.createElement('a');
      card.className = 'diploma-card';
      card.href = item.file;
      card.target = '_blank';
      card.rel = 'noopener';

      const frame = document.createElement('div');
      frame.className = 'diploma-frame';

      const img = document.createElement('img');
      img.src = item.file;
      img.alt = item.title || `Документ об образовании ${index + 1}`;
      img.loading = 'lazy';
      img.decoding = 'async';

      img.addEventListener('error', function () {
        card.remove();
      });

      frame.appendChild(img);
      card.appendChild(frame);

      const caption = document.createElement('p');
      caption.className = 'diploma-caption';
      caption.append(document.createTextNode(item.title));

      if (item.note) {
        const note = document.createElement('span');
        note.className = 'diploma-note';
        note.textContent = item.note;
        caption.appendChild(note);
      }

      const open = document.createElement('span');
      open.className = 'diploma-open';
      open.textContent = 'Открыть крупно';
      caption.appendChild(open);

      card.appendChild(caption);
      grid.appendChild(card);
    });
  }

  details.addEventListener('toggle', function () {
    if (details.open) renderDocuments();
  });
});
