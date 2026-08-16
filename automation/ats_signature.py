"""Sirketin kariyer sayfasindan hangi ATS'i kullandigini tespit eder.

NEDEN
-----
`find_sources.py` sirket adindan slug turetip Lever/Greenhouse/Ashby/Workable
panolarini deniyor. Bu yontem teknoloji sirketlerinde iyi calisiyor ama
Turkiye'nin buyuk isverenlerinde tutmuyor: onlar SAP SuccessFactors, Oracle
Recruiting ve Taleo kullaniyor ve pano kimlikleri sirket adindan turemiyor.

Bu modul tersini yapiyor: sirketin KENDI kariyer sayfasini aciyor ve sayfadaki
baglantilarda ATS imzasi ariyor. Tahmin yok — sayfada gecen adres neyse o.

NEZAKET
-------
Sirket basina en fazla birkac istek atiliyor, her host icin bekleme var ve
robots.txt okunup ilgili yol yasakliysa istek HIC atilmiyor. Amac ilan kazimak
degil, yalnizca hangi saglayicinin kullanildigini ogrenmek.

Kullanim:
    python ats_signature.py                 # hepsini tara
    python ats_signature.py --limit 10
    python ats_signature.py --out bulgular.json
"""
from __future__ import annotations

import argparse
import json
import re
import time
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from urllib.robotparser import RobotFileParser

import requests

HEADERS = {
    "User-Agent": "StajimVarBot/1.0 (+https://stajimvar.com/bot)",
    "Accept": "text/html,application/xhtml+xml",
}
TIMEOUT = 20
HOST_DELAY = 1.5

# Kariyer sayfasi icin denenecek yollar. Sirasi onemli: Turkce olanlar once,
# cunku Turk sirketlerinde /kariyer daha yaygin ve genelde daha dolu.
KARIYER_YOLLARI = ["/kariyer", "/careers", "/career", "/tr/kariyer", "/en/careers", "/insan-kaynaklari"]

# ATS imzalari: sayfada gecen adres kalibi -> saglayici adi.
IMZALAR: list[tuple[str, re.Pattern[str]]] = [
    ("lever",           re.compile(r"jobs\.lever\.co/([a-z0-9\-]+)", re.I)),
    ("greenhouse",      re.compile(r"boards\.greenhouse\.io/([a-z0-9\-]+)", re.I)),
    ("ashby",           re.compile(r"jobs\.ashbyhq\.com/([a-z0-9\-]+)", re.I)),
    ("workable",        re.compile(r"apply\.workable\.com/([a-z0-9\-]+)", re.I)),
    ("smartrecruiters", re.compile(r"careers\.smartrecruiters\.com/([A-Za-z0-9\-]+)", re.I)),
    ("workday",         re.compile(r"([a-z0-9\-]+)\.(wd\d+)\.myworkdayjobs\.com", re.I)),
    ("successfactors",  re.compile(r"(?:career|jobs)\d*\.([a-z0-9\-]+)\.(?:com|net)/\w*[Cc]areer|successfactors\.(?:com|eu)|sapsf\.(?:com|eu)", re.I)),
    ("oracle_orc",      re.compile(r"([a-z0-9\-]+)\.oraclecloud\.com/hcmUI/CandidateExperience", re.I)),
    ("taleo",           re.compile(r"([a-z0-9\-]+)\.taleo\.net", re.I)),
    ("bamboohr",        re.compile(r"([a-z0-9\-]+)\.bamboohr\.com", re.I)),
    ("personio",        re.compile(r"([a-z0-9\-]+)\.jobs\.personio\.(?:de|com)", re.I)),
    ("recruitee",       re.compile(r"([a-z0-9\-]+)\.recruitee\.com", re.I)),
    ("teamtailor",      re.compile(r"([a-z0-9\-]+)\.teamtailor\.com", re.I)),
    ("icims",           re.compile(r"([a-z0-9\-]+)\.icims\.com", re.I)),
    ("jobvite",         re.compile(r"jobs\.jobvite\.com/([a-z0-9\-]+)", re.I)),
    ("sap_jobs",        re.compile(r"jobs\.sap\.com", re.I)),
    ("kariyer_net",     re.compile(r"kariyer\.net", re.I)),
    ("linkedin",        re.compile(r"linkedin\.com/(?:company|jobs)", re.I)),
]

_son_istek: dict[str, float] = {}
_robots: dict[str, RobotFileParser | None] = {}


