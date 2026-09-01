"""KAYNAK SAYIMI — TÜRKİYE'DE STAJ İLANI GERÇEKTE NEREDE DURUYOR?

Bu modül ARAMA YAPMIYOR. Elimizdeki LinkedIn sinyallerinin şirketlerini
alıp, şirketin kendi sitesini çekerek hangi işe alım altyapısını
kullandığını ölçüyor.

NEDEN SAYIM
-----------
İki tur üst üste aynı yerde bitti: sinyal bol, resmî kaynağa köprü yok.
Desteklediğimiz beş ATS (Lever, Greenhouse, Ashby, Workable,
SmartRecruiters) bu popülasyonda neredeyse hiç çıkmadı. Bir sonraki
adaptörü tahminle seçmek yerine sayıyla seçmek için önce şu soruyu
cevaplamak gerekiyor: bu şirketler ilanı NEREDE yayımlıyor?

KANIT YOKSA UNKNOWN
-------------------
Alan adı adayları tahminle üretiliyor ama hiçbiri kanıt sayılmıyor:
sayfa çekiliyor ve şirket kimliği sayfanın kendisinde aranıyor
(`dogrula_alan_adi`). Doğrulanmayan aday atılıyor.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from automation.radar_cozucu import (
    KARIYER_YOLLARI,
    alan_adi_adaylari,
    ats_tani,
    dogrula_alan_adi,
    kariyer_kaynagi_bul,
    sadelestir,
)
from automation.kariyer_html import jsonld_ilanlari, mikroveri_var_mi
from automation.radar_resmi import DESTEKLENEN, DESTEKLENMEYEN

# ---------------------------------------------------------- sınıflar

DESTEKLENEN_SINIF = {
    "lever": "LEVER",
    "greenhouse": "GREENHOUSE",
    "ashby": "ASHBY",
    "workable": "WORKABLE",
    "smartrecruiters": "SMARTRECRUITERS",
}

DESTEKLENMEYEN_SINIF = {
    "workday": "WORKDAY",
    "successfactors": "SUCCESSFACTORS",
    "teamtailor": "TEAMTAILOR",
    "recruitee": "RECRUITEE",
    "taleo": "TALEO",
    "personio": "PERSONIO",
    "workable_view": "WORKABLE",
}

CUSTOM = "CUSTOM_CAREER_PAGE"
KARIYER_YOK = "NO_CAREER_PAGE"
BILINMIYOR = "UNKNOWN"

#: Kaç alan adı adayı denenecek. Tahmin listesi uzadıkça yanlış siteye
#: bağlanma riski artıyor; üçten sonrası zaten isabet etmiyor.
ADAY_TAVANI = 3

#: Kariyer sayfasında ilan gövdesi arayan işaretler. Sayfanın ilanları
#: DOĞRUDAN HTML'de taşıyıp taşımadığını ölçüyor: taşıyorsa genel bir
#: HTML kariyer adaptörü o şirketi okuyabilir.
ILAN_BAGLANTISI = re.compile(
    r'<a[^>]+href=["\']([^"\']*(?:job|ilan|pozisyon|kariyer|career|vacanc)[^"\']*)["\']',
    re.I)

ILAN_YAPISI = re.compile(
    r"\b(a[çc][ıi]k pozisyon|open position|i[şs] ilanlar[ıi]|job openings|"
    r"pozisyonlar|current openings|ba[şs]vur)\b", re.I)


@dataclass
class SirketKaydi:
    """Bir şirketin işe alım altyapısı ölçümü."""

    sirket: str
    sinyal_sayisi: int
    sinif: str = BILINMIYOR
    alan_adi: str | None = None
    kariyer_url: str | None = None
    ats: str | None = None
    ilan_html_icinde: bool = False
    kanitlar: list[str] = field(default_factory=list)


def kariyer_sayfasi_ilan_tasiyor_mu(govde: str | None) -> tuple[bool, str]:
    """Kariyer sayfası GERÇEK bir ilan taşıyor mu?

    BAĞLANTI SAYMAK YETMİYOR — ÖLÇÜLDÜ
    ----------------------------------
    İlk sürüm "üç ilan bağlantısı + 'açık pozisyon' ifadesi" görünce
    evet diyordu ve 14 şirketi böyle işaretledi. Sonraki tur o 14
    şirketin kariyer sayfalarını gerçekten okudu: hiçbirinde tekil ilan
    yoktu. Sayılan bağlantılar gezinme bağlarıydı — "How We Hire",
    "Careers in R&D", "İnomera Akademi", dil değiştirme bağı. Başvurular
    ya bir forma ya da bir e-posta adresine gidiyordu.

    Yanlış pozitif ucuz değil: bir sonraki sprintin adaptör önceliğini
    o sayı belirledi. Bu yüzden ölçü artık KANIT: sayfa ya JobPosting
    yapısal verisi yayımlıyor ya da schema.org mikroverisiyle ilanı
    işaretliyor. İkisi de yoksa cevap hayır.
    """
    if not govde:
        return False, "sayfa boş"
    if jsonld_ilanlari(govde, "https://ornek.invalid/"):
        return True, "JobPosting JSON-LD"
    if mikroveri_var_mi(govde):
        return True, "schema.org JobPosting mikroverisi"
    baglantilar = {m.group(1) for m in ILAN_BAGLANTISI.finditer(govde)}
    return False, f"yapısal ilan verisi yok ({len(baglantilar)} bağlantı)"


def platformu_sinifla(imza_kaynaklari: list[str]) -> tuple[str | None, str | None]:
    """Adres ya da sayfa gövdesinden ATS sınıfı çıkarır.

    Döndürür: (ats_adi, sinif). Kanıt yoksa (None, None).
    """
    for kaynak in imza_kaynaklari:
        ats = ats_tani(kaynak)
        if not ats:
            continue
        if ats in DESTEKLENEN_SINIF:
            return ats, DESTEKLENEN_SINIF[ats]
        if ats in DESTEKLENMEYEN_SINIF:
            return ats, DESTEKLENMEYEN_SINIF[ats]
        return ats, ats.upper()
    # Doğrudan alan adı imzaları (ats_tani kaçırırsa).
    for kaynak in imza_kaynaklari:
        d = (kaynak or "").lower()
        for ad, imzalar in DESTEKLENMEYEN.items():
            if any(i in d for i in imzalar):
                return ad, DESTEKLENMEYEN_SINIF.get(ad, ad.upper())
        for ad, bilgi in DESTEKLENEN.items():
            if bilgi["alan"] in d:
                return ad, DESTEKLENEN_SINIF[ad]
    return None, None


def sirketi_olc(sirket: str, sinyal_sayisi: int, getir) -> SirketKaydi:
    """Bir şirketin işe alım altyapısını ölçer. ARAMA YOK, yalnız HTTP.

    Zincir: alan adı adayı → sayfa kimliğiyle DOĞRULAMA → kariyer
    kaynağı → ATS imzası → ilan yapısı.
    """
    kayit = SirketKaydi(sirket=sirket, sinyal_sayisi=sinyal_sayisi)

    kanit = dogrula_alan_adi(sirket, getir, alan_adi_adaylari(sirket)[:ADAY_TAVANI])
    if not kanit.var:
        # Alan adı doğrulanamadı. Bu "şirketin sitesi yok" DEMEK DEĞİL:
        # arama katmanı olmadan "yalnız toplayıcıda görünüyor" ile
        # "tahmin listem tutmadı" ayırt edilemiyor. Bu yüzden UNKNOWN.
        kayit.kanitlar.append(f"alan adı doğrulanamadı: {kanit.neden}")
        return kayit

    kayit.alan_adi = kanit.deger
    kayit.kanitlar.append(f"alan adı: {kanit.neden}")

    kariyer = kariyer_kaynagi_bul(kayit.alan_adi, getir)
    if not kariyer.var:
        kayit.sinif = KARIYER_YOK
        kayit.kanitlar.append(f"kariyer kaynağı yok: {kariyer.neden}")
        return kayit

    kayit.kariyer_url = kariyer.deger
    kayit.kanitlar.append(f"kariyer kaynağı: {kariyer.neden}")

    govde = ""
    try:
        durum, govde = getir(kayit.kariyer_url)
        if durum != 200:
            govde = ""
    except Exception:
        govde = ""

    ats, sinif = platformu_sinifla([kayit.kariyer_url, kariyer.ekler.get("ats", ""), govde])
    if sinif:
        kayit.ats, kayit.sinif = ats, sinif
        kayit.kanitlar.append(f"ATS imzası: {ats}")
        return kayit

    kayit.sinif = CUSTOM
    kayit.ilan_html_icinde, neden = kariyer_sayfasi_ilan_tasiyor_mu(govde)
    kayit.kanitlar.append(f"kendi kariyer sayfası ({neden})")
    return kayit


def sirketleri_topla(sinyaller: list) -> dict[str, tuple[str, int]]:
    """Sinyalleri ŞİRKETE indirger.

    Aynı şirketin beş ilanı, platform araştırmasında beş şirket değil.
    Döndürür: normalize ad → (görünen ad, sinyal sayısı).
    """
    toplam: dict[str, tuple[str, int]] = {}
    for s in sinyaller:
        ad = s.sirket_normal or sadelestir(s.sirket)
        if not ad:
            continue
        gorunen, sayi = toplam.get(ad, (s.sirket, 0))
        toplam[ad] = (gorunen, sayi + 1)
    return toplam
