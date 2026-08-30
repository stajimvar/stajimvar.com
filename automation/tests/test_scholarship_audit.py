"""Burs denetim aracının çıkarım sınırları.

Bu dosyadaki her test bir söz koruyor: araç TAHMİN ETMİYOR. Geçen bir
test, bir öğrenciye yanlış burs bilgisi gösterilmesi demek — başvuramayacağı
bir bursa başvurması ya da başvurabileceğini hiç öğrenememesi.

Testler ağa çıkmıyor; metin girdisiyle çalışıyor.
"""
from __future__ import annotations

from datetime import date

import pytest

from automation.scholarship_audit import (
    _baglam,
    _govde,
    _sadelestir,
    aylik_tutar_adaylari,
    bolum_adaylari,
    kaydi_denetle,
    sehir_adaylari,
    seviye_adaylari,
    son_tarih_adaylari,
)

BOLUMLER = [
    "Bilgisayar Mühendisliği",
    "Endüstri Mühendisliği",
    "Makine Mühendisliği",
    "Hukuk",
    "Tıp",
]
SEHIRLER = {"İstanbul", "Ankara", "İzmir", "Bursa"}


def coz(metin: str) -> tuple[str, str]:
    """Ham ve sadeleştirilmiş metni birlikte döndürür."""
    return _sadelestir(metin), metin


# --------------------------------------------------------------- son tarih


def test_son_basvuru_tarihi_okunuyor():
    duz, ham = coz("Burs başvuruları için son başvuru tarihi 15 Eylül 2026'dır.")
    adaylar = son_tarih_adaylari(duz, ham)
    assert {t for t, _ in adaylar} == {date(2026, 9, 15)}


def test_SONUC_DUYURUSU_SON_TARIH_SANILMIYOR():
    """
    Ölçüldü: KYK sayfasındaki "başvuru sonuçları açıklandı ... 11 Ağustos"
    cümlesi son başvuru tarihi olarak önerilmişti. "başvuru son" deseni
    "başvuru SONUÇLARI" ifadesine takılıyordu.
    """
    duz, ham = coz("İlk dönem başvuru sonuçları açıklandı. 11 Ağustos 2026 itibarıyla.")
    assert son_tarih_adaylari(duz, ham) == []


def test_uzak_tarihler_toplanmiyor():
    """Duyuru ve açılış tarihleri aynı sayfada; yalnızca yakındaki alınıyor."""
    duz, ham = coz(
        "Duyuru 1 Haziran 2026 tarihinde yayımlandı. " + ("x " * 120) +
        "Son başvuru tarihi 30 Eylül 2026."
    )
    assert {t for t, _ in son_tarih_adaylari(duz, ham)} == {date(2026, 9, 30)}


def test_sayisal_tarih_de_okunuyor():
    duz, ham = coz("Son başvuru tarihi 30.09.2026")
    assert {t for t, _ in son_tarih_adaylari(duz, ham)} == {date(2026, 9, 30)}


def test_gecersiz_tarih_dusuruluyor():
    duz, ham = coz("Son başvuru tarihi 31 Şubat 2026")
    assert son_tarih_adaylari(duz, ham) == []


# ------------------------------------------------------------------ tutar


def test_aylik_tutar_okunuyor():
    duz, ham = coz("10 ay boyunca aylık 2.250 TL burs alacaktır.")
    assert {t for t, _ in aylik_tutar_adaylari(duz, ham)} == {2250}


def test_TOPLAM_TUTAR_AYLIK_SANILMIYOR():
    """
    "toplam 22.500 TL" ile "aylık 2.250 TL" aynı veri değil. Dönemi
    yazmayan tutar öneri üretmiyor.
    """
    duz, ham = coz("Burs tutarı öğrenim dönemi için toplam 22.500 TL'dir.")
    assert aylik_tutar_adaylari(duz, ham) == []


def test_donemi_belirsiz_tutar_oneri_uretmiyor():
    for metin in [
        "40.000 TL burs desteği sağlanmaktadır.",
        "Yıllık 30.000 TL ödenir.",
        "En fazla 50.000 TL'ye kadar destek.",
    ]:
        duz, ham = coz(metin)
        assert aylik_tutar_adaylari(duz, ham) == [], metin


def test_gercekci_olmayan_tutar_eleniyor():
    duz, ham = coz("Aylık 12 TL ödenir.")
    assert aylik_tutar_adaylari(duz, ham) == []
    duz, ham = coz("Aylık 9.999.999 TL ödenir.")
    assert aylik_tutar_adaylari(duz, ham) == []


# --------------------------------------------------------- eğitim seviyesi


def test_lisansustu_lisans_demek_degil():
    """"Lisansüstü" yüksek lisans + doktora demek; lisans DAHİL DEĞİL."""
    duz, ham = coz("Program lisansüstü öğrencilere açıktır.")
    seviyeler, _ = seviye_adaylari(duz, ham)
    assert set(seviyeler) == {"Yüksek Lisans", "Doktora"}
    assert "Lisans" not in seviyeler


