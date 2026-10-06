#!/usr/bin/env python3
import json
import math
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

CHANNEL = "sukhareva_psy"
BASE_URL = f"https://t.me/s/{CHANNEL}"
OUTPUT = Path("data/telegram-posts.json")
MAX_PAGES = 280
REQUEST_DELAY = 0.35
TOP_KEEP = 120


def parse_count(value):
    if value is None:
        return 0
    text = str(value).strip().replace("\u00a0", "").replace(" ", "").replace(",", ".").upper()
    match = re.search(r"(\d+(?:\.\d+)?)\s*([KMBКМ]?)", text)
    if not match:
        return 0
    number = float(match.group(1))
    suffix = match.group(2)
    multiplier = {"K": 1_000, "К": 1_000, "M": 1_000_000, "М": 1_000_000, "B": 1_000_000_000}.get(suffix, 1)
    return int(round(number * multiplier))


def reaction_total(node):
    box = node.select_one(".tgme_widget_message_reactions")
    if not box:
        return 0
    counts = []
    for el in box.select(".tgme_reaction_count"):
        counts.append(parse_count(el.get_text(" ", strip=True)))
    if counts:
        return sum(counts)
    for reaction in box.select(".tgme_reaction"):
        numbers = re.findall(r"\d+(?:[\.,]\d+)?\s*[KMBКМ]?", reaction.get_text(" ", strip=True), flags=re.I)
        if numbers:
            counts.append(parse_count(numbers[-1]))
    if counts:
        return sum(counts)
    numbers = re.findall(r"\d+(?:[\.,]\d+)?\s*[KMBКМ]?", box.get_text(" ", strip=True), flags=re.I)
    return sum(parse_count(x) for x in numbers)


def clean_text(text):
    return re.sub(r"\s+", " ", (text or "")).strip()


def auto_informational(text, forwarded=False):
    if forwarded:
        return False

    text = clean_text(text)
    if len(text) < 280:
        return False
    lowered = text.lower()

    blocked_starts = (
        "вопрос!", "пост-знакомство", "пост знакомство", "интересные факты обо мне",
        "с новым годом жизни", "всем читательницам", "всех с праздником",
        "за эту неделю я успела", "сегодня делюсь с вами большой радостью"
    )
    if lowered.startswith(blocked_starts):
        return False

    strong_promo = (
        "#акция", "промокод", "скидка", "записаться по ссылке",
        "запись на консультац", "осталось мест", "места в группе",
        "регистрация на", "старт группы", "набор в группу",
        "до конца недели", "спеццен"
    )
    if any(marker in lowered for marker in strong_promo):
        return False

    groups = (
        (
            "psychology",
            (
                "психолог", "психик", "эмоц", "чувств", "потребност", "тревог", "стресс",
                "терап", "клиент", "отношен", "реакц", "поведен", "границ", "стыд", "вина",
                "злост", "страх", "самооцен", "прокраст", "конфликт", "травм", "привязан",
                "защит", "копинг", "пережив", "внутренн"
            ),
        ),
        (
            "body",
            (
                "тело", "телесн", "симптом", "психосомат", "боль", "мышц", "сон",
                "гормон", "феррит", "желез", "глюкоз", "инсулин", "депресс",
                "антидепресс", "организм", "здоров", "диагноз", "физиолог",
                "биолог", "метабол", "кислород", "гипокси", "донац", "дыхани"
            ),
        ),
        (
            "cognition",
            (
                "мозг", "когнит", "памят", "вниман", "исследован", "нейро",
                "обучен", "чтени", "информац", "восприяти", "концентрац", "мышлен"
            ),
        ),
    )

    group_hits = []
    for _, stems in groups:
        group_hits.append(sum(1 for stem in stems if stem in lowered))

    total_hits = sum(group_hits)
    strongest = max(group_hits) if group_hits else 0

    # Нужна содержательная концентрация темы, а не случайное упоминание
    # психологического/телесного слова в личном посте.
    return strongest >= 2 or (total_hits >= 3 and len(text) >= 420)


