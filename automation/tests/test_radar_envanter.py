"""KAYNAK SAYIMI REGRESYONU

Ana kural: BU SAYIM ARAMA YAPMAZ ve KANIT YOKSA UNKNOWN DER.
Bir sonraki adaptör önceliği tahminle değil ölçülen sayıyla belirlenir.
"""

import pathlib

import pytest

from automation.radar_envanter import (
    BILINMIYOR,
    CUSTOM,
    KARIYER_YOK,
    SirketKaydi,
    kariyer_sayfasi_ilan_tasiyor_mu,
    platformu_sinifla,
    sirketi_olc,
    sirketleri_topla,
)


class SahteSinyal:
    def __init__(self, sirket, normal):
        self.sirket = sirket
        self.sirket_normal = normal


def sahte_getir(sayfalar: dict):
    """Verilen adres → (durum, gövde) eşlemesiyle çalışan çekici.

    EN UZUN ANAHTAR ÖNCE: "acme.com.tr/" aynı zamanda
    "acme.com.tr/kariyer" adresinin de alt dizesi. Kısa anahtar önce
    eşleşirse kariyer sayfası yerine ana sayfa dönüyor ve test ürünü
    değil kendini ölçmüş oluyor.
    """
    sirali = sorted(sayfalar.items(), key=lambda kv: -len(kv[0]))

    def getir(url):
        for anahtar, deger in sirali:
            if anahtar in url:
                return deger
        return 404, ""
    return getir


# --------------------------------------------- A: arama yapılmıyor

def test_a_sayim_arama_saglayicisi_kurmuyor():
    """0 API request sözü kod düzeyinde tutuluyor."""
    kok = pathlib.Path(__file__).resolve().parents[1]
    for ad in ("radar_envanter.py", "radar_envanter_kosu.py"):
        govde = (kok / ad).read_text(encoding="utf-8")
        assert "saglayici_kur" not in govde, ad
        assert "radar_brave" not in govde, ad
        assert "api.search.brave.com" not in govde, ad


def test_a_rapor_sifir_arama_istegi_bildiriyor():
    govde = (pathlib.Path(__file__).resolve().parents[1] / "radar_envanter_kosu.py"
             ).read_text(encoding="utf-8")
    assert '"arama_istegi": 0' in govde


# ------------------------------------------- B: şirket tekilleştirme

def test_b_ayni_sirketin_bes_ilani_bes_sirket_degil():
    sinyaller = [SahteSinyal("Getir", "getir")] * 5 + [SahteSinyal("Trendyol", "trendyol")]
    toplam = sirketleri_topla(sinyaller)
    assert len(toplam) == 2
    assert toplam["getir"] == ("Getir", 5)
    assert toplam["trendyol"] == ("Trendyol", 1)


def test_b_sirketsiz_sinyal_sayilmiyor():
    assert sirketleri_topla([SahteSinyal("", "")]) == {}


# ---------------------------------------- C: platform sınıflandırma

@pytest.mark.parametrize("kaynak,beklenen", [
    ("https://jobs.lever.co/acme", "LEVER"),
    ("https://boards.greenhouse.io/acme", "GREENHOUSE"),
    ("https://jobs.ashbyhq.com/acme", "ASHBY"),
    ("https://apply.workable.com/acme", "WORKABLE"),
    ("https://acme.wd3.myworkdayjobs.com/careers", "WORKDAY"),
    ("https://career5.successfactors.eu/careers?company=x", "SUCCESSFACTORS"),
    ("https://acme.teamtailor.com/jobs", "TEAMTAILOR"),
    ("https://acme.recruitee.com/o/intern", "RECRUITEE"),
    ("https://tbe.taleo.net/x/ats/careers", "TALEO"),
])
def test_c_ats_imzalari_siniflaniyor(kaynak, beklenen):
    _, sinif = platformu_sinifla([kaynak])
    assert sinif == beklenen


def test_c_imza_yoksa_sinif_yok():
    """TAHMİN ETME: kanıt yoksa sınıf yok."""
    assert platformu_sinifla(["https://www.acme.com.tr/kariyer"]) == (None, None)
    assert platformu_sinifla([""]) == (None, None)
    assert platformu_sinifla([]) == (None, None)


# ------------------------------- D: kariyer sayfası ilan taşıyor mu

def test_d_ilan_baglantilari_ve_yapi_varsa_evet():
    govde = ("<h1>Açık Pozisyonlar</h1>"
             + "".join(f'<a href="/kariyer/ilan-{i}">Poz {i}</a>' for i in range(4)))
    tasiyor, neden = kariyer_sayfasi_ilan_tasiyor_mu(govde)
    assert tasiyor, neden


def test_d_bos_ya_da_yapisiz_sayfa_hayir():
    assert not kariyer_sayfasi_ilan_tasiyor_mu(None)[0]
    assert not kariyer_sayfasi_ilan_tasiyor_mu("<p>Bize yazın</p>")[0]
    # Tek bir "kariyer" bağlantısı ilan listesi değil.
    assert not kariyer_sayfasi_ilan_tasiyor_mu('<a href="/kariyer">Kariyer</a>')[0]


