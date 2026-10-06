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
MAX_PAGES = 60
REQUEST_DELAY = 1.15
TOP_KEEP = 60


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
    if len(text) < 220:
        return False
    if len(re.findall(r"[А-Яа-яЁёA-Za-z]", text)) < 120:
        return False
    promo_markers = (
        "записаться по ссылке", "запись на консультац", "осталось мест", "места в группе",
        "скидка", "промокод", "регистрация на", "старт группы", "набор в группу"
    )
    lowered = text.lower()
    marker_hits = sum(marker in lowered for marker in promo_markers)
    return marker_hits < 2


def generated_title(text):
    text = clean_text(text)
    if not text:
        return "Открыть пост"
    sentence = re.split(r"(?<=[.!?])\s+", text)[0].strip()
    sentence = re.sub(r"^[\W_]+", "", sentence, flags=re.UNICODE)
    if len(sentence) > 110:
        sentence = sentence[:107].rstrip(" ,.;:-") + "…"
    return sentence or "Открыть пост"


def generated_topic(text):
    hashtags = re.findall(r"#([A-Za-zА-Яа-яЁё0-9_]{3,})", text or "")
    if hashtags:
        return hashtags[0].replace("_", " ").strip().capitalize()
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
        text = text_el.get_text("\n", strip=True) if text_el else ""
        views_el = wrap.select_one(".tgme_widget_message_views")
        time_el = wrap.select_one(".tgme_widget_message_date time") or wrap.select_one("time[datetime]")
        forwarded = bool(wrap.select_one(".tgme_widget_message_forwarded_from"))
        posts.append({
            "id": post_id,
            "url": f"https://t.me/{CHANNEL}/{post_id}",
            "text": clean_text(text),
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
        item = {
            "id": post["id"],
            "url": post["url"],
            "title": old.get("title") or generated_title(post["text"]),
            "topic": old.get("topic") or generated_topic(post["text"]),
            "show": old.get("show") if "show" in old else auto_info,
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

    for post_id, old in existing.items():
        if post_id not in kept_ids and old.get("show") is True:
            kept.append(old)

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
