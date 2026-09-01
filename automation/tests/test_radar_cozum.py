"""SİNYAL → RESMÎ İLAN KÖPRÜSÜ REGRESYONU

Ana kural: LINKEDIN SİNYALİ ÇÖZÜMÜN GİRDİSİ, ÇIKTISI DEĞİL.
Aramada LinkedIn'i tekrar bulmak çözüm sayılmaz; yayın kararını resmî
kaynaktan okunan ilan verir.
"""

import pytest

from automation.radar_cozum import (
    AILE_ATS,
    AILE_KARIYER,
    AILE_TAM,
    alan_sirkete_ait_mi,
    cozum_sorgulari,
    eslesme_guveni,
    oncelik_ver,
    sonuc_kabul_edilir_mi,
)

ATS_ALANLARI = {
    "lever": "jobs.lever.co",
    "greenhouse": "greenhouse.io",
    "workable": "workable.com",
}


# ------------------------------------------------------ A: öncelik

def test_a_taninan_sirket_kuyrukta_once():
    bilinen = {"getir"}
    tanidik = oncelik_ver("Getir", "Data Science Intern", "İstanbul, Türkiye", bilinen)
    yabanci = oncelik_ver("Bilinmeyen AŞ", "Data Science Intern", "İstanbul", bilinen)
    assert tanidik.puan < yabanci.puan
    assert any("tanınan" in n for n in tanidik.nedenler)


def test_a_acik_staj_basligi_ve_net_konum_one_aliyor():
    net = oncelik_ver("Acme", "Software Intern", "İstanbul, Türkiye", set())
    belirsiz = oncelik_ver("Acme", "Associate Program", "Remote", set())
    assert net.puan < belirsiz.puan


def test_a_generic_sirket_adi_geriye_atiliyor():
    generic = oncelik_ver("Startup", "Intern", "İstanbul", set())
    normal = oncelik_ver("Trendyol", "Intern", "İstanbul", set())
    assert generic.puan > normal.puan
    assert any("genel" in n for n in generic.nedenler)


def test_a_dusuk_oncelikli_sinyal_silinmiyor():
    """Öncelik bir SIRALAMA; eleme değil. Her sinyalin puanı var."""
    o = oncelik_ver("X", None, None, set())
    assert isinstance(o.puan, int)


def test_a_sirketsiz_sinyal_en_sona():
    assert oncelik_ver(None, "Intern", "İstanbul", set()).puan == 99


# -------------------------------------------- B: sorgu ailesi ve tavan

def test_b_ilk_sorgu_resmi_ilanin_kendisini_ariyor():
    sorgular = cozum_sorgulari("Getir", "Data Science Intern", None, ATS_ALANLARI)
    aile, sorgu = sorgular[0]
    assert aile == AILE_TAM
    assert '"Getir"' in sorgu and '"Data Science Intern"' in sorgu
    assert "careers" not in sorgu, "ilk sorgu ana sayfayı değil ilanı aramalı"


def test_b_sinyal_basina_en_cok_iki_sorgu():
    for ats in (None, "lever", "bilinmeyen"):
        assert len(cozum_sorgulari("Acme", "Intern", ats, ATS_ALANLARI)) <= 2


def test_b_ats_biliniyorsa_ikinci_sorgu_oraya_daraliyor():
    sorgular = cozum_sorgulari("Acme", "Intern", "lever", ATS_ALANLARI)
    aile, sorgu = sorgular[1]
    assert aile == AILE_ATS
    assert "site:jobs.lever.co" in sorgu


def test_b_ats_bilinmiyorsa_ikinci_sorgu_careers():
    aile, sorgu = cozum_sorgulari("Acme", "Intern", None, ATS_ALANLARI)[1]
    assert aile == AILE_KARIYER and "careers" in sorgu


def test_b_baslik_yoksa_da_sorgu_uretiliyor():
    sorgular = cozum_sorgulari("Acme", None, None, ATS_ALANLARI)
    assert sorgular and all(isinstance(s, tuple) for s in sorgular)


# --------------------------------------- C: arama sonucu süzgeci

def test_c_linkedini_tekrar_bulmak_cozum_degil():
    assert not sonuc_kabul_edilir_mi("https://www.linkedin.com/jobs/view/123456789")


@pytest.mark.parametrize("url", [
    "https://www.kariyer.net/is-ilani/1",
    "https://www.youthall.com/tr/x",
    "https://tr.indeed.com/viewjob?jk=1",
    "https://www.glassdoor.com/job/1",
    "https://www.instagram.com/p/x",
    "https://www.facebook.com/acme/jobs",
    "https://x.com/acme/status/1",
    "https://medium.com/@acme/staj-ilani",
    "https://tr.wikipedia.org/wiki/Acme",
])
def test_c_toplayici_sosyal_ve_repost_eleniyor(url):
    assert not sonuc_kabul_edilir_mi(url)


@pytest.mark.parametrize("url", [
    "https://jobs.lever.co/acme/1",
    "https://boards.greenhouse.io/acme/jobs/1",
    "https://www.acme.com.tr/kariyer",
])
def test_c_resmi_kaynak_adaylari_geciyor(url):
    assert sonuc_kabul_edilir_mi(url)


def test_c_bos_adres_gecmiyor():
    assert not sonuc_kabul_edilir_mi(None)
    assert not sonuc_kabul_edilir_mi("")


# --------------------------------------------- D: eşleşme güveni

