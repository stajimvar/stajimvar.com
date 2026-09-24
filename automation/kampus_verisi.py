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
TARIH = re.compile(r"^(\d{1,2})[./](\d{1,2})[./](\d{4})$")
KALORI = re.compile(r"^(\d{2,4})\s*kcal$", re.I)
# Tek başına sayı (yemek başına kalori) ve sütun başlığı gürültüsü: yemek değil.
GURULTU = re.compile(r"^(\d{1,4}|kcal|kalori)$", re.I)
# Belgenin altındaki imza bloğu (unvanlar): hücre burada biter.
IMZA = re.compile(r"DA[İI]RE BA[ŞS]KAN|V\.?H\.?K\.?[İI]|M[ÜU]D[ÜU]R|M[ÜU]HEND[İI]S|D[İI]YET[İI]SYEN|ONAY", re.I)


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
            # Gün adı başlıkları her haftada tekrarlanabiliyor (GSÜ); sütun
            # merkezi aynı gün adının bütün tekrarlarının ortalaması.
            merkezler: dict[int, list[float]] = {}
            for k in kelimeler:
                ad = k["text"].strip().upper()
                if ad in GUNLER:
                    merkezler.setdefault(GUNLER.index(ad), []).append((k["x0"] + k["x1"]) / 2)
            if len(merkezler) < 3:
                continue
            sutun_x = {g: sum(xs) / len(xs) for g, xs in merkezler.items()}
            sutunlar: dict[int, list[tuple[float, str]]] = {g: [] for g in sutun_x}
            for k in kelimeler:
                yazi = re.sub(r"\s+", " ", k["text"]).strip()
                if not yazi or yazi.upper() in GUNLER:
                    continue
                orta = (k["x0"] + k["x1"]) / 2
                gun = min(sutun_x, key=lambda g: abs(sutun_x[g] - orta))
                sutunlar[gun].append((k["top"], yazi))

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

                # Başlık üstündeki yazılar (ör. belge başlığı) ilk tarihten
                # önce geldiği için hiçbir hücreye girmiyor.
                sirali = sorted(satirlar)
                # Satır aralığı: bu sütundaki ardışık satır farklarının ortancası.
                farklar = sorted(b[0] - a[0] for a, b in zip(sirali, sirali[1:]) if b[0] - a[0] > 1)
                aralik = farklar[len(farklar) // 2] if farklar else 12.0
                onceki_y: float | None = None
                for y, yazi in sirali:
                    # Büyük boşluk ya da imza satırı: tablo bitti, hücre kapanıyor.
                    if hucre is not None and hucre["yemekler"] and (
                        IMZA.search(yazi) or (onceki_y is not None and y - onceki_y > 3.5 * aralik)
                    ):
                        kapat()
                        hucre = None
                    onceki_y = y
                    t = TARIH.match(yazi)
                    if t:
                        kapat()
                        try:
                            tarih = date(int(t.group(3)), int(t.group(2)), int(t.group(1)))
                        except ValueError:
                            hucre = None
                            continue
                        hucre = {"tarih": tarih, "kalori": None, "yemekler": []}
                        continue
                    if hucre is None:
                        continue
                    kc = KALORI.match(yazi)
                    if kc:
                        if hucre["kalori"] is None and not hucre["yemekler"]:
                            hucre["kalori"] = int(kc.group(1))
                        continue
                    if GURULTU.match(yazi):
                        continue
                    hucre["yemekler"].append(yazi)
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


# ------------------------------------------------------------ ortak metin yardımcıları

AYLAR = ["ocak", "şubat", "mart", "nisan", "mayıs", "haziran", "temmuz", "ağustos", "eylül", "ekim", "kasım", "aralık"]
TARIH_METIN = re.compile(
    r"\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b"
    r"|\b(\d{1,2})\s+(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)(?:\s+(\d{4}))?",
    re.I,
)
GUN_ADI = re.compile(r"(pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar)", re.I)
GUN_SIRA = ["pazartesi", "salı", "çarşamba", "perşembe", "cuma", "cumartesi", "pazar"]


def kucuk(s: str) -> str:
    return s.replace("İ", "i").replace("I", "ı").lower()


def metinden_tarih(s: str, gun: date, yil_yoksa_gecmis: bool = True) -> date | None:
    """Metindeki İLK tarih. Yıl yazmıyorsa bugüne en yakın geçmiş yıl."""
    m = TARIH_METIN.search(kucuk(s))
    if not m:
        return None
    try:
        if m.group(1):
            return date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
        ay = AYLAR.index(m.group(5)) + 1
        yil = int(m.group(6)) if m.group(6) else gun.year
        t = date(yil, ay, int(m.group(4)))
        if not m.group(6) and yil_yoksa_gecmis and t > gun:
            t = date(yil - 1, ay, int(m.group(4)))
        return t
    except ValueError:
        return None


def gun_adi_tutuyor(satir: str, t: date) -> bool:
    """Satırda gün adı varsa tarihle uyuşmalı; yoksa kabul."""
    g = GUN_ADI.search(kucuk(satir))
    return not g or GUN_SIRA.index(g.group(1).lower()) == t.weekday()


def satirlar(html_metni: str) -> list[str]:
    from bs4 import BeautifulSoup

    b = BeautifulSoup(html_metni, "html.parser")
    for x in b(["script", "style", "noscript"]):
        x.decompose()
    return [re.sub(r"\s+", " ", l).strip() for l in b.get_text("\n").split("\n") if l.strip()]


def menu_satiri(ogun: str, t: date, yemekler: list[str], kalori: int | None, kaynak_url: str) -> dict[str, Any]:
    return {"tarih": t.isoformat(), "ogun": ogun, "yemekler": yemekler[:24], "kalori": kalori, "kaynak_url": kaynak_url}


def pencere(gun: date, t: date) -> bool:
    """Yazılacak menü aralığı: bu ayın başı ile gelecek ayın sonu."""
    ay_basi = gun.replace(day=1)
    return ay_basi <= t < ay_ileri(ay_basi, 2)


# ------------------------------------------------------------ menü: JSON uç noktaları


def _yemek_listesi(ham: str) -> list[str]:
    """'<p>YAYLA ÇORBA(130kcal)</p>' ya da 'A,\\r\\nB' → temiz yemek adları."""
    parcalar = re.split(r"</p>|<br\s*/?>|\r?\n", ham or "")
    out = []
    for p in parcalar:
        p = metin(p)
        p = re.sub(r"\(\s*[\d/]+\s*(kcal|kal)?\s*\)", "", p, flags=re.I).strip(" ,.-")
        if p and not GURULTU.match(p) and not re.fullmatch(r"(öğle|akşam|ÖĞLE|AKŞAM)", p):
            out.append(p)
    return out


def json_gunluk_ogun(kaynak: dict[str, Any], alan: str, gun: date) -> Sonuc:
    """Gün ve öğün başına bir istek (İstanbul Üniversitesi SKS).

    ayar: {"tarih_param": "date", "ogun_param": "category",
           "ogunler": {"ogle": "lunch", "aksam": "dinner"}, "alan": "meal", "gun_sayisi": 7}
    """
    a = kaynak["ayar"]
    menuler, uyarilar = [], []
    for i in range(int(a.get("gun_sayisi", 7))):
        t = date.fromordinal(gun.toordinal() + i)
        for ogun, kategori in a["ogunler"].items():
            r = getir(kaynak["url"], alan, **{a["tarih_param"]: t.isoformat(), a["ogun_param"]: kategori})
            veri = r.json()
            yemekler = _yemek_listesi(veri.get(a.get("alan", "meal")) or "") if veri.get("success", True) else []
            if yemekler:
                menuler.append(menu_satiri(ogun, t, yemekler, None, a.get("kaynak_sayfasi", kaynak["url"])))
    if not menuler:
        uyarilar.append("önümüzdeki 7 gün için menü yok")
    return Sonuc(menuler, [], uyarilar)


def json_aylik_ogun(kaynak: dict[str, Any], alan: str, gun: date) -> Sonuc:
    """Ay başına tek istek, günlerin listesi (Yıldız Teknik SKS, Drupal).

    ayar: {"ay_param": "list_date", "ay_bicimi": "%Y%m", "sabit": {...},
           "tarih_alani": "date", "tarih_bicimi": "%d-%m-%Y",
           "ogunler": {"ogle": "lunch_menu", "aksam": "dinner_menu"}}
    """
    a = kaynak["ayar"]
    menuler, uyarilar = [], []
    for ay in (gun.replace(day=1), ay_ileri(gun.replace(day=1), 1)):
        r = getir(kaynak["url"], alan, **{a["ay_param"]: ay.strftime(a["ay_bicimi"]), **a.get("sabit", {})})
        for g in r.json() or []:
            try:
                t = datetime.strptime(g[a["tarih_alani"]], a["tarih_bicimi"]).date()
            except (KeyError, ValueError):
                continue
            if not pencere(gun, t):
                continue
            for ogun, alan_adi in a["ogunler"].items():
                yemekler = _yemek_listesi(g.get(alan_adi) or "")
                if yemekler:
                    menuler.append(menu_satiri(ogun, t, yemekler, None, a.get("kaynak_sayfasi", kaynak["url"])))
    if not menuler:
        uyarilar.append("bu ay için menü yok")
    return Sonuc(menuler, [], uyarilar)


# ------------------------------------------------------------ menü: HTML satırları

OGUN_ISARETI: dict[str | None, re.Pattern[str]] = {
    "ogle": re.compile(r"^(öğle|öğlen|öğle yemeği|öğlen yemeği)$", re.I),
    "aksam": re.compile(r"^(akşam|akşam yemeği)$", re.I),
    None: re.compile(r"^(kahvaltı|kahvaltı menüsü|ara öğün)$", re.I),
}
ETIKET = re.compile(
    r"^(çorba|ana yemek|yardımcı yemek|seçmeli|tatlı|vejetaryen/vegan|vejetaryen|vegan|normal menü|"
    r"alternatif toplam:?|normal toplam:?|toplam:?|kalori|kcal)$",
    re.I,
)
TOPLAM_KAL = re.compile(r"^(\d{2,4})\s*(kal|kcal)\b", re.I)
# Aynı sayfada ayrı menü bölümleri (Marmara): yalnız normal menü alınıyor;
# vegan/diyet bölümü ayrı bir öğün değil, aynı öğünün başka listesi.
BOLUM_NORMAL = re.compile(r"^normal menü$", re.I)
BOLUM_DIGER = re.compile(r"^(vegan|vejetaryen|diyet|diyabetik|glutensiz|personel)\s*menü(sü)?$", re.I)
PARANTEZ = re.compile(r"^\(.*\)$")


def satir_menu_ayristir(satir_listesi: list[str], gun: date, kaynak_url: str, varsayilan_ogun: str) -> list[dict[str, Any]]:
    """Tarih satırıyla başlayan günler; içinde isteğe bağlı öğün başlıkları.

    Tarih satırı: "21.09.2026 Pazartesi" ya da "25 Eylül 2026, Cuma".
    Gün adı yazıyorsa tarihle uyuşmalı, uyuşmazsa gün atlanıyor.
    İlk tarihten önceki her şey (menü bağlantıları dahil) yok sayılıyor.
    """
    menuler: list[dict[str, Any]] = []
    t: date | None = None
    ogun: str | None = varsayilan_ogun
    kayit: dict[str, list[str]] = {}
    kalori: dict[str, int] = {}
    toplam_bekliyor = False
    bolum_disi = False
    gorulen: set[tuple[date, str]] = set()

    def kapat() -> None:
        if t is not None:
            for o, yemekler in kayit.items():
                if yemekler and (t, o) not in gorulen:
                    gorulen.add((t, o))
                    menuler.append(menu_satiri(o, t, yemekler, kalori.get(o), kaynak_url))

    for satir in satir_listesi:
        if BOLUM_NORMAL.match(satir) or BOLUM_DIGER.match(satir):
            kapat()
            t, kayit, kalori = None, {}, {}
            bolum_disi = bool(BOLUM_DIGER.match(satir))
            continue
        if bolum_disi:
            continue
        m = TARIH_METIN.match(kucuk(satir))
        if m and (m.group(3) or m.group(6)) and len(satir) <= 40:
            kapat()
            yeni = metinden_tarih(satir, gun, yil_yoksa_gecmis=False)
            t = yeni if yeni and gun_adi_tutuyor(satir, yeni) else None
            ogun, kayit, kalori, toplam_bekliyor = varsayilan_ogun, {}, {}, False
            continue
        if t is None:
            continue
        isaret = next((o for o, r in OGUN_ISARETI.items() if r.match(satir)), "yok")
        if isaret != "yok":
            ogun = isaret
            continue
        if ogun is None:
            continue
        kucuk_satir = kucuk(satir)
        if kucuk_satir.startswith("normal toplam"):
            toplam_bekliyor = True
            continue
        tk = TOPLAM_KAL.match(satir)
        if tk:
            if toplam_bekliyor and ogun not in kalori:
                kalori[ogun] = int(tk.group(1))
            toplam_bekliyor = False
            continue
        if ETIKET.match(satir) or GURULTU.match(satir) or PARANTEZ.match(satir) or "porsiyon gramajı" in kucuk_satir:
            continue
        kayit.setdefault(ogun, []).append(satir)
        if len(kayit[ogun]) > 24:  # menü bitti, sayfanın geri kalanı başladı
            kayit[ogun] = kayit[ogun][:24]
            kapat()
            t = None
    kapat()
    return [m for m in menuler if pencere(gun, date.fromisoformat(m["tarih"]))]


def html_satir_menu(kaynak: dict[str, Any], alan: str, gun: date) -> Sonuc:
    """Menüyü düz HTML'de tarih satırlarıyla yayımlayan sayfa (Marmara, Boğaziçi).

    ayar: {"varsayilan_ogun": "ogle" | "gunluk"}
    """
    r = getir(kaynak["url"], alan)
    menuler = satir_menu_ayristir(satirlar(r.text), gun, kaynak["url"], kaynak["ayar"].get("varsayilan_ogun", "gunluk"))
    return Sonuc(menuler, [], [] if menuler else ["sayfada bu aya ait menü yok"])


# ------------------------------------------------------------ menü: sayfadaki PDF bağlantıları


def sayfadaki_pdf_menu(kaynak: dict[str, Any], alan: str, gun: date) -> Sonuc:
    """Sayfada öğün başına aylık PDF bağlantısı (Galatasaray).

    ayar: {"ogunler": {"ogle": "oglen|öğle", "aksam": "aksam|akşam"}, "haric": "vegan"}
    Öğün bağlantı metninden ya da dosya adından okunuyor; aynı öğün için
    sayfadaki ilk (en yeni) PDF kullanılıyor.
    """
    from bs4 import BeautifulSoup
    from urllib.parse import urljoin

    a = kaynak["ayar"]
    r = getir(kaynak["url"], alan)
    b = BeautifulSoup(r.text, "html.parser")
    haric = re.compile(a.get("haric", "vegan"), re.I)
    secilen: dict[str, str] = {}
    for link in b.find_all("a", href=True):
        href = urljoin(r.url, link["href"])
        if not href.lower().endswith(".pdf"):
            continue
        ipucu = kucuk(link.get_text(" ", strip=True) + " " + href)
        if haric.search(ipucu):
            continue
        for ogun, desen in a["ogunler"].items():
            if ogun not in secilen and re.search(desen, ipucu, re.I):
                secilen[ogun] = href
    menuler: list[dict[str, Any]] = []
    uyarilar: list[str] = []
    for ogun, pdf_url in secilen.items():
        if not resmi_alanda(pdf_url, alan):
            uyarilar.append(f"PDF resmî alanda değil: {pdf_url}")
            continue
        gunler, u = menu_pdf_ayristir(getir(pdf_url, alan).content)
        uyarilar += u
        menuler += [menu_satiri(ogun, g.tarih, list(g.yemekler), g.kalori, pdf_url) for g in gunler if pencere(gun, g.tarih)]
    if not menuler:
        uyarilar.append("sayfadaki PDF'lerde bu aya ait menü yok")
    return Sonuc(menuler, [], uyarilar)


# ------------------------------------------------------------ duyurular


def json_duyuru_listesi(kaynak: dict[str, Any], alan: str, gun: date) -> Sonuc:
    """JSON duyuru listesi (İstanbul Üniversitesi CMS).

    ayar: {"parametreler": {...}, "veri": "Data", "baslik": "Header", "tarih": "Date",
           "url_sablonu": "https://www.istanbul.edu.tr/tr/duyurular/{Route}"}
    Bağlantı şablondan üretiliyor; resmî alanda değilse duyuru atlanıyor.
    """
    a = kaynak["ayar"]
    r = getir(kaynak["url"], alan, **a.get("parametreler", {}))
    duyurular: list[dict[str, Any]] = []
    uyarilar: list[str] = []
    for d in (r.json() or {}).get(a.get("veri", "Data")) or []:
        try:
            url = a["url_sablonu"].format(**d)
        except (KeyError, IndexError):
            continue
        baslik = metin(str(d.get(a["baslik"]) or ""))
        tarih = str(d.get(a["tarih"]) or "")[:10]
        if not baslik or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", tarih) or not resmi_alanda(url, alan):
            uyarilar.append(f"atlandı: {baslik[:40]} {url}")
            continue
        duyurular.append({"baslik": baslik[:400], "yayin_tarihi": tarih, "url": url, "kaynak_url": kaynak["url"]})
    return Sonuc([], duyurular[:10], uyarilar)


def _detay_bilgisi(url: str, alan: str, gun: date) -> tuple[str | None, date | None]:
    """Detay sayfasından başlık ve YAYIN tarihi.

    Tarih önceliği: <time datetime> → article:published_time → metindeki
    bugünden sonra OLMAYAN ilk tarih (gelecekteki tarih bir etkinlik
    tarihidir, yayın tarihi değil).
    """
    from bs4 import BeautifulSoup

    b = BeautifulSoup(getir(url, alan).text, "html.parser")
    baslik = None
    og = b.find("meta", attrs={"property": "og:title"})
    if og and og.get("content"):
        baslik = re.split(r"\s+[|–]\s+", og["content"].strip())[0].strip()
    tarih = None
    adaylar = [x.get("datetime") for x in b.find_all("time") if x.get("datetime")]
    adaylar += [m.get("content") for m in b.find_all("meta", attrs={"property": "article:published_time"})]
    for a in adaylar:
        if a and re.match(r"\d{4}-\d{2}-\d{2}", a):
            tarih = date.fromisoformat(a[:10])
            break
    if tarih is None:
        for x in b(["script", "style", "nav", "header", "footer"]):
            x.decompose()
        for m in TARIH_METIN.finditer(kucuk(b.get_text(" ", strip=True))):
            t = metinden_tarih(m.group(0), gun)
            if t and t <= gun:
                tarih = t
                break
    if baslik is None:
        h1 = b.find("h1")
        baslik = h1.get_text(" ", strip=True) if h1 else None
    return baslik, tarih


def html_duyuru_listesi(kaynak: dict[str, Any], alan: str, gun: date) -> Sonuc:
    """Duyuru liste sayfası: yolu `onek` içeren bağlantılar.

    ayar: {"onek": "/tr/duyurular/", "detay": true}
    Tarih listede yazıyorsa oradan; yoksa (ya da başlık kısaltılmışsa)
    detay sayfasından. Tarihi bulunamayan duyuru YAZILMIYOR.
    """
    from bs4 import BeautifulSoup
    from urllib.parse import urljoin

    a = kaynak["ayar"]
    r = getir(kaynak["url"], alan)
    b = BeautifulSoup(r.text, "html.parser")
    duyurular: list[dict[str, Any]] = []
    uyarilar: list[str] = []
    detay_hakki = int(a.get("detay_siniri", 12))

    # Aynı duyuruya birden çok bağlantı gidebiliyor (tarih rozeti, başlık,
    # "Devamı"). Bağlantı başına EN UZUN, tarih olmayan metin başlık;
    # tarih yalnız bağlantı metinlerinin DIŞINDAKİ kap metninden okunuyor —
    # başlığın içindeki "9 Eylül" yayın tarihi değil.
    sira: list[str] = []
    metinler: dict[str, list[str]] = {}
    kaplar: dict[str, Any] = {}
    for link in b.find_all("a", href=True):
        href = urljoin(r.url, link["href"]).split("#")[0]
        yol = urlsplit(href).path
        if not resmi_alanda(href, alan) or a["onek"] not in yol:
            continue
        if yol.rstrip("/") == urlsplit(r.url).path.rstrip("/"):
            continue
        if href not in metinler:
            sira.append(href)
            metinler[href] = []
            kaplar[href] = link
        metinler[href].append(link.get_text(" ", strip=True))

    def kap_tarihi(link: Any, href: str) -> date | None:
        """Bağlantıdan yukarı çık; başka bir duyurunun bağlantısını içeren
        kaba (listenin kendisi) varmadan bulunan ilk tarih."""
        for kap in list(link.parents)[:6]:
            baskalari = {
                urljoin(r.url, x["href"]).split("#")[0] for x in kap.find_all("a", href=True)
            } & set(metinler) - {href}
            if baskalari:
                return None
            kap_metni = kap.get_text(" ", strip=True)
            for m in metinler[href]:
                kap_metni = kap_metni.replace(m, " ")
            t = metinden_tarih(kap_metni, gun)
            if t:
                return t
        return None

    for href in sira:
        adaylar = [m for m in metinler[href] if len(m) >= 12 and not TARIH_METIN.fullmatch(kucuk(m))]
        adaylar = [m for m in adaylar if not re.fullmatch(r"(devamı|detay|duyuru detayı|oku)", m, re.I)]
        if not adaylar:
            continue
        baslik = max(adaylar, key=len)
        tarih = kap_tarihi(kaplar[href], href)
        if tarih is None:
            # Aynı duyurunun kısa, tarih içeren bağlantısı (rozet: "ÇAR 23 Eylül")
            # başlık değil ama tarih kaynağı.
            rozet = [m for m in metinler[href] if len(m) <= 25 and TARIH_METIN.search(kucuk(m))]
            tarih = metinden_tarih(rozet[0], gun) if rozet else None
        if tarih and tarih > gun:
            tarih = None  # yayın tarihi gelecekte olamaz
        kisaltilmis = baslik.endswith(("...", "…")) or bool(re.search(r"detay", baslik, re.I))
        if (tarih is None or kisaltilmis) and a.get("detay", True) and detay_hakki > 0:
            detay_hakki -= 1
            d_baslik, d_tarih = _detay_bilgisi(href, alan, gun)
            baslik = d_baslik or baslik
            tarih = tarih or d_tarih
        if tarih is None:
            uyarilar.append(f"tarihi bulunamadı, atlandı: {href}")
            continue
        baslik = re.sub(r"\s*(duyuru detayı|devamı)\s*$", "", baslik, flags=re.I).strip()
        duyurular.append({"baslik": baslik[:400], "yayin_tarihi": tarih.isoformat(), "url": href, "kaynak_url": kaynak["url"]})
        if len(duyurular) >= 10:
            break
    return Sonuc([], duyurular, uyarilar)


AYRISTIRICILAR: dict[str, Callable[[dict[str, Any], str, date], Sonuc]] = {
    "wordpress_aylik_menu_pdf": wordpress_aylik_menu_pdf,
    "wordpress_kategori": wordpress_kategori,
    "json_gunluk_ogun": json_gunluk_ogun,
    "json_aylik_ogun": json_aylik_ogun,
    "html_satir_menu": html_satir_menu,
    "sayfadaki_pdf_menu": sayfadaki_pdf_menu,
    "json_duyuru_listesi": json_duyuru_listesi,
    "html_duyuru_listesi": html_duyuru_listesi,
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
