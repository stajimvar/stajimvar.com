"""1 Kasım 2026 ilan teslimi: Working Student süzgeci, başlık eki, logo zinciri."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import logos  # noqa: E402
import scraper  # noqa: E402
import staj_kalitesi  # noqa: E402


def test_working_student_ilk_suzgecte_ve_kalite_kapisinda_ayni():
    for baslik in ("Part-Time Working Student (Software Developer)", "Part time Working Student (Production Engineer)"):
        assert scraper.is_early_career(baslik, "")
        assert staj_kalitesi.STAJ_KANITI.search(baslik)
    assert not scraper.is_early_career("Working Capital Analyst", "")
    assert not scraper.is_early_career("Student Success Manager", "")


def test_baslik_eki_ayracli_ve_tekil_de_atiliyor():
    html = "<html><head><title>Part-Time Working Student (Software Developer) - Job Detail</title></head></html>"
    assert scraper.ilan_sayfasi_basligi(html) == "Part-Time Working Student (Software Developer)"
    eski = "<html><head><title>Praktikum HR Stellendetails | Festool Group</title></head></html>"
    assert scraper.ilan_sayfasi_basligi(eski) == "Praktikum HR"


def test_logo_adaylari_once_logo_url_sonra_yedek_wikimedia_png():
    adaylar = logos.kurator_adaylari({
        "logo_url": "https://upload.wikimedia.org/wikipedia/commons/3/34/EY_logo_2019.svg",
        "fallback_logo_url": "https://logo.clearbit.com/ey.com",
    })
    assert adaylar == [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/EY_logo_2019.svg/250px-EY_logo_2019.svg.png",
        "https://logo.clearbit.com/ey.com",
    ]
    # Yalnız https; boş ve tekrar eden adres atılıyor.
    assert logos.kurator_adaylari({"logo_url": "http://x.org/a.png", "fallback_logo_url": ""}) == []
    assert logos.kurator_adaylari({"logo_url": "https://a.org/l.png", "fallback_logo_url": "https://a.org/l.png"}) == ["https://a.org/l.png"]


def test_teslim_kaynaklari_dogru_kipte_ve_tekrarsiz():
    kaynaklar = json.loads((Path(__file__).resolve().parents[1] / "sources.json").read_text(encoding="utf-8"))["sources"]
    kimlik = {k["id"]: k for k in kaynaklar}
    assert len(kimlik) == len(kaynaklar), "kaynak kimliği tekrar ediyor"
    # Açıklığı makineyle doğrulanamayanlar TASLAK hattında.
    for k in ("siemens-tr-ilan-sayfasi", "amazon-tr-ilan-sayfasi", "ey-tr-ilan-sayfasi"):
        assert kimlik[k]["type"] == "resmi_ilan_sayfasi" and kimlik[k]["aciklik_dogrulanmadi"] is True
    assert kimlik["in-vr-tr-official-jsonld"]["type"] == "official_jsonld"
    # Bir ilan adresi iki kaynakta birden yok.
    adresler = [u for k in kaynaklar for u in k.get("urls", [])]
    assert len(adresler) == len(set(adresler))
    # 404 dönen eski BAT adresi kaynağı düşürmesin diye çıkarıldı.
    assert not any("44671289984" in u for u in kimlik["bat-official-jsonld"]["urls"])
