"""RESMÎ WEB RADARI REGRESYONU

Ana kural: BRAVE NEREDEN BAKACAĞIMIZI SÖYLER, RESMÎ ATS GERÇEĞİ
SÖYLER. Arama özeti kanıt değil; ilan resmî kaynaktan çekilmeden
kalite kapısı çalışmıyor ve yayın adayı doğmuyor.
"""

from automation.radar_resmi import (
    DESTEKLENEN,
    DESTEKLENMEYEN,
    ResmiAday,
    kayitli_kiracilar,
    kiracilari_topla,
    sonucu_sinifla,
    sorgu_matrisi,
    turkiye_mi,
    yeni_kiraci_mi,
)
from automation.staj_kalitesi import NOT_INTERNSHIP, VALID_INTERNSHIP, sinifla

STAJ = ("Üniversite öğrencilerine yönelik 3 aylık staj programımıza stajyer "
        "arıyoruz. Zorunlu staj evrakları desteklenir.")
MEZUN = ("Yeni mezunlara yönelik tam zamanlı 18 aylık leadership program. "
         "Management trainee olarak rotasyona katılacaksınız.")


# --------------------------------------------------------- sorgu matrisi


def test_sorgular_desteklenen_atslere_daraltilmis():
    """Bütün web'e körlemesine sorgu YOK."""
    sorgular = sorgu_matrisi()
    assert sorgular
    alanlar = {b["alan"] for b in DESTEKLENEN.values()}
    for s in sorgular:
        assert s.startswith("site:"), s
        assert any(a in s for a in alanlar), s


def test_sorgu_matrisi_deterministik_ve_sinirli():
    assert sorgu_matrisi(120) == sorgu_matrisi(120)
    assert len(sorgu_matrisi(30)) == 30


# ------------------------------------------------------- A: destekli ATS


def test_a_lever_ilani_kiraciya_cozuluyor():
    b = sonucu_sinifla("https://jobs.lever.co/acme/93762a98-207d")
    assert b.destekli and b.platform == "lever" and b.kiraci == "acme"


def test_desteklenen_platformlarin_hepsi_kiraci_cikariyor():
    ornekler = {
        "lever": "https://jobs.lever.co/acme/1",
        "greenhouse": "https://boards.greenhouse.io/acme/jobs/1",
        "ashby": "https://jobs.ashbyhq.com/acme/1",
        "workable": "https://apply.workable.com/acme/j/ABC/",
        "smartrecruiters": "https://jobs.smartrecruiters.com/acme/123",
    }
    for platform, url in ornekler.items():
        b = sonucu_sinifla(url)
        assert b.destekli, url
        assert b.platform == platform
        assert b.kiraci == "acme", url


# -------------------------------------------------------- B, C: reddet


def test_b_kariyer_net_reddediliyor():
    b = sonucu_sinifla("https://www.kariyer.net/is-ilani/abc-123")
    assert not b.destekli
    assert b.red_nedeni == "toplayıcı/sosyal/rehber"


def test_c_linkedin_ve_sosyal_reddediliyor():
    for u in ["https://www.linkedin.com/jobs/view/1",
              "https://www.instagram.com/p/x",
              "https://tr.wikipedia.org/wiki/X",
              "https://www.youthall.com/tr/x"]:
        assert not sonucu_sinifla(u).destekli, u


def test_kiraci_cikarilamayan_ats_adresi_destekli_degil():
    """`jobs.workable.com/view/...` kiracı taşımıyor."""
    b = sonucu_sinifla("https://jobs.workable.com/view/abc/it-intern")
    assert not b.destekli


# --------------------------------------------------- J: adaptörsüz ATS


def test_j_adaptoru_olmayan_resmi_ats_sayiliyor_yayinlanmiyor():
    ornekler = {
        "successfactors": "https://career5.successfactors.eu/careers?company=x",
        "teamtailor": "https://acme.teamtailor.com/jobs/1",
        "recruitee": "https://acme.recruitee.com/o/intern",
        "taleo": "https://tbe.taleo.net/x/ats/careers/1",
        "workday": "https://acme.wd3.myworkdayjobs.com/careers/job/1",
    }
    for platform, url in ornekler.items():
        b = sonucu_sinifla(url)
        assert not b.destekli, url
        assert b.platform == platform, url
        assert b.red_nedeni == "adaptör yok"


def test_desteklenmeyen_listesi_desteklenenle_cakismiyor():
    assert not (set(DESTEKLENEN) & set(DESTEKLENMEYEN))


# ------------------------------------------------- G: çapraz tekilleştirme