def generated_title(headline, text):
    headline = clean_text(headline)
    text = clean_text(text)

    if headline:
        headline = re.sub(r"^(?:#[A-Za-zА-Яа-яЁё0-9_]+\s*)+", "", headline).strip()
        if headline and len(headline) <= 150:
            return headline.rstrip()

    if not text:
        return "Открыть пост"

    first_sentence = re.split(r"(?<=[.!?])\s+", text, maxsplit=1)[0].strip()
    first_sentence = re.sub(r"^[\W_]+", "", first_sentence, flags=re.UNICODE).strip()
    return first_sentence or "Открыть пост"


def generated_topic(text):
    lowered = (text or "").lower()
    groups = (
        ("Тело и симптом", ("психосомат", "симптом", "телесн", "тело", "боль", "мышц")),
        ("Мозг и внимание", ("мозг", "когнит", "памят", "вниман", "нейро", "концентрац", "чтени")),
        ("Физиология", ("феррит", "желез", "глюкоз", "инсулин", "гормон", "метабол", "гипокси", "кислород", "организм", "дыхани")),
        ("Отношения", ("отношен", "границ", "родител", "партнер", "любов", "близост", "привязан")),
        ("Эмоции", ("эмоц", "чувств", "тревог", "стыд", "вина", "злост", "страх")),
        ("Психотерапия", ("терап", "клиент", "психолог", "супервиз", "запрос")),
        ("Исследования", ("исследован", "данные", "эксперимент", "выборк")),
    )
    for label, stems in groups:
        if any(stem in lowered for stem in stems):
            return label
    return "Психология"


def parse_page(html):
    soup = BeautifulSoup(html, "html.parser")
    posts = []
    for wrap in soup.select(".tgme_widget_message_wrap"):
        msg = wrap.select_one(".tgme_widget_message[data-post]") or wrap.select_one("[data-post]")
        if not msg:
            continue
        data_post = msg.get("data-post", "")
        if "/" not in data_post:
            continue
        try:
            post_id = int(data_post.rsplit("/", 1)[1])
        except ValueError:
            continue

        text_el = wrap.select_one(".tgme_widget_message_text")
        raw_text = text_el.get_text("\n", strip=True) if text_el else ""
        lines = [clean_text(line) for line in raw_text.splitlines() if clean_text(line)]
        headline = lines[0] if lines else ""
        text = clean_text(raw_text)
        views_el = wrap.select_one(".tgme_widget_message_views")
        time_el = wrap.select_one(".tgme_widget_message_date time") or wrap.select_one("time[datetime]")
        forwarded = bool(wrap.select_one(".tgme_widget_message_forwarded_from"))
        posts.append({
            "id": post_id,
            "url": f"https://t.me/{CHANNEL}/{post_id}",
            "text": text,
            "headline": headline,
            "views": parse_count(views_el.get_text(" ", strip=True) if views_el else ""),
            "reactions": reaction_total(wrap),
            "date": time_el.get("datetime", "") if time_el else "",
            "forwarded": forwarded,
        })

    before = None
    more = soup.select_one("[data-before]")
    if more and more.get("data-before"):
        before = more.get("data-before")
    if not before:
        prev = soup.select_one('link[rel="prev"]') or soup.select_one('a[rel="prev"]')
        href = prev.get("href", "") if prev else ""
        match = re.search(r"[?&]before=(\d+)", href)
        if match:
            before = match.group(1)
    return posts, before


def fetch_posts():
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        "Accept-Language": "ru,en;q=0.8",
    })
    all_posts = {}
    before = None
    seen_cursors = set()

    for _ in range(MAX_PAGES):
        url = BASE_URL if not before else f"{BASE_URL}?before={before}"
        response = None
        for attempt in range(2):
            try:
                response = session.get(url, timeout=25)
                response.raise_for_status()
                break
            except requests.RequestException:
                if attempt == 1:
                    raise
                time.sleep(2.5)

        posts, next_before = parse_page(response.text)
        if not posts:
            break

        new_count = 0
        for post in posts:
            if post["id"] not in all_posts:
                all_posts[post["id"]] = post
                new_count += 1

        if not next_before or next_before in seen_cursors or new_count == 0:
            break
        seen_cursors.add(next_before)
        before = next_before
        time.sleep(REQUEST_DELAY)

    return list(all_posts.values())


