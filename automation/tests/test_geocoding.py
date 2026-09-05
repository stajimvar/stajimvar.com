"""Geocoding katmanının sözleşmesi.

Bu testler ağa çıkmıyor: sağlayıcı arayüzü sahte bir uygulamayla
değiştiriliyor. Korunan şey davranış — özellikle "sahte konum üretme" ve
"token yoksa çağrı yapma" kuralları.
"""

from __future__ import annotations

import pathlib
import sys

# Depodaki diğer testlerle aynı kalıp: modül kökünü yola ekliyor.
sys.path.insert(0, str(pathlib.Path(__file__).parents[1]))

import pytest

from event_import.geocoding import (
    GeocodeResult,
    GeoapifyProvider,
    NullProvider,
    build_query,
    konum_yeterince_kesin,
    default_provider,
    geocode_event,
)


class SahteSaglayici:
    """Çağrıldığını kaydeden, sabit koordinat dönen sağlayıcı."""

    name = "sahte"

    def __init__(self, koordinat=(41.0, 29.0), acik=True):
        self.koordinat = koordinat
        self.acik = acik
        self.cagrilar: list[tuple[str, str | None]] = []

    def enabled(self) -> bool:
        return self.acik

    def forward(self, query: str, *, country: str | None = None):
        self.cagrilar.append((query, country))
        return self.koordinat


# --------------------------------------------------------------- sorgu kurma


def test_acik_adres_address_hassasiyeti_veriyor():
    sonuc = build_query(
        address="Merkezefendi Mah. 1. Sok. No:3",
        venue_name="Kültür Merkezi",
        district="Zeytinburnu",
        city="İstanbul",
        country_name="Türkiye",
    )
    assert sonuc is not None
    query, precision = sonuc
    assert precision == "address"
    assert query.startswith("Merkezefendi Mah.")
    assert "Zeytinburnu" in query and "İstanbul" in query


def test_adres_yoksa_mekan_adi_deneniyor():
    sonuc = build_query(
        address=None,
        venue_name="Zorlu PSM",
        district=None,
        city="İstanbul",
        country_name="Türkiye",
    )
    assert sonuc == ("Zorlu PSM, İstanbul, Türkiye", "address")


def test_yalniz_ilce_ve_sehir_bolge_hassasiyeti():
    """İlçe koordinatı bir BÖLGE; 'address' sayılmamalı."""
    sonuc = build_query(
        address=None,
        venue_name=None,
        district="Zeytinburnu",
        city="İstanbul",
        country_name="Türkiye",
    )
    assert sonuc == ("Zeytinburnu, İstanbul, Türkiye", "admin2")


def test_yalniz_sehir_admin1():
    sonuc = build_query(
        address=None, venue_name=None, district=None, city="Konya", country_name="Türkiye"
    )
    assert sonuc == ("Konya, Türkiye", "admin1")


def test_hicbir_yer_bilgisi_yoksa_sorgu_uretilmiyor():
    """Sahte konum üretmenin başladığı yer burasıydı; None dönmeli."""
    assert (
        build_query(address=None, venue_name=None, district=None, city=None, country_name="Türkiye")
        is None
    )
    assert (
        build_query(address="  ", venue_name="", district=None, city="   ", country_name=None)
        is None
    )


# ------------------------------------------------------------------ akış


def test_token_yoksa_hic_cagri_yapilmiyor(monkeypatch):
    monkeypatch.delenv("GEOAPIFY_API_KEY", raising=False)
    saglayici = default_provider()
    assert isinstance(saglayici, NullProvider)
    assert saglayici.enabled() is False
    assert (
        geocode_event(provider=saglayici, address="Bir adres", city="İstanbul") is None
    )


def test_anahtar_varsa_geoapify_secilir(monkeypatch):
    monkeypatch.setenv("GEOAPIFY_API_KEY", "test-anahtar")
    saglayici = default_provider()
    assert isinstance(saglayici, GeoapifyProvider)
    assert saglayici.enabled() is True