def _bekle(host: str) -> None:
    kalan = _son_istek.get(host, 0) + HOST_DELAY - time.time()
    if kalan > 0:
        time.sleep(kalan)
    _son_istek[host] = time.time()


def izin_var_mi(url: str) -> bool:
    """robots.txt yasakliyorsa istek atilmaz.

    Hata durumunda izin VERILIYOR sayiliyor: robots.txt'e ulasamamak yasak
    demek degil. Ama gercekten 'Disallow' yaziyorsa ona uyuluyor.
    """
    parca = urlsplit(url)
    host = parca.netloc
    if host not in _robots:
        rp = RobotFileParser()
        try:
            _bekle(host)
            # DIKKAT: RobotFileParser.read() urllib kullanir ve ZAMAN ASIMI
            # ALMAZ. Cevap vermeyen bir sunucuda tarama suresiz asili kaliyor.
            # Dosyayi zaman asimli cekip parse()'a veriyoruz.
            r = requests.get(
                f"{parca.scheme}://{host}/robots.txt",
                headers=HEADERS, timeout=10,
            )
            if r.status_code == 200:
                rp.parse(r.text.splitlines())
            else:
                # robots.txt yoksa kisitlama da yok.
                _robots[host] = None
                return True
        except Exception:
            _robots[host] = None
            return True
        _robots[host] = rp
    rp = _robots[host]
    if rp is None:
        return True
    try:
        return rp.can_fetch(HEADERS["User-Agent"], url)
    except Exception:
        return True


def getir(url: str) -> str | None:
    if not izin_var_mi(url):
        return None
    host = urlsplit(url).netloc
    _bekle(host)
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)
    except Exception:
        return None
    if r.status_code != 200 or "html" not in r.headers.get("content-type", ""):
        return None
    # Yonlendirme baska bir ATS'e gitmis olabilir; son adresi de metne kat.
    return r.text[:400_000] + "\n" + r.url


def imza_ara(metin: str) -> dict[str, str]:
    """Metinde gecen ATS imzalarini {saglayici: kimlik} olarak dondurur."""
    bulunan: dict[str, str] = {}
    for ad, kalip in IMZALAR:
        m = kalip.search(metin)
        if m:
            bulunan[ad] = (m.group(1) if m.groups() else "").lower() or "?"
    return bulunan


def sirketi_tara(ad: str, site: str) -> dict:
    sonuc = {"sirket": ad, "site": site, "kariyer_url": None, "ats": {}}
    if not site.startswith("http"):
        site = "https://" + site

    for yol in KARIYER_YOLLARI:
        url = urljoin(site, yol)
        html = getir(url)
        if not html:
            continue
        bulunan = imza_ara(html)
        sonuc["kariyer_url"] = url
        if bulunan:
            sonuc["ats"] = bulunan
            return sonuc

    # Kariyer yolu bulunamadiysa ana sayfaya bak: cogu sirket oradan link veriyor.
    html = getir(site)
    if html:
        sonuc["ats"] = imza_ara(html)
        sonuc["kariyer_url"] = sonuc["kariyer_url"] or site
    return sonuc


def main() -> None:
    ayrist = argparse.ArgumentParser(description="Kariyer sayfasindan ATS imzasi tespit eder")
    ayrist.add_argument("--limit", type=int, default=0, help="ilk N sirket")
    ayrist.add_argument("--out", default="ats_bulgular.json")
    ayrist.add_argument("--girdi", default="buyuk_isverenler.json")
    args = ayrist.parse_args()

    yol = Path(__file__).parent / args.girdi
    sirketler = json.loads(yol.read_text(encoding="utf-8"))
    if args.limit:
        sirketler = sirketler[: args.limit]

    bulgular = []
    sayac: dict[str, int] = {}
    for i, s in enumerate(sirketler, 1):
        r = sirketi_tara(s["ad"], s["site"])
        bulgular.append(r)
        for saglayici in r["ats"]:
            sayac[saglayici] = sayac.get(saglayici, 0) + 1
        durum = ", ".join(f"{k}:{v}" for k, v in r["ats"].items()) or "-"
        print(f"[{i}/{len(sirketler)}] {s['ad']:32s} {durum}", flush=True)

    (Path(__file__).parent / args.out).write_text(
        json.dumps(bulgular, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    print("\n=== SAGLAYICI DAGILIMI ===")
    for k, v in sorted(sayac.items(), key=lambda x: -x[1]):
        print(f"  {k:18s} {v}")


if __name__ == "__main__":
    main()
