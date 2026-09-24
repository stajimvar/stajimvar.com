"""Kampüsüm verisi: üniversitelerin RESMÎ kaynağından yemek menüsü ve duyurular.

Profil sayfasındaki "Kampüsüm" paneli bu betiğin yazdığı tablolardan
besleniyor (göç 20261108010000). Hangi okulun hangi kaynaktan okunacağı
kodda DEĞİL, `universite_kaynaklari` tablosunda: yeni bir üniversite
eklemek bir satır eklemek demek; ayrıştırıcı zaten varsa kod değişmiyor.

Kurallar:
  * Kaynak adresi üniversitenin resmî alan adında olmak zorunda (tabloda
    tetikleyici zorluyor; burada da tekrar denetleniyor, çünkü kaynak
    sayfanın verdiği bağlantılar — PDF, duyuru — başka yere gidebilir).
  * robots.txt kapalıysa istek atılmıyor.
  * Menü satırı yalnız kendi tarihiyle yazılıyor; tarih ile sütunun gün
    adı uyuşmazsa hücre ATLANIYOR (yanlış güne yemek yazmaktansa boş).
  * Başarısız kaynak eski veriyi SİLMİYOR; hatası `son_hata`ya yazılıyor.

Çalıştırma:
    python -m automation.kampus_verisi            # yaz
    python -m automation.kampus_verisi --kuru     # yalnız ekrana dök
"""
from __future__ import annotations

import argparse
import html
import io
import json
import os
import re
import sys
import time
from dataclasses import dataclass
from datetime import UTC, date, datetime
from typing import Any, Callable
from urllib.parse import urlsplit
from urllib.robotparser import RobotFileParser
from zoneinfo import ZoneInfo

import requests

ISTANBUL = ZoneInfo("Europe/Istanbul")
HEADERS = {"User-Agent": "StajimVarBot/1.0 (+https://stajimvar.com)"}
ZAMAN_ASIMI = 30

GUNLER = ["PAZARTESİ", "SALI", "ÇARŞAMBA", "PERŞEMBE", "CUMA", "CUMARTESİ", "PAZAR"]
TARIH = re.compile(r"^(\d{2})[./](\d{2})[./](\d{4})$")
KALORI = re.compile(r"^(\d{2,4})\s*kcal$", re.I)


# ------------------------------------------------------------------ yardımcılar


def bugun() -> date:
    return datetime.now(ISTANBUL).date()


