"""KAYNAK BAŞLIĞI VE GÖRÜNÜM KATMANI REGRESYONU

Ana kural: ŞİRKETTEN GELEN ORİJİNAL VERİ ÇEVİRİ UĞRUNA KAYBOLMAZ.
`source_title` kaynağın kendi başlığı, `title` kullanıcıya gösterilen ad.
"""

import pathlib
import sys

import pytest

KOK = pathlib.Path(__file__).resolve().parents[1]
if str(KOK) not in sys.path:
    sys.path.insert(0, str(KOK))

from baslik_gorunumu import (  # noqa: E402
    ACIK_KARSILIKLAR,
    farkli_mi,
    gorunen_baslik,
)
import scraper  # noqa: E402


# ------------------------------- A/B: kaynak başlığı korunuyor

def test_a_ceviri_kaynak_basligini_ezmiyor():
    """`translate_job` başlığın üzerine yazıyordu; orijinal depoya ulaşmıyordu."""
    is_ = scraper.Job("kaynak", "https://x.example/1", "IT Intern")
    sonuc = scraper.translate_job(is_, {"translate_to_turkish": False})
    assert sonuc.source_title == "IT Intern"


def test_b_ceviri_acikken_de_kaynak_basligi_dolu():
    is_ = scraper.Job("kaynak", "https://x.example/1", "Research Intern")
    # Çeviri servisine gitmeden alanın doldurulduğunu görmek için
    # `source_title` önceden verilmiş bir iş kullanılıyor.
    onceden = scraper.Job("kaynak", "https://x.example/2", "Çevrilmiş",
                          source_title="Research Intern")
    sonuc = scraper.translate_job(onceden, {"translate_to_turkish": False})
    assert sonuc.source_title == "Research Intern"
    assert is_.source_title is None, "ham iş nesnesi kendiliğinden dolmamalı"


def test_b2_raw_kaydinda_kaynak_basligi_var():
    from repository import raw_listing_payload

    is_ = scraper.Job("kaynak", "https://x.example/1", "Türkçe Başlık",
                      source_title="Original Title")
    p = raw_listing_payload(is_, "sid", "https://x.example/1", "now")
    assert p["raw"]["source_title"] == "Original Title"
    assert p["raw"]["title"] == "Türkçe Başlık"


def test_k_yeniden_tarama_kaynak_basligini_silmiyor():
    """Adaptör her turda `source_title` üretiyor; alan boş kalmıyor."""
    is_ = scraper.Job("kaynak", "https://x.example/1", "Marketing Intern")
    ilk = scraper.translate_job(is_, {"translate_to_turkish": False})
    ikinci = scraper.translate_job(ilk, {"translate_to_turkish": False})
    assert ikinci.source_title == "Marketing Intern"


# ------------------------------- C/D: görünen başlık ayrı katman

def test_c_gorunen_baslik_kaynaktan_farkli_olabilir():
    assert gorunen_baslik("Research Intern") == "Research Stajyeri"
    assert farkli_mi("Research Stajyeri", "Research Intern")


def test_d_guvensiz_donusum_kaynaga_donuyor():
    """Yarı Türkçe yarı İngilizce başlık üretilmiyor."""
    # "Engineer" karşılığı kuralda yok; dönüşüm güvenli sayılmıyor.
    assert gorunen_baslik("Software Engineer Intern") == "Software Engineer Intern"


def test_d2_bos_ve_bozuk_girdi_cokmuyor():
    assert gorunen_baslik(None) == ""
    assert gorunen_baslik("") == ""
    assert gorunen_baslik("   ") == ""


# ----------------------------------------- E/F: kısaltma güvenliği

@pytest.mark.parametrize("kaynak,beklenen", [
    ("IT intern", "IT Stajyeri"),
    ("HR Intern", "HR Stajyeri"),
    ("R&D Intern", "R&D Stajyeri"),
    ("QA Intern", "QA Stajyeri"),
    ("UI/UX Design Intern", "UI/UX Design Stajyeri"),
    ("Data Science Intern", "Data Science Stajyeri"),
    ("Customer Success Intern", "Customer Success Stajyeri"),
])
def test_ef_kisaltmalar_korunuyor(kaynak, beklenen):
    """ÖLÇÜLDÜ: makine çevirisi "IT intern" için "BT stajyeri" üretiyordu.

    Kısaltmayı bozmak, ilanı arayan öğrencinin aradığı kelimeyi de yok
    ediyor.
    """
    assert gorunen_baslik(kaynak) == beklenen


def test_e2_makine_cevirisi_cagrilmiyor():
    kaynak = (KOK / "baslik_gorunumu.py").read_text(encoding="utf-8")
    kod = "\n".join(s for s in kaynak.splitlines() if not s.lstrip().startswith("#"))
    assert "translate_" not in kod
    assert "GoogleTranslator" not in kod


def test_e3_turkce_tespiti_noktasiz_i_tuzagina_dusmuyor():
    """`re.I` altında `ı` ile `I` eşleşiyor.

    Sınıf duyarsız yazılınca büyük "I" içeren HER başlık Türkçe sayılıyor
    ve hiç dönüştürülmüyordu (ölçüldü: "IT intern").
    """
    from baslik_gorunumu import _turkce_mi

    assert not _turkce_mi("IT intern")
    assert not _turkce_mi("International Intern")
    assert _turkce_mi("Araştırma Stajyeri")


# --------------------------- açık karşılık en yüksek öncelik

def test_acik_karsilik_kurali_eziyor():
    assert (
        gorunen_baslik("Long-Term Full Stack Developer Intern")
        == "Uzun Dönem Full Stack Geliştirici Stajyeri"
    )
    for anahtar in ACIK_KARSILIKLAR:
        assert anahtar == anahtar.casefold(), "anahtarlar küçük harf olmalı"


# ----------------------------- G: doğrudan ilan modeli dışında

def test_g_dogrudan_ilan_provenance_modeline_girmiyor():
    kaynak = (KOK / "kaynak_basligi_doldur.py").read_text(encoding="utf-8")
    assert 'application_method") or "") == "external"' in kaynak, \
        "yalnız dış kaynaklı ilanlar geriye doldurulmalı"


# ------------------------------- H/I: şeffaflık ve uydurma yok

def test_h_resmi_ad_yalniz_farkliysa_gosteriliyor():
    assert farkli_mi("IT Stajyeri", "IT intern")
    assert not farkli_mi("Customer Success Intern", "Customer Success Intern")
    assert not farkli_mi("Bir Şey", None)
    assert not farkli_mi(None, "Bir Şey")
    # Yalnız boşluk farkı gösterim sebebi değil.
    assert not farkli_mi("IT  Stajyeri", "IT Stajyeri")


def test_i_kaynakta_bulunamayan_ilan_uydurulmuyor():
    kaynak = (KOK / "kaynak_basligi_doldur.py").read_text(encoding="utf-8")
    assert "if args.yaz and kaynak_basligi:" in kaynak, \
        "kaynak başlığı yoksa yazma yapılmamalı"
    assert "kaynakta_bulunamadi" in kaynak


def test_j_sirket_kimligi_degistirilmiyor():
    """Görünüm katmanı yalnız BAŞLIĞA dokunuyor; şirket adına değil."""
    kaynak = (KOK / "baslik_gorunumu.py").read_text(encoding="utf-8")
    for yasak in ["company", "organization_name", "sirket_adi"]:
        assert yasak not in kaynak, f"{yasak} bu katmanın işi değil"
