# -*- coding: utf-8 -*-
"""Universitelerin kariyer merkezi sayfalarini bulur ve dogrular.

NEDEN
-----
Zorunlu stajin evrak tarafi universitenin kariyer merkezinden / staj
komisyonundan geciyor. Ogrenci "staj formu nereden alinir" diye ariyor ve
cevabi kendi okulunun sayfasinda. Biz o sayfayi bulup baglayabiliyoruz.

Tahmin yok: her adres gercekten cagriliyor, 200 donmeyen ve sayfasinda
"kariyer" gecmeyen adres listeye alinmiyor.

NEZAKET
-------
Universite basina en fazla birkac istek, her host icin bekleme var ve
robots.txt okunup ilgili yol yasakliysa istek HIC atilmiyor.

Kullanim:
    python kariyer_merkezi_bul.py
    python kariyer_merkezi_bul.py --limit 5 --out deneme.json
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from urllib.parse import urlsplit
from urllib.robotparser import RobotFileParser

import requests

HEADERS = {
    "User-Agent": "StajimVarBot/1.0 (+https://stajimvar.com/bot)",
    "Accept": "text/html,application/xhtml+xml",
}
TIMEOUT = 18
HOST_BEKLEME = 1.0

# Alan adlari tahmin degil: bunlar kurumlarin bilinen resmi adresleri.
# Yanlis olani zaten 200 donmez ve listeye girmez.
UNIVERSITELER: list[tuple[str, str]] = [
    ("Boğaziçi Üniversitesi", "boun.edu.tr"),
    ("Orta Doğu Teknik Üniversitesi", "metu.edu.tr"),
    ("İstanbul Teknik Üniversitesi", "itu.edu.tr"),
    ("Hacettepe Üniversitesi", "hacettepe.edu.tr"),
    ("Ankara Üniversitesi", "ankara.edu.tr"),
    ("İstanbul Üniversitesi", "istanbul.edu.tr"),
    ("Ege Üniversitesi", "ege.edu.tr"),
    ("Dokuz Eylül Üniversitesi", "deu.edu.tr"),
    ("Gazi Üniversitesi", "gazi.edu.tr"),
    ("Marmara Üniversitesi", "marmara.edu.tr"),
    ("Yıldız Teknik Üniversitesi", "yildiz.edu.tr"),
    ("Sabancı Üniversitesi", "sabanciuniv.edu"),
    ("Koç Üniversitesi", "ku.edu.tr"),
    ("Bilkent Üniversitesi", "bilkent.edu.tr"),
    ("Anadolu Üniversitesi", "anadolu.edu.tr"),
    ("Akdeniz Üniversitesi", "akdeniz.edu.tr"),
    ("Çukurova Üniversitesi", "cu.edu.tr"),
    ("Bursa Uludağ Üniversitesi", "uludag.edu.tr"),
    ("Selçuk Üniversitesi", "selcuk.edu.tr"),
    ("Atatürk Üniversitesi", "atauni.edu.tr"),
    ("Karadeniz Teknik Üniversitesi", "ktu.edu.tr"),
    ("Erciyes Üniversitesi", "erciyes.edu.tr"),
    ("Gebze Teknik Üniversitesi", "gtu.edu.tr"),
    ("Eskişehir Osmangazi Üniversitesi", "ogu.edu.tr"),
    ("Sakarya Üniversitesi", "sakarya.edu.tr"),
    ("Kocaeli Üniversitesi", "kocaeli.edu.tr"),
    ("Pamukkale Üniversitesi", "pau.edu.tr"),
    ("Süleyman Demirel Üniversitesi", "sdu.edu.tr"),
    ("Ondokuz Mayıs Üniversitesi", "omu.edu.tr"),
    ("İnönü Üniversitesi", "inonu.edu.tr"),
    ("Fırat Üniversitesi", "firat.edu.tr"),
    ("Dicle Üniversitesi", "dicle.edu.tr"),
    ("Trakya Üniversitesi", "trakya.edu.tr"),
    ("Mersin Üniversitesi", "mersin.edu.tr"),
    ("Muğla Sıtkı Koçman Üniversitesi", "mu.edu.tr"),
    ("Yeditepe Üniversitesi", "yeditepe.edu.tr"),
    ("Bahçeşehir Üniversitesi", "bau.edu.tr"),
    ("Özyeğin Üniversitesi", "ozyegin.edu.tr"),
    ("TOBB Ekonomi ve Teknoloji Üniversitesi", "etu.edu.tr"),
    ("Başkent Üniversitesi", "baskent.edu.tr"),
    ("Atılım Üniversitesi", "atilim.edu.tr"),
    ("İzmir Yüksek Teknoloji Enstitüsü", "iyte.edu.tr"),
]

# Once alt alan adi, sonra yol. Turkiye'de kariyer merkezleri cogunlukla
# ayri bir alt alan adinda duruyor.
KALIPLAR = [
    "https://kariyer.{d}",
    "https://kariyermerkezi.{d}",
    "https://www.{d}/kariyer",
    "https://www.{d}/kariyer-merkezi",
    "https://{d}/kariyer",
]

_son: dict[str, float] = {}


def bekle(host: str) -> None:
    kalan = _son.get(host, 0) + HOST_BEKLEME - time.time()
    if kalan > 0:
        time.sleep(kalan)
    _son[host] = time.time()


def izinli(url: str) -> bool:
    """robots.txt kapaliysa istek atmiyoruz. Okunamiyorsa serbest sayiliyor."""
    p = urlsplit(url)
    rp = RobotFileParser()
    try:
        bekle(p.netloc)
        r = requests.get(f"{p.scheme}://{p.netloc}/robots.txt", headers=HEADERS, timeout=10)
        rp.parse(r.text.splitlines() if r.status_code == 200 else [])
    except Exception:
        return True
    return rp.can_fetch("StajimVarBot", url)


def dene(url: str) -> tuple[str, int] | None:
    """200 donen ve icinde 'kariyer' gecen sayfayi kabul ediyor."""
    if not izinli(url):
        return None
    try:
        bekle(urlsplit(url).netloc)
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)
    except Exception:
        return None
    if r.status_code != 200 or len(r.text) < 1500:
        return None
    if "kariyer" not in r.text.lower():
        return None
    return r.url, len(r.text)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int)
    ap.add_argument("--out", default="kariyer_merkezleri.json")
    args = ap.parse_args()

    liste = UNIVERSITELER[: args.limit] if args.limit else UNIVERSITELER
    bulgular = []
    for i, (ad, alan) in enumerate(liste, 1):
        bulundu = None
        for kalip in KALIPLAR:
            sonuc = dene(kalip.format(d=alan))
            if sonuc:
                bulundu = sonuc
                break
        if bulundu:
            url, boy = bulundu
            bulgular.append({"universite": ad, "alan": alan, "url": url})
            print(f"[{i}/{len(liste)}] {ad[:34]:34s} OK  {url[:60]}")
        else:
            print(f"[{i}/{len(liste)}] {ad[:34]:34s} --")

    hedef = Path(args.out)
    if not hedef.is_absolute() and hedef.parent == Path("."):
        hedef = Path(__file__).parent / hedef
    hedef.write_text(json.dumps(bulgular, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\nbulunan: {len(bulgular)}/{len(liste)} -> {hedef.name}")


if __name__ == "__main__":
    main()
