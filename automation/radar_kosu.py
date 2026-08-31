"""KEŞİF RADARI — GÖLGE KOŞUSU

Gerçek ağa çıkan tek yer burası. `radar.py` ve `radar_cozucu.py` saf
kalıyor; testleri ağ olmadan çalışıyor.

Bu koşu canonical `listings` tablosuna HİÇBİR ŞEY YAZMIYOR. Yalnızca
sinyalleri toplar, çözmeye çalışır ve huniyi raporlar.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from urllib.parse import urlparse

import requests

from automation.radar import coz, rapor
from automation.radar_cozucu import ats_tani, toplayici_mi
from automation.radar_sirket import AramaYok, bilgi_tabani_kur
from automation.radar_kaynaklar import (
    KULLANICI_AJANI,
    KaynakKapali,
    kariyer_net,
    youthall,
)

ZAMAN_ASIMI = 12
RAPOR_DOSYASI = "radar-rapor.json"


def _oturum() -> requests.Session:
    o = requests.Session()
    o.headers.update({"User-Agent": KULLANICI_AJANI, "Accept-Language": "tr,en;q=0.8"})
    return o


def getir_fabrikasi(oturum: requests.Session, onbellek: dict[str, tuple[int, str]]):
    """Aynı adresi bir koşuda ikinci kez çekmiyor.

    Alan adı doğrulaması ve kariyer araması aynı ana sayfayı defalarca
    isteyebiliyor; önbellek hem hızlı hem kaynağa saygılı.
    """

    def getir(url: str) -> tuple[int, str]:
        if url in onbellek:
            return onbellek[url]
        try:
            y = oturum.get(url, timeout=ZAMAN_ASIMI, allow_redirects=True)
            sonuc = (y.status_code, y.text if "text/html" in y.headers.get("content-type", "") or y.status_code == 200 else "")
        except requests.RequestException:
            sonuc = (0, "")
        onbellek[url] = sonuc
        time.sleep(0.4)
        return sonuc

    return getir


def resmi_ilanlari_getir_fabrikasi(getir):
    """Kariyer kaynağındaki ilan başlıklarını ve adreslerini çıkarır.

    ATS'e özel tam adaptör YAZILMIYOR — bu sprintte amaç TANIMAK. Genel
    HTML ayrıştırma yeterli olduğunda ilan bulunuyor; olmadığında sinyal
    `unresolved` kalıyor ve boşluk analizinde hangi ATS için adaptör
    gerektiği sayıyla görünüyor.
    """

    def resmi_ilanlari_getir(alan_adi: str, kariyer_url: str) -> list[dict]:
        durum, govde = getir(kariyer_url)
        if durum != 200 or not govde:
            return []
        ilanlar: list[dict] = []
        gorulen: set[str] = set()
        for m in re.finditer(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', govde, re.I | re.S):
            adres, ic = m.group(1), re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", m.group(2))).strip()
            if not ic or len(ic) < 4 or len(ic) > 120:
                continue
            tam = adres if adres.startswith("http") else None
            if tam is None:
                temel = f"https://{urlparse(kariyer_url).netloc or alan_adi}"
                tam = temel + (adres if adres.startswith("/") else "/" + adres)
            if tam in gorulen or toplayici_mi(tam):
                continue
            # İlan gibi görünen bağlar: ATS adresi ya da /job/ /ilan/ yolu.
            if not (ats_tani(tam) or re.search(r"/(job|jobs|ilan|pozisyon|vacanc)", tam, re.I)):
                continue
            gorulen.add(tam)
            ilanlar.append({"title": ic, "url": tam, "location": None,
                            "description": None, "employment_type": None})
        return ilanlar[:60]

    return resmi_ilanlari_getir


def _rest(yol: str, parametreler: dict) -> list[dict]:
    """Servis anahtarıyla okuma. Anahtar yoksa boş liste."""
    url = os.getenv("SUPABASE_URL")
    anahtar = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not anahtar:
        return []
    try:
        y = requests.get(
            f"{url}/rest/v1/{yol}", params=parametreler,
            headers={"apikey": anahtar, "Authorization": f"Bearer {anahtar}"},
            timeout=ZAMAN_ASIMI,
        )
        y.raise_for_status()
        return y.json()
    except requests.RequestException:
        return []


def bilgi_tabanini_yukle() -> dict[str, str]:
    """KATMAN 1 verisi: kendi şirket ve ilan kayıtlarımız."""
    sirketler = _rest("companies", {"select": "name,website_url"})
    ilanlar = _rest("listings", {"select": "canonical_url,apply_url,source_url,companies(name)"})
    return bilgi_tabani_kur(sirketler, ilanlar)


def mevcut_ilanlari_yukle() -> dict[str, str]:
    """Canonical listede zaten olan resmî adresler → listing id.

    Servis anahtarı yoksa boş dönüyor: duplicate tespiti zayıflar ama
    koşu düşmez ve YAYIN zaten kapalı.
    """
    url = os.getenv("SUPABASE_URL")
    anahtar = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not anahtar:
        return {}
    try:
        y = requests.get(
            f"{url}/rest/v1/listings",
            params={"select": "id,canonical_url,apply_url,source_url", "status": "eq.published"},
            headers={"apikey": anahtar, "Authorization": f"Bearer {anahtar}"},
            timeout=ZAMAN_ASIMI,
        )
        y.raise_for_status()
    except requests.RequestException:
        return {}
    harita: dict[str, str] = {}
    for satir in y.json():
        for alan in ("canonical_url", "apply_url", "source_url"):
            if satir.get(alan):
                harita[satir[alan]] = satir["id"]
    return harita


def main(argv: list[str] | None = None) -> int:
    ayrıştırıcı = argparse.ArgumentParser(description="Keşif radarı gölge koşusu")
    ayrıştırıcı.add_argument("--sayfa", type=int, default=2)
    args = ayrıştırıcı.parse_args(argv)

    oturum = _oturum()
    getir = getir_fabrikasi(oturum, {})
    resmi_getir = resmi_ilanlari_getir_fabrikasi(getir)
    mevcut = mevcut_ilanlari_yukle()
    bilgi = bilgi_tabanini_yukle()
    saglayici = AramaYok()
    sirket_onbellegi: dict = {}
    print(f"bilgi tabanı: {len(bilgi)} şirket | arama katmanı: {saglayici.ad}", file=sys.stderr)

    sinyaller = []
    kapali: dict[str, str] = {}
    for ad, toplayici in (("kariyer.net", kariyer_net), ("youthall", youthall)):
        try:
            bulunan = toplayici(getir, args.sayfa)
            sinyaller += bulunan
            print(f"{ad}: {len(bulunan)} sinyal", file=sys.stderr)
        except KaynakKapali as k:
            kapali[ad] = str(k)
            print(f"{ad}: KAPALI — {k}", file=sys.stderr)
        except Exception as hata:  # kaynak düşerse radar devam ediyor
            kapali[ad] = f"{type(hata).__name__}"
            print(f"{ad}: hata {type(hata).__name__}", file=sys.stderr)

    # LinkedIn: robots.txt tüm yolları kapatıyor, adaptör yazılmadı.
    from automation.radar_kaynaklar import LINKEDIN_NEDEN_YOK

    kapali["linkedin"] = LINKEDIN_NEDEN_YOK

    sonuclar = []
    for i, s in enumerate(sinyaller, 1):
        sonuclar.append(coz(s, getir, resmi_getir, mevcut, bilgi, saglayici, sirket_onbellegi))
        if i % 10 == 0:
            print(f"  çözülen: {i}/{len(sinyaller)}", file=sys.stderr)

    r = rapor(sonuclar, kapali)
    r["arama_katmani"] = {"saglayici": saglayici.ad,
                          "kullanilabilir": getattr(saglayici, "kullanilabilir", False),
                          "sorgu": 0}
    r["bilgi_tabani_sirket"] = len(bilgi)
    r["domain_guven"] = {
        "HIGH": sum(1 for s in sonuclar if s.resolved_company_domain and s.resolution_confidence == "HIGH"),
        "MEDIUM": sum(1 for s in sonuclar if s.resolved_company_domain and s.resolution_confidence == "MEDIUM"),
        "yok": sum(1 for s in sonuclar if not s.resolved_company_domain),
    }
    r["unresolved_ornekleri"] = [
        {
            "company": s.company_name_raw[:60],
            "title": s.title_raw[:60],
            "source": s.source,
            "stage": s.resolution_status,
            "reason": s.resolution_reason,
            "ats": s.resolved_ats,
        }
        for s in sonuclar if s.resolution_status == "unresolved"
    ][:25]
    r["would_publish_ornekleri"] = [
        {
            "company": s.company_name_raw[:60],
            "official_title": s.title_raw[:60],
            "official_url": s.resolved_official_job_url,
            "ats": s.resolved_ats,
            "quality": s.quality_class,
        }
        for s in sonuclar if s.would_publish
    ][:25]

    with open(RAPOR_DOSYASI, "w", encoding="utf-8") as f:
        json.dump(r, f, ensure_ascii=False, indent=2)
    print(json.dumps(r["kaynaklar"], ensure_ascii=False, indent=2))
    print(json.dumps(r["capraz"], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
