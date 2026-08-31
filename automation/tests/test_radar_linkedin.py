"""LINKEDIN KEŞİF RADARI REGRESYONU

Ana kural: LINKEDIN SİNYAL ÜRETİR, RESMÎ KAYNAK KANIT ÜRETİR.
LinkedIn'e istek gitmez, LinkedIn özeti ilan açıklaması olmaz, yayın
kararını şirketin resmî ATS ilanı verir.
"""

import dataclasses

import pytest

from automation.radar_linkedin import (
    Butce,
    ButceBitti,
    LinkedInSinyali,
    basliktan_ayikla,
    cozum_onceligi,
    erken_durdur,
    ilan_adresi_mi,
    job_id_cikar,
    kesif_sorgulari,
    sinyal_kur,
    sinyalleri_birlestir,
    sorgu_ailesi,
    turkiye_sinyali_mi,
)
from automation.radar_resmi import ilan_kimligi
from automation.staj_kalitesi import VALID_INTERNSHIP, sinifla

STAJ = ("Üniversite öğrencilerine yönelik 6 aylık staj programımıza stajyer "
        "arıyoruz. Zorunlu staj evrakları desteklenir.")
MEZUN = ("Yeni mezunlara yönelik tam zamanlı 18 aylık management trainee "
         "programı. Rotasyonla ilerleyen kariyer programı.")


def sonuc(url, title=None):
    return {"url": url, "title": title}


# ------------------------------------------------- A: sorgu matrisi

def test_a_sorgular_linkedin_ilan_yoluna_daraltilmis():
    """Bütün web'e körlemesine sorgu yok; yalnız ilan yolu."""
    sorgular = kesif_sorgulari(40)
    assert sorgular
    for s in sorgular:
        assert s.startswith("site:linkedin.com/jobs/view "), s


def test_a_sorgu_matrisi_deterministik_ve_sinirli():
    assert kesif_sorgulari(220) == kesif_sorgulari(220)
    assert len(kesif_sorgulari(37)) == 37
    assert len(set(kesif_sorgulari(220))) == len(kesif_sorgulari(220)), "tekrar eden sorgu"


def test_a_sorgu_hem_ingilizce_hem_turkce():
    hepsi = " ".join(kesif_sorgulari(220))
    assert "intern" in hepsi and "stajyer" in hepsi


def test_a_sorgu_ailesi_okunuyor():
    assert sorgu_ailesi("site:linkedin.com/jobs/view stajyer Istanbul") == "stajyer"


# --------------------------------------- B: ilan adresi / ilan dışı

def test_b_linkedin_ilan_adresi_sinyal_uretiyor():
    for u in ["https://www.linkedin.com/jobs/view/4123456789",
              "https://tr.linkedin.com/jobs/view/software-intern-at-acme-4123456789",
              "https://www.linkedin.com/jobs/view/4123456789/?refId=x"]:
        assert ilan_adresi_mi(u), u
        assert job_id_cikar(u) == "4123456789", u


def test_b_profil_sirket_gonderi_makale_sinyal_degil():
    """Kişi profili ve şirket sayfası TOPLANMIYOR."""
    for u in ["https://www.linkedin.com/in/birisi",
              "https://www.linkedin.com/company/acme/jobs/",
              "https://www.linkedin.com/posts/acme_hiring-activity-123",
              "https://www.linkedin.com/pulse/staj-rehberi-x",
              "https://www.linkedin.com/school/bogazici/",
              "https://www.linkedin.com/jobs/search?keywords=intern"]:
        assert not ilan_adresi_mi(u), u
        assert sinyal_kur(sonuc(u, "X | LinkedIn"), "q") is None, u


def test_b_bos_ve_bozuk_adres_cokmuyor():
    for u in [None, "", "not-a-url", "https://linkedin.com/jobs/view/abc"]:
        assert not ilan_adresi_mi(u)
        assert job_id_cikar(u) is None


# ----------------------------------------------- C: başlık ayrıştırma

def test_c_iki_baslik_bicimi_de_okunuyor():
    s, b, k = basliktan_ayikla("Getir hiring Data Science Intern in Istanbul | LinkedIn")
    assert (s, b, k) == ("Getir", "Data Science Intern", "Istanbul")

    s, b, k = basliktan_ayikla("Yazılım Stajyeri - Trendyol | LinkedIn")
    assert s == "Trendyol" and b == "Yazılım Stajyeri"


