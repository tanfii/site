// Добавляйте дипломы сюда. Файлы складывайте в images/diplomas/.
// Пример:
// { file: 'images/diplomas/magistratura.jpg', title: 'Диплом магистра', note: 'Организационная психология, 2025' },
const DIPLOMAS = [
];

document.addEventListener('DOMContentLoaded', function () {
  const finalSection = document.querySelector('.final');
  if (!finalSection) return;

  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = 'education.css';
  document.head.appendChild(stylesheet);

  const section = document.createElement('section');
  section.className = 'section education';
  section.id = 'education';
  section.hidden = true;
  section.innerHTML = `
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow">Образование</p>
        <h2>Образование и квалификация</h2>
        <p>Дипломы и документы об образовании. Нажмите на документ, чтобы открыть его в полном размере.</p>
      </div>
      <div class="diploma-grid" aria-label="Дипломы и документы об образовании"></div>
    </div>`;

  finalSection.before(section);
  const grid = section.querySelector('.diploma-grid');
  let loaded = 0;

  DIPLOMAS.forEach(function (item, index) {
    if (!item || !item.file) return;

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

    img.addEventListener('load', function () {
      if (img.naturalWidth > img.naturalHeight) card.classList.add('is-landscape');
      loaded += 1;
      if (loaded === 1) section.hidden = false;
    });

    img.addEventListener('error', function () {
      card.remove();
    });

    frame.appendChild(img);
    card.appendChild(frame);

    if (item.title || item.note) {
      const caption = document.createElement('p');
      caption.className = 'diploma-caption';
      if (item.title) caption.append(document.createTextNode(item.title));
      if (item.note) {
        const note = document.createElement('span');
        note.className = 'diploma-note';
        note.textContent = item.note;
        caption.appendChild(note);
      }
      card.appendChild(caption);
    }

    grid.appendChild(card);
  });
});