def test_basarili_geocode_hassasiyet_ve_sorguyu_tasiyor():
    saglayici = SahteSaglayici(koordinat=(41.0055, 28.9769))
    sonuc = geocode_event(
        provider=saglayici,
        address="Merkezefendi Mah. 1. Sok. No:3",
        district="Zeytinburnu",
        city="İstanbul",
        country_name="Türkiye",
        country_code="TR",
    )
    assert isinstance(sonuc, GeocodeResult)
    assert sonuc.precision == "address"
    assert sonuc.provider == "sahte"
    assert sonuc.latitude == 41.0055 and sonuc.longitude == 28.9769
    # Sorgu saklanıyor: sonucun neden o çıktığı sonradan denetlenebilsin.
    assert "Merkezefendi" in sonuc.query
    # Ülke kodu servise iletiliyor; yanlış ülkedeki aynı adı elemek için.
    assert saglayici.cagrilar[0][1] == "TR"


def test_bolge_sorgusundan_koordinat_saklanmiyor():
    """İlçe merkezi ne 'address' diye kaydedilir ne de bölge olarak saklanır.

    Eskiden 'admin2' hassasiyetiyle saklanıp arayüzde pin çizilmiyordu.
    Artık hiç saklanmıyor: saklanan tek şey nokta seviyesi koordinat.
    """
    saglayici = SahteSaglayici()
    sonuc = geocode_event(
        provider=saglayici,
        address=None,
        venue_name=None,
        district="Zeytinburnu",
        city="İstanbul",
        country_name="Türkiye",
    )
    assert sonuc is None
    assert saglayici.cagrilar == [], "bölge sorgusu için servise gidilmemeli"


def test_yer_bilgisi_yoksa_cagri_bile_yapilmiyor():
    saglayici = SahteSaglayici()
    sonuc = geocode_event(provider=saglayici, address=None, city=None, district=None)
    assert sonuc is None
    assert saglayici.cagrilar == [], "yer bilgisi yokken servise gidilmemeli"


def test_saglayici_none_donunce_etkinlik_elenmiyor():
    """Geocode başarısızlığı sessiz: çağıran taraf None alıp devam ediyor."""

    class Bulamayan(SahteSaglayici):
        def forward(self, query: str, *, country: str | None = None):
            self.cagrilar.append((query, country))
            return None

    saglayici = Bulamayan()
    assert geocode_event(provider=saglayici, address="Olmayan bir yer", city="İstanbul") is None
    assert len(saglayici.cagrilar) == 1


@pytest.mark.parametrize("koordinat", [(91.0, 29.0), (41.0, 181.0), (-95.0, 0.0)])
def test_dunya_disi_koordinat_saklanmiyor(koordinat):
    """Servisin bozuk yanıtı veritabanına geçmemeli."""
    saglayici = SahteSaglayici(koordinat=koordinat)
    sonuc = geocode_event(provider=saglayici, address="Bir adres", city="İstanbul")
    assert sonuc is None


def test_geoapify_dogru_uc_noktayi_ve_parametreleri_kullaniyor():
    yakalanan: dict = {}

    class SahteOturum:
        def get(self, url, params=None, timeout=None):
            yakalanan["url"] = url
            yakalanan["params"] = params
            yakalanan["timeout"] = timeout

            class Yanit:
                def raise_for_status(self):
                    return None

                def json(self):
                    return {
                        "features": [
                            {
                                "geometry": {"coordinates": [28.9769, 41.0055]},
                                "properties": {
                                    "result_type": "amenity",
                                    "rank": {"confidence": 0.9},
                                },
                            }
                        ]
                    }

            return Yanit()

    saglayici = GeoapifyProvider(api_key="test-anahtar", session=SahteOturum(), min_interval=0)
    assert saglayici.forward("Bir adres, İstanbul", country="TR") == (41.0055, 28.9769)
    assert "geoapify.com/v1/geocode/search" in yakalanan["url"]
    assert yakalanan["params"]["apiKey"] == "test-anahtar"
    assert yakalanan["params"]["text"] == "Bir adres, İstanbul"
    # Ülke süzgeci: aynı adın başka ülkedeki eşini elemek için.
    assert yakalanan["params"]["filter"] == "countrycode:tr"
    # Zaman aşımı verilmeden istek atılmamalı; yoksa içe aktarma kilitlenir.
    assert yakalanan["timeout"] is not None


