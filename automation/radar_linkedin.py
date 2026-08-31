"""LINKEDIN KEŞİF RADARI — SİNYAL, KANIT DEĞİL

LINKEDIN'E DOĞRUDAN İSTEK YOK
-----------------------------
`linkedin.com/robots.txt` tüm yolları otomasyona kapatıyor. Bu modül
LinkedIn'e HİÇBİR istek göndermiyor: yalnızca Brave'in kamuya açık
dizin sonuçlarını okuyor. LinkedIn adresi bir SİNYAL — "bu şirkette
böyle bir pozisyon olabilir".

Canonical ilan verisi şirketin resmî kaynağından geliyor; LinkedIn
özeti hiçbir yerde ilan açıklaması olarak kullanılmıyor.

HİPOTEZ
-------
Kariyer.net radarı ölçüldü: şirketlerin çoğunun ilanı kendi kariyer
sayfasında yoktu. LinkedIn'de kurumsal şirket ve resmî kariyer
yönlendirmesi oranının daha yüksek olabileceği hipotezi bu turda
sınanıyor.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from automation.radar_cozucu import sadelestir
from automation.radar_resmi import turkiye_mi

# ------------------------------------------------------------- bütçe


class ButceBitti(RuntimeError):
    """Sert tavana ulaşıldı. Koşu durur, para yakılmaz."""


@dataclass
class Butce:
    """Brave isteklerinin SERT tavanı.

    Tavan kodda korunuyor: keşif ve çözüm aşamaları ayrı cepten
    harcıyor, ama toplam hiçbir koşulda `toplam` değerini geçmiyor.
    Yedek cep yalnız açıkça istendiğinde açılıyor.
    """

    toplam: int = 430
    kesif_tavani: int = 220
    cozum_tavani: int = 180

    kesif: int = 0
    cozum: int = 0
    yedek: int = 0

    @property
    def harcanan(self) -> int:
        return self.kesif + self.cozum + self.yedek

    @property
    def kalan(self) -> int:
        return max(0, self.toplam - self.harcanan)

    def kesif_harca(self) -> None:
        if self.harcanan >= self.toplam or self.kesif >= self.kesif_tavani:
            raise ButceBitti("keşif bütçesi bitti")
        self.kesif += 1

    def cozum_harca(self, yedek_kullan: bool = False) -> None:
        if self.harcanan >= self.toplam:
            raise ButceBitti("toplam bütçe bitti")
        if self.cozum < self.cozum_tavani:
            self.cozum += 1
            return
        if yedek_kullan and self.harcanan < self.toplam:
            self.yedek += 1
            return
        raise ButceBitti("çözüm bütçesi bitti")

    def ozet(self) -> dict:
        return {
            "toplam_tavan": self.toplam,
            "harcanan": self.harcanan,
            "kesif": self.kesif,
            "cozum": self.cozum,
            "yedek": self.yedek,
            "kullanilmayan": self.kalan,
        }


# ------------------------------------------------------- sorgu matrisi

#: Şehirler: en yoğun dörtten başlayıp genişliyor. Kombinasyon
#: patlamasın diye terim×şehir çarpımı sıralı üretiliyor ve sorgu
#: tavanında kesiliyor.
SEHIRLER = (
    "Turkey", "Türkiye", "Istanbul", "Ankara", "Izmir",
    "Bursa", "Kocaeli", "Gebze", "Antalya", "Eskişehir",
    "Manisa", "Tekirdağ", "Adana", "Sakarya",
)

#: Terimler: İngilizce ve Türkçe. Tırnaklı olanlar öbek araması.
TERIMLER = (
    "intern", "internship", "stajyer", '"staj programı"',
    '"uzun dönem stajyer"', '"long term intern"',
    '"summer intern"', '"working student"',
)

LINKEDIN_ILAN_YOLU = "linkedin.com/jobs/view"


def kesif_sorgulari(sinir: int = 220) -> list[str]:
    """Deterministik LinkedIn keşif sorguları.

    Sıra sabit: verimli aileler (kısa terim × yoğun şehir) başta.
    İki koşu aynı kümeyi üretiyor, dolayısıyla önbellek işe yarıyor.
    """
    sorgular: list[str] = []
    for terim in TERIMLER:
        for sehir in SEHIRLER:
            sorgular.append(f"site:{LINKEDIN_ILAN_YOLU} {terim} {sehir}")
            if len(sorgular) >= sinir:
                return sorgular
    return sorgular


def sorgu_ailesi(sorgu: str) -> str:
    """Sorgunun ait olduğu aile — verim raporu için."""
    for terim in TERIMLER:
        if f" {terim} " in f"{sorgu} ":
            return terim.strip('"')
    return "?"


# ------------------------------------------------------------ sinyal


@dataclass
class LinkedInSinyali:
    """LinkedIn keşif sinyali. Açıklama YOK — bilinçli."""

    job_id: str
    url: str
    sirket: str | None
    baslik: str | None
    konum: str | None
    sorgular: list[str] = field(default_factory=list)


#: Yalnız ilan adresleri. Profil, şirket sayfası, gönderi ve makale
#: adresleri sinyal değil.
ILAN_ADRESI = re.compile(r"linkedin\.com/jobs/view/(?:[^/?#]*-)?(\d{6,})", re.I)
ILAN_DISI = re.compile(
    r"linkedin\.com/(in|company|posts|pulse|feed|school|learning|events)/", re.I
)


def ilan_adresi_mi(url: str | None) -> bool:
    """Bu adres bir LinkedIn İLAN adresi mi?"""
    if not url:
        return False
    if ILAN_DISI.search(url):
        return False
    return bool(ILAN_ADRESI.search(url))


def job_id_cikar(url: str | None) -> str | None:
    m = ILAN_ADRESI.search(url or "")
    return m.group(1) if m else None


# BAŞLIK BİÇİMLERİ ÖLÇÜLDÜ, TAHMİN EDİLMEDİ
#
# İlk sürüm yalnız iki İngilizce biçim biliyordu ve 359 sinyalin
# 315'inde şirket adı okunamadı. Teşhis koşusu ham başlıkları getirdi:
# Brave, Türkiye sorgularında LinkedIn'in TÜRKÇE YERELLEŞTİRİLMİŞ
# başlığını döndürüyor —
#
#   "Getir şirketi İstanbul, Türkiye konumunda GetirRise Internship
#    Program işe alım yapıyor | LinkedIn"
#
# Fiil çekimi değişiyor ("işe alım yapıyor", "işe alacak") ve başlık
# sık sık kırpılıyor ("... işe ..."), bu yüzden pozisyon adı
# "konumunda" ile "işe" arasında kalan parça olarak okunuyor.

#: Türkçe biçim — en sık görülen. `İ`/`ı` büyük-küçük eşlemesi
#: güvenilir olmadığı için harfler açıkça yazılıyor, `re.I`'ye
#: bırakılmıyor.
_TR = re.compile(
    r"^(?P<sirket>.+?)\s+[şŞ]irketi\s+(?P<konum>.+?)\s+konumunda\s+"
    r"(?P<baslik>.+?)(?:\s+[iİ]şe\b.*)?$"
)

#: "Şirket hiring Başlık in Konum | LinkedIn"
_HIRING = re.compile(
    r"^(?P<sirket>.+?)\s+hiring\s+(?P<baslik>.+?)"
    r"(?:\s+in\s+(?P<konum>.+?))?$", re.I)

#: "Fit4rail Summer Internship 2026 @Siemens Mobility Turkey"
_AT = re.compile(r"^(?P<baslik>.+?)\s*@\s*(?P<sirket>[^@]+)$")

#: "Business Development Intern (Turkish market) - Qeepl"
_TIRE = re.compile(r"^(?P<baslik>.+?)\s+[-–]\s+(?P<sirket>[^-–]+)$")

#: Tek ilan değil, ilan LİSTESİ başlığı: "Türkiye konumunda 83 Stajyer
#: iş ilanı", "1,000+ International Intern jobs in United States".
#: Buradan şirket adı çıkarılmıyor — çıkarılsa uydurma olurdu.
_LISTE = re.compile(
    r"(\d[\d.,]*\+?\s*(iş ilan|jobs? in|ilanlar)|^LinkedIn\s+[İI]ş\s+Arama)", re.I)

_SON_EK = re.compile(r"\s*[|]\s*LinkedIn\s*$", re.I)


def basliktan_ayikla(sonuc_basligi: str | None) -> tuple[str | None, str | None, str | None]:
    """Arama sonucu başlığından şirket, pozisyon ve konum çıkarır.

    Bu YALNIZCA keşif kalitesi için: hangi sinyalin çözüm kuyruğuna
    gireceğini belirliyor. Canonical veri resmî kaynaktan gelecek,
    buradan değil.
    """
    if not sonuc_basligi:
        return None, None, None
    metin = _SON_EK.sub("", sonuc_basligi.strip()).strip()
    if not metin or _LISTE.search(metin):
        return None, None, None
    for kalip in (_TR, _HIRING, _AT, _TIRE):
        m = kalip.match(metin)
        if not m:
            continue
        g = m.groupdict()
        sirket = (g.get("sirket") or "").strip(" .,…") or None
        baslik = (g.get("baslik") or "").strip(" .,…") or None
        konum = (g.get("konum") or "").strip(" .,…") or None
        if sirket:
            return sirket, baslik, konum
    return None, None, None


def sinyal_kur(sonuc: dict, sorgu: str) -> LinkedInSinyali | None:
    """Brave sonucundan sinyal üretir; ilan değilse None."""
    url = sonuc.get("url") or ""
    if not ilan_adresi_mi(url):
        return None
    jid = job_id_cikar(url)
    if not jid:
        return None
    sirket, baslik, konum = basliktan_ayikla(sonuc.get("title"))
    return LinkedInSinyali(jid, url, sirket, baslik, konum, [sorgu])


def sinyalleri_birlestir(sinyaller: list[LinkedInSinyali]) -> dict[str, LinkedInSinyali]:
    """ÇAPRAZ SORGU TEKİLLEŞTİRME — kimlik LinkedIn ilan kimliği.

    Aynı ilan `intern Turkey`, `intern Istanbul` ve şirket
    sorgularında da çıkabiliyor. Ham isabet ayrı sayılıyor; sinyal bir.
    """
    tekil: dict[str, LinkedInSinyali] = {}
    for s in sinyaller:
        var = tekil.get(s.job_id)
        if var is None:
            tekil[s.job_id] = s
            continue
        var.sorgular += s.sorgular
        # Eksik alanlar sonraki sonuçtan tamamlanabiliyor.
        var.sirket = var.sirket or s.sirket
        var.baslik = var.baslik or s.baslik
        var.konum = var.konum or s.konum
    return tekil


def turkiye_sinyali_mi(s: LinkedInSinyali) -> bool:
    """Sinyal Türkiye'yi gösteriyor mu?

    Bu YALNIZCA kuyruk sırası için bir ön eleme. Asıl Türkiye kanıtı
    resmî kaynağın kendi konum alanında aranıyor — sorguda "Turkey"
    yazması yeterli değil.
    """
    return turkiye_mi(s.konum) or turkiye_mi(s.baslik)


def cozum_onceligi(s: LinkedInSinyali, bilinen_sirketler: set[str]) -> int:
    """Çözüm kuyruğundaki sıra. Küçük sayı önce.

    StajımVar'ın zaten tanıdığı şirketler öne alınıyor: resmî kaynağa
    ulaşma ihtimalleri en yüksek ve çoğu zaman Brave harcamadan
    çözülüyorlar. Küçük şirket sinyalleri SİLİNMİYOR, sona kalıyor.
    """
    ad = sadelestir(s.sirket)
    if ad and ad in bilinen_sirketler:
        return 0
    if turkiye_sinyali_mi(s):
        return 1
    return 2


# ------------------------------------------------------- erken durdurma


def erken_durdur(sorgu_sayisi: int, resmi_eslesme: int,
                 esik_sorgu: int = 200, esik_eslesme: int = 1) -> bool:
    """İlk `esik_sorgu` sorguda resmî eşleşme yoksa koşuyu kes.

    Aynı sonucu üretmek için bütçe yakmanın anlamı yok; kalan bütçe
    bir sonraki hipoteze kalıyor.
    """
    return sorgu_sayisi >= esik_sorgu and resmi_eslesme < esik_eslesme
