"""KEŞİF SİNYALLERİNİN KALICI DEPOSU

NEDEN VAR
---------
İlk LinkedIn koşusu 359 tekil sinyal buldu ve hiçbirini yazmadı: koşucu
yalnız toplamları rapora basıyordu. Koşu bitince sinyaller kayboldu ve
aynı ilanları yeniden bulmak için ikinci kez arama parası harcamak
gerekti.

Keşif pahalı, çözüm ondan da pahalı. İkisi ayrı koşulara bölünebilsin
diye sinyal `job_discovery_signals` tablosunda duruyor; kota ortada
biterse çözülmüş sinyaller korunuyor ve sonraki koşu kaldığı yerden
devam ediyor.

Bu tablo canonical `listings` DEĞİL: burada duran şey şüphe, kanıt
değil. Yayın kararı hâlâ resmî kaynaktan geliyor.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

import requests

ZAMAN_ASIMI = 20

#: Tabloda tutulan çözüm durumları (migration'daki check kısıtıyla aynı).
COZULMEMIS = ("new", "company_resolved", "career_source_found")


class DepoYok(RuntimeError):
    """Servis anahtarı yok — depo kullanılamıyor."""


@dataclass
class Sinyal:
    """Depodan okunan bir keşif sinyali."""

    id: str
    source: str
    source_url: str
    sirket: str
    sirket_normal: str
    baslik: str
    konum: str | None
    durum: str
    resolved_ats: str | None = None
    resolved_company_domain: str | None = None


def _baglanti() -> tuple[str, dict]:
    url = os.getenv("SUPABASE_URL")
    anahtar = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not anahtar:
        raise DepoYok("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY yok")
    return url.rstrip("/"), {
        "apikey": anahtar,
        "Authorization": f"Bearer {anahtar}",
        "Content-Type": "application/json",
    }


def sinyalleri_yaz(kayitlar: list[dict], source: str = "linkedin") -> dict:
    """Sinyalleri yazar; aynı adres ikinci kez satır açmıyor.

    `on_conflict` ile (source, source_url) tekilliği kullanılıyor:
    yeniden keşfedilen bir sinyal `last_seen_at` alıyor, çözüm durumu
    EZİLMİYOR — aksi hâlde her keşif turu, önceki turda pahalıya
    çözülmüş sinyalleri sıfırlardı.
    """
    if not kayitlar:
        return {"yazilan": 0}
    url, basliklar = _baglanti()
    govde = [
        {
            "source": source,
            "source_url": k["source_url"],
            "company_name_raw": k["sirket"],
            "company_name_normalized": k["sirket_normal"],
            "title_raw": k["baslik"],
            "location_raw": k.get("konum"),
        }
        for k in kayitlar
    ]
    yanit = requests.post(
        f"{url}/rest/v1/job_discovery_signals",
        params={"on_conflict": "source,source_url"},
        headers={**basliklar, "Prefer": "resolution=merge-duplicates,return=minimal"},
        json=govde,
        timeout=ZAMAN_ASIMI,
    )
    yanit.raise_for_status()
    return {"yazilan": len(govde)}


def sinyalleri_oku(source: str = "linkedin", durumlar: tuple[str, ...] = COZULMEMIS,
                   sinir: int = 1000) -> list[Sinyal]:
    """Çözülmemiş sinyalleri okur."""
    url, basliklar = _baglanti()
    yanit = requests.get(
        f"{url}/rest/v1/job_discovery_signals",
        params={
            "select": ("id,source,source_url,company_name_raw,company_name_normalized,"
                       "title_raw,location_raw,resolution_status,resolved_ats,"
                       "resolved_company_domain"),
            "source": f"eq.{source}",
            "resolution_status": f"in.({','.join(durumlar)})",
            "limit": str(sinir),
        },
        headers=basliklar,
        timeout=ZAMAN_ASIMI,
    )
    yanit.raise_for_status()
    return [
        Sinyal(
            id=s["id"], source=s["source"], source_url=s["source_url"],
            sirket=s["company_name_raw"], sirket_normal=s["company_name_normalized"],
            baslik=s["title_raw"], konum=s.get("location_raw"),
            durum=s["resolution_status"], resolved_ats=s.get("resolved_ats"),
            resolved_company_domain=s.get("resolved_company_domain"),
        )
        for s in yanit.json()
    ]


def cozumu_yaz(sinyal_id: str, **alanlar) -> None:
    """Bir sinyalin çözüm durumunu günceller.

    Çözüm koşusu ortada kesilse bile o ana kadar harcanan arama parası
    burada saklı kalıyor.
    """
    url, basliklar = _baglanti()
    yanit = requests.patch(
        f"{url}/rest/v1/job_discovery_signals",
        params={"id": f"eq.{sinyal_id}"},
        headers={**basliklar, "Prefer": "return=minimal"},
        json=alanlar,
        timeout=ZAMAN_ASIMI,
    )
    yanit.raise_for_status()


def durum_dagilimi(source: str = "linkedin") -> dict[str, int]:
    """Depodaki sinyallerin durum dağılımı — huni raporunun temeli."""
    url, basliklar = _baglanti()
    yanit = requests.get(
        f"{url}/rest/v1/job_discovery_signals",
        params={"select": "resolution_status", "source": f"eq.{source}", "limit": "5000"},
        headers=basliklar,
        timeout=ZAMAN_ASIMI,
    )
    yanit.raise_for_status()
    dagilim: dict[str, int] = {}
    for s in yanit.json():
        d = s["resolution_status"]
        dagilim[d] = dagilim.get(d, 0) + 1
    return dagilim
