"""İlan düşürmenin güvenlik sözleri.

Bu dosyadaki her test bir güvenceyi koruyor: geçen bir test, gerçekten
AÇIK olan bir stajın siteden düşmesi demek. Gevşetmeden önce hangi
başarısızlığın hangi ilanı kapatacağını düşün.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from automation.stale_safety import (
    MISS_THRESHOLD,
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


def test_esik_dolunca_kapanmaya_aday():
    assert eligible_for_deactivation(
        tur(), kayit(consecutive_missing_runs=MISS_THRESHOLD - 1), False, SIMDI
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
    for slug in ("workable-tr-arama", "ciceksepeti-lever", "astrazeneca-workday", "lalamove-lever"):
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
    karar = reconcile(tur(), aday, False, SIMDI, allow_deactivation=False)
    assert karar.stale_eligible is True
    yuk = reconciliation_payload(karar, seen=False, now=SIMDI, allow_deactivation=False)
    assert "is_active" not in yuk
    assert yuk["stale_eligible_at"] is not None
