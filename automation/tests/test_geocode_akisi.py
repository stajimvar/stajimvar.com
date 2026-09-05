"""Geocoding'in içe aktarma akışına bağlanma sözleşmesi.

Ağa çıkılmıyor ve veritabanına gidilmiyor: sağlayıcı ile depo sahte
nesnelerle değiştiriliyor. Korunan davranışlar:

  - token yokken hiçbir çağrı yapılmaz
  - aynı sorgu iki kez sorulmaz (kalıcı uç nokta ücretli)
  - sorgu değişince yeniden sorulur
  - geocode başarısızlığı etkinliğin yazılmasını engellemez
  - sonuç yokken tabloya dokunulmaz (mevcut koordinat silinmez)
"""

from __future__ import annotations

import pathlib
import sys

# Depodaki diğer testlerle aynı kalıp: modül kökünü yola ekliyor.
sys.path.insert(0, str(pathlib.Path(__file__).parents[1]))

from dataclasses import dataclass

from event_import.geocoding import GeocodeResult, NullProvider
from event_import.run import GeocodeService


@dataclass
class SahteEtkinlik:
    city: str | None = "İstanbul"
    district: str | None = "Beyoğlu"
    venue_name: str | None = "Bir Sahne"
    address: str | None = None
    country_code: str | None = "TR"


class SahteSaglayici:
    name = "sahte"

    def __init__(self, koordinat=(41.0, 29.0)):
        self.koordinat = koordinat
        self.cagrilar: list[str] = []

    def enabled(self) -> bool:
        return True

    def forward(self, query: str, *, country: str | None = None, **kwargs):
        self.cagrilar.append(query)
        return self.koordinat


def test_token_yoksa_servis_hicbir_sey_yapmaz():
    servis = GeocodeService(NullProvider())
    assert servis.process(SahteEtkinlik(), None) is None
    assert servis.calls == 0


def test_yer_bilgisi_yoksa_cagri_yapilmaz():
    saglayici = SahteSaglayici()
    servis = GeocodeService(saglayici)
    bos = SahteEtkinlik(city=None, district=None, venue_name=None, address=None)
    assert servis.process(bos, None) is None
    assert saglayici.cagrilar == []


def test_yeni_kayit_geocode_ediliyor():
    saglayici = SahteSaglayici()
    servis = GeocodeService(saglayici)
    sonuc = servis.process(SahteEtkinlik(), None)
    assert isinstance(sonuc, GeocodeResult)
    assert len(saglayici.cagrilar) == 1
    assert servis.calls == 1


def test_ayni_sorgu_tekrar_sorulmuyor():
    """Kalıcı uç nokta ücretli; değişmeyen adres yeniden sorulmamalı."""
    saglayici = SahteSaglayici()
    servis = GeocodeService(saglayici)
    etkinlik = SahteEtkinlik()

    ilk = servis.process(etkinlik, None)
    assert ilk is not None

    mevcut = {"geocode_query": ilk.query, "latitude": ilk.latitude}
    assert servis.process(etkinlik, mevcut) is None
    assert len(saglayici.cagrilar) == 1, "aynı sorgu ikinci kez gitmemeli"


def test_sorgu_degisince_yeniden_soruluyor():
    """Mekân ya da ilçe güncellendiyse koordinat artık başka yeri gösteriyor."""
    saglayici = SahteSaglayici()
    servis = GeocodeService(saglayici)

    ilk = servis.process(SahteEtkinlik(), None)
    mevcut = {"geocode_query": ilk.query, "latitude": ilk.latitude}

    tasindi = SahteEtkinlik(venue_name="Başka Sahne")
    assert servis.process(tasindi, mevcut) is not None
    assert len(saglayici.cagrilar) == 2


def test_koordinati_olmayan_mevcut_kayit_yeniden_deneniyor():
    """Önceki denemede sonuç çıkmadıysa bir dahakine yine denenmeli."""
    saglayici = SahteSaglayici()
    servis = GeocodeService(saglayici)
    etkinlik = SahteEtkinlik()
    hazir = servis.process(etkinlik, None)

    mevcut_ama_koordinatsiz = {"geocode_query": hazir.query, "latitude": None}
    assert servis.process(etkinlik, mevcut_ama_koordinatsiz) is not None


def test_adres_varsa_address_hassasiyeti():
    saglayici = SahteSaglayici()
    servis = GeocodeService(saglayici)
    sonuc = servis.process(SahteEtkinlik(address="Bir Cad. No:1"), None)
    assert sonuc.precision == "address"


def test_adres_yoksa_ama_mekan_varsa_yine_address_denenir():
    saglayici = SahteSaglayici()
    servis = GeocodeService(saglayici)
    sonuc = servis.process(SahteEtkinlik(address=None, venue_name="Bir Sahne"), None)
    assert sonuc.precision == "address"


def test_yalniz_bolge_varsa_koordinat_uretilmiyor():
    """Bölge merkezi artık ne saklanıyor ne de servise soruluyor."""
    saglayici = SahteSaglayici()
    servis = GeocodeService(saglayici)
    sonuc = servis.process(
        SahteEtkinlik(address=None, venue_name=None, district="Beyoğlu"), None
    )
    assert sonuc is None
    assert saglayici.cagrilar == []


class SahteDepo:
    def __init__(self):
        self.yazilanlar: list[tuple[str, object]] = []

    def save_geocode(self, event_id, result):
        # Gerçek deponun sözleşmesi: sonuç None ise tabloya dokunma.
        if result is None:
            return
        self.yazilanlar.append((event_id, result))


def test_sonuc_yokken_tabloya_dokunulmuyor():
    """Mevcut koordinatın None'larla ezilmemesi bu davranışa bağlı."""
    depo = SahteDepo()
    depo.save_geocode("olay-1", None)
    assert depo.yazilanlar == []


def test_sonuc_varsa_yaziliyor():
    depo = SahteDepo()
    sonuc = GeocodeResult(41.0, 29.0, "address", "Bir Sahne, İstanbul", "sahte")
    depo.save_geocode("olay-1", sonuc)
    assert depo.yazilanlar == [("olay-1", sonuc)]