# -------------------------------------------------- E: uçtan uca sınıf

def test_e_dogrulanamayan_alan_adi_unknown():
    """Alan adı kanıtlanamadıysa sınıf UYDURULMUYOR."""
    k = sirketi_olc("Bilinmeyen Firma", 3, sahte_getir({}))
    assert k.sinif == BILINMIYOR
    assert k.alan_adi is None
    assert k.sinyal_sayisi == 3


def test_e_kariyer_sayfasinda_ats_imzasi_varsa_o_sinif():
    sayfalar = {
        "acme.com.tr/": (200, "<title>Acme Teknoloji</title>"
                              '<a href="/kariyer">Kariyer</a>'),
        "acme.com.tr/kariyer": (200, '<a href="https://acme.teamtailor.com/jobs">İlanlar</a>'),
    }
    k = sirketi_olc("Acme", 2, sahte_getir(sayfalar))
    assert k.sinif == "TEAMTAILOR"
    assert k.ats == "teamtailor"


def test_e_ats_yoksa_ama_kariyer_sayfasi_varsa_custom():
    ilanlar = "".join(f'<a href="/career/job-{i}">Poz {i}</a>' for i in range(6))
    sayfalar = {
        "acme.com.tr/": (200, "<title>Acme Teknoloji</title>"
                              '<a href="/careers">Careers</a>'),
        "acme.com.tr/careers": (200, "<h1>Open Positions</h1>" + ilanlar),
    }
    k = sirketi_olc("Acme", 4, sahte_getir(sayfalar))
    assert k.sinif == CUSTOM
    assert k.ilan_html_icinde, k.kanitlar


def test_e_alan_var_kariyer_yoksa_no_career_page():
    sayfalar = {"acme.com.tr/": (200, "<title>Acme Teknoloji</title><p>Hakkımızda</p>")}
    k = sirketi_olc("Acme", 1, sahte_getir(sayfalar))
    assert k.sinif == KARIYER_YOK
    assert k.alan_adi


def test_e_her_kayit_gerekcesini_tasiyor():
    k = sirketi_olc("Bilinmeyen Firma", 1, sahte_getir({}))
    assert k.kanitlar, "gerekçesiz sınıf yok"


# ------------------------------ F: AGGREGATOR_ONLY iddia edilmiyor

def test_f_aggregator_only_kanitsiz_iddia_edilmiyor():
    """Arama olmadan 'yalnız toplayıcıda' kanıtlanamaz.

    Alan adı doğrulanamayan şirket UNKNOWN kalıyor; AGGREGATOR_ONLY
    etiketi bu turda hiçbir kayda basılmıyor.
    """
    kok = pathlib.Path(__file__).resolve().parents[1]
    govde = (kok / "radar_envanter.py").read_text(encoding="utf-8")
    kod = "\n".join(s for s in govde.splitlines() if not s.lstrip().startswith("#"))
    assert "AGGREGATOR_ONLY" not in kod
    rapor = (kok / "radar_envanter_kosu.py").read_text(encoding="utf-8")
    assert "unknown_notu" in rapor


# ------------------------------- G: adaptör önceliği sayıyla veriliyor

def test_g_oncelik_sinyal_sayisina_gore_siralaniyor():
    govde = (pathlib.Path(__file__).resolve().parents[1] / "radar_envanter_kosu.py"
             ).read_text(encoding="utf-8")
    assert "sonraki_adaptor_onceligi" in govde
    assert 'key=lambda x: (-x["sinyal"], -x["sirket"])' in govde


def test_g_desteklenen_atsler_adaptor_onceliginde_yok():
    """Zaten adaptörü olan platform 'sonraki adaptör' listesine girmez."""
    govde = (pathlib.Path(__file__).resolve().parents[1] / "radar_envanter_kosu.py"
             ).read_text(encoding="utf-8")
    assert "if sinif not in set(DESTEKLENEN_SINIF.values())" in govde


# --------------------------------- H: canonical tabloya yazmıyor

def test_h_sayim_canonical_tabloya_yazmiyor():
    govde = (pathlib.Path(__file__).resolve().parents[1] / "radar_envanter_kosu.py"
             ).read_text(encoding="utf-8")
    assert "/rest/v1/listings" not in govde
    # Yazdığı tek yer sinyalin kendi çözüm alanları.
    assert "cozumu_yaz" in govde


def test_h_kayit_veri_sinifi_beklenen_alanlari_tasiyor():
    alanlar = set(SirketKaydi("X", 1).__dict__)
    assert {"sirket", "sinyal_sayisi", "sinif", "alan_adi", "kariyer_url",
            "ats", "ilan_html_icinde", "kanitlar"} <= alanlar
