"""LOGOSUZ İLAN EKLENMEZ (25 Kasım 2026, kullanıcı kuralı)

"Ben yeni ilan girdiğimde logosuz eklemesin, logolarını da eklesin;
canlıya alırken bu kural olsun." İki katman:

1. Kaynak kapısı (bu dosya): sources.json'a giren her yeni şirket kaynağı
   bir logo yolu taşımalı — `logo_url` (depodaki dosya, Commons ya da
   şirketin resmî adresi), `website` ya da logoyu kendisi veren bir ilan
   sistemi (Ashby, Personio, Greenhouse, Lever, Workable). Yoksa CI düşer,
   PR birleşmez.
2. Yayın kapısı (promote.py): logosu boş şirketin ilanı yayına çıkmaz.

Kullanıcı mevcut kaynaklarla uğraşılmamasını istedi: kural yürürlüğe
girdiği gün logo yolu olmayan 55 kaynak aşağıda DONDURULDU. Bu liste
yalnız küçülebilir; yeni bir kimlik eklenemez.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

KOK = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(KOK / "automation"))

import logos  # noqa: E402
import promote  # noqa: E402

KURAL_ONCESI = frozenset({
    "2zero-join-de", "aboutyou-smartrecruiters-de", "adi-tr-official-jsonld", "allianzgi-jsonld-de",
    "amazon-ilan-sayfasi-de", "amazon-tr-ilan-sayfasi", "anadolu-ajansi-ajans-staj-ilan-sayfasi",
    "anadolu-ajansi-yurt-staj-ilan-sayfasi", "atryaio-join-de", "barilla-ilan-sayfasi-de",
    "baykar-tr-ilan-sayfasi", "bertelsmann-smartrecruiters-de", "bmwgroup-ilan-sayfasi-de",
    "bosch-smartrecruiters-de", "deliveryhero-smartrecruiters", "dhl-jsonld-de", "ebay-jsonld-de",
    "esteelauder-jsonld-de", "esteelauder-tr-official-jsonld", "fergani-tr-ilan-sayfasi",
    "festool-ilan-sayfasi-de", "fixfirst-join-de", "fugo-games-official-jsonld", "get-incacom-join-de",
    "glocalzone-official-jsonld", "hopneu-join-de", "hugoboss-jsonld-de", "inception-media-join-de",
    "klarablau-join-de", "kluuucom-join-de", "lidl-jsonld-de", "logo-yazilim-peoplise-ilan-sayfasi",
    "mars-jsonld-de", "maxdrei-join-de", "medtronic-tr-official-jsonld", "melagence-join-de",
    "mercedesbenz-jsonld-de", "neckar-hub-join-de", "opet-kockariyerim-ilan-sayfasi",
    "otis-tr-official-jsonld", "pladis-tr-official-jsonld", "porsche-ilan-sayfasi-de", "puma-workday-de",
    "redbull-jsonld-de", "reload-tr-microdata", "renault-ilan-sayfasi-de", "scjohnson-tr-official-jsonld",
    "siemens-ilan-sayfasi-de", "sonypictures-jsonld-de", "stiebel-eltron-ilan-sayfasi-de",
    "ups-tr-official-jsonld", "vodafone-tr-official-jsonld", "wegain-join-de", "wordsmith-tr-microdata",
    "yami-studioscom-join-de",
})
# Çok şirketli arama: şirket ilan başına çözülüyor, kaynakta tek logo
# olamaz. Bu kaynağın ilanlarını yayın kapısı (promote.py) tutuyor.
COK_SIRKETLI = frozenset({"workable_search"})

KAYNAKLAR = json.loads((KOK / "automation" / "sources.json").read_text(encoding="utf-8"))["sources"]


def logo_yolu(kaynak: dict) -> bool:
    return bool(kaynak.get("logo_url") or kaynak.get("website") or logos.ats_pano_adresi(kaynak))


def test_yeni_kaynak_logo_yolu_tasimali():
    eksik = sorted(
        k["id"] for k in KAYNAKLAR
        if k.get("enabled", True) and k.get("type") not in COK_SIRKETLI
        and not logo_yolu(k) and k["id"] not in KURAL_ONCESI
    )
    assert eksik == [], (
        "Logo yolu olmayan yeni kaynak: " + ", ".join(eksik)
        + " — `logo_url` (ör. https://stajimvar.com/isveren-logolari/<dosya>.png) ya da `website` ekleyin."
    )


def test_depodaki_logo_dosyasi_gercekten_var():
    for k in KAYNAKLAR:
        eslesme = re.match(r"https://stajimvar\.com/isveren-logolari/(.+)$", k.get("logo_url") or "")
        if eslesme:
            assert (KOK / "public" / "isveren-logolari" / eslesme.group(1)).is_file(), k["id"]


def test_istisna_listesi_yalniz_kuculebilir():
    kimlikler = {k["id"] for k in KAYNAKLAR}
    # Logo yolu kazanan ya da silinen kaynak listeden çıkarılmalı.
    fazla = sorted(i for i in KURAL_ONCESI if i in kimlikler and logo_yolu(next(k for k in KAYNAKLAR if k["id"] == i)))
    assert fazla == [], f"Artık logo yolu var, istisnadan çıkarın: {fazla}"
    assert len(KURAL_ONCESI) <= 55


class _Sorgu:
    def __init__(self, veri):
        self.veri = veri

    def __getattr__(self, _):
        return lambda *a, **k: self

    def execute(self):
        return type("Y", (), {"data": self.veri})()


class _Db:
    def __init__(self, logo):
        self.logo = logo

    def table(self, ad):
        return _Sorgu([{"logo_url": self.logo}] if ad == "companies" else [])


def test_yayin_kapisi_logosuz_sirketi_tutuyor():
    assert promote.sirket_logosu_var(_Db("https://stajimvar.com/isveren-logolari/x.png"), "id") is True
    assert promote.sirket_logosu_var(_Db(None), "id") is False
    assert promote.sirket_logosu_var(_Db("  "), "id") is False
    kod = (KOK / "automation" / "promote.py").read_text(encoding="utf-8")
    assert 'if not dry and ilan_durumu(raw) == "published" and not sirket_logosu_var(db, company_id):' in kod
    assert 'return "logo_bekliyor"' in kod


def test_logo_adimi_yayindan_once_kosuyor():
    akis = (KOK / ".github" / "workflows" / "stajimvar-automation.yml").read_text(encoding="utf-8")
    assert akis.index("python logos.py") < akis.index("python promote.py")
