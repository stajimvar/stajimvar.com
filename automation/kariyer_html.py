"""GENEL HTML KARİYER SAYFASI ADAPTÖRÜ

Şirketin KENDİ kariyer sayfasından ilan çıkarır. Kaynak sayımı ölçtü:
desteklediğimiz beş ATS bu popülasyonda neredeyse hiç yok; buna karşılık
14 şirket ilanlarını doğrudan kendi HTML'inde taşıyor.

KANIT SIRASI — TAHMİN EN SONDA
------------------------------
1. JobPosting JSON-LD (schema.org) — en güvenilir, alanlar adlandırılmış
2. schema.org mikroverisi
3. Açık ilan detay bağlantıları
4. Anlamlı HTML başlıkları / bölümleri

Her aşama NEYE DAYANDIĞINI yazıyor. Serbest metinden LLM ile alan
uydurulmuyor: bir alan kaynaktan çıkmıyorsa boş kalıyor ve ilan
yayınlanmıyor.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from html import unescape
from urllib.parse import urljoin, urlparse

# ------------------------------------------------------------ yardımcı

_ETIKET = re.compile(r"<[^>]+>")
_BOSLUK = re.compile(r"[ \t\r\f\v]+")
_SATIR = re.compile(r"\n{3,}")
_SCRIPT = re.compile(r"<(script|style)\b[^>]*>.*?</\1>", re.I | re.S)


def metne_cevir(html: str | None) -> str:
    """HTML'i okunabilir düz metne çevirir."""
    if not html:
        return ""
    govde = _SCRIPT.sub(" ", html)
    govde = re.sub(r"<br\s*/?>|</p>|</li>|</div>|</h[1-6]>", "\n", govde, flags=re.I)
    govde = re.sub(r"<li\b[^>]*>", "• ", govde, flags=re.I)
    govde = _ETIKET.sub(" ", govde)
    govde = unescape(govde)
    govde = _BOSLUK.sub(" ", govde)
    govde = "\n".join(s.strip() for s in govde.split("\n"))
    return _SATIR.sub("\n\n", govde).strip()


# ------------------------------------------------- 1. JSON-LD JobPosting

