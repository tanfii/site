(function () {
  'use strict';

  const COUNTER_ID = 113903025;

  function send(method) {
    if (typeof window.ym !== 'function') return;
    const args = Array.prototype.slice.call(arguments, 1);
    window.ym.apply(window, [COUNTER_ID, method].concat(args));
  }

  function sectionKey(element) {
    const section = element && element.closest ? element.closest('section') : null;
    if (!section) {
      if (element && element.closest && element.closest('header')) return 'header';
      if (element && element.closest && element.closest('footer')) return 'footer';
      return 'page';
    }
    if (section.id) return section.id;

    const known = [
      'hero',
      'body-section',
      'process',
      'practical',
      'education',
      'reading',
      'org-section',
      'final',
      'supervision-compact',
      'article-head',
      'article-section'
    ];
    for (let i = 0; i < known.length; i += 1) {
      if (section.classList.contains(known[i])) return known[i];
    }
    return 'section';
  }

  function contextFor(element, extra) {
    return Object.assign({
      page_path: window.location.pathname,
      page_title: document.title,
      placement: sectionKey(element)
    }, extra || {});
  }

  function goal(name, element, extra) {
    send('reachGoal', name, {
      site_event: contextFor(element, Object.assign({ event_name: name }, extra || {}))
    });
  }

  function event(name, element, extra) {
    send('params', {
      site_event: contextFor(element, Object.assign({ event_name: name }, extra || {}))
    });
  }

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 160);
  }

  function virtualArticleHit(link) {
    const dataPage = link.getAttribute('data-page');
    if (!dataPage) return;
    const virtualPath = '/psychosomatika/' + dataPage.replace(/^\/+/, '');
    const title = cleanText(link.textContent) || document.title;
    send('hit', virtualPath, {
      title: title,
      referer: window.location.href,
      params: {
        virtual_content: {
          source: 'psychosomatika',
          path: dataPage
        }
      }
    });
    event('content_open', link, {
      content_path: dataPage,
      content_title: title
    });
  }

  function virtualHubHit(link) {
    if (window.location.pathname !== '/psychosomatika/' || !document.body.classList.contains('page-open')) return;
    send('hit', '/psychosomatika/', {
      title: 'Психосоматика - Вероника Сухарева',
      referer: window.location.href
    });
    event('content_return', link, { content_path: 'hub' });
  }

  document.addEventListener('click', function (clickEvent) {
    const link = clickEvent.target && clickEvent.target.closest
      ? clickEvent.target.closest('a')
      : null;
    if (!link) return;

    if (link.hasAttribute('data-page')) virtualArticleHit(link);
    if (link.hasAttribute('data-home') || link.id === 'back') virtualHubHit(link);

    const rawHref = link.getAttribute('href') || '';
    if (/^mailto:/i.test(rawHref)) {
      goal('email_click', link, {
        link_text: cleanText(link.textContent)
      });
      return;
    }

    let url;
    try {
      url = new URL(link.href, window.location.href);
    } catch (_) {
      return;
    }

    const host = url.hostname.toLowerCase();
    const path = url.pathname.replace(/\/+$/, '').toLowerCase();

    if (host === 't.me' && path === '/veronikasukhareva') {
      goal('booking_click', link, {
        destination: 'telegram_booking',
        link_text: cleanText(link.textContent)
      });
      return;
    }

    if (host === 't.me' && (path === '/sukhareva_psy' || path.indexOf('/sukhareva_psy/') === 0)) {
      goal('blog_click', link, {
        destination: 'telegram_channel',
        link_text: cleanText(link.textContent)
      });
      return;
    }

    if (
      url.origin === window.location.origin &&
      url.pathname.replace(/\/+$/, '/') === '/psychosomatika/' &&
      window.location.pathname !== '/psychosomatika/'
    ) {
      goal('psychosomatika_open', link, {
        destination: '/psychosomatika/',
        link_text: cleanText(link.textContent)
      });
    }
  }, true);

  function initSectionTracking() {
    if (!('IntersectionObserver' in window)) return;

    const seen = new Set();
    const sections = Array.from(document.querySelectorAll('main section'));
    if (!sections.length) return;

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const key = sectionKey(entry.target);
        const uniqueKey = window.location.pathname + ':' + key;
        if (seen.has(uniqueKey)) return;
        seen.add(uniqueKey);
        event('section_view', entry.target, { section: key });
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -20% 0px'
    });

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSectionTracking, { once: true });
  } else {
    initSectionTracking();
  }
})();