def test_c_taninmayan_baslik_uydurulmuyor():
    assert basliktan_ayikla("rastgele metin") == (None, None, None)
    assert basliktan_ayikla(None) == (None, None, None)
    assert basliktan_ayikla("") == (None, None, None)


# ---------------------------------------- D: LinkedIn özeti kanıt değil

def test_d_sinyalde_aciklama_alani_yok():
    """LinkedIn özeti canonical description olarak TUTULMUYOR."""
    alanlar = {f.name for f in dataclasses.fields(LinkedInSinyali)}
    assert not alanlar & {"description", "aciklama", "ozet", "snippet"}


def test_d_sinyal_kurulurken_ozet_yutulmuyor():
    s = sinyal_kur(
        {"url": "https://www.linkedin.com/jobs/view/4111111111",
         "title": "Acme hiring Intern in Ankara | LinkedIn",
         "description": "Bu metin ilan açıklaması DEĞİL"},
        "q")
    assert s is not None
    assert "DEĞİL" not in repr(s)


# ------------------------------------------- E: çapraz sorgu tekilleştirme

def test_e_ayni_ilan_farkli_sorgularda_tek_sinyal():
    a = sinyal_kur(sonuc("https://www.linkedin.com/jobs/view/4100000001",
                         "Acme hiring Intern in Istanbul | LinkedIn"), "q1")
    b = sinyal_kur(sonuc("https://tr.linkedin.com/jobs/view/intern-at-acme-4100000001",
                         "Acme hiring Intern | LinkedIn"), "q2")
    c = sinyal_kur(sonuc("https://www.linkedin.com/jobs/view/4100000002",
                         "Baska hiring Intern in Ankara | LinkedIn"), "q3")

    tekil = sinyalleri_birlestir([a, b, c])
    assert len(tekil) == 2, "ham isabet 3, tekil sinyal 2 olmalı"
    assert tekil["4100000001"].sorgular == ["q1", "q2"]
    # Eksik alan sonraki sonuçtan tamamlanıyor, mevcut alan ezilmiyor.
    assert tekil["4100000001"].konum == "Istanbul"


# ---------------------------------------------------- F: BÜTÇE TAVANI

def test_f_toplam_tavan_kodda_korunuyor():
    b = Butce(toplam=430, kesif_tavani=220, cozum_tavani=180)
    for _ in range(220):
        b.kesif_harca()
    with pytest.raises(ButceBitti):
        b.kesif_harca()

    for _ in range(180):
        b.cozum_harca()
    with pytest.raises(ButceBitti):
        b.cozum_harca()

    assert b.harcanan == 400
    # Yedek cep yalnız açıkça istendiğinde açılıyor.
    for _ in range(30):
        b.cozum_harca(yedek_kullan=True)
    assert b.harcanan == 430
    with pytest.raises(ButceBitti):
        b.cozum_harca(yedek_kullan=True)


def test_f_kesif_tavani_toplami_asamaz():
    b = Butce(toplam=10, kesif_tavani=220, cozum_tavani=180)
    with pytest.raises(ButceBitti):
        for _ in range(11):
            b.kesif_harca()
    assert b.harcanan <= 10


def test_f_ozet_harcamayi_dogru_bildiriyor():
    b = Butce()
    b.kesif_harca(); b.cozum_harca()
    o = b.ozet()
    assert o["harcanan"] == 2 and o["kullanilmayan"] == 428


# ------------------------------------------------- G: ERKEN DURDURMA

def test_g_ilk_200_sorguda_eslesme_yoksa_kesiliyor():
    assert erken_durdur(200, 0)
    assert erken_durdur(300, 0)


def test_g_eslesme_varsa_devam_ediyor():
    assert not erken_durdur(200, 1)
    assert not erken_durdur(199, 0), "eşik dolmadan kesilmiyor"


# --------------------------------- H: DUPLICATE = platform + ilan kimliği

def test_h_ayni_workable_ilani_iki_adres_bicimide_tek_kimlik():
    """Geçen koşuda iki Vertigo ilanı 'yeni' sanılmıştı: adres farklı,
    ilan aynıydı."""
    a = ilan_kimligi("https://jobs.workable.com/view/9gwmlmrefwwkrtyxarwyg8/senior-dev")
    b = ilan_kimligi("https://apply.workable.com/vertigogames/j/9gwmlmrefwwkrtyxarwyg8/")
    assert a and b
    assert a[0] == b[0] == "workable"
    assert a[2] == b[2] == "9gwmlmrefwwkrtyxarwyg8"
    # Kiracı adres biçimine göre değişebiliyor — bu yüzden anahtar değil.
    assert (a[0], a[2]) == (b[0], b[2])


