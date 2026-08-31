"""STAJ KALİTE KAPISI REGRESYONU

Ana kural: BAŞLIK ŞÜPHE UYANDIRABİLİR, BAŞLIK TEK BAŞINA HÜKÜM VEREMEZ.

"MT" yazıyor diye gerçek staj elenmiyor; "Intern" yazıyor diye gerçek
olmayan staj kabul edilmiyor.
"""

from automation.staj_kalitesi import (
    AMBIGUOUS,
    LIKELY_INTERNSHIP,
    NOT_INTERNSHIP,
    VALID_INTERNSHIP,
    sinifla,
    toplayici_mi,
)

STAJ_METNI = (
    "Üniversite öğrencilerine yönelik 3 aylık staj programımıza "
    "stajyer arıyoruz. Zorunlu staj evrakları desteklenir."
)
MEZUN_METNI = (
    "Yeni mezunlara yönelik tam zamanlı 18 aylık leadership program. "
    "Management trainee olarak ekiplerimizde rotasyona katılacaksınız."
)


def test_a_software_intern_staj_aciklamasiyla_geciyor():
    k = sinifla("Software Intern", STAJ_METNI)
    assert k.sinif == VALID_INTERNSHIP
    assert k.yayinlanabilir
    assert k.nedenler


def test_b_uzun_vadeli_stajyer_geciyor():
    k = sinifla(
        "Uzun Vadeli Full Stack Geliştirici Stajyeri",
        "Gerçek sorumluluklar üstlenebilecek uzun vadeli bir stajyer arıyoruz.",
    )
    assert k.sinif == VALID_INTERNSHIP


def test_c_management_trainee_mezun_programi_gecmiyor():
    k = sinifla("Management Trainee", MEZUN_METNI)
    assert k.sinif == NOT_INTERNSHIP
    assert not k.yayinlanabilir


def test_d_mt_basligi_gercek_staj_aciklamasiyla_geciyor():
    """BAŞLIK TEK BAŞINA ELEYEMEZ.

    Başlıkta "(MT)" geçiyor ama açıklama açıkça üniversite öğrencilerine
    yönelik bir staj programı tarif ediyor. Mezun programı işareti
    YALNIZCA açıklamadan okunuyor; başlıktaki "(MT)" bir şeyi elemiyor.
    """
    k = sinifla("İnsan Kaynakları Yönetici Adayı (MT)", STAJ_METNI)
    assert k.sinif == VALID_INTERNSHIP
    assert k.yayinlanabilir


def test_e_graduate_program_gecmiyor():
    k = sinifla(
        "Graduate Program 2026",
        "Yalnızca yeni mezunlar için tam zamanlı graduate programme.",
    )
    assert k.sinif == NOT_INTERNSHIP


def test_f_intern_basligi_kidemli_aciklamayla_otomatik_gecmiyor():
    """"Intern" kelimesi tek başına kabul sebebi değil."""
    k = sinifla(
        "Software Intern",
        "Kalıcı pozisyon. En az 8 yıl deneyimli senior mühendis arıyoruz.",
    )
    assert k.sinif == NOT_INTERNSHIP
    assert not k.yayinlanabilir


def test_internal_kelimesi_staj_sinyali_degil():
    """Insider One kaydının kapıdan geçtiği yer tam olarak burasıydı.

    Resmi kaynakta geçen dört "intern" eşleşmesinin dördü de "internal"
    kelimesinin içindeydi.
    """
    k = sinifla(
        "Management Trainee for People & Culture (Fresh Grad)",
        "Work closely with internal communication and internal training "
        "teams across our international offices.",
        istihdam_turu="Full-Time",
    )
    assert k.sinif == NOT_INTERNSHIP


def test_istihdam_turu_en_agir_sinyal():
    """ATS'in kendi alanı şirketin beyanı: tam zamanlı diyorsa staj değil."""
    k = sinifla("Trainee", "Genel bir program.", istihdam_turu="Full-Time")
    assert k.sinif == NOT_INTERNSHIP

    k2 = sinifla("Yönetici Adayı", "Genel bir program.", istihdam_turu="Internship")
    assert k2.sinif == VALID_INTERNSHIP


def test_tam_zamanli_ama_staj_diyorsa_belirsiz():
    """Çelişkiyi sessizce çözmüyoruz: insan baksın."""
    k = sinifla("Intern", STAJ_METNI, istihdam_turu="Full-Time")
    assert k.sinif == AMBIGUOUS
    assert not k.yayinlanabilir


def test_aciklamasiz_ilan_yalniz_baslikla_olasi_sayiliyor():
    k = sinifla("Yazılım Stajyeri", "")
    assert k.sinif == LIKELY_INTERNSHIP
    assert k.yayinlanabilir


def test_hicbir_sinyal_yoksa_gecmiyor():
    k = sinifla("Bölge Satış Sorumlusu", "Saha satış ekibimize katılın.")
    assert k.sinif == NOT_INTERNSHIP


def test_trainee_tek_basina_kabul_sebebi_degil():
    """Eski süzgeç `trainee` kelimesini pozitif sayıyordu."""
    k = sinifla("Trainee Programı", "Mezunlara yönelik leadership program.")
    assert k.sinif == NOT_INTERNSHIP


def test_karar_her_zaman_gerekce_tasiyor():
    for baslik, aciklama in [
        ("Software Intern", STAJ_METNI),
        ("Management Trainee", MEZUN_METNI),
        ("Bölge Satış Sorumlusu", "Saha ekibi."),
    ]:
        k = sinifla(baslik, aciklama)
        assert k.nedenler, f"{baslik}: gerekçesiz karar"


# ------------------------------------------------------------- kaynak


def test_i_toplayici_resmi_kaynak_degil():
    for u in [
        "https://www.linkedin.com/jobs/view/123",
        "https://www.kariyer.net/is-ilani/456",
        "https://www.youthall.com/tr/job/789",
    ]:
        assert toplayici_mi(u), u


def test_j_ats_adresi_resmi_kaynak():
    for u in [
        "https://jobs.lever.co/insiderone/93762a98",
        "https://boards.greenhouse.io/acme/jobs/123",
        "https://jobs.workable.com/view/abc/it-intern",
        "https://kariyer.ornek.com.tr/ilan/12",
    ]:
        assert not toplayici_mi(u), u


def test_o_internal_ilan_apply_url_istemiyor():
    """StajımVar'da açılan ilanda dış başvuru adresi olmaması normal."""
    assert not toplayici_mi(None)
    assert not toplayici_mi("")
