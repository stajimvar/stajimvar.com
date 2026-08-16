"""Ilan metinlerini kaydetmeden once Turkcelestirir.

Bu modul yalnizca scraper gorevinde kullanilir. Google Translate katmani
anahtar istemez; belirli erken-kariyer unvanlari ise platform diline uygun,
kontrollu karsiliklarla standardize edilir.

NEDEN YENIDEN YAZILDI
---------------------
Eskiden ceviri basarisiz olunca RuntimeError firlatiyordu ve discover.py bunu
yakalamadigi icin KAYNAGIN TAMAMI dusuyordu. 16 Agustos taramasinda dort
kaynak boyle kaybedildi: Alumil, AstraZeneca, Cicek Sepeti, Vertigo Games --
dordunun de gercek staj ilani vardi.

Sebep kalici bir ariza degildi: 37 kaynak arka arkaya cevrilmeye calisilinca
ucretsiz Google ucnoktasi hiz sinirina takiliyor. Ayni metin tek basina
denendiginde sorunsuz cevriliyor.

Yeni davranis:
  1. Her cagri once onbellekten bakilir (ayni unvan defalarca gecebiliyor).
  2. Basarisiz olursa artan bekleme ile birkac kez denenir.
  3. Yine de olmazsa ORIJINAL METIN dondurulur ve sayaca islenir.

Ucuncu madde bilincli bir tercih: Ingilizce duran gercek bir staj ilani,
hic gorunmeyen bir ilandan iyidir. Kac metnin cevrilemedigi tarama ciktisinda
raporlanir, boylece sessizce Ingilizceye kaymiyoruz.
"""
from __future__ import annotations

import re
import time
from functools import lru_cache

from deep_translator import GoogleTranslator


TITLE_OVERRIDES = {
    "software engineer (new grad)": "Yazılım Mühendisi (Yeni Mezun / Stajyer)",
    "management trainee for people & culture": "İnsan Kaynakları Yönetici Adayı (MT)",
    "management trainee for people & culture (fresh grad)": "İnsan Kaynakları Yönetici Adayı (MT)",
    "product specialist (new grad)": "Ürün Uzmanı (Yeni Mezun / Stajyer)",
}

DENEME_SAYISI = 3
BEKLEME_SANIYE = (1.0, 3.0, 7.0)

# Cevrilemeyen metin sayaci. discover.py tarama sonunda okur.
cevrilemeyen = 0


def sayaci_sifirla() -> None:
    global cevrilemeyen
    cevrilemeyen = 0


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


def _parcayi_cevir(part: str) -> str | None:
    """Tek bir parcayi cevirir. Basaramazsa None doner, istisna firlatmaz."""
    for deneme in range(DENEME_SAYISI):
        try:
            sonuc = _translator().translate(part)
            if sonuc:
                return sonuc
        except Exception:
            pass
        if deneme < DENEME_SAYISI - 1:
            # Hiz sinirinin gecmesini bekle. Sabit degil, artan bekleme.
            time.sleep(BEKLEME_SANIYE[deneme])
    return None


@lru_cache(maxsize=2048)
def _cevir_onbellekli(text: str) -> str:
    parcalar = _chunks(text)
    cevrilen = [_parcayi_cevir(p) for p in parcalar]

    if any(c is None for c in cevrilen):
        # Kismi ceviri, yarisi Turkce yarisi Ingilizce bir metin uretirdi.
        # Boyle bir metin okunmaz; ya hepsi ya hicbiri.
        return text

    return "\n\n".join(c for c in cevrilen if c is not None)


def translate_title(title: str) -> str:
    normalized = re.sub(r"\s+", " ", title).strip().casefold()
    if normalized in TITLE_OVERRIDES:
        return TITLE_OVERRIDES[normalized]
    return translate_text(title)


def translate_text(text: str) -> str:
    """Bos metni korur; ceviri yapilamazsa orijinali dondurur."""
    global cevrilemeyen
    text = text.strip()
    if not text:
        return text

    sonuc = _cevir_onbellekli(text)
    if sonuc == text and not _zaten_turkce(text):
        cevrilemeyen += 1
    return sonuc


def _zaten_turkce(text: str) -> bool:
    """Kaba bir kontrol: metin Turkce karakter tasiyorsa cevrilmemis sayma."""
    return any(ch in text for ch in "çğıöşüÇĞİÖŞÜ")