def test_d_birebir_olmayan_baslik_eslesebiliyor():
    """LinkedIn "Marketing Intern" ile resmî "Marketing Long Term
    Internship" aynı pozisyon olabilir."""
    guven, kanitlar = eslesme_guveni(
        "Acme", "Marketing Intern", "İstanbul",
        "Acme", "Marketing Long Term Internship", "Istanbul, Turkey",
        ats_kimligi=True)
    assert guven == "HIGH", kanitlar


def test_d_baslik_alakasizsa_low():
    guven, _ = eslesme_guveni(
        "Acme", "Marketing Intern", "İstanbul",
        "Acme", "Senior Backend Engineer", "Istanbul", ats_kimligi=True)
    assert guven == "LOW"


def test_d_farkli_sirket_high_olmuyor():
    guven, _ = eslesme_guveni(
        "Acme", "Marketing Intern", "İstanbul",
        "Bambaska Holding", "Marketing Intern", "Istanbul", ats_kimligi=False)
    assert guven != "HIGH"


def test_d_ats_kimligi_olmadan_tek_basina_baslik_high_yapmiyor():
    guven, _ = eslesme_guveni(
        "Acme", "Marketing Intern", None,
        None, "Marketing Intern", None, ats_kimligi=False)
    assert guven != "HIGH"


def test_d_yalniz_high_yayin_adayi_olabilir():
    """Sözleşme: koşucu HIGH dışındaki eşleşmeyi yayın adayı yapmıyor."""
    import pathlib

    govde = (pathlib.Path(__file__).resolve().parents[1] / "radar_cozum_kosu.py"
             ).read_text(encoding="utf-8")
    assert 'if guven != "HIGH":' in govde
    assert "would_publish" in govde


# ------------------------------------------------- E: alan adı sahipliği

def test_e_yanlis_alan_kabul_edilmiyor():
    """YANLIŞ DOMAIN ÇÖZÜLEMEMİŞTEN KÖTÜDÜR."""
    assert alan_sirkete_ait_mi("Trendyol", "trendyol.com")
    assert not alan_sirkete_ait_mi("Trendyol", "bambaskabirsite.com")


def test_e_alt_alan_ve_protokol_temizleniyor():
    assert alan_sirkete_ait_mi("Rapsodo", "https://www.rapsodo.com/kariyer")


# ------------------------------- F: 402 "çözülemedi" değil, "arama yok"

def test_f_kota_hatasi_ayri_neden_olarak_raporlaniyor():
    import pathlib

    govde = (pathlib.Path(__file__).resolve().parents[1] / "radar_cozum_kosu.py"
             ).read_text(encoding="utf-8")
    assert "quota_exhausted" in govde
    # Kota bitince sinyal bozulmuyor: durum yazılmadan döngü kırılıyor.
    assert 'return None, "arama_yok", "quota_exhausted"' in govde


def test_f_kota_bitince_sinyal_unresolved_isaretlenmiyor():
    import pathlib

    govde = (pathlib.Path(__file__).resolve().parents[1] / "radar_cozum_kosu.py"
             ).read_text(encoding="utf-8")
    arama_hatasi_blok = govde[govde.index("if arama_hatasi:"):govde.index("if kiraci is None:")]
    assert "cozumu_yaz" not in arama_hatasi_blok, \
        "arama yapılamadıysa sinyalin durumu değiştirilmemeli"


# ----------------------------------------- G: bu koşuda keşif yapılmıyor

def test_g_cozum_kosusu_kesif_sorgusu_atmiyor():
    import pathlib

    govde = (pathlib.Path(__file__).resolve().parents[1] / "radar_cozum_kosu.py"
             ).read_text(encoding="utf-8")
    assert "kesif_sorgulari" not in govde
    assert "site:linkedin.com" not in govde
    # Bütçenin tamamı çözüme ayrılıyor.
    assert "kesif_tavani=0" in govde


def test_g_cozum_kosusu_canonical_tabloya_yazmiyor():
    import pathlib

    govde = (pathlib.Path(__file__).resolve().parents[1] / "radar_cozum_kosu.py"
             ).read_text(encoding="utf-8")
    for yasak in ("rest/v1/listings\", json=", "/rest/v1/listings\",\n            json"):
        assert yasak not in govde


# --------------------- H: şirket sitesi atlanmıyor, alan adı toplanıyor

def test_h_sirket_sitesi_sonucu_atlanmiyor():
    """Ölçüldü: 104 aday alan adı toplanmadan düştü.

    `sonucu_sinifla` sade bir şirket sitesine de platform veriyor
    ("sirket_sitesi"). İlk sürüm desteklenmeyen her platformu `continue`
    ile geçtiği için bedava kariyer sayfası zinciri hiç çalışmadı —
    sayaçlarda tek bir `kariyer_sayfasi_*` kaydı yoktu. Oysa aranan şey
    tam da o: şirketin kendi sayfasından ATS'ine inmek.
    """
    from automation.radar_resmi import sonucu_sinifla

    b = sonucu_sinifla("https://www.rapsodo.com/kariyer")
    assert b.platform == "sirket_sitesi" and not b.destekli

    import pathlib

    govde = (pathlib.Path(__file__).resolve().parents[1] / "radar_cozum_kosu.py"
             ).read_text(encoding="utf-8")
    assert 'b.platform != "sirket_sitesi"' in govde,         "şirket sitesi adaptörsüz ATS gibi atlanmamalı"


def test_h_adaptorsuz_ats_hala_atlaniyor():
    """Workday/Teamtailor gibi adaptörü olmayan ATS'lerde zincir bitiyor."""
    from automation.radar_resmi import sonucu_sinifla

    b = sonucu_sinifla("https://acme.wd3.myworkdayjobs.com/careers/job/1")
    assert b.platform == "workday" and not b.destekli
