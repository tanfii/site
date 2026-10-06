(function () {
  const POSTS_URL = 'https://raw.githubusercontent.com/tanfii/site/main/data/telegram-posts.json';
  const SESSION_KEY = 'site-telegram-featured-v1';
  const LAST_KEY = 'site-telegram-featured-last-v1';

  function uniqueById(items) {
    const seen = new Set();
    return items.filter(function (item) {
      const id = String(item.id || item.post_id || item.url || '');
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  function weightedPick(items, count) {
    const source = items.slice();
    const selected = [];
    while (source.length && selected.length < count) {
      const weights = source.map(function (_, index) {
        return 1 / Math.sqrt(index + 1);
      });
      const total = weights.reduce(function (sum, weight) { return sum + weight; }, 0);
      let needle = Math.random() * total;
      let chosen = 0;
      for (let i = 0; i < weights.length; i += 1) {
        needle -= weights[i];
        if (needle <= 0) {
          chosen = i;
          break;
        }
      }
      selected.push(source.splice(chosen, 1)[0]);
    }
    return selected;
  }

  function readIds(storage, key) {
    try {
      const value = JSON.parse(storage.getItem(key) || '[]');
      return Array.isArray(value) ? value.map(String) : [];
    } catch (_) {
      return [];
    }
  }

  function choosePosts(top) {
    const byId = new Map(top.map(function (post) { return [String(post.id || post.post_id), post]; }));
    const sessionIds = readIds(sessionStorage, SESSION_KEY);
    const sessionPosts = sessionIds.map(function (id) { return byId.get(id); }).filter(Boolean);
    if (sessionPosts.length === Math.min(3, top.length)) return sessionPosts;

    const lastIds = new Set(readIds(localStorage, LAST_KEY));
    let pool = top.filter(function (post) { return !lastIds.has(String(post.id || post.post_id)); });
    if (pool.length < 3) pool = top.slice();
    const selected = weightedPick(pool, Math.min(3, pool.length));
    const ids = selected.map(function (post) { return String(post.id || post.post_id); });
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(ids));
      localStorage.setItem(LAST_KEY, JSON.stringify(ids));
    } catch (_) {}
    return selected;
  }

  function render(posts) {
    const list = document.querySelector('.read-list');
    if (!list || !posts.length) return;
    list.replaceChildren();
    posts.forEach(function (post) {
      const link = document.createElement('a');
      link.className = 'read-item';
      link.href = post.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      const topic = document.createElement('span');
      topic.textContent = post.topic || 'Telegram';
      const title = document.createElement('strong');
      title.textContent = post.title || post.text_preview || 'Открыть пост';
      link.append(topic, title);
      list.appendChild(link);
    });
  }

  async function boot() {
    try {
      const response = await fetch(POSTS_URL + '?v=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) throw new Error(String(response.status));
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Неверный формат telegram-posts.json');
      const top = uniqueById(data)
        .filter(function (post) { return post.show !== false && post.url && (post.title || post.text_preview); })
        .sort(function (a, b) { return Number(b.score || 0) - Number(a.score || 0); })
        .slice(0, 20);
      render(choosePosts(top));
    } catch (error) {
      console.error('Не удалось загрузить подборку Telegram', error);
    }
  }

  document.addEventListener('DOMContentLoaded', boot, { once: true });
})();