_JSONLD = re.compile(
    r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', re.I | re.S)


def _duzlestir(dugum) -> list[dict]:
    """JSON-LD ağacındaki tüm nesneleri düzleştirir (@graph dahil)."""
    cikti: list[dict] = []
    yigin = [dugum]
    while yigin:
        d = yigin.pop()
        if isinstance(d, list):
            yigin += d
        elif isinstance(d, dict):
            cikti.append(d)
            for anahtar in ("@graph", "itemListElement", "item", "mainEntity"):
                if anahtar in d:
                    yigin.append(d[anahtar])
    return cikti


def _tur_esitmi(dugum: dict, tur: str) -> bool:
    t = dugum.get("@type")
    if isinstance(t, list):
        return any(str(x).lower() == tur for x in t)
    return str(t or "").lower() == tur


def _metin(deger) -> str | None:
    """JSON-LD değerinden metin çıkarır; sözlükse `name` alanına bakar."""
    if isinstance(deger, str):
        return deger.strip() or None
    if isinstance(deger, dict):
        for anahtar in ("name", "value", "@value", "title"):
            if isinstance(deger.get(anahtar), str):
                return deger[anahtar].strip() or None
    if isinstance(deger, list):
        for x in deger:
            m = _metin(x)
            if m:
                return m
    return None


def _konum(dugum: dict) -> str | None:
    """`jobLocation` → "Şehir, Ülke"."""
    yer = dugum.get("jobLocation")
    for aday in (yer if isinstance(yer, list) else [yer]):
        if not isinstance(aday, dict):
            continue
        adres = aday.get("address")
        if isinstance(adres, dict):
            parcalar = [adres.get("addressLocality"), adres.get("addressRegion"),
                        adres.get("addressCountry")]
            metin = ", ".join(str(p) for p in parcalar
                              if isinstance(p, str) and p.strip())
            if metin:
                return metin
            ulke = adres.get("addressCountry")
            if isinstance(ulke, dict) and _metin(ulke):
                return _metin(ulke)
        if _metin(aday):
            return _metin(aday)
    if dugum.get("jobLocationType") == "TELECOMMUTE":
        return "Uzaktan"
    return None


@dataclass
class HamIlan:
    """Kariyer sayfasından çıkarılan tek ilan ve NEREDEN çıktığı."""

    baslik: str
    url: str
    aciklama: str = ""
    konum: str | None = None
    istihdam_turu: str | None = None
    sirket: str | None = None
    yayin_tarihi: str | None = None
    son_tarih: str | None = None
    basvuru_url: str | None = None
    kanit: str = ""
    kapali: bool = False


def jsonld_ilanlari(html: str, sayfa_url: str) -> list[HamIlan]:
    """JobPosting JSON-LD'den ilan çıkarır — EN GÜVENİLİR KATMAN."""
    ilanlar: list[HamIlan] = []
    for m in _JSONLD.finditer(html or ""):
        ham = m.group(1).strip()
        try:
            veri = json.loads(ham)
        except json.JSONDecodeError:
            continue
        for dugum in _duzlestir(veri):
            if not _tur_esitmi(dugum, "jobposting"):
                continue
            baslik = _metin(dugum.get("title"))
            if not baslik:
                continue
            url = _metin(dugum.get("url")) or sayfa_url
            ilanlar.append(HamIlan(
                baslik=baslik,
                url=urljoin(sayfa_url, url),
                aciklama=metne_cevir(dugum.get("description")
                                     if isinstance(dugum.get("description"), str) else None),
                konum=_konum(dugum),
                istihdam_turu=_metin(dugum.get("employmentType")),
                sirket=_metin(dugum.get("hiringOrganization")),
                yayin_tarihi=_metin(dugum.get("datePosted")),
                son_tarih=_metin(dugum.get("validThrough")),
                basvuru_url=urljoin(sayfa_url, _metin(dugum.get("url")) or sayfa_url),
                kanit="JobPosting JSON-LD",
            ))
    return ilanlar


# --------------------------------------------- 2. schema.org mikroverisi

_MIKRO = re.compile(
    r'itemtype=["\'][^"\']*schema\.org/JobPosting["\']', re.I)


def mikroveri_var_mi(html: str | None) -> bool:
    return bool(html and _MIKRO.search(html))


# ------------------------------------------- 3. ilan detay bağlantıları

# YOL SÜZGECİ SAYIMLA AYNI GENİŞLİKTE
#
# İlk sürüm yalnız "job/ilan/pozisyon" gibi parçaları kabul ediyordu ve
# `/kariyer/<ilan>` biçimindeki adresleri kaçırıyordu. Sonuç: kaynak
# sayımında "ilanlar HTML içinde" çıkan şirket, adaptörde sıfır bağlantı
# veriyordu. İki süzgeç aynı genişlikte olmalı, yoksa sayım yalan söyler.
ILAN_YOLU = re.compile(
    r"/(job|jobs|ilan|is-ilani|pozisyon|position|vacanc|career|careers|"
    r"kariyer|opening)s?[/=-]", re.I)

#: İlan detayı OLMAYAN, sayfada sık geçen bağlantılar.
ILAN_DISI_YOL = re.compile(
    r"/(login|signup|kayit|privacy|gizlilik|cookie|cerez|kvkk|contact|iletisim|"
    r"about|hakkimizda|blog|news|haber|press|basin|search|arama)\b", re.I)

_BAG = re.compile(r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', re.I | re.S)


def ilan_baglantilari(html: str | None, sayfa_url: str, tavan: int = 60) -> list[tuple[str, str]]:
    """Kariyer sayfasındaki ilan detay bağlantıları: (url, bağlantı metni).

    Aynı sayfaya birden fazla bağ olabiliyor; adres bazında tekilleşiyor.
    """
    if not html:
        return []
    kok = urlparse(sayfa_url)
    bulunan: dict[str, str] = {}
    for m in _BAG.finditer(html):
        ham_url, metin = m.group(1), metne_cevir(m.group(2))
        if ham_url.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue
        tam = urljoin(sayfa_url, ham_url)
        p = urlparse(tam)
        if p.scheme not in ("http", "https"):
            continue
        # Aynı siteden olmayan bağlar ilan detayı sayılmıyor: dış ATS
        # zaten kendi adaptörüyle okunuyor.
        if p.netloc.replace("www.", "") != kok.netloc.replace("www.", ""):
            continue
        if ILAN_DISI_YOL.search(p.path) or not ILAN_YOLU.search(p.path):
            continue
        temiz = f"{p.scheme}://{p.netloc}{p.path}"
        if temiz.rstrip("/") == sayfa_url.rstrip("/"):
            continue
        if temiz not in bulunan and len(bulunan) < tavan:
            bulunan[temiz] = metin[:120]
    return list(bulunan.items())


# --------------------------------------------------- 4. kapalı ilan kanıtı

KAPALI_KANITI = re.compile(
    r"\b(bu ilan (yay[ıi]ndan kald[ıi]r[ıi]lm[ıi][şs]|dolmu[şs]|sona ermi[şs])|"
    r"ba[şs]vurular kapan|position (is )?(closed|filled|no longer)|"
    r"this (job|position|posting) (is|has been) (closed|filled|expired)|"
    # TÜRKÇE EKLER SONDA \b KABUL ETMİYOR: "kaldırılmış"+"tır",
    # "kapan"+"dı". Eşleşme ekten önce bittiği için sondaki sınır
    # tutmuyordu ve iki Türkçe kapanış cümlesi de yakalanmıyordu
    # (ölçüldü). Sınır yalnız başta aranıyor.
    r"applications? (are )?closed|art[ıi]k aktif de[ğg]il)", re.I)


def kapali_mi(html: str | None) -> bool:
    """Sayfa ilanın kapandığını AÇIKÇA söylüyor mu?"""
    return bool(html and KAPALI_KANITI.search(metne_cevir(html)))


# ------------------------------------------------------ tek giriş noktası


@dataclass
class SayfaSonucu:
    """Bir kariyer sayfasının okunma sonucu ve gerekçesi."""

    kariyer_url: str
    http_durum: int | None = None
    erisilebilir: bool = False
    ilan_baglantisi: int = 0
    detay_cekilen: int = 0
    yapisal_veri: bool = False
    ilanlar: list[HamIlan] = field(default_factory=list)
    neden: str = ""


def kariyer_sayfasini_oku(kariyer_url: str, getir, detay_tavani: int = 12) -> SayfaSonucu:
    """Kariyer sayfasını okur ve bulabildiği ilanları döndürür.

    FAIL CLOSED: sayfa okunamıyorsa (403/429/5xx/ağ hatası) ilan
    üretilmiyor ve KAPALI DA VARSAYILMIYOR.
    """
    sonuc = SayfaSonucu(kariyer_url=kariyer_url)
    try:
        durum, govde = getir(kariyer_url)
    except Exception as hata:
        sonuc.neden = f"kariyer sayfası okunamadı: {type(hata).__name__}"
        return sonuc

    sonuc.http_durum = durum
    if durum != 200 or not govde:
        sonuc.neden = f"kariyer sayfası HTTP {durum}"
        return sonuc
    sonuc.erisilebilir = True

    # 1. Liste sayfasının kendisi JSON-LD taşıyor olabilir.
    liste_ilanlari = jsonld_ilanlari(govde, kariyer_url)
    if liste_ilanlari:
        sonuc.yapisal_veri = True
        sonuc.ilanlar += liste_ilanlari

    # 3. İlan detay bağlantıları.
    baglantilar = ilan_baglantilari(govde, kariyer_url)
    sonuc.ilan_baglantisi = len(baglantilar)

    for url, bag_metni in baglantilar[:detay_tavani]:
        try:
            d_durum, d_govde = getir(url)
        except Exception:
            continue
        sonuc.detay_cekilen += 1
        if d_durum != 200 or not d_govde:
            continue

        detay = jsonld_ilanlari(d_govde, url)
        if detay:
            sonuc.yapisal_veri = True
            for ilan in detay:
                ilan.kapali = kapali_mi(d_govde)
            sonuc.ilanlar += detay
            continue

        # 2/4. Yapısal veri yoksa: mikroveri işareti + sayfa metni.
        mikro = mikroveri_var_mi(d_govde)
        metin = metne_cevir(d_govde)
        baslik = _sayfa_basligi(d_govde) or bag_metni
        if not baslik or len(metin) < 200:
            continue
        sonuc.ilanlar.append(HamIlan(
            baslik=baslik, url=url, aciklama=metin[:12000],
            basvuru_url=url, kapali=kapali_mi(d_govde),
            kanit="schema.org mikroverisi + sayfa metni" if mikro else "ilan detay sayfası metni",
        ))

    if not sonuc.ilanlar:
        sonuc.neden = (f"{sonuc.ilan_baglantisi} bağlantı bulundu, "
                       "ilan çıkarılamadı") if baglantilar else "ilan bağlantısı yok"
    return sonuc


_BASLIK = re.compile(r"<h1[^>]*>(.*?)</h1>", re.I | re.S)
_TITLE = re.compile(r"<title[^>]*>(.*?)</title>", re.I | re.S)


def _sayfa_basligi(html: str) -> str | None:
    for kalip in (_BASLIK, _TITLE):
        m = kalip.search(html)
        if m:
            metin = metne_cevir(m.group(1))
            # "Pozisyon | Şirket" biçiminde ilk parça alınıyor.
            metin = re.split(r"\s*[|–]\s*", metin)[0].strip()
            if 3 <= len(metin) <= 140:
                return metin
    return None
