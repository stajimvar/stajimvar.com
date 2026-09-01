"""KAYNAK BAŞLIĞI GERİYE DOLDURMA

Yayındaki dış kaynaklı ilanların `source_title` alanını şirketin KENDİ
kaynağından yeniden okuyarak dolduruyor.

NEDEN GEREKLİ
-------------
`translate_job` adaptör çıktısındaki başlığın üzerine yazıyordu; orijinal
hiçbir yere ulaşmadı. Ölçüldü: yayındaki 9 ilanın 9'unda da şirketin
resmî ilan adı kayıptı — `listings.title`, `raw_listings.title` ve
`raw` JSON'unun hepsinde yalnız çeviri vardı.

ARAMA YOK, TAHMİN YOK
---------------------
Yalnız kayıtlı kaynakların MEVCUT adaptörleri çağrılıyor. Bir ilan
kaynakta bulunamazsa alan NULL bırakılıyor ve raporlanıyor; uydurulmuyor.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections import Counter

import requests

from baslik_gorunumu import ACIK_KARSILIKLAR, _turkce_mi, gorunen_baslik

ZAMAN_ASIMI = 25


def _scraper():
    """`scraper.py`'ı ÇEVİRİSİZ kullanmak için yükler."""
    import pathlib

    kok = str(pathlib.Path(__file__).resolve().parent)
    if kok not in sys.path:
        sys.path.insert(0, kok)
    import scraper  # noqa: PLC0415

    return scraper


def _kaynaklari_oku() -> list[dict]:
    import pathlib

    yol = pathlib.Path(__file__).with_name("sources.json")
    ham = json.loads(yol.read_text(encoding="utf-8"))
    return ham if isinstance(ham, list) else ham.get("sources", [])


def _baglanti() -> tuple[str, dict]:
    url = os.getenv("SUPABASE_URL")
    anahtar = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not anahtar:
        raise SystemExit("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY yok")
    return url.rstrip("/"), {
        "apikey": anahtar,
        "Authorization": f"Bearer {anahtar}",
        "Content-Type": "application/json",
    }


def _ilanlari_oku(url: str, basliklar: dict, durum: str) -> list[dict]:
    y = requests.get(
        f"{url}/rest/v1/listings",
        params={
            "select": "id,title,source_title,canonical_url,apply_url,source_url,origin,"
                      "application_method,companies(name)",
            "status": f"eq.{durum}",
        },
        headers=basliklar,
        timeout=ZAMAN_ASIMI,
    )
    y.raise_for_status()
    return y.json()


def _kaynak_basliklari(sayac: Counter) -> dict[str, str]:
    """Kayıtlı kaynakların ADAPTÖRÜNDEN adres → kaynak başlığı.

    ÇEVİRİ ÇAĞRILMIYOR: `translate_job` atlanıyor, adaptörün ham çıktısı
    okunuyor. Bu betiğin bütün amacı zaten o ham değeri kurtarmak.
    """
    scraper = _scraper()
    harita: dict[str, str] = {}
    for config in _kaynaklari_oku():
        tur = (config.get("type") or "").lower()
        adaptor = getattr(scraper, tur, None)
        if adaptor is None or not config.get("enabled", True):
            sayac[f"kaynak_atlandi:{tur}"] += 1
            continue
        try:
            for job in adaptor(config):
                if job.source_url and job.title:
                    harita[scraper.canonical(job.source_url)] = job.title
            sayac[f"kaynak_ok:{tur}"] += 1
        except Exception as hata:
            sayac[f"kaynak_hata:{tur}:{type(hata).__name__}"] += 1
    return harita


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Kaynak başlığı geriye doldurma")
    ap.add_argument("--durum", default="published")
    ap.add_argument("--yaz", action="store_true", help="Veritabanına YAZ")
    args = ap.parse_args(argv)

    url, basliklar = _baglanti()
    ilanlar = _ilanlari_oku(url, basliklar, args.durum)
    sayac: Counter = Counter()
    scraper = _scraper()

    # ŞİRKETİN KENDİ İLANI PROVENANCE MODELİNE GİRMİYOR
    #
    # Başlığı şirket StajımVar'da kendisi yazıyorsa `title` zaten
    # canonical; oraya bir "kaynak başlığı" uydurmak yanlış olurdu.
    dis_kaynakli = [i for i in ilanlar if (i.get("application_method") or "") == "external"]
    sayac["toplam"] = len(ilanlar)
    sayac["dis_kaynakli"] = len(dis_kaynakli)
    sayac["dogrudan_ilan"] = len(ilanlar) - len(dis_kaynakli)

    kaynak_haritasi = _kaynak_basliklari(sayac)
    print(f"kaynaktan okunan ilan adresi: {len(kaynak_haritasi)}", file=sys.stderr)

    rapor = []
    for ilan in dis_kaynakli:
        adaylar = [ilan.get("source_url"), ilan.get("canonical_url"), ilan.get("apply_url")]
        kaynak_basligi = None
        for aday in adaylar:
            if not aday:
                continue
            try:
                anahtar = scraper.canonical(aday)
            except Exception:
                continue
            if anahtar in kaynak_haritasi:
                kaynak_basligi = kaynak_haritasi[anahtar]
                break

        satir = {
            "id": ilan["id"],
            "sirket": (ilan.get("companies") or {}).get("name"),
            "gorunen_baslik": ilan["title"],
            "kaynak_basligi": kaynak_basligi,
            "onceki_source_title": ilan.get("source_title"),
        }
        if kaynak_basligi is None:
            sayac["kaynakta_bulunamadi"] += 1
        elif kaynak_basligi == ilan["title"]:
            sayac["ayni"] += 1
        else:
            sayac["farkli"] += 1
        rapor.append(satir)

        # GÖRÜNEN BAŞLIK POLİTİKANIN SONUCU
        #
        # Elle "şunu şuna çevir" denmiyor: kaynak başlığı deterministik
        # görünüm katmanından geçiriliyor. Mevcut başlık zaten iyi bir
        # Türkçeyse dokunulmuyor — yalnız açık bir karşılık varsa ya da
        # mevcut başlık İngilizce kalmışsa düzeltiliyor.
        yeni_baslik = None
        if kaynak_basligi:
            onerilen = gorunen_baslik(kaynak_basligi)
            acik_karsilik = ACIK_KARSILIKLAR.get(kaynak_basligi.strip().casefold())
            mevcut_turkce = _turkce_mi(ilan["title"])
            if onerilen and onerilen != ilan["title"] and (acik_karsilik or not mevcut_turkce):
                yeni_baslik = onerilen
                sayac["baslik_duzeltildi"] += 1
        satir["onerilen_baslik"] = yeni_baslik

        if args.yaz and kaynak_basligi:
            y = requests.patch(
                f"{url}/rest/v1/listings",
                params={"id": f"eq.{ilan['id']}"},
                headers={**basliklar, "Prefer": "return=minimal"},
                json={
                    "source_title": kaynak_basligi,
                    **({"title": yeni_baslik} if yeni_baslik else {}),
                },
                timeout=ZAMAN_ASIMI,
            )
            y.raise_for_status()
            sayac["yazildi"] += 1

    cikti = {"sayac": dict(sayac.most_common()), "ilanlar": rapor, "yazma_modu": args.yaz}
    with open("kaynak-basligi-rapor.json", "w", encoding="utf-8") as f:
        json.dump(cikti, f, ensure_ascii=False, indent=2)
    print(json.dumps(cikti, ensure_ascii=False, indent=2)[:4000])
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