def ay_ileri(ay_basi: date, kac: int) -> date:
    """Ayın ilk gününden `kac` ay sonraki ayın ilk günü."""
    toplam = ay_basi.year * 12 + ay_basi.month - 1 + kac
    return date(toplam // 12, toplam % 12 + 1, 1)


def resmi_alanda(url: str, alan: str) -> bool:
    """https ve ana bilgisayar alan adının kendisi ya da alt alan adı mı."""
    p = urlsplit(url)
    host = (p.hostname or "").lower()
    return p.scheme == "https" and (host == alan or host.endswith("." + alan))


_robots: dict[str, RobotFileParser] = {}


def izinli(url: str) -> bool:
    p = urlsplit(url)
    rp = _robots.get(p.netloc)
    if rp is None:
        rp = RobotFileParser()
        try:
            r = requests.get(f"{p.scheme}://{p.netloc}/robots.txt", headers=HEADERS, timeout=10)
            rp.parse(r.text.splitlines() if r.status_code == 200 else [])
        except requests.RequestException:
            rp.parse([])
        _robots[p.netloc] = rp
    return rp.can_fetch(HEADERS["User-Agent"], url)


def getir(url: str, alan: str, **params: Any) -> requests.Response:
    if not resmi_alanda(url, alan):
        raise ValueError(f"resmî alan adında değil: {url}")
    if not izinli(url):
        raise PermissionError(f"robots.txt izin vermiyor: {url}")
    r = requests.get(url, params=params or None, headers=HEADERS, timeout=ZAMAN_ASIMI)
    r.raise_for_status()
    time.sleep(1)
    return r


def metin(s: str) -> str:
    """HTML varlıklarını çöz, etiketleri at, boşlukları tekle."""
    s = re.sub(r"<[^>]+>", " ", html.unescape(s or ""))
    return re.sub(r"\s+", " ", s).strip()


# ------------------------------------------------------------ PDF menü ayrıştırma


@dataclass(frozen=True)
class MenuGunu:
    tarih: date
    kalori: int | None
    yemekler: tuple[str, ...]


def menu_pdf_ayristir(pdf: bytes) -> tuple[list[MenuGunu], list[str]]:
    """Sütunlu aylık menü PDF'i → günler.

    Düzen: üstte gün adları (PAZARTESİ…CUMA) sütun başlığı; her sütunda
    alt alta hücreler: tarih, "NNN kcal", yemekler. Kelimeler x
    konumlarına göre en yakın sütun başlığına atanıyor, sütun içinde y
    sırasıyla okunuyor; her tarih yeni bir hücre başlatıyor.

    İkinci değer uyarılar: tarihi sütunun gününe uymayan hücreler
    atlanıyor ve burada anlatılıyor.
    """
    import pdfplumber

    gunler: list[MenuGunu] = []
    uyarilar: list[str] = []
    with pdfplumber.open(io.BytesIO(pdf)) as belge:
        for sayfa in belge.pages:
            kelimeler = sayfa.extract_words(keep_blank_chars=True, x_tolerance=2, y_tolerance=2)
            basliklar = [
                (GUNLER.index(k["text"].strip().upper()), (k["x0"] + k["x1"]) / 2, k["bottom"])
                for k in kelimeler
                if k["text"].strip().upper() in GUNLER
            ]
            if len(basliklar) < 3:
                continue
            baslik_alti = max(b[2] for b in basliklar)
            sutunlar: dict[int, list[tuple[float, str]]] = {b[0]: [] for b in basliklar}
            for k in kelimeler:
                if k["top"] <= baslik_alti:
                    continue
                orta = (k["x0"] + k["x1"]) / 2
                gun, _, _ = min(basliklar, key=lambda b: abs(b[1] - orta))
                sutunlar[gun].append((k["top"], k["text"].strip()))

            for gun, satirlar in sutunlar.items():
                hucre: dict[str, Any] | None = None

                def kapat() -> None:
                    if hucre and hucre["yemekler"]:
                        if hucre["tarih"].weekday() != gun:
                            uyarilar.append(
                                f"{hucre['tarih']} {GUNLER[gun]} sütununda, gün uyuşmuyor; atlandı"
                            )
                        else:
                            gunler.append(MenuGunu(hucre["tarih"], hucre["kalori"], tuple(hucre["yemekler"])))

                for _, yazi in sorted(satirlar):
                    t = TARIH.match(yazi)
                    if t:
                        kapat()
                        hucre = {
                            "tarih": date(int(t.group(3)), int(t.group(2)), int(t.group(1))),
                            "kalori": None,
                            "yemekler": [],
                        }
                        continue
                    if hucre is None or not yazi:
                        continue
                    kc = KALORI.match(re.sub(r"\s+", " ", yazi))
                    if kc and hucre["kalori"] is None and not hucre["yemekler"]:
                        hucre["kalori"] = int(kc.group(1))
                    else:
                        hucre["yemekler"].append(re.sub(r"\s+", " ", yazi))
                kapat()
    gunler.sort(key=lambda g: g.tarih)
    return gunler, uyarilar


# ------------------------------------------------------------------ ayrıştırıcılar


@dataclass
class Sonuc:
    menuler: list[dict[str, Any]]
    duyurular: list[dict[str, Any]]
    uyarilar: list[str]


def wordpress_aylik_menu_pdf(kaynak: dict[str, Any], alan: str, gun: date) -> Sonuc:
    """WordPress medya kütüphanesindeki aylık menü PDF'leri.

    En yeni birkaç PDF okunuyor; yalnız BU AYIN ve gelecek ayın günleri
    yazılıyor. Geçmiş aylar yazılmıyor (gerek yok) ve silinmiyor.
    """
    arama = kaynak["ayar"].get("arama", "menu")
    r = getir(kaynak["url"], alan, search=arama, per_page=10, orderby="date", order="desc",
              _fields="date,source_url,mime_type")
    pdfler = [m["source_url"] for m in r.json() if m.get("mime_type") == "application/pdf"]
    ay_basi = gun.replace(day=1)
    sinir = ay_ileri(ay_basi, 2)  # bu ay + gelecek ay; sınır dahil değil
    menuler: list[dict[str, Any]] = []
    uyarilar: list[str] = []
    gorulen: set[date] = set()
    for pdf_url in pdfler[:4]:
        if not resmi_alanda(pdf_url, alan):
            uyarilar.append(f"PDF resmî alanda değil, atlandı: {pdf_url}")
            continue
        gunler, u = menu_pdf_ayristir(getir(pdf_url, alan).content)
        uyarilar += [f"{pdf_url}: {x}" for x in u]
        for g in gunler:
            if not (ay_basi <= g.tarih < sinir) or g.tarih in gorulen:
                continue
            gorulen.add(g.tarih)
            menuler.append({
                "tarih": g.tarih.isoformat(),
                "ogun": "gunluk",
                "yemekler": list(g.yemekler),
                "kalori": g.kalori,
                "kaynak_url": pdf_url,
            })
    if not menuler:
        uyarilar.append("bu ay için menü bulunamadı")
    return Sonuc(menuler, [], uyarilar)


def wordpress_kategori(kaynak: dict[str, Any], alan: str, gun: date) -> Sonuc:
    """WordPress REST: bir kategorideki en yeni yazılar → duyurular."""
    kategori = kaynak["ayar"]["kategori"]
    r = getir(kaynak["url"], alan, categories=kategori, per_page=10, _fields="date,link,title")
    duyurular: list[dict[str, Any]] = []
    uyarilar: list[str] = []
    for y in r.json():
        baslik = metin((y.get("title") or {}).get("rendered", ""))
        link = y.get("link") or ""
        if not baslik or not resmi_alanda(link, alan):
            uyarilar.append(f"atlandı (başlık yok ya da resmî alanda değil): {link}")
            continue
        duyurular.append({
            "baslik": baslik[:400],
            "yayin_tarihi": (y.get("date") or "")[:10],
            "url": link,
            "kaynak_url": kaynak["url"],
        })
    return Sonuc([], duyurular, uyarilar)


AYRISTIRICILAR: dict[str, Callable[[dict[str, Any], str, date], Sonuc]] = {
    "wordpress_aylik_menu_pdf": wordpress_aylik_menu_pdf,
    "wordpress_kategori": wordpress_kategori,
}


# ------------------------------------------------------------------ koşu


def istemci():
    from supabase import create_client

    url = os.getenv("SUPABASE_URL")
    anahtar = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not anahtar:
        raise SystemExit("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY yok")
    return create_client(url, anahtar)


def kos(kuru: bool = False) -> int:
    db = istemci()
    kaynaklar = (
        db.table("universite_kaynaklari")
        .select("id, universite_id, tur, ayristirici, url, ayar, universiteler(resmi_alan_adi)")
        .eq("etkin", True)
        .execute()
        .data
    )
    gun = bugun()
    hatali = 0
    for k in kaynaklar:
        alan = k["universiteler"]["resmi_alan_adi"]
        etiket = f"{k['universite_id']} / {k['tur']} / {k['ayristirici']}"
        simdi = datetime.now(UTC).isoformat()
        try:
            ayristir = AYRISTIRICILAR[k["ayristirici"]]
            sonuc = ayristir(k, alan, gun)
        except Exception as e:  # kaynak bazında yalıtım: biri düşünce ötekiler sürsün
            hatali += 1
            print(f"HATA  {etiket}: {e}", file=sys.stderr)
            if not kuru:
                db.table("universite_kaynaklari").update(
                    {"son_kontrol_at": simdi, "son_hata": str(e)[:500]}
                ).eq("id", k["id"]).execute()
            continue

        for u in sonuc.uyarilar:
            print(f"UYARI {etiket}: {u}")
        print(f"TAMAM {etiket}: {len(sonuc.menuler)} menü günü, {len(sonuc.duyurular)} duyuru")
        if kuru:
            print(json.dumps({"menuler": sonuc.menuler[:3], "duyurular": sonuc.duyurular[:3]},
                             ensure_ascii=False, indent=2))
            continue

        if sonuc.menuler:
            db.table("kampus_menuleri").upsert(
                [{**m, "universite_id": k["universite_id"], "cekildi_at": simdi} for m in sonuc.menuler],
                on_conflict="universite_id,tarih,ogun",
            ).execute()
        if sonuc.duyurular:
            db.table("universite_duyurulari").upsert(
                [{**d, "universite_id": k["universite_id"], "cekildi_at": simdi} for d in sonuc.duyurular],
                on_conflict="universite_id,url",
            ).execute()
        # Boş sonuç bir başarı değil: son başarı anı olduğu gibi kalıyor,
        # uyarılar hata alanına yazılıyor. Eski veri silinmiyor.
        durum: dict[str, Any] = {"son_kontrol_at": simdi}
        if sonuc.menuler or sonuc.duyurular:
            durum.update(son_basari_at=simdi, son_hata=None)
        else:
            durum["son_hata"] = ("; ".join(sonuc.uyarilar) or "kaynak boş döndü")[:500]
        db.table("universite_kaynaklari").update(durum).eq("id", k["id"]).execute()
    return 1 if hatali and hatali == len(kaynaklar) else 0


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--kuru", action="store_true", help="veritabanına yazma, yalnız göster")
    args = ap.parse_args()
    raise SystemExit(kos(kuru=args.kuru))


if __name__ == "__main__":
    main()
