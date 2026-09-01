"""SİNYAL → RESMÎ İLAN KÖPRÜSÜ

Keşif bitti. Bu modül keşfi TEKRARLAMIYOR: depodaki sinyalleri alıp
şirketin resmî kaynağına bağlamaya çalışıyor. Bütçenin tamamı bu
köprüye harcanıyor.

BEDAVA KATMANLAR ÖNCE
---------------------
Bir sinyalin şirketi zaten tanıdığımız biriyse arama yapmaya gerek yok.
Sıra: kaynak kaydı → mevcut şirketler → mevcut ilanlar → depodaki
önceki çözüm → ancak sonra arama.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from automation.radar_cozucu import baslik_benzerligi, sadelestir, sirket_adini_normalize_et
from automation.radar_sirket import alan_adini_normalize_et, sirket_alani_olamaz

# ------------------------------------------------------------- öncelik

#: Başlıkta açık staj işareti — çözüm kuyruğunda öne alınıyor.
#: KALİTE KARARI DEĞİL: kaliteyi resmî ilan metni belirliyor. Bu yalnız
#: hangi sinyale önce arama parası harcanacağını söylüyor.
ACIK_STAJ = re.compile(
    r"\b(intern|internship|stajyer|staj|working student|co-?op|placement)\b", re.I)

#: Net lokasyon işareti.
NET_KONUM = re.compile(
    r"(t[üu]rkiye|turkey|[iİ]stanbul|ankara|[iİ]zmir|bursa|kocaeli|gebze|antalya)", re.I)

#: Kimliği belirsiz, çok genel şirket adları. Bunlara arama harcamak
#: yanlış şirkete gitme riskini büyütüyor.
GENERIC_AD = re.compile(
    r"^(confidential|gizli|company|[şs]irket|startup|agency|group|holding|"
    r"consulting|technology|teknoloji|yaz[ıi]l[ıi]m|international marketplace)$", re.I)


@dataclass
class Oncelik:
    """Bir sinyalin çözüm sırası ve NEDENİ."""

    puan: int
    nedenler: list[str] = field(default_factory=list)


def oncelik_ver(sirket: str | None, baslik: str | None, konum: str | None,
                bilinen_sirketler: set[str]) -> Oncelik:
    """Resmî kaynak bulunma ihtimaline göre puan. Küçük sayı önce.

    Düşük öncelikli sinyal SİLİNMİYOR: sıraya sonda giriyor ve bütçe
    kalırsa o da denenecek.
    """
    nedenler: list[str] = []
    puan = 50
    ad = sadelestir(sirket)

    if not ad:
        return Oncelik(99, ["şirket okunamadı"])

    if ad in bilinen_sirketler:
        puan -= 30
        nedenler.append("tanınan şirket / kayıtlı kaynak")
    if baslik and ACIK_STAJ.search(baslik):
        puan -= 10
        nedenler.append("başlıkta açık staj işareti")
    if konum and NET_KONUM.search(konum):
        puan -= 8
        nedenler.append("net lokasyon")
    if GENERIC_AD.match(sirket.strip()):
        puan += 25
        nedenler.append("çok genel şirket adı")
    if len(ad.replace(" ", "")) < 4:
        puan += 15
        nedenler.append("şirket adı çok kısa")

    return Oncelik(puan, nedenler)


# --------------------------------------------------------- arama sorgusu

#: Sorgu aileleri. Hangisinin gerçekten yayın adayı ürettiği ölçülüyor
#: ki sonraki turlarda yalnız verimli olan kullanılsın.
AILE_TAM = "sirket+tam_baslik"
AILE_KARIYER = "sirket+baslik+careers"
AILE_ATS = "ats_kapsamli"


def cozum_sorgulari(sirket: str, baslik: str | None, ats: str | None,
                    ats_alanlari: dict[str, str]) -> list[tuple[str, str]]:
    """Bir sinyal için en çok iki sorgu: (aile, sorgu).

    İlk sorgu resmî ilanın KENDİSİNİ arıyor, şirketin ana sayfasını
    değil: "<şirket>" "<başlık>". İkincisi ancak birincisi boş dönerse
    kullanılıyor.
    """
    sorgular: list[tuple[str, str]] = []
    if baslik:
        sorgular.append((AILE_TAM, f'"{sirket}" "{baslik}"'))
    if ats and ats in ats_alanlari:
        # ATS biliniyorsa ikinci sorgu doğrudan oraya daraltılıyor.
        sorgular.append((AILE_ATS, f'site:{ats_alanlari[ats]} "{sirket}"'))
    elif baslik:
        sorgular.append((AILE_KARIYER, f'"{sirket}" "{baslik}" careers'))
    else:
        sorgular.append((AILE_KARIYER, f'"{sirket}" careers jobs'))
    return sorgular[:2]


def sonuc_kabul_edilir_mi(url: str | None) -> bool:
    """Arama sonucu resmî kaynak adayı olabilir mi?

    LinkedIn sinyalini tekrar bulmak çözüm değil: toplayıcılar, sosyal
    ağlar ve rehberler eleniyor. Kalan adres ya şirketin kendi alanı ya
    da bir ATS.
    """
    return bool(url) and not sirket_alani_olamaz(url)


# --------------------------------------------------- eşleşme güveni

# EŞİKLER ÖLÇÜLDÜ, SEÇİLMEDİ
#
# Gerçek çiftlerde örtüşme 0.60–0.85 arasında ("Marketing Intern" ↔
# "Marketing Long Term Internship" 0.70, "Data Science Intern" ↔
# "Data Scientist Intern" 0.85). Alakasız çiftlerde 0.29–0.36
# ("Marketing Intern" ↔ "Senior Backend Engineer" 0.36). İlk eşik
# 0.34'tü ve gürültünün içine düşüyordu: alakasız bir ilan şirket ve
# ATS puanlarıyla birlikte HIGH'a çıkabiliyordu.
BASLIK_HIGH = 0.5
BASLIK_MEDIUM = 0.45


def eslesme_guveni(sinyal_sirket: str, sinyal_baslik: str | None, sinyal_konum: str | None,
                   resmi_sirket: str | None, resmi_baslik: str,
                   resmi_konum: str | None, ats_kimligi: bool) -> tuple[str, list[str]]:
    """LinkedIn sinyali ile resmî ilan aynı pozisyon mu?

    Deterministik sinyaller toplanıyor; tek bir ölçüye güvenilmiyor.
    YALNIZ HIGH yayın adayı olabiliyor.
    """
    kanitlar: list[str] = []
    puan = 0

    if ats_kimligi:
        puan += 2
        kanitlar.append("resmî ATS ilan kimliği")

    if resmi_sirket:
        sirket_orani = baslik_benzerligi(
            sirket_adini_normalize_et(sinyal_sirket),
            sirket_adini_normalize_et(resmi_sirket))
        if sirket_orani >= 0.6:
            puan += 2
            kanitlar.append("şirket kimliği eşleşti")
        elif sirket_orani >= 0.4:
            puan += 1
            kanitlar.append("şirket adı kısmen eşleşti")

    baslik_orani = baslik_benzerligi(sinyal_baslik or "", resmi_baslik)
    if baslik_orani >= BASLIK_HIGH:
        puan += 2
        kanitlar.append(f"başlık örtüşmesi {baslik_orani:.2f}")
    elif baslik_orani >= BASLIK_MEDIUM:
        puan += 1
        kanitlar.append(f"başlık örtüşmesi zayıf {baslik_orani:.2f}")
    else:
        return "LOW", kanitlar + [f"başlık örtüşmesi yetersiz {baslik_orani:.2f}"]

    if sinyal_konum and resmi_konum:
        a, b = sadelestir(sinyal_konum), sadelestir(resmi_konum)
        if a and b and (a.split(",")[0] in b or b.split(",")[0] in a):
            puan += 1
            kanitlar.append("konum eşleşti")

    # BAŞLIK BİR KAPI, YALNIZ PUAN DEĞİL
    #
    # Şirket kimliği ve ATS kimliği tek başına 4 puan getiriyor; başlık
    # zayıfken bunlar HIGH'a yetmemeli. Aynı şirketin bambaşka bir
    # pozisyonu, sinyalin karşılığı değildir.
    if puan >= 5 and baslik_orani >= BASLIK_HIGH:
        return "HIGH", kanitlar
    if puan >= 3:
        return "MEDIUM", kanitlar
    return "LOW", kanitlar


def alan_sirkete_ait_mi(sirket: str, alan: str, esik: float = 0.6) -> bool:
    """Alan adı gerçekten bu şirketin mi? YANLIŞ ALAN ÇÖZÜLEMEMİŞTEN KÖTÜ."""
    govde = (alan_adini_normalize_et(alan) or alan).split(".")[0]
    return baslik_benzerligi(sirket_adini_normalize_et(sirket), sadelestir(govde)) >= esik


def sonuc_kabul_edilir_mi_liste(urller: list[str | None]) -> list[str]:
    return [u for u in urller if sonuc_kabul_edilir_mi(u)]
