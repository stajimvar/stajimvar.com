"""Etkinlik konumlarını koordinata çevirir.

NEDEN SAĞLAYICI KATMANI
-----------------------
Geocoding servisleri değişiyor: fiyatlandırma, kullanım şartları ve
saklama izni yıllar içinde farklılaşıyor. Çağrıyı doğrudan içe aktarma
koduna gömmek, sağlayıcı değiştiğinde hattın tamamına dokunmak demek.
Burada tek bir arayüz var; Geoapify onun bir uygulaması.

SAKLAMA İZNİ VE KOTA
-------------------
Geoapify ücretsiz katmanı sonucun saklanmasına izin veriyor ve günlük
istek kotası var. Bu yüzden iki koruma birlikte duruyor: çağrılar
arasında en az bir bekleme (saniyedeki istek sınırı) ve tek koşuda üst
sınır (günlük kota). İkisi de aşıldığında sessizce None dönülüyor —
içe aktarma durmuyor, yalnızca o koşuda pin üretilmiyor.

TOKEN YOKSA ÇAĞRI YOK
---------------------
Anahtar yalnızca ortam değişkeninden okunuyor. Yoksa modül sessizce devre
dışı kalıyor: istek atılmıyor, veritabanına hiçbir şey yazılmıyor, içe
aktarma normal biçimde devam ediyor. Anahtarı koda ya da repoya gömmek
yasak.

SAHTE KONUM ÜRETİLMİYOR — İKİ AŞAMALI KORUMA
--------------------------------------------
Koordinat yazılması için İKİ koşulun birden sağlanması gerekiyor:

1. SORGU adres/mekân seviyesinde kurulabilmeli. Kaydın açık adresi ya da
   mekân adı + şehri varsa bu sağlanıyor. Yalnızca ilçe/şehir varsa sorgu
   tanımı gereği bir bölge merkezi döndüreceği için servise HİÇ
   gidilmiyor — hem yanlış pin üretilmiyor hem kota harcanmıyor.

2. YANIT gerçekten nokta olmalı. Sorguyu adres niyetiyle kurmuş olmamız
   servisin adres bulduğu anlamına gelmiyor: mekân adı tanınmazsa Geoapify
   şehir merkezini döndürebiliyor ve koordinat geçerli görünüyor. Bu yüzden
   yanıttaki `result_type` ve `rank.confidence` okunuyor; yalnızca POI,
   bina ve sokak seviyesi kabul ediliyor (bkz. konum_yeterince_kesin).

Sonuç: saklanan her koordinat 'address' hassasiyetinde ve bir noktayı
gösteriyor. Reddedilen kayıt listede kalıyor, yalnızca pini olmuyor.

Kaynakta hiçbir yer bilgisi yoksa hiçbir şey uydurulmuyor: None dönüyor.
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass
from typing import Protocol

import requests


GEOAPIFY_KEY_ENV = "GEOAPIFY_API_KEY"

GEOAPIFY_URL = "https://api.geoapify.com/v1/geocode/search"

#: Ücretsiz katman saniyede ~5 istek kabul ediyor; 0.25 sn ile altında kalıyoruz.
VARSAYILAN_ARALIK_SN = 0.25

#: Tek koşuda atılacak en fazla istek. Günlük kotayı tek gecede tüketmemek için.
VARSAYILAN_KOTA = 2000

#: Ağ yanıtı beklerken içe aktarmayı kilitlememek için.
VARSAYILAN_ZAMAN_ASIMI_SN = 15.0

#: Pin üretmeye yetecek kadar KESİN sayılan Geoapify sonuç türleri.
#:
#: amenity  = POI (müze, sahne, kültür merkezi) — aradığımız şey çoğunlukla bu
#: building = bina
#: street   = sokak/cadde; açık adreste kapı numarası tutmazsa buraya düşüyor
KESIN_SONUC_TURLERI = frozenset({"amenity", "building", "street"})

#: Açıkça BÖLGE olan ve reddedilen türler. Listede olmayan ("unknown" gibi)
#: her tür de reddediliyor: tanımadığımız bir türü kesin saymak, bilmediğimiz
#: bir şeyi biliyormuş gibi davranmak olur.
BOLGE_SONUC_TURLERI = frozenset(
    {"suburb", "district", "postcode", "city", "county", "state", "country", "unknown"}
)

#: Geoapify güven skoru 0–1. Altında kalan eşleşme "buldum ama emin değilim"
#: demek; pin yanlış binayı gösterebilir.
EN_AZ_GUVEN = 0.5


def konum_yeterince_kesin(result_type: str | None, confidence: float | None) -> bool:
    """Sonuç bir NOKTA mı, yoksa bölge merkezi mi.

    NEDEN SERVİSİN SÖYLEDİĞİNE BAKIYORUZ
    ------------------------------------
    Sorguyu adres niyetiyle kurmuş olmamız, servisin adres bulduğu anlamına
    gelmiyor. "Bir Sahne, İstanbul" diye sorduğumuzda Geoapify mekânı
    bulamazsa İSTANBUL'un merkezini döndürebiliyor ve koordinat gayet
    geçerli görünüyor. Onu pin olarak çizmek, öğrenciyi şehir merkezine
    yollamak demek.

    Bu yüzden karar sorgunun niyetine değil, yanıttaki `result_type` ve
    `rank.confidence` alanlarına bakıyor.

    BİLİNMEYEN TÜR REDDEDİLİYOR
    ---------------------------
    Beyaz liste kullanılıyor: yalnızca kesin olduğunu bildiğimiz türler
    geçiyor. Servis yarın yeni bir tür eklerse o da reddedilir — sessizce
    kabul edilip yanlış pin üretmesindense.
    """
    if result_type is None or result_type.strip().lower() not in KESIN_SONUC_TURLERI:
        return False
    if confidence is None:
        return False
    try:
        return float(confidence) >= EN_AZ_GUVEN
    except (TypeError, ValueError):
        return False


@dataclass(frozen=True)
class GeocodeResult:
    latitude: float
    longitude: float
    #: 'address' | 'locality' | 'admin2' | 'admin1' — migration'daki kısıtla aynı.
    precision: str
    #: Servise gönderilen tam metin; sonucu sonradan denetleyebilmek için.
    query: str
    provider: str


class GeocodeProvider(Protocol):
    """Sağlayıcı arayüzü. Yeni sağlayıcı bunu uygular, çağıran taraf değişmez."""

    name: str

    def enabled(self) -> bool: ...

    def forward(self, query: str, *, country: str | None = None) -> tuple[float, float] | None: ...


class GeoapifyProvider:
    """Geoapify Geocoding — ücretsiz katman, sonucu saklamaya izinli.

    ANAHTAR YALNIZCA SUNUCUDA
    -------------------------
    `GEOAPIFY_API_KEY` içe aktarma sürecinde okunuyor ve istemciye HİÇ
    gitmiyor. Tarayıcıya giden tek harita kaynağı OpenFreeMap'in açık
    stili; o anahtarsız çalışıyor.

    ÜÇ KORUMA BİRLİKTE
    ------------------
    Ücretsiz katmanın hem saniyelik hem günlük sınırı var; ayrıca ağ
    yanıtı gecikirse içe aktarmanın tamamı kilitlenmemeli:

      aralık      — iki çağrı arasında en az `VARSAYILAN_ARALIK_SN`
      kota        — tek koşuda en fazla `VARSAYILAN_KOTA` istek
      zaman aşımı — tek istek `VARSAYILAN_ZAMAN_ASIMI_SN` içinde bitmezse bırak

    Üçünde de davranış aynı: sessizce None. İçe aktarma durmuyor, etkinlik
    yazılmaya devam ediyor, yalnızca o kayıt pinsiz kalıyor. Kotanın
    aşılması bir hata değil, beklenen ve zararsız bir durum.
    """

    name = "geoapify"

    def __init__(
        self,
        api_key: str | None = None,
        session: requests.Session | None = None,
        *,
        min_interval: float = VARSAYILAN_ARALIK_SN,
        quota: int = VARSAYILAN_KOTA,
        timeout: float = VARSAYILAN_ZAMAN_ASIMI_SN,
        clock=time.monotonic,
        sleep=time.sleep,
    ) -> None:
        self._key = api_key if api_key is not None else os.environ.get(GEOAPIFY_KEY_ENV, "").strip()
        self._session = session or requests.Session()
        self._min_interval = max(0.0, min_interval)
        self._quota = max(0, quota)
        self._timeout = timeout
        self._clock = clock
        self._sleep = sleep
        self._used = 0
        self._rejected = 0
        self._last_call: float | None = None

    def enabled(self) -> bool:
        return bool(self._key)

    @property
    def used(self) -> int:
        """Bu koşuda atılan istek sayısı — raporlamak ve sınamak için."""
        return self._used

    @property
    def rejected(self) -> int:
        """Servis yanıt verdi ama sonuç bölge merkeziydi: kaç kez.

        Başarısızlıktan AYRI tutuluyor. "Bulamadı" ile "buldu ama şehir
        merkezini gösterdi" farklı sorunlar; ikincisi kaynak verisinin
        mekân adının tanınmadığını söylüyor.
        """
        return self._rejected

    def _bekle(self) -> None:
        """Saniyelik sınırın altında kalmak için gerekiyorsa uyu."""
        if self._last_call is None or self._min_interval <= 0:
            return
        gecen = self._clock() - self._last_call
        if gecen < self._min_interval:
            self._sleep(self._min_interval - gecen)

    def forward(self, query: str, *, country: str | None = None) -> tuple[float, float] | None:
        if not self.enabled():
            return None
        if self._used >= self._quota:
            # Kota doldu: bu koşuda artık istek yok, içe aktarma sürüyor.
            return None

        params = {
            "text": query,
            "apiKey": self._key,
            "limit": 1,
            "format": "geojson",
        }
        if country:
            # Aynı adın başka ülkedeki eşini elemek için.
            params["filter"] = f"countrycode:{country.lower()}"

        self._bekle()
        self._used += 1
        try:
            response = self._session.get(GEOAPIFY_URL, params=params, timeout=self._timeout)
            response.raise_for_status()
            payload = response.json()
        except (requests.RequestException, ValueError):
            # Ağ, zaman aşımı, kota reddi ya da bozuk biçim: hepsi sessiz.
            return None
        finally:
            self._last_call = self._clock()

        features = payload.get("features") or []
        if not features:
            return None

        ozellik = features[0] or {}
        nitelik = ozellik.get("properties") or {}
        rank = nitelik.get("rank") or {}

        # Servisin ne bulduğuna bak: bölge merkezi pin olamaz.
        if not konum_yeterince_kesin(nitelik.get("result_type"), rank.get("confidence")):
            self._rejected += 1
            return None

        coords = ((ozellik.get("geometry") or {}).get("coordinates")) or []
        if len(coords) != 2:
            return None

        lon, lat = coords[0], coords[1]
        try:
            return float(lat), float(lon)
        except (TypeError, ValueError):
            return None


class NullProvider:
    """Anahtar yokken kullanılan sağlayıcı: hiçbir şey yapmaz.

    Çağıran tarafta `if provider:` kontrolü gerekmesin diye var; akış tek
    yoldan ilerliyor ve token yokluğu bir hata değil, beklenen durum.
    """

    name = "none"

    def enabled(self) -> bool:
        return False

    def forward(self, query: str, *, country: str | None = None) -> tuple[float, float] | None:
        return None


def default_provider() -> GeocodeProvider:
    """Ortamda anahtar varsa Geoapify, yoksa devre dışı sağlayıcı."""
    provider = GeoapifyProvider()
    return provider if provider.enabled() else NullProvider()


def build_query(
    *,
    address: str | None,
    venue_name: str | None,
    district: str | None,
    city: str | None,
    country_name: str | None,
) -> tuple[str, str] | None:
    """Sorgu metnini ve hassasiyetini üretir.

    SIRALAMA BİLİNÇLİ

    1. Açık adres → 'address'. Tek gerçek nokta konumu bu.
    2. Adres yoksa mekân adı + şehir → yine 'address' denemesi; mekân adı
       geocoding'de bir binaya çözülebiliyor ("Zorlu PSM, İstanbul").
    3. O da yoksa ilçe + şehir → 'admin2' (BÖLGE).
    4. Yalnızca şehir varsa → 'admin1' (BÖLGE).
    5. Hiçbiri yoksa → None. Uydurma yok.

    3 ve 4 birer bölge koordinatı üretiyor; hassasiyet bu yüzden
    kaydediliyor ve arayüz onları nokta pini olarak çizmiyor.
    """

    def temiz(value: str | None) -> str:
        return (value or "").strip()

    adres = temiz(address)
    mekan = temiz(venue_name)
    ilce = temiz(district)
    sehir = temiz(city)
    ulke = temiz(country_name)

    if adres:
        parcalar = [adres, ilce, sehir, ulke]
        return ", ".join(p for p in parcalar if p), "address"

    if mekan and sehir:
        parcalar = [mekan, ilce, sehir, ulke]
        return ", ".join(p for p in parcalar if p), "address"

    if ilce and sehir:
        parcalar = [ilce, sehir, ulke]
        return ", ".join(p for p in parcalar if p), "admin2"

    if sehir:
        parcalar = [sehir, ulke]
        return ", ".join(p for p in parcalar if p), "admin1"

    return None


def geocode_event(
    *,
    provider: GeocodeProvider,
    address: str | None = None,
    venue_name: str | None = None,
    district: str | None = None,
    city: str | None = None,
    country_name: str | None = None,
    country_code: str | None = None,
) -> GeocodeResult | None:
    """Tek bir etkinliği koordinata çevirir; başarısızlıkta None.

    None dönmesi bir hata değil: etkinlik listede kalmaya devam ediyor,
    yalnızca haritada pini olmuyor.
    """
    if not provider.enabled():
        return None

    hazir = build_query(
        address=address,
        venue_name=venue_name,
        district=district,
        city=city,
        country_name=country_name,
    )
    if hazir is None:
        return None

    query, precision = hazir

    """
    BÖLGE NİYETLİ SORGU SERVİSE HİÇ GİTMİYOR

    'admin1'/'admin2' sorguları tanımı gereği bir bölge merkezi döndürür ve
    o sonuç zaten reddedilecek (bkz. konum_yeterince_kesin). Yine de sormak
    ücretsiz kotayı boşa harcamak olurdu.

    Sonuç: koordinat YALNIZCA adres/mekân seviyesinde bir sorgudan ve
    yalnızca servis de nokta bulduğunu söylediğinde yazılıyor.
    """
    if precision != "address":
        return None

    koordinat = provider.forward(query, country=country_code)
    if koordinat is None:
        return None

    lat, lon = koordinat
    # Dünya dışı koordinat servisin bozuk yanıtı demek; saklanmıyor.
    if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lon <= 180.0):
        return None

    return GeocodeResult(
        latitude=lat,
        longitude=lon,
        precision=precision,
        query=query,
        provider=provider.name,
    )