def test_g_ayni_kiraci_birden_fazla_sorguda_tek_sayiliyor():
    urller = [
        "https://jobs.lever.co/acme/1",
        "https://jobs.lever.co/acme/2",
        "https://jobs.lever.co/baska/9",
    ]
    kiracilar, hepsi = kiracilari_topla(urller)
    assert len(hepsi) == 3, "ham isabet ayrı sayılmalı"
    assert set(kiracilar) == {("lever", "acme"), ("lever", "baska")}
    assert len(kiracilar[("lever", "acme")]) == 2


# ------------------------------------------------------- Türkiye süzgeci


def test_turkiye_konumlari_taniniyor():
    for k in ["Istanbul, Turkey", "İzmir", "Ankara", "Türkiye", "Gebze/Kocaeli"]:
        assert turkiye_mi(k), k


def test_turkiye_disi_konum_reddediliyor():
    for k in ["Berlin, Germany", "London", "Remote - US", "Warsaw"]:
        assert not turkiye_mi(k), k


def test_uzaktan_ilan_kanit_olmadan_turkiye_sayilmiyor():
    """"Remote" tek başına Türkiye demek değil."""
    assert not turkiye_mi("Remote")
    assert turkiye_mi("Remote", "Türkiye'den çalışabilirsiniz")


# ------------------------------------------------- D, F, K: kalite kapısı


def test_d_kapali_ilan_yayin_adayi_degil():
    aday = ResmiAday("lever", "acme", "Acme", "Intern", "Istanbul",
                     "https://jobs.lever.co/acme/1", durum="rejected", neden="kapalı")
    assert not aday.would_publish


def test_f_canli_ama_staj_olmayan_ilan_eleniyor():
    """Sprint 1 kapısı AYNEN kullanılıyor; ikinci motor yok."""
    karar = sinifla("Management Trainee", MEZUN, "Full-Time")
    assert karar.sinif == NOT_INTERNSHIP


def test_k_arama_ozeti_degil_resmi_ilan_karar_veriyor():
    """Özet 'intern' dese de resmî metin tam zamanlı mezun programıysa eleniyor."""
    karar = sinifla("Software Intern", MEZUN.replace("Management trainee", "Management trainee"),
                    "Full-Time")
    assert karar.sinif != VALID_INTERNSHIP


def test_e_canli_turkiye_staj_ilani_yayin_adayi():
    karar = sinifla("Software Intern", STAJ, "Internship")
    assert karar.sinif == VALID_INTERNSHIP
    aday = ResmiAday("lever", "acme", "Acme", "Software Intern", "Istanbul, Turkey",
                     "https://jobs.lever.co/acme/1",
                     quality_class=karar.sinif, durum="would_publish")
    assert aday.would_publish


def test_toplayici_adresli_aday_yayinlanamaz():
    aday = ResmiAday("lever", "acme", "Acme", "Intern", "Istanbul",
                     "https://www.kariyer.net/is-ilani/1",
                     quality_class=VALID_INTERNSHIP, durum="would_publish")
    assert not aday.would_publish


# ------------------------------------------------------ H, I: kiracılar


def test_h_kayitli_kiraci_yeni_sayilmiyor():
    kayitli = kayitli_kiracilar([
        {"type": "lever", "site": "Commencis"},
        {"type": "greenhouse", "board_token": "acme"},
    ])
    assert not yeni_kiraci_mi("lever", "commencis", kayitli)
    assert not yeni_kiraci_mi("greenhouse", "ACME", kayitli)
    assert yeni_kiraci_mi("lever", "bilinmeyen", kayitli)


def test_i_gercek_kaynak_dosyasindan_kiracilar_okunuyor():
    import json
    from pathlib import Path

    yol = Path(__file__).resolve().parents[1] / "sources.json"
    ham = json.loads(yol.read_text(encoding="utf-8"))
    kaynaklar = ham if isinstance(ham, list) else ham.get("sources", [])
    kayitli = kayitli_kiracilar(kaynaklar)
    assert len(kayitli) >= 20, "kaynak kaydından kiracı çıkarılamadı"
    # Kiracı çıkarma kalıpları gerçek kayıtlarla uyumlu olmalı.
    assert any(p == "lever" for p, _ in kayitli)
    assert any(p == "greenhouse" for p, _ in kayitli)


# ------------------------------------------------------------- L: hata


def test_l_bos_adres_cokmeye_yol_acmiyor():
    assert sonucu_sinifla("").red_nedeni == "adres yok"
    assert sonucu_sinifla(None).red_nedeni == "adres yok"