def test_anahtar_yoksa_istek_atmiyor():
    class PatlayanOturum:
        def get(self, *args, **kwargs):  # pragma: no cover - çağrılmamalı
            raise AssertionError("anahtar yokken servise gidilmemeli")

    saglayici = GeoapifyProvider(api_key="", session=PatlayanOturum())
    assert saglayici.enabled() is False
    assert saglayici.forward("Bir adres") is None


def test_kota_dolunca_istek_kesiliyor():
    """Günlük ücretsiz kotayı tek koşuda tüketmemek için."""

    class SayanOturum:
        def __init__(self):
            self.cagri = 0

        def get(self, url, params=None, timeout=None):
            self.cagri += 1

            class Yanit:
                def raise_for_status(self):
                    return None

                def json(self):
                    return {
                        "features": [
                            {
                                "geometry": {"coordinates": [29.0, 41.0]},
                                "properties": {
                                    "result_type": "building",
                                    "rank": {"confidence": 0.8},
                                },
                            }
                        ]
                    }

            return Yanit()

    oturum = SayanOturum()
    saglayici = GeoapifyProvider(api_key="k", session=oturum, quota=2, min_interval=0)
    assert saglayici.forward("bir") is not None
    assert saglayici.forward("iki") is not None
    assert saglayici.forward("uc") is None, "kota aşıldıktan sonra istek atılmamalı"
    assert oturum.cagri == 2
    assert saglayici.used == 2


def test_hiz_siniri_cagrilar_arasinda_bekliyor():
    """Saniyelik sınırın altında kalmak için ikinci çağrı önce uyuyor."""
    uykular: list[float] = []
    zaman = {"t": 0.0}

    class Oturum:
        def get(self, url, params=None, timeout=None):
            class Yanit:
                def raise_for_status(self):
                    return None

                def json(self):
                    return {
                        "features": [
                            {
                                "geometry": {"coordinates": [29.0, 41.0]},
                                "properties": {
                                    "result_type": "amenity",
                                    "rank": {"confidence": 0.9},
                                },
                            }
                        ]
                    }

            return Yanit()

    saglayici = GeoapifyProvider(
        api_key="k",
        session=Oturum(),
        min_interval=0.25,
        clock=lambda: zaman["t"],
        sleep=uykular.append,
    )
    saglayici.forward("bir")
    assert uykular == [], "ilk çağrıdan önce beklenmemeli"
    saglayici.forward("iki")
    assert uykular and 0 < uykular[0] <= 0.25


def test_zaman_asimi_ve_ag_hatasi_sessizce_gecistiriliyor():
    import requests as _requests

    class PatlayanOturum:
        def get(self, *args, **kwargs):
            raise _requests.Timeout("çok uzun sürdü")

    saglayici = GeoapifyProvider(api_key="k", session=PatlayanOturum(), min_interval=0)
    assert saglayici.forward("bir adres") is None


# --------------------------------------------- sonuç kesinliği (bölge reddi)


@pytest.mark.parametrize("tur", ["amenity", "building", "street", "AMENITY", " Building "])
def test_nokta_seviyesi_turler_kabul(tur):
    assert konum_yeterince_kesin(tur, 0.9) is True


