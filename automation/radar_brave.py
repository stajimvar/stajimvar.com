"""BRAVE SEARCH — YALNIZCA ŞİRKET ALAN ADI KEŞFİ

Brave bize "buraya bak" der. "Bu kesin resmî site" DEMEZ.

Bu sağlayıcı ADAY üretiyor; kanıt şirketin kendi sitesinde aranıyor
(`radar_sirket.kimligi_dogrula`). Arama sonucundaki başlık ve özet tek
başına HIGH güven vermiyor — bayat ya da yanlış olabilir.

BRAVE CANONICAL İLAN KAYNAĞI DEĞİL
----------------------------------
Sonuçlardaki özet metinden ilan açıklaması üretilmiyor, StajımVar
kaydına kopyalanmıyor. Tek kullanım alanı: şirket adı → aday alan adı.

ANAHTAR
-------
`BRAVE_SEARCH_API_KEY` ortam değişkeninden okunuyor. Değeri hiçbir
yerde yazılmıyor: log, hata mesajı, rapor ve depo dosyaları dahil.
Anahtar yoksa sağlayıcı sessizce kullanılamaz duruma geçiyor ve radar
çalışmaya devam ediyor.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field

import requests

UC_NOKTA = "https://api.search.brave.com/res/v1/web/search"
ZAMAN_ASIMI = 10

#: Bir koşuda harcanabilecek toplam sorgu. Kaçak bir döngü faturayı
#: büyütmesin diye sert tavan.
VARSAYILAN_TAVAN = int(os.getenv("MAX_SEARCH_QUERIES_PER_RUN", "100"))


@dataclass
class BraveOlcum:
    """Sağlayıcının maliyet ve sağlık sayaçları. Anahtar YOK, sorgu YOK."""

    sorgu: int = 0
    basarili: int = 0
    sonucsuz: int = 0
    hata: dict[str, int] = field(default_factory=dict)
    tavana_takildi: int = 0

    def hata_yaz(self, tur: str) -> None:
        self.hata[tur] = self.hata.get(tur, 0) + 1

    def ozet(self) -> dict:
        return {
            "sorgu": self.sorgu,
            "basarili": self.basarili,
            "sonucsuz": self.sonucsuz,
            "hata": dict(self.hata),
            "tavana_takildi": self.tavana_takildi,
        }


class BraveArama:
    """`AramaSaglayici` arayüzünün Brave uygulaması."""

    ad = "brave"

    def __init__(self, anahtar: str | None = None, tavan: int | None = None, oturum=None):
        # Anahtar YALNIZCA burada tutuluyor ve hiçbir çıktıya geçmiyor.
        self._anahtar = anahtar if anahtar is not None else os.getenv("BRAVE_SEARCH_API_KEY")
        self.tavan = tavan if tavan is not None else VARSAYILAN_TAVAN
        self.olcum = BraveOlcum()
        self._oturum = oturum or requests
        #: Aynı sorgu bir koşuda ikinci kez ücretlendirilmesin.
        self._onbellek: dict[str, list[dict]] = {}

    @property
    def kullanilabilir(self) -> bool:
        """Anahtar yoksa katman kapalı — radar düşmüyor."""
        return bool(self._anahtar)

    def ara(self, sorgu: str) -> list[dict]:
        """`[{"title","url","aciklama"}]` döndürür.

        Hiçbir hata yukarı taşmıyor: arama katmanı düşerse radar
        devam ediyor ve neden sayaçta görünüyor.
        """
        if not self.kullanilabilir:
            return []
        if sorgu in self._onbellek:
            return self._onbellek[sorgu]
        if self.olcum.sorgu >= self.tavan:
            self.olcum.tavana_takildi += 1
            return []

        self.olcum.sorgu += 1
        try:
            yanit = self._oturum.get(
                UC_NOKTA,
                params={"q": sorgu, "count": 10, "country": "TR", "search_lang": "tr"},
                headers={
                    "Accept": "application/json",
                    "X-Subscription-Token": self._anahtar,
                },
                timeout=ZAMAN_ASIMI,
            )
        except Exception as hata:
            # Hata TÜRÜ yazılıyor, mesajı değil: mesajda adres ya da
            # başlık bilgisi taşınabiliyor.
            self.olcum.hata_yaz(type(hata).__name__)
            return []

        durum = getattr(yanit, "status_code", 0)
        if durum == 429:
            # Yeniden deneme fırtınası YOK: bu tur sessizce vazgeçiyor.
            self.olcum.hata_yaz("429")
            return []
        if durum in (401, 403):
            self.olcum.hata_yaz(str(durum))
            return []
        if durum >= 500:
            self.olcum.hata_yaz("5xx")
            return []
        if durum != 200:
            self.olcum.hata_yaz(f"http_{durum}")
            return []

        try:
            govde = yanit.json()
        except Exception:
            self.olcum.hata_yaz("json")
            return []

        sonuclar = [
            {
                "title": s.get("title") or "",
                "url": s.get("url") or "",
                "aciklama": s.get("description") or "",
            }
            for s in ((govde.get("web") or {}).get("results") or [])
            if s.get("url")
        ]

        if sonuclar:
            self.olcum.basarili += 1
        else:
            self.olcum.sonucsuz += 1

        self._onbellek[sorgu] = sonuclar
        return sonuclar


def saglayici_kur(oturum=None):
    """Ortamdan sağlayıcı kurar; anahtar yoksa kapalı sağlayıcı döner."""
    from automation.radar_sirket import AramaYok

    b = BraveArama(oturum=oturum)
    return b if b.kullanilabilir else AramaYok()
