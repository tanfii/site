(function () {
  function bootEducationCms() {
    const script = document.createElement('script');
    script.src = 'diplomas-cms.js?v=20261005';
    script.onload = async function () {
      try {
        enhanceContactOptions();
        const collections = await loadEducationCollections();
        renderEducationSection(collections);
      } catch (error) {
        console.error('Не удалось загрузить документы об образовании', error);
      }
    };
    script.onerror = function () {
      console.error('Не удалось загрузить diplomas-cms.js');
    };
    document.head.appendChild(script);
  }

  document.addEventListener('DOMContentLoaded', bootEducationCms, { once: true });
})();
