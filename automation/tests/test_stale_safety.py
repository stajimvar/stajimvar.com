"""İlan düşürmenin güvenlik sözleri.

Bu dosyadaki her test bir güvenceyi koruyor: geçen bir test, gerçekten
AÇIK olan bir stajın siteden düşmesi demek. Gevşetmeden önce hangi
başarısızlığın hangi ilanı kapatacağını düşün.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from automation.stale_safety import (
    MIN_SOURCE_SIZE_FOR_ABSENCE,
    MISS_THRESHOLD,
    CloseEvidence,
    Health,
    ListingState,
    SourceRun,
    eligible_for_deactivation,
    health,
    mass_deactivation_blocked,
    may_reactivate,
    protected,
    reconcile,
    reconciliation_payload,
    source_deactivation_allowed,
    strong_close_signal,
)

SIMDI = datetime(2026, 9, 1, 12, 0, tzinfo=UTC)


def tur(**kwargs) -> SourceRun:
    varsayilan = dict(
        source_id="ornek-workable",
        started_at=SIMDI - timedelta(seconds=30),
        finished_at=SIMDI,
        http_status=200,
        fetch_success=True,
        parser_success=True,
        pagination_complete=True,
        previous_job_count=5,
        current_job_count=5,
    )
    varsayilan.update(kwargs)
    return SourceRun(**varsayilan)


def kayit(**kwargs) -> ListingState:
    varsayilan = dict(
        type="external",
        importer_managed=True,
        company_id=None,
        author_id=None,
        application_method="external",
        consecutive_missing_runs=0,
        last_seen_at=SIMDI - timedelta(days=5),
    )
    varsayilan.update(kwargs)
    return ListingState(**varsayilan)


# --------------------------------------------------------------- sağlık


def test_saglikli_tur_taninir():
    assert health(tur())[0] is Health.HEALTHY


@pytest.mark.parametrize(
    "bozukluk",
    [
        {"fetch_success": False},
        {"parser_success": False},
        {"http_status": 500},
        {"http_status": 503},
        {"http_status": 429},
        {"http_status": 403},
        {"http_status": 401},
        {"http_status": 408},
    ],
)
def test_basarisiz_tur_FAILED(bozukluk):
    """Çekme veya ayrıştırma başarısızsa tur sağlıksız."""
    assert health(tur(**bozukluk))[0] is Health.FAILED


def test_eksik_sayfalama_DEGRADED():
    assert health(tur(pagination_complete=False))[0] is Health.DEGRADED


def test_sifir_sonuc_ANOMALI():
    """Önce ilanı olan bir kaynak birden sıfır dönerse bu bir arızadır."""
    assert health(tur(previous_job_count=5, current_job_count=0))[0] is Health.ANOMALY


def test_sert_dusus_ANOMALI():
    assert health(tur(previous_job_count=20, current_job_count=3))[0] is Health.ANOMALY


def test_gercekten_bos_kaynak_saglikli():
    """Zaten ilanı olmayan kaynağın boş dönmesi normal (ZERO_RESULTS_VALID)."""
    assert health(tur(previous_job_count=0, current_job_count=0))[0] is Health.HEALTHY


# ----------------------------------------- ASIL SÖZ: başarısız tur kapatmaz


@pytest.mark.parametrize(
    "bozukluk",
    [
        {"fetch_success": False},
        {"parser_success": False},
        {"http_status": 500},
        {"http_status": 429},
        {"pagination_complete": False},
        {"previous_job_count": 5, "current_job_count": 0},
        {"previous_job_count": 20, "current_job_count": 3},
    ],
)
def test_SAGLIKSIZ_TUR_HICBIR_ILANI_KAPATMAZ(bozukluk):
    """
    Bu projedeki en pahalı hata: kaynak çökünce bütün ilanları kapatmak.
    Sağlıksız turda sayaç ilerlemiyor, bayat adayı üretilmiyor ve
    kapatma kararı çıkmıyor — ilan üç tur kayıp olsa bile.
    """
    karar = reconcile(
        tur(**bozukluk),
        kayit(consecutive_missing_runs=MISS_THRESHOLD + 5),
        seen=False,
        now=SIMDI,
        allow_deactivation=True,
    )
    assert karar.would_deactivate is False
    assert karar.stale_eligible is False
    assert karar.consecutive_missing_runs == MISS_THRESHOLD + 5  # sayaç dondu


def test_sagliksiz_turda_yuk_ilani_pasiflestirmiyor():
    karar = reconcile(tur(fetch_success=False), kayit(), False, SIMDI, True)
    yuk = reconciliation_payload(karar, seen=False, now=SIMDI, allow_deactivation=True)
    assert "is_active" not in yuk
    assert "deactivated_at" not in yuk


# ------------------------------------------------- üst üste kaçırma şartı


def test_tek_turda_kaybolan_ilan_kapanmaz():
    """Bir turda görülmemek yetmiyor; eşik üç tur."""
    assert MISS_THRESHOLD >= 2
    assert not eligible_for_deactivation(tur(), kayit(consecutive_missing_runs=0), False, SIMDI)
    assert not eligible_for_deactivation(tur(), kayit(consecutive_missing_runs=1), False, SIMDI)


BUYUK = 20  # yoklukla kapatmanin serbest oldugu kaynak boyutu


def test_esik_dolunca_kapanmaya_aday():
    assert eligible_for_deactivation(
        tur(), kayit(consecutive_missing_runs=MISS_THRESHOLD - 1), False, SIMDI,
        source_active_count=BUYUK,
    )


def test_yeni_ilan_48_saat_korunuyor():
    """Az önce görülmüş bir ilan, sayaç dolsa bile kapatılmıyor."""
    taze = kayit(
        consecutive_missing_runs=MISS_THRESHOLD + 3,
        last_seen_at=SIMDI - timedelta(hours=2),
    )
    assert not eligible_for_deactivation(tur(), taze, False, SIMDI)


def test_gorulen_ilanin_sayaci_sifirlaniyor():
    karar = reconcile(tur(), kayit(consecutive_missing_runs=2), True, SIMDI, True)
    assert karar.consecutive_missing_runs == 0
    assert karar.would_deactivate is False


# ----------------------------------------------------------- korunanlar


@pytest.mark.parametrize(
    "durum",
    [
        {"type": "internal"},
        {"importer_managed": False},
        {"company_id": "11111111-1111-1111-1111-111111111111"},
        {"author_id": "22222222-2222-2222-2222-222222222222"},
        {"application_method": "internal"},
        {"application_method": "email_application"},
    ],
)
def test_ISVERENIN_KENDI_ILANI_ASLA_KAPATILMAZ(durum):
    """
    Toplayıcı yalnızca KENDİ getirdiği ilanı kapatabilir. İşverenin
    panelden açtığı ilan bir kaynakta görünmüyor diye kapanırsa, şirket
    ilanının neden kaybolduğunu hiçbir yerde göremez.
    """
    k = kayit(consecutive_missing_runs=99, **durum)
    assert protected(k)
    assert reconcile(tur(), k, False, SIMDI, True).would_deactivate is False


# ------------------------------------------------------------ devre kesici


def test_toplu_kapatma_devre_kesicisi_buyuk_kaynakta_oran():
    assert mass_deactivation_blocked(candidate_count=3, managed_active_count=10) is True
    assert mass_deactivation_blocked(candidate_count=2, managed_active_count=10) is False


def test_kucuk_kaynakta_mutlak_sinir():
    """Küçük kaynakta oran anlamsız: tur başına en fazla bir ilan."""
    assert mass_deactivation_blocked(candidate_count=2, managed_active_count=3) is True
    assert mass_deactivation_blocked(candidate_count=1, managed_active_count=3) is False


# ---------------------------------------------------------- izin listesi


def test_izin_listesi_kapali_baslar():
    """Fail closed: hem küresel şalter hem kaynak listesi gerekiyor."""
    assert source_deactivation_allowed("a", False, {"a"}) is False
    assert source_deactivation_allowed("a", True, set()) is False
    assert source_deactivation_allowed("a", True, {"b"}) is False
    assert source_deactivation_allowed("a", True, {"a"}) is True


def test_acik_kaynaklar_listede():
    """
    Bu liste iş akışındaki DEACTIVATION_ENABLED_SOURCES ile aynı olmalı.
    Bir kaynak eklenirken buraya da yazılıyor: gözden geçirilmemiş bir
    kaynağın sessizce açılmasını engelliyor.
    """
    acik = {
        "workable-tr-arama",
        "vertigogames-workable",
        "newmindai-workable",
        "rapsodo-workable",
        "sanction-scanner-workable",
        "alumil-workable",
        "insiderone-lever",
    }
    for slug in acik:
        assert source_deactivation_allowed(slug, True, acik) is True
    # Dalgalanan kaynaklar bilerek dışarıda.
    for slug in ("ciceksepeti-lever", "astrazeneca-workday", "lalamove-lever"):
        assert source_deactivation_allowed(slug, True, acik) is False


# ------------------------------------------------------------ geri açma


def test_kaynakta_yeniden_gorulen_ilan_geri_aciliyor():
    kapali = kayit(deactivation_reason="stale")
    assert may_reactivate(kapali, seen=True) is True
    yuk = reconciliation_payload(
        reconcile(tur(), kapali, True, SIMDI, True), seen=True, now=SIMDI, allow_deactivation=True
    )
    assert yuk["is_active"] is True
    assert yuk["deactivation_reason"] is None


def test_elle_kapatilan_ilan_otomatik_geri_acilmiyor():
    """Yönetici bir ilanı elle kapattıysa toplayıcı onu geri açmıyor."""
    assert may_reactivate(kayit(deactivation_reason="admin"), seen=True) is False
    assert may_reactivate(kayit(deactivation_reason=None), seen=True) is False


def test_izin_kapaliyken_karar_uretilir_ama_yazilmaz():
    """
    Şalter kapalıyken bayat adayı işaretleniyor (yönetici görsün diye)
    ama ilan pasifleştirilmiyor.
    """
    aday = kayit(consecutive_missing_runs=MISS_THRESHOLD - 1)
    karar = reconcile(tur(), aday, False, SIMDI, allow_deactivation=False, source_active_count=BUYUK)
    assert karar.stale_eligible is True
    yuk = reconciliation_payload(karar, seen=False, now=SIMDI, allow_deactivation=False)
    assert "is_active" not in yuk
    assert yuk["stale_eligible_at"] is not None


# ------------------------------------------------- arama birimi kapsaması


def test_kapsama_olculmeyen_kaynakta_kural_devrede_degil():
    """Tek istekli adaptörlerde alanlar 0; davranış değişmiyor."""
    from automation.stale_safety import unit_coverage

    assert unit_coverage(tur()) is None
    assert health(tur())[0] is Health.HEALTHY


def test_tam_kapsama_HEALTHY():
    t = tur(expected_units=280, successful_units=280, broken_units=0)
    assert health(t)[0] is Health.HEALTHY


def test_TEK_BOZUK_ALT_ISTEK_DEGRADED():
    """
    HTTP 200 + beklenmedik gövde, gerçek sıfır sonuçtan ayırt edilemiyordu:
    `data.get("jobs") or []` ikisini de boş sayıyordu. Artık bir alt istek
    bile bozuk gövde dönerse tur DEGRADED ve hiçbir ilan kapanmıyor.
    """
    t = tur(expected_units=280, successful_units=279, broken_units=1)
    saglik, gerekce = health(t)
    assert saglik is Health.DEGRADED
    assert "UNIT_PAYLOAD_BROKEN" in gerekce


def test_eksik_kapsama_DEGRADED():
    t = tur(expected_units=280, successful_units=250, broken_units=0)
    saglik, gerekce = health(t)
    assert saglik is Health.DEGRADED
    assert "UNIT_COVERAGE" in gerekce


def test_DEGRADED_KAPSAMA_ILAN_KAPATMIYOR():
    """Kapsama düşükken üç turdur kayıp bir ilan bile kapanmıyor."""
    t = tur(expected_units=280, successful_units=200, broken_units=0)
    karar = reconcile(
        t, kayit(consecutive_missing_runs=MISS_THRESHOLD + 2), False, SIMDI, True
    )
    assert karar.would_deactivate is False
    assert karar.consecutive_missing_runs == MISS_THRESHOLD + 2


def test_kapsama_dusukken_last_seen_bozulmuyor():
    t = tur(broken_units=1, expected_units=10, successful_units=9)
    yuk = reconciliation_payload(
        reconcile(t, kayit(), False, SIMDI, True), seen=False, now=SIMDI, allow_deactivation=True
    )
    assert "last_seen_at" not in yuk
    assert "is_active" not in yuk


# ------------------------------------------ production vaka senaryoları


def test_ardisik_kacirma_senaryosu_bastan_sona():
    """1 tur → 2 tur → 3 tur ama 48 saat dolmamış → 3 tur + 48 saat."""
    t = tur()
    # 1. tur
    k1 = reconcile(t, kayit(consecutive_missing_runs=0), False, SIMDI, True, source_active_count=BUYUK)
    assert (k1.consecutive_missing_runs, k1.would_deactivate) == (1, False)
    # 2. tur
    k2 = reconcile(t, kayit(consecutive_missing_runs=1), False, SIMDI, True, source_active_count=BUYUK)
    assert (k2.consecutive_missing_runs, k2.would_deactivate) == (2, False)
    # 3. tur ama ilan 2 saat önce görülmüş
    taze = kayit(consecutive_missing_runs=2, last_seen_at=SIMDI - timedelta(hours=2))
    k3 = reconcile(t, taze, False, SIMDI, True, source_active_count=BUYUK)
    assert (k3.consecutive_missing_runs, k3.would_deactivate) == (3, False)
    # 3. tur ve 48 saat dolmuş
    eski = kayit(consecutive_missing_runs=2, last_seen_at=SIMDI - timedelta(days=3))
    k4 = reconcile(t, eski, False, SIMDI, True, source_active_count=BUYUK)
    assert (k4.consecutive_missing_runs, k4.would_deactivate) == (3, True)


def test_araya_giren_degraded_tur_sayaci_dondurur():
    aday = kayit(consecutive_missing_runs=2, last_seen_at=SIMDI - timedelta(days=3))
    karar = reconcile(tur(pagination_complete=False), aday, False, SIMDI, True)
    assert karar.consecutive_missing_runs == 2  # ilerlemedi
    assert karar.would_deactivate is False


def test_araya_giren_failed_tur_sayaci_dondurur():
    aday = kayit(consecutive_missing_runs=2, last_seen_at=SIMDI - timedelta(days=3))
    karar = reconcile(tur(http_status=500), aday, False, SIMDI, True)
    assert karar.consecutive_missing_runs == 2
    assert karar.would_deactivate is False


def test_geri_gelen_ilan_sayaci_sifirliyor_ve_geri_aciliyor():
    kapali = kayit(consecutive_missing_runs=5, deactivation_reason="stale")
    karar = reconcile(tur(), kapali, True, SIMDI, True)
    assert karar.consecutive_missing_runs == 0
    assert karar.would_reactivate is True


def test_yuzde_80_dusus_ANOMALI_ve_kapatmiyor():
    t = tur(previous_job_count=50, current_job_count=5)  # %10 kaldı
    assert health(t)[0] is Health.ANOMALY
    aday = kayit(consecutive_missing_runs=9, last_seen_at=SIMDI - timedelta(days=9))
    assert reconcile(t, aday, False, SIMDI, True).would_deactivate is False


def test_bozuk_govde_HTTP_200_ile_geliyor_ve_yakaLaniyor():
    """
    En sinsi vaka: HTTP 200 ama gövde beklenen şekilde değil. HTTP durumu
    sağlıklı göründüğü için eski model bunu fark etmiyordu.
    """
    t = tur(http_status=200, expected_units=5, successful_units=4, broken_units=1)
    assert health(t)[0] is Health.DEGRADED


# ------------------------------------------------- kucuk kaynak korumasi


def bayat(**kwargs):
    """Esigi ve 48 saati DOLDURMUS bir kayit: tek engel kaynak boyutu."""
    return kayit(
        consecutive_missing_runs=MISS_THRESHOLD + 5,
        last_seen_at=SIMDI - timedelta(days=9),
        **kwargs,
    )


def test_TEK_ILANLI_KAYNAKTA_YOKLUK_KAPATMIYOR():
    """
    Olculdu: astrazeneca-workday'in tek ilani 122 turdur gorunmuyordu ve
    ilan hala aciktir. Turlar 1->0->1->0 gidiyor; ilk sifir ANOMALY
    sayiliyor ama sonraki 0->0 turlarinda previous_job_count de 0 oldugu
    icin anomali kurali susuyor, tur HEALTHY gorunuyor ve sayac ilerliyor.
    """
    t = tur(previous_job_count=0, current_job_count=0)
    assert health(t)[0] is Health.HEALTHY  # anomali kurali burada susuyor
    assert not eligible_for_deactivation(t, bayat(), False, SIMDI, source_active_count=1)
    assert reconcile(t, bayat(), False, SIMDI, True, source_active_count=1).would_deactivate is False


@pytest.mark.parametrize("adet", [0, 1, 2, 3])
def test_kucuk_kaynakta_yokluk_yetmiyor(adet):
    assert not eligible_for_deactivation(tur(), bayat(), False, SIMDI, source_active_count=adet)


def test_esikten_itibaren_yokluk_yeterli():
    assert eligible_for_deactivation(
        tur(), bayat(), False, SIMDI, source_active_count=MIN_SOURCE_SIZE_FOR_ABSENCE
    )


@pytest.mark.parametrize("kanit", [
    CloseEvidence(http_status=404),
    CloseEvidence(http_status=410),
    CloseEvidence(explicit_closed=True),
])
def test_TEK_ILANLI_KAYNAKTA_GUCLU_SINYAL_KAPATIYOR(kanit):
    """404, 410 ya da saglayicinin kendi kapali bayragi bagimsiz kanittir."""
    assert strong_close_signal(kanit)
    assert eligible_for_deactivation(
        tur(), bayat(), False, SIMDI, source_active_count=1, evidence=kanit
    )


@pytest.mark.parametrize("kanit", [
    None,
    CloseEvidence(),
    CloseEvidence(http_status=200),
    CloseEvidence(http_status=500),
    CloseEvidence(http_status=403),
    CloseEvidence(http_status=429),
])
def test_zayif_sinyal_kucuk_kaynakta_kapatmiyor(kanit):
    """200 acik demek; 5xx/403/429 ise KAYNAK arizasi. Hicbiri kapanma degil."""
    assert not strong_close_signal(kanit)
    assert not eligible_for_deactivation(
        tur(), bayat(), False, SIMDI, source_active_count=1, evidence=kanit
    )


def test_guclu_sinyal_sagliksiz_turu_asmiyor():
    """
    Kaynak cokmusken gelen 404 guvenilir degil: ayni ariza hem listeyi hem
    ilan sayfasini dusurmus olabilir.
    """
    assert not eligible_for_deactivation(
        tur(fetch_success=False), bayat(), False, SIMDI,
        source_active_count=1, evidence=CloseEvidence(http_status=404),
    )
    assert not eligible_for_deactivation(
        tur(broken_units=1, expected_units=10, successful_units=9), bayat(), False, SIMDI,
        source_active_count=1, evidence=CloseEvidence(http_status=404),
    )


def test_guclu_sinyal_48_saat_ve_esigi_asmiyor():
    """Kanit diger korumalarin yerine gecmiyor, ustune ekleniyor."""
    taze = kayit(consecutive_missing_runs=MISS_THRESHOLD + 5,
                 last_seen_at=SIMDI - timedelta(hours=2))
    assert not eligible_for_deactivation(
        tur(), taze, False, SIMDI, source_active_count=1, evidence=CloseEvidence(http_status=404)
    )
    az = kayit(consecutive_missing_runs=1, last_seen_at=SIMDI - timedelta(days=9))
    assert not eligible_for_deactivation(
        tur(), az, False, SIMDI, source_active_count=1, evidence=CloseEvidence(http_status=404)
    )


def test_isverenin_ilani_guclu_sinyalle_de_kapanmiyor():
    korumali = bayat(company_id="11111111-1111-1111-1111-111111111111")
    assert not eligible_for_deactivation(
        tur(), korumali, False, SIMDI, source_active_count=99,
        evidence=CloseEvidence(http_status=410),
    )


def test_iki_ilanli_kaynak_senaryosu():
    """2 aktif ilan, biri kayip: yokluk yetmiyor, kanit gerekiyor."""
    assert not eligible_for_deactivation(tur(), bayat(), False, SIMDI, source_active_count=2)
    assert eligible_for_deactivation(
        tur(), bayat(), False, SIMDI, source_active_count=2,
        evidence=CloseEvidence(http_status=404),
    )


def test_uc_ilanli_kaynak_sifir_donerse_anomali():
    """3 aktif ilan, tur 0 dondu -> ANOMALY, guclu kanitla bile kapanmiyor."""
    t = tur(previous_job_count=3, current_job_count=0)
    assert health(t)[0] is Health.ANOMALY
    assert not eligible_for_deactivation(
        t, bayat(), False, SIMDI, source_active_count=3,
        evidence=CloseEvidence(http_status=404),
    )


def test_varsayilan_fail_closed():
    """source_active_count verilmezse kaynak kucuk sayiliyor."""
    assert not eligible_for_deactivation(tur(), bayat(), False, SIMDI)
    assert reconcile(tur(), bayat(), False, SIMDI, True).would_deactivate is False