def test_on_lisans_ve_lisans_ayriliyor():
    duz, ham = coz("Ön lisans öğrencileri başvurabilir.")
    seviyeler, _ = seviye_adaylari(duz, ham)
    assert "Ön Lisans" in seviyeler
    assert "Lisans" not in seviyeler


def test_yuksek_lisans_lisans_sanilmiyor():
    duz, ham = coz("Yüksek lisans öğrencileri başvurabilir.")
    seviyeler, _ = seviye_adaylari(duz, ham)
    assert seviyeler == ["Yüksek Lisans"]


def test_seviye_yoksa_bos():
    duz, ham = coz("Üniversite öğrencileri başvurabilir.")
    seviyeler, _ = seviye_adaylari(duz, ham)
    assert seviyeler == []


# ------------------------------------------------------------------ bölüm


def test_sart_baglaminda_gecen_bolum_oneriliyor():
    duz, ham = coz(
        "Yalnızca aşağıdaki bölümlerde okuyan öğrenciler: Bilgisayar Mühendisliği "
        "ve Endüstri Mühendisliği başvurabilir."
    )
    bolum, kanit = bolum_adaylari(duz, ham, BOLUMLER)
    assert set(bolum) == {"Bilgisayar Mühendisliği", "Endüstri Mühendisliği"}
    assert kanit


def test_SART_DISI_GECEN_BOLUM_ADI_KISIT_SAYILMIYOR():
    """
    "Mezunlarımız Bilgisayar Mühendisliği okudu" bir başvuru şartı değil.
    Sayfada bölüm adı geçmesi kısıt anlamına gelmiyor.
    """
    duz, ham = coz("Vakfımızın mezunları Bilgisayar Mühendisliği alanında çalışmaktadır.")
    bolum, _ = bolum_adaylari(duz, ham, BOLUMLER)
    assert bolum == []


def test_tum_ogrencilere_acik_burs_bolum_uretmiyor():
    """"Tüm lisans öğrencileri" = KISIT YOK. Bölüm listesi doldurulmaz."""
    duz, ham = coz("Tüm lisans öğrencileri başvurabilir.")
    bolum, _ = bolum_adaylari(duz, ham, BOLUMLER)
    assert bolum == []


def test_fakulte_ifadesi_bolumlere_genisletilmiyor():
    """
    "Mühendislik fakültesi öğrencileri" ifadesinden tek tek bölüm
    üretilmiyor: hangi bölümlerin o fakültede olduğu okula göre değişiyor.
    """
    duz, ham = coz("Mühendislik fakültesi öğrencileri başvurabilir.")
    bolum, _ = bolum_adaylari(duz, ham, BOLUMLER)
    assert bolum == []


# ------------------------------------------------------------------ şehir


def test_acik_ikamet_sarti_okunuyor():
    duz, ham = coz("Ankara'da ikamet eden öğrenciler başvurabilir.")
    sehir, kanit = sehir_adaylari(duz, ham, SEHIRLER)
    assert sehir == ["Ankara"]
    assert kanit


def test_KURUM_ADRESI_SEHIR_KISITI_SAYILMIYOR():
    """Vakfın İstanbul'da olması öğrenciye şehir şartı koymuyor."""
    duz, ham = coz("Vakıf merkezi İstanbul'dadır. Türkiye genelinden başvuru alınır.")
    sehir, _ = sehir_adaylari(duz, ham, SEHIRLER)
    assert sehir == []


def test_turkiye_geneli_sehir_doldurmuyor():
    duz, ham = coz("Türkiye genelindeki tüm üniversite öğrencileri başvurabilir.")
    sehir, _ = sehir_adaylari(duz, ham, SEHIRLER)
    assert sehir == []


# ------------------------------------------------------------ HTML gövdesi


def test_script_icerigi_kanit_sayilmiyor():
    """script içindeki sayı sayfada YAZMIYOR; kanıt olamaz."""
    html = "<html><script>var tutar='aylık 9.000 TL';</script><p>Burs verilir.</p></html>"
    govde = _govde(html)
    assert "9.000" not in govde
    assert "Burs verilir." in govde


# ------------------------------------------------- uçtan uca sınıflandırma


class SahteCevap:
    def __init__(self, kod: int, metin: str = ""):
        self.status_code = kod
        self.text = metin
        self.headers = {"content-type": "text/html"}


def test_kapali_kaynak_C_sinifi(monkeypatch):
    monkeypatch.setattr(
        "automation.scholarship_audit.requests.get", lambda *a, **k: SahteCevap(404)
    )
    rapor = kaydi_denetle(
        {"id": "1", "title": "T", "organization_name": "K", "source_url": "https://x.test"},
        BOLUMLER, SEHIRLER, date(2026, 9, 1),
    )
    assert rapor.sinif == "C"
    assert rapor.oneriler == []