@pytest.mark.parametrize(
    "tur", ["city", "district", "suburb", "county", "state", "country", "postcode", "unknown"]
)
def test_bolge_seviyesi_turler_reddediliyor(tur):
    """Şehir/ilçe/bölge merkezi pin olamaz; güven 1.0 olsa bile."""
    assert konum_yeterince_kesin(tur, 1.0) is False


def test_taninmayan_tur_reddediliyor():
    """Beyaz liste: servis yarın yeni tür eklerse sessizce kabul edilmesin."""
    assert konum_yeterince_kesin("hyperloop_station", 1.0) is False


@pytest.mark.parametrize("guven", [0.49, 0.0, None, "abc"])
def test_dusuk_veya_bozuk_guven_reddediliyor(guven):
    assert konum_yeterince_kesin("amenity", guven) is False


def test_tur_yoksa_reddediliyor():
    assert konum_yeterince_kesin(None, 0.99) is False


def _yanit_veren_oturum(result_type, confidence, koordinat=(28.9769, 41.0055)):
    class Oturum:
        def get(self, url, params=None, timeout=None):
            class Yanit:
                def raise_for_status(self):
                    return None

                def json(self):
                    return {
                        "features": [
                            {
                                "geometry": {"coordinates": list(koordinat)},
                                "properties": {
                                    "result_type": result_type,
                                    "rank": {"confidence": confidence},
                                },
                            }
                        ]
                    }

            return Yanit()

    return Oturum()


def test_saglayici_poi_sonucunu_kabul_ediyor():
    saglayici = GeoapifyProvider(
        api_key="k", session=_yanit_veren_oturum("amenity", 0.95), min_interval=0
    )
    assert saglayici.forward("Bir Sahne, İstanbul") == (41.0055, 28.9769)
    assert saglayici.rejected == 0


def test_saglayici_sehir_merkezini_reddediyor_ve_sayiyor():
    """En kritik test: geçerli görünen ama yanlış olan koordinat."""
    saglayici = GeoapifyProvider(
        api_key="k", session=_yanit_veren_oturum("city", 0.99), min_interval=0
    )
    assert saglayici.forward("Tanınmayan Sahne, İstanbul") is None
    assert saglayici.rejected == 1
    # İstek atıldı ama sonuç kullanılmadı: "bulamadı"dan farklı bir durum.
    assert saglayici.used == 1


def test_reddedilen_sonuc_basarisizliktan_ayri_sayiliyor():
    saglayici = GeoapifyProvider(
        api_key="k", session=_yanit_veren_oturum("district", 0.9), min_interval=0
    )
    saglayici.forward("bir")
    saglayici.forward("iki")
    assert saglayici.rejected == 2 and saglayici.used == 2


def test_bolge_niyetli_sorgu_servise_hic_gitmiyor():
    """İlçe/şehir sorgusu zaten reddedilecek; kotayı harcamanın anlamı yok."""

    class PatlayanOturum:
        def get(self, *args, **kwargs):  # pragma: no cover - çağrılmamalı
            raise AssertionError("bölge sorgusu için servise gidilmemeli")

    saglayici = GeoapifyProvider(api_key="k", session=PatlayanOturum(), min_interval=0)
    sonuc = geocode_event(
        provider=saglayici,
        address=None,
        venue_name=None,
        district="Zeytinburnu",
        city="İstanbul",
        country_name="Türkiye",
    )
    assert sonuc is None
    assert saglayici.used == 0


def test_saklanan_her_koordinat_address_hassasiyetinde():
    """Bölge koordinatı artık hiç saklanmıyor; tek olası değer 'address'."""
    saglayici = GeoapifyProvider(
        api_key="k", session=_yanit_veren_oturum("building", 0.8), min_interval=0
    )
    sonuc = geocode_event(
        provider=saglayici,
        address="Bir Cad. No:1",
        city="İstanbul",
        country_name="Türkiye",
    )
    assert sonuc is not None and sonuc.precision == "address"