def normalize_scores(posts):
    if not posts:
        return
    rates = [p["reactions"] / max(p["views"], 1) for p in posts]
    absolutes = [math.log1p(p["reactions"]) for p in posts]
    max_rate = max(rates) or 1.0
    max_abs = max(absolutes) or 1.0
    for post, rate, absolute in zip(posts, rates, absolutes):
        post["score"] = round(0.7 * (rate / max_rate) + 0.3 * (absolute / max_abs), 6)


def load_existing():
    if not OUTPUT.exists():
        return {}
    try:
        data = json.loads(OUTPUT.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    if not isinstance(data, list):
        return {}
    return {
        int(item.get("id")): item
        for item in data
        if isinstance(item, dict) and str(item.get("id", "")).isdigit()
    }


def build_output(scraped, existing):
    normalize_scores(scraped)
    candidates = []
    for post in scraped:
        old = existing.get(post["id"], {})
        auto_info = auto_informational(post["text"], post["forwarded"])
        mode = old.get("mode") or "auto"
        show = mode == "include" or (mode == "auto" and auto_info)

        curated_defaults = {
            122: ("Почему важны конкретные симптомы, а не только диагноз", "Тело и симптом"),
            547: ("Зажатые плечи: почему массаж не всегда решает проблему", "Напряжение"),
            1191: ("Почему я не очень люблю говорить о вторичной выгоде", "Потребности"),
        }
        curated_title, curated_topic = curated_defaults.get(post["id"], ("", ""))

        custom_title = old.get("custom_title", "") or curated_title
        custom_topic = old.get("custom_topic", "") or curated_topic
        auto_title = generated_title(post.get("headline", ""), post["text"])
        auto_topic = generated_topic(post["text"])

        item = {
            "id": post["id"],
            "url": post["url"],
            "title": auto_title,
            "topic": auto_topic,
            "custom_title": custom_title,
            "custom_topic": custom_topic,
            "mode": mode,
            "show": show,
            "auto_info": auto_info,
            "reactions": post["reactions"],
            "views": post["views"],
            "score": post["score"],
            "date": post["date"],
            "text_preview": post["text"][:260],
        }
        candidates.append(item)

    candidates.sort(key=lambda x: (x["score"], x["reactions"], x["views"]), reverse=True)
    kept = candidates[:TOP_KEEP]
    kept_ids = {item["id"] for item in kept}

    # Keep explicitly included older entries, but never let stale seed scores outrank live data.
    for post_id, old in existing.items():
        if post_id not in kept_ids and (old.get("mode") == "include" or ("mode" not in old and old.get("show") is True)):
            stale = dict(old)
            stale["mode"] = old.get("mode") or "include"
            stale["show"] = True
            if "custom_title" not in stale:
                stale["custom_title"] = stale.get("title", "")
            if "custom_topic" not in stale:
                stale["custom_topic"] = stale.get("topic", "")
            stale["score"] = 0.0
            stale["reactions"] = int(stale.get("reactions") or 0)
            stale["views"] = int(stale.get("views") or 0)
            kept.append(stale)

    kept.sort(
        key=lambda x: (
            float(x.get("score", 0)),
            int(x.get("reactions", 0)),
            int(x.get("views", 0)),
        ),
        reverse=True,
    )
    return kept


def main():
    existing = load_existing()
    scraped = fetch_posts()
    if not scraped:
        print("No Telegram posts fetched; keeping current file", file=sys.stderr)
        return 2

    output = build_output(scraped, existing)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"Fetched {len(scraped)} posts; stored {len(output)} candidates; "
        f"generated {datetime.now(timezone.utc).isoformat()}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