def test_erisilemeyen_kaynak_F_sinifi(monkeypatch):
    def patla(*a, **k):
        raise TimeoutError("zaman aşımı")

    monkeypatch.setattr("automation.scholarship_audit.requests.get", patla)
    rapor = kaydi_denetle(
        {"id": "1", "title": "T", "organization_name": "K", "source_url": "https://x.test"},
        BOLUMLER, SEHIRLER, date(2026, 9, 1),
    )
    assert rapor.sinif == "F"
    assert rapor.oneriler == []


def test_kaynak_kayitla_celisirse_E_sinifi(monkeypatch):
    monkeypatch.setattr(
        "automation.scholarship_audit.requests.get",
        lambda *a, **k: SahteCevap(200, "<p>Son başvuru tarihi 30 Eylül 2026</p>"),
    )
    rapor = kaydi_denetle(
        {
            "id": "1", "title": "T", "organization_name": "K",
            "source_url": "https://x.test",
            "application_deadline": "2026-10-15T00:00:00+00:00",
        },
        BOLUMLER, SEHIRLER, date(2026, 9, 1),
    )
    assert rapor.sinif == "E"
    assert any(o.alan == "application_deadline" for o in rapor.oneriler)


def test_ONERI_URETMEK_VERIFIED_YAPMIYOR(monkeypatch):
    """
    Çıkarıcının bulduğu tutar bir ÖNERİDİR. amount_verified_at asla
    araç tarafından üretilmiyor; onu yalnızca insan onayı doldurabilir.
    """
    monkeypatch.setattr(
        "automation.scholarship_audit.requests.get",
        lambda *a, **k: SahteCevap(200, "<p>Aylık 3.000 TL ödenir.</p>"),
    )
    rapor = kaydi_denetle(
        {"id": "1", "title": "T", "organization_name": "K", "source_url": "https://x.test"},
        BOLUMLER, SEHIRLER, date(2026, 9, 1),
    )
    alanlar = {o.alan for o in rapor.oneriler}
    assert "amount_min" in alanlar
    assert "amount_verified_at" not in alanlar
    assert all(o.kanit_url and o.kanit_metni for o in rapor.oneriler)


def test_her_onerinin_kaniti_var(monkeypatch):
    monkeypatch.setattr(
        "automation.scholarship_audit.requests.get",
        lambda *a, **k: SahteCevap(200, "<p>Lisansüstü öğrenciler. Aylık 4.000 TL.</p>"),
    )
    rapor = kaydi_denetle(
        {"id": "1", "title": "T", "organization_name": "K", "source_url": "https://x.test"},
        BOLUMLER, SEHIRLER, date(2026, 9, 1),
    )
    assert rapor.oneriler
    for o in rapor.oneriler:
        assert o.kanit_url.startswith("https://")
        assert o.gerekce
        # Kanıt KISA olmalı: telif nedeniyle uzun sayfa kopyası taşınmıyor.
        assert len(o.kanit_metni) <= 400


def test_GEZINME_MENUSU_SEVIYE_KISITI_SAYILMIYOR():
    """
    Ölçüldü: bir üniversite sayfasındaki "Enstitüler Lisansüstü Eğitim
    Enstitüsü" menüsü, bursun lisansüstüne açık olduğu sanılıp öneri
    üretmişti. Menü bir başvuru şartı değil.
    """
    duz, ham = coz(
        "Anasayfa Fakülteler Mühendislik Fakültesi Enstitüler "
        "Lisansüstü Eğitim Enstitüsü İletişim"
    )
    seviyeler, _ = seviye_adaylari(duz, ham)
    assert seviyeler == []


def test_uygunluk_baglaminda_seviye_okunuyor():
    duz, ham = coz("Burs başvuru şartları: örgün lisans programında öğrenim gören öğrenciler.")
    seviyeler, _ = seviye_adaylari(duz, ham)
    assert seviyeler == ["Lisans"]


def test_uzaktaki_seviye_kelimesi_alinmiyor():
    duz, ham = coz(
        "Doktora programlarımız hakkında bilgi. " + ("dolgu " * 120) +
        "Burs başvuru şartları: lisans öğrencisi olmak."
    )
    seviyeler, _ = seviye_adaylari(duz, ham)
    assert "Doktora" not in seviyeler
    assert "Lisans" in seviyeler


def test_kanit_html_varliklarini_cozuyor():
    """Kanıt yönetici ekranında karar dayanağı; okunabilir olmalı.

    Kaynak sayfalar Türkçe karakterleri sık sık `&uuml;` gibi HTML
    varlıklarıyla veriyor. Ham hâliyle taşınan kanıt ekranda
    "Lisans&uuml;st&uuml;" görünüyordu ve kimse ona bakıp karar veremez.
    """
    ham = "Burs " + "x" * 100 + " Lisans&uuml;st&uuml;   (tezli)\n\nprogram"
    kanit = _baglam(ham, ham.index("Lisans&"))
    assert "&uuml;" not in kanit
    assert "Lisansüstü" in kanit
    assert "  " not in kanit
    assert "\n" not in kanit


def test_kanit_kisa_kaliyor():
    """Telif: kanıt sayfa kopyası değil, kısa bir bağlam."""
    assert len(_baglam("a" * 1000, 500)) <= 220
