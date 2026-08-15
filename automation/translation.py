"""Ilan metinlerini kaydetmeden once Turkcelestirir.

Bu modul yalnizca scraper gorevinde kullanilir. Google Translate katmani
anahtar istemez; belirli erken-kariyer unvanlari ise platform diline uygun,
kontrollu karsiliklarla standardize edilir.
"""
from __future__ import annotations

import re
from functools import lru_cache

from deep_translator import GoogleTranslator


TITLE_OVERRIDES = {
    "software engineer (new grad)": "Yazılım Mühendisi (Yeni Mezun / Stajyer)",
    "management trainee for people & culture": "İnsan Kaynakları Yönetici Adayı (MT)",
    "management trainee for people & culture (fresh grad)": "İnsan Kaynakları Yönetici Adayı (MT)",
    "product specialist (new grad)": "Ürün Uzmanı (Yeni Mezun / Stajyer)",
}


def _chunks(text: str, limit: int = 4_500) -> list[str]:
    """Ceviri servisinin metin sinirina takilmadan cumle bazli boler."""
    if len(text) <= limit:
        return [text]

    chunks: list[str] = []
    current = ""
    for sentence in re.split(r"(?<=[.!?])\s+", text):
        if current and len(current) + len(sentence) + 1 > limit:
            chunks.append(current)
            current = sentence
        else:
            current = f"{current} {sentence}".strip()
    if current:
        chunks.append(current)
    return chunks


@lru_cache(maxsize=1)
def _translator() -> GoogleTranslator:
    return GoogleTranslator(source="en", target="tr")


def translate_title(title: str) -> str:
    normalized = re.sub(r"\s+", " ", title).strip().casefold()
    if normalized in TITLE_OVERRIDES:
        return TITLE_OVERRIDES[normalized]
    return translate_text(title)


def translate_text(text: str) -> str:
    """Bos metni korur; servis hatasinda ilani yanlislikla Ingilizce yazmaz."""
    text = text.strip()
    if not text:
        return text
    try:
        return "\n\n".join(_translator().translate(part) for part in _chunks(text))
    except Exception as error:
        raise RuntimeError(f"Turkce ceviri yapilamadi: {error}") from error
