"""KEŞİF RADARI REGRESYONU

Ana kural: RADAR ŞÜPHE ÜRETİR, RESMÎ KAYNAK KANIT ÜRETİR, YALNIZ KANIT
YAYINLANABİLİR.

Fikstürler gerçek dünyayı temsil ediyor: Sprint 1'de ölçtüğümüz Insider
One vakası (gerçek MT programı) burada da eleniyor.
"""

import pytest

from automation.radar import coz, rapor
from automation.radar_cozucu import (
    ats_tani,
    benzerlik,
    dogrula_alan_adi,
    kariyer_kaynagi_bul,
    resmi_ilani_esle,
    sirket_adini_normalize_et,
    toplayici_mi,
)
from automation.radar_kaynaklar import LINKEDIN_NEDEN_YOK, Sinyal
from automation.staj_kalitesi import NOT_INTERNSHIP, VALID_INTERNSHIP

STAJ_METNI = (
    "Üniversite öğrencilerine yönelik 3 aylık staj programımıza stajyer "
    "arıyoruz. Zorunlu staj evrakları desteklenir."
)
MEZUN_METNI = (
    "Yeni mezunlara yönelik tam zamanlı 18 aylık leadership program. "
    "Management trainee olarak rotasyona katılacaksınız."
)


def sahte_getir(sayfalar: dict[str, str]):
    """Ağ yerine sözlük. Testler ağa çıkmıyor."""

    def getir(url: str):
        for anahtar, govde in sayfalar.items():
            if url.rstrip("/").endswith(anahtar.rstrip("/")) or url == anahtar:
                return 200, govde
        return 404, ""

    return getir


ABC_ANASAYFA = (
    "<html><head><title>ABC Teknoloji | Anasayfa</title></head>"
    "<body><a href='/kariyer'>Kariyer</a></body></html>"
)
ABC_KARIYER = "<html><body>Açık pozisyonlar <a href='https://jobs.workable.com/view/x/abc'>ilan</a></body></html>"


# ------------------------------------------------------ normalleştirme


def test_e_sirket_adi_varyantlari_ayni_koke_iniyor():
    """ABC Teknoloji A.Ş. → aynı kök."""
    assert sirket_adini_normalize_et("ABC Teknoloji A.Ş.") == "abc teknoloji"
    assert sirket_adini_normalize_et("ABC Teknoloji San. ve Tic. Ltd. Şti.") == "abc teknoloji"


def test_f_ayni_ada_benzeyen_farkli_sirketler_birlesmiyor():
    """ABC ile ABC Global ayrı şirket; körlemesine merge YOK."""
    assert sirket_adini_normalize_et("ABC") != sirket_adini_normalize_et("ABC Global")
    assert benzerlik("ABC", "ABC Global") < 0.82


# --------------------------------------------------------- alan adı


def test_alan_adi_yalniz_kimlik_eslesirse_kabul():
    getir = sahte_getir({"abcteknoloji.com.tr": ABC_ANASAYFA})
    k = dogrula_alan_adi("ABC Teknoloji A.Ş.", getir, ["abcteknoloji.com.tr"])
    assert k.var and k.guven == "HIGH"


def test_200_donen_park_alan_adi_kanit_degil():
    """"200 geldi" kanıt değil: sayfa şirketi adlandırmıyorsa reddediliyor."""
    getir = sahte_getir({"abcteknoloji.com": "<html><title>Domain for sale</title></html>"})
    k = dogrula_alan_adi("ABC Teknoloji", getir, ["abcteknoloji.com"])
    assert not k.var


# ----------------------------------------------------- kariyer kaynağı


def test_kariyer_sayfasi_gercek_bagdan_bulunuyor():
    getir = sahte_getir({"abcteknoloji.com.tr": ABC_ANASAYFA, "/kariyer": ABC_KARIYER})
    k = kariyer_kaynagi_bul("abcteknoloji.com.tr", getir)
    assert k.var and k.guven == "HIGH"


def test_ats_imzalari_taniniyor():
    for url, beklenen in [
        ("https://jobs.lever.co/x/1", "lever"),
        ("https://boards.greenhouse.io/x", "greenhouse"),
        ("https://jobs.workable.com/view/x", "workable"),
        ("https://x.myworkdayjobs.com/y", "workday"),
        ("https://career5.successfactors.eu/x", "successfactors"),
        ("https://x.teamtailor.com/jobs", "teamtailor"),
        ("https://x.recruitee.com/o/y", "recruitee"),
        ("https://tbe.taleo.net/x", "taleo"),
    ]:
        assert ats_tani(url) == beklenen, url


# ----------------------------------------------------- resmî kaynak


def test_g_aggregator_adresi_resmi_kaynak_sayilmiyor():
    k = resmi_ilani_esle(
        "Yazılım Stajyeri", None,
        [{"title": "Yazılım Stajyeri", "url": "https://www.kariyer.net/is-ilani/x-123"}],
    )
    assert not k.var
    assert "toplayıcı" in k.neden


def test_h_resmi_ats_adresi_kabul_ediliyor():
    k = resmi_ilani_esle(
        "Yazılım Stajyeri", None,
        [{"title": "Yazılım Stajyeri", "url": "https://jobs.lever.co/abc/1"}],
    )
    assert k.var and k.guven == "HIGH"


def test_toplayicilar_resmi_sayilmiyor():
    for u in ["https://kariyer.net/x", "https://www.youthall.com/y", "https://linkedin.com/z"]:
        assert toplayici_mi(u)
    assert not toplayici_mi("https://jobs.lever.co/x")