def test_h_desteklenen_platformlarin_hepsinden_kimlik_cikiyor():
    ornekler = {
        "lever": ("https://jobs.lever.co/insiderone/93762a98-207d-44ad-9145-05180706781b",
                  "insiderone", "93762a98-207d-44ad-9145-05180706781b"),
        "greenhouse": ("https://boards.greenhouse.io/acme/jobs/12345", "acme", "12345"),
        "ashby": ("https://jobs.ashbyhq.com/acme/8f3a1b2c-1111-2222-3333-444455556666",
                  "acme", "8f3a1b2c-1111-2222-3333-444455556666"),
        "smartrecruiters": ("https://jobs.smartrecruiters.com/acme/744000012345",
                            "acme", "744000012345"),
    }
    for platform, (url, kiraci, jid) in ornekler.items():
        assert ilan_kimligi(url) == (platform, kiraci, jid), url


def test_h_farkli_ilanlar_ayni_kimlige_dusmuyor():
    a = ilan_kimligi("https://boards.greenhouse.io/acme/jobs/1")
    b = ilan_kimligi("https://boards.greenhouse.io/acme/jobs/2")
    assert (a[0], a[2]) != (b[0], b[2])


def test_h_kimlik_cikmayan_adres_none_donuyor():
    assert ilan_kimligi("https://acme.com/kariyer/staj") is None
    assert ilan_kimligi(None) is None


# ------------------------------------- I: kalite kapısı resmî metne bakar

def test_i_linkedin_basligi_staj_dese_de_resmi_metin_karar_veriyor():
    assert sinifla("Software Intern", MEZUN, "Full-Time").sinif != VALID_INTERNSHIP


def test_i_gercek_staj_resmi_metinle_geciyor():
    assert sinifla("Yazılım Stajyeri", STAJ, "Internship").sinif == VALID_INTERNSHIP


# ------------------------------------------------- J: Türkiye ön elemesi

def test_j_turkiye_sinyali_taniniyor():
    s = LinkedInSinyali("1", "u", "Acme", "Intern", "Istanbul, Turkey")
    assert turkiye_sinyali_mi(s)


def test_j_yurtdisi_sinyali_turkiye_sayilmiyor():
    s = LinkedInSinyali("1", "u", "Acme", "Intern", "Berlin, Germany")
    assert not turkiye_sinyali_mi(s)


# ------------------------------------------------- K: çözüm kuyruğu sırası

def test_k_bilinen_sirket_kuyrukta_once():
    bilinen = {"getir"}
    tanidik = LinkedInSinyali("1", "u", "Getir", "Intern", "Istanbul")
    turk = LinkedInSinyali("2", "u", "Bilinmeyen", "Intern", "Ankara")
    yabanci = LinkedInSinyali("3", "u", "Bilinmeyen", "Intern", "Berlin")
    assert cozum_onceligi(tanidik, bilinen) < cozum_onceligi(turk, bilinen)
    assert cozum_onceligi(turk, bilinen) < cozum_onceligi(yabanci, bilinen)


def test_k_kucuk_sirket_sinyali_silinmiyor_sona_kaliyor():
    """Kuyruk sıralaması eleme değil — hiçbir sinyal atılmıyor."""
    bilinen = {"getir"}
    s = LinkedInSinyali("3", "u", "Küçük Firma", "Intern", "Berlin")
    assert cozum_onceligi(s, bilinen) == 2


# --------------------------------------- L: LinkedIn'e istek gönderilmiyor

def test_l_modul_linkedine_istek_atmiyor():
    """Kaynak kodda LinkedIn'e HTTP çağrısı olmamalı."""
    import pathlib

    kok = pathlib.Path(__file__).resolve().parents[1]
    for ad in ("radar_linkedin.py", "radar_linkedin_kosu.py"):
        govde = (kok / ad).read_text(encoding="utf-8")
        kod = "\n".join(satir for satir in govde.splitlines()
                        if not satir.lstrip().startswith("#"))
        assert "requests.get" not in kod, ad
        assert "https://www.linkedin.com" not in kod, ad
        assert "urlopen" not in kod, ad


def test_l_kosu_modulu_canonical_tabloya_yazmiyor():
    import pathlib

    govde = (pathlib.Path(__file__).resolve().parents[1] / "radar_linkedin_kosu.py"
             ).read_text(encoding="utf-8")
    for yasak in ("rest/v1/listings\", json=", ".post(", ".patch(", ".delete("):
        assert yasak not in govde, yasak
