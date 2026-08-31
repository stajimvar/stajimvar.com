"""RESMÎ WEB RADARI — BRAVE'DEN DOĞRUDAN RESMÎ İLANA

STRATEJİ DEĞİŞİKLİĞİNİN ÖLÇÜMÜ
------------------------------
Kariyer.net radarı 53 sinyalden 0 yayın adayı üretti. Sebep çözücü
hatası değildi: o şirketlerin çoğu ilanı YALNIZCA Kariyer.net'te
yayımlıyor, kendi kariyer/ATS kaynağında aynı ilan yok. Yani
"toplayıcıdan resmî kaynağa" zinciri o popülasyonda yapısal olarak
kapalı.

Bu modül zinciri tersine çeviriyor:

    Brave  →  RESMÎ ATS İLANI  →  kalite  →  duplicate  →  aday

Brave artık şirket alan adı çözücüsü değil, RESMÎ İLAN KEŞİF motoru.

NEDEN KİRACI (TENANT) KEŞFİ
---------------------------
Brave bir ilan adresi buluyor: `jobs.lever.co/acme/123`. Buradan tek
ilanı çekmek yerine KİRACIYI (`acme`) çıkarıp mevcut adaptöre veriyoruz.
Adaptör o kiracının bütün ilanlarını resmî API'den okuyor — açıklama,
konum ve istihdam bilgisiyle birlikte.

İki kazanç: radar için ikinci bir Lever/Greenhouse ayrıştırıcısı
yazılmıyor, ve bir arama sonucu tek ilan yerine bir kiracının tamamını
açıyor.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from urllib.parse import urlparse

from automation.radar_cozucu import sadelestir, toplayici_mi
from automation.radar_sirket import sirket_alani_olamaz

# --------------------------------------------------------- desteklenen

#: Adaptörü ZATEN OLAN platformlar ve kiracı çıkarma kalıpları.
#:
#: Yeni ATS adaptörü yazmadan önce mevcut kapasite kullanılıyor: bu
#: altısında Brave bir ilan bulursa en kısa yoldan gerçek ilana
#: ulaşılıyor. Kalıplar `automation/sources.json` içindeki gerçek
#: kayıtların adres biçimlerinden çıkarıldı, tahminle yazılmadı.
DESTEKLENEN: dict[str, dict] = {
    "lever": {
        "alan": "jobs.lever.co",
        "kalip": re.compile(r"^https?://jobs\.lever\.co/([^/?#]+)"),
        "anahtar": "site",
    },
    "greenhouse": {
        "alan": "greenhouse.io",
        "kalip": re.compile(r"^https?://(?:boards|job-boards)\.greenhouse\.io/([^/?#]+)"),
        "anahtar": "board_token",
    },
    "ashby": {
        "alan": "jobs.ashbyhq.com",
        "kalip": re.compile(r"^https?://jobs\.ashbyhq\.com/([^/?#]+)"),
        "anahtar": "job_board",
    },
    "workable": {
        "alan": "apply.workable.com",
        "kalip": re.compile(r"^https?://apply\.workable\.com/([^/?#]+)"),
        "anahtar": "account",
    },
    "smartrecruiters": {
        "alan": "jobs.smartrecruiters.com",
        "kalip": re.compile(r"^https?://(?:jobs|careers)\.smartrecruiters\.com/([^/?#]+)"),
        "anahtar": "company_identifier",
    },
}

#: Adaptörü OLMAYAN ama resmî görünen platformlar. Yayınlanmıyorlar;
#: yalnızca sayılıyorlar — sonraki adaptör önceliği buradan çıkacak.
DESTEKLENMEYEN: dict[str, tuple[str, ...]] = {
    "successfactors": ("successfactors.eu", "successfactors.com", "sapsf.eu", "sapsf.com"),
    "teamtailor": ("teamtailor.com",),
    "recruitee": ("recruitee.com",),
    "taleo": ("taleo.net",),
    "personio": ("jobs.personio.de", "jobs.personio.com"),
    "workday": ("myworkdayjobs.com", "myworkdaysite.com"),
    # Workable'ın ilan görüntüleme adresi kiracı taşımıyor: kiracı
    # çıkarılamadığı için adaptöre beslenemiyor.
    "workable_view": ("jobs.workable.com/view",),
}


# ------------------------------------------------------- sorgu matrisi

#: Arama terimleri. Türkçe ve İngilizce; hepsi staj/öğrenci odaklı.
TERIMLER = ("intern", "internship", "stajyer", "staj")

#: Coğrafya. Türkiye ilanı olduğunu ARAMADA daraltmak için; asıl
#: doğrulama resmî ilanın kendi konum alanında.
COGRAFYA = ("Turkey", "Türkiye", "Istanbul", "Ankara", "Izmir")


def sorgu_matrisi(sinir: int = 120) -> list[str]:
    """Deterministik, sınırlı sorgu kümesi.

    Bütün web'e körlemesine sorgu atılmıyor: her sorgu DESTEKLENEN bir
    ATS alanına daraltılmış. Sıra sabit, dolayısıyla iki koşu aynı
    kümeyi üretiyor ve önbellek işe yarıyor.
    """
    sorgular: list[str] = []
    for ad, bilgi in DESTEKLENEN.items():
        for terim in TERIMLER:
            for yer in COGRAFYA:
                sorgular.append(f"site:{bilgi['alan']} {terim} {yer}")
                if len(sorgular) >= sinir:
                    return sorgular
    return sorgular


# --------------------------------------------------------- sınıflandırma


@dataclass
class Bulgu:
    """Bir arama sonucunun sınıflandırılmış hâli."""

    url: str
    platform: str | None = None
    kiraci: str | None = None
    destekli: bool = False
    red_nedeni: str | None = None


def sonucu_sinifla(url: str) -> Bulgu:
    """Arama sonucunu resmî kaynak açısından sınıflandırır.

    Toplayıcı ve sosyal adresler doğrudan eleniyor — Sprint 1'deki
    canonical liste kullanılıyor, ikinci bir güven sistemi yok.
    """
    if not url:
        return Bulgu(url="", red_nedeni="adres yok")
    if toplayici_mi(url) or sirket_alani_olamaz(url):
        return Bulgu(url=url, red_nedeni="toplayıcı/sosyal/rehber")

    for ad, bilgi in DESTEKLENEN.items():
        m = bilgi["kalip"].match(url)
        if m:
            kiraci = m.group(1).strip("/")
            # `jobs`, `search` gibi yol parçaları kiracı değil.
            if not kiraci or kiraci.lower() in {"jobs", "search", "companies", "j"}:
                return Bulgu(url=url, platform=ad, red_nedeni="kiracı çıkarılamadı")
            return Bulgu(url=url, platform=ad, kiraci=kiraci, destekli=True)

    d = url.lower()
    for ad, imzalar in DESTEKLENMEYEN.items():
        if any(i in d for i in imzalar):
            return Bulgu(url=url, platform=ad, red_nedeni="adaptör yok")

    return Bulgu(url=url, platform="sirket_sitesi", red_nedeni="desteklenen ATS değil")


def kiracilari_topla(sonuc_urlleri: list[str]) -> tuple[dict[tuple[str, str], list[str]], list[Bulgu]]:
    """Arama sonuçlarını (platform, kiracı) demetlerine indirger.

    ÇAPRAZ SORGU TEKİLLEŞTİRME: aynı kiracı `intern Turkey` ve
    `intern Istanbul` sorgularında da çıkabilir. Ham isabet ayrı
    sayılıyor ama kiracı bir kez işleniyor.
    """
    kiracilar: dict[tuple[str, str], list[str]] = {}
    hepsi: list[Bulgu] = []
    for url in sonuc_urlleri:
        b = sonucu_sinifla(url)
        hepsi.append(b)
        if b.destekli and b.platform and b.kiraci:
            kiracilar.setdefault((b.platform, b.kiraci), []).append(url)
    return kiracilar, hepsi


# ------------------------------------------------------------ Türkiye

#: Konum metninde aranan Türkiye işaretleri.
#: Hepsi SADELEŞTİRİLMİŞ biçimde: karşılaştırma da öyle yapılıyor.
TURKIYE_IZLERI = (
    "turkey", "turkiye", "istanbul", "ankara", "izmir",
    "bursa", "kocaeli", "manisa", "antalya", "adana", "gebze",
    "kayseri", "konya", "eskisehir", "denizli", "sakarya", "tekirdag",
)


def turkiye_mi(konum: str | None, aciklama: str | None = None) -> bool:
    """Konum Türkiye'yi gösteriyor mu?

    UZAKTAN İLAN OTOMATİK TÜRKİYE DEĞİL: yalnız "remote" yazan bir ilan,
    Türkiye'den çalışılabildiğine dair GERÇEK bir işaret taşımıyorsa
    Türkiye ilanı sayılmıyor. Yanlış coğrafya, öğrenciye başvuramayacağı
    bir ilan göstermek olurdu.
    """
    # `sadelestir` KULLANILIYOR, `.lower()` DEĞİL
    #
    # Python'da "İzmir".lower() noktalı i'yi iki karaktere ayırıyor ve
    # "izmir" ile eşleşmiyor. Projede bu tuzağı çözen yardımcı zaten
    # var; ikinci bir normalleştirme yazmak aynı hatayı yeniden
    # üretirdi.
    metin = sadelestir(konum)
    if any(iz in metin for iz in TURKIYE_IZLERI):
        return True
    if "remote" in metin or "uzaktan" in metin:
        return any(iz in sadelestir(aciklama) for iz in TURKIYE_IZLERI)
    return False


# --------------------------------------------------------------- huni


@dataclass
class ResmiAday:
    """Resmî kaynaktan doğrulanmış yayın adayı."""

    platform: str
    kiraci: str
    sirket: str | None
    baslik: str
    konum: str | None
    url: str
    quality_class: str | None = None
    durum: str = "discovered"
    neden: str = ""
    mevcut_listing_id: str | None = None
    kanitlar: list[str] = field(default_factory=list)

    @property
    def would_publish(self) -> bool:
        return (
            self.durum == "would_publish"
            and bool(self.url)
            and not toplayici_mi(self.url)
        )


def yeni_kiraci_mi(platform: str, kiraci: str, kayitli: set[tuple[str, str]]) -> bool:
    """Bu kiracı canonical kaynak listesinde var mı?

    Yeni kiracılar raporlanıyor ama `sources.json` bu turda
    DEĞİŞTİRİLMİYOR — gölge koşusu kaynak kaydına dokunmuyor.
    """
    return (platform, kiraci.lower()) not in kayitli


def kayitli_kiracilar(kaynaklar: list[dict]) -> set[tuple[str, str]]:
    """`sources.json` içindeki mevcut kiracılar."""
    anahtarlar = {"lever": "site", "greenhouse": "board_token", "ashby": "job_board",
                  "workable": "account", "smartrecruiters": "company_identifier"}
    kume: set[tuple[str, str]] = set()
    for k in kaynaklar:
        tur = k.get("type")
        alan = anahtarlar.get(tur)
        if alan and k.get(alan):
            kume.add((tur, str(k[alan]).lower()))
    return kume