def test_baslik_esmesi_farkli_dilde_de_calisiyor():
    """"Yazılım Stajyeri" ile "Software Intern" aynı ilan olabilir."""
    k = resmi_ilani_esle(
        "Software Engineering Intern", "Istanbul",
        [{"title": "Software Engineering Intern", "location": "Istanbul",
          "url": "https://jobs.lever.co/abc/1"}],
    )
    assert k.guven == "HIGH"


# --------------------------------------------------- uçtan uca zincir


def _zincir(baslik, resmi_ilanlar, mevcut=None):
    getir = sahte_getir({"abcteknoloji.com.tr": ABC_ANASAYFA, "/kariyer": ABC_KARIYER})
    return coz(
        Sinyal("kariyer.net", "https://www.kariyer.net/is-ilani/abc-1", "ABC Teknoloji A.Ş.", baslik, None),
        getir,
        lambda alan, kariyer: resmi_ilanlar,
        mevcut,
    )


def test_a_resmi_kaynakta_ayni_ilan_bulundu_yayin_adayi():
    s = _zincir("Software Intern", [{
        "title": "Software Intern", "url": "https://jobs.workable.com/view/x/abc",
        "description": STAJ_METNI, "employment_type": "Internship",
    }])
    assert s.resolution_status == "verified"
    assert s.quality_class == VALID_INTERNSHIP
    assert s.would_publish


def test_b_resmi_ilan_management_trainee_cikti_reddediliyor():
    """Sprint 1 Insider vakası: radar da AYNI kapıdan geçiyor.

    Sinyal resmî ilanla eşleşiyor — yani zincir kalite kapısına kadar
    geliyor — ve orada eleniyor. Elenmesinin sebebi başlıkta "trainee"
    geçmesi değil: resmî kaynak tam zamanlı bir mezun programı tarif
    ediyor.
    """
    s = _zincir("Management Trainee", [{
        "title": "Management Trainee for People & Culture (Fresh Grad)",
        "url": "https://jobs.lever.co/abc/mt",
        "description": MEZUN_METNI, "employment_type": "Full-Time",
    }])
    assert s.resolved_official_job_url, "zincir kalite kapısına varmadı"
    assert s.quality_class == NOT_INTERNSHIP
    assert s.resolution_status == "rejected"
    assert not s.would_publish


def test_baslik_eslesmezse_zincir_yayin_uretmiyor():
    """Türkçe sinyal başlığı İngilizce resmî başlıkla eşleşmiyorsa
    sinyal çözülmemiş kalıyor — tahminle yayına çıkmıyor."""
    s = _zincir("Yönetici Adayı (MT)", [{
        "title": "Management Trainee for People & Culture (Fresh Grad)",
        "url": "https://jobs.lever.co/abc/mt",
        "description": MEZUN_METNI, "employment_type": "Full-Time",
    }])
    assert s.resolution_status == "unresolved"
    assert not s.would_publish


def test_c_resmi_kaynak_bulunamazsa_yayin_yok():
    s = _zincir("Software Intern", [])
    assert s.resolution_status == "unresolved"
    assert s.resolution_reason.startswith("official_job_not_found")
    assert not s.would_publish


def test_c2_alan_adi_cozulemezse_zincir_kopuyor():
    getir = sahte_getir({})
    s = coz(
        Sinyal("kariyer.net", "u", "Bilinmeyen Şirket", "Intern", None),
        getir, lambda a, k: [], None,
    )
    assert s.resolution_status == "unresolved"
    assert s.resolution_reason.startswith("company_unresolved")


def test_mevcut_ilan_duplicate_sayiliyor():
    s = _zincir(
        "Software Intern",
        [{"title": "Software Intern", "url": "https://jobs.workable.com/view/x/abc",
          "description": STAJ_METNI, "employment_type": "Internship"}],
        mevcut={"https://jobs.workable.com/view/x/abc": "listing-1"},
    )
    assert s.resolution_status == "duplicate"
    assert s.official_listing_id == "listing-1"
    assert not s.would_publish


def test_d_iki_kaynak_ayni_resmi_ilana_cozulunce_tek_firsat():
    """Kariyer.net + Youthall aynı ilanı görürse: 2 sinyal, 1 fırsat."""
    resmi = [{"title": "Software Intern", "url": "https://jobs.workable.com/view/x/abc",
              "description": STAJ_METNI, "employment_type": "Internship"}]
    getir = sahte_getir({"abcteknoloji.com.tr": ABC_ANASAYFA, "/kariyer": ABC_KARIYER})
    sonuclar = [
        coz(Sinyal(k, f"https://{k}/x", "ABC Teknoloji A.Ş.", "Software Intern", None),
            getir, lambda a, c: resmi, None)
        for k in ("kariyer.net", "youthall")
    ]
    r = rapor(sonuclar, {})
    assert r["capraz"]["toplam_raw"] == 2
    assert r["capraz"]["unique_opportunity"] == 1
    assert r["capraz"]["would_publish"] == 1


# ------------------------------------------------------------ güvenlik


def test_auto_publish_varsayilan_kapali():
    from automation import radar

    assert radar.AUTO_PUBLISH is False


def test_linkedin_adaptoru_yok_ve_nedeni_yazili():
    assert "Disallow" in LINKEDIN_NEDEN_YOK
    with pytest.raises(ImportError):
        from automation.radar_kaynaklar import linkedin  # noqa: F401


def test_rapor_kapali_kaynagi_gosteriyor():
    r = rapor([], {"linkedin": "robots.txt tüm yolları kapatıyor"})
    assert r["kaynaklar"]["linkedin"]["kapali"]
    assert r["kaynaklar"]["linkedin"]["raw_signals"] == 0
