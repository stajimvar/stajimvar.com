"""KEŞİF KAYNAKLARI — YALNIZ METADATA

Bu modül Kariyer.net ve Youthall'dan yalnızca ŞU dört şeyi alıyor:

    şirket adı · ilan başlığı · konum · keşif adresi

İlan AÇIKLAMASI, ücret, yan haklar ALINMIYOR. Toplayıcının metnini
canonical kayda kopyalamak, ilanı oradan üretmek olurdu; oysa ilanın
kendisi şirketin resmî kaynağında.

ERİŞİM KURALI
-------------
Yalnızca normal biçimde kamuya açık yüzeyler. CAPTCHA, giriş duvarı ya
da bot engeli görülürse KAYNAK KAPANIYOR ve raporlanıyor — aşılmıyor.
robots.txt'te yasaklanmış yollar hiç denenmiyor.

Ölçüldü (31 Ağustos 2026):
  kariyer.net/robots.txt  → ilan yolları serbest; /filtre, /ozgecmis,
                            /profil, /hesabim yasak (kullanılmıyor)
  youthall.com/robots.txt → Allow: /
  linkedin.com/robots.txt → Disallow: /  → ADAPTÖR YAZILMADI
"""

from __future__ import annotations

import re
import time
from dataclasses import dataclass

KULLANICI_AJANI = "StajimVarRadar/1.0 (+https://stajimvar.com; kesif-metadata)"

#: Kaynaklar arasında ve istekler arasında bekleme. Radar saatlik
#: çalışmıyor; kaynağa yük bindirmenin sebebi yok.
ISTEK_ARASI_SANIYE = 1.5

#: Bot duvarı işaretleri. Görülürse kaynak kapanıyor.
DUVAR_IZLERI = (
    "just a moment", "cf-browser-verification", "attention required",
    "access denied", "please enable javascript and cookies",
    "/cdn-cgi/challenge-platform",
)


@dataclass(frozen=True)
class Sinyal:
    """Keşif sinyali. Açıklama YOK — bilinçli."""

    source: str
    source_url: str
    company_name_raw: str
    title_raw: str
    location_raw: str | None


class KaynakKapali(RuntimeError):
    """Kaynak otomasyona kapalı. Aşılmıyor, raporlanıyor."""


def _duvar_mi(govde: str) -> bool:
    alt = govde[:4000].lower()
    return any(iz in alt for iz in DUVAR_IZLERI)


def _metni_ayikla(ham: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", ham)).strip()


def kariyer_net(getir, sayfa_sayisi: int = 3) -> list[Sinyal]:
    """Kariyer.net staj ilanı listelerinden metadata toplar.

    Yalnızca `/is-ilanlari/...` liste sayfaları ve oradaki `/is-ilani/`
    bağlantıları. `/filtre` yolları robots.txt'te yasak — kullanılmıyor.
    """
    sinyaller: list[Sinyal] = []
    gorulen: set[str] = set()

    for sayfa in range(1, sayfa_sayisi + 1):
        url = "https://www.kariyer.net/is-ilanlari/stajyer"
        if sayfa > 1:
            url = f"{url}?sayfa={sayfa}"
        durum, govde = getir(url)
        if durum != 200 or not govde:
            break
        if _duvar_mi(govde):
            raise KaynakKapali("kariyer.net bot duvarı döndürdü")

        # Liste kartları: ilan bağı + yanındaki şirket/konum metni.
        for m in re.finditer(
            r'<a[^>]+href="(/is-ilani/[^"]+)"[^>]*>(.*?)</a>', govde, re.I | re.S
        ):
            yol, ic = m.group(1), _metni_ayikla(m.group(2))
            if not ic or yol in gorulen:
                continue
            gorulen.add(yol)
            # Kart metni "Başlık Şirket Konum" biçiminde geliyor; slug
            # şirketi de taşıyor. Başlık kart metninin ilk parçası.
            baslik = ic[:120]
            sirket = _kariyer_sirket(yol, ic)
            if not sirket or not baslik:
                continue
            sinyaller.append(
                Sinyal("kariyer.net", "https://www.kariyer.net" + yol, sirket, baslik, None)
            )
        time.sleep(ISTEK_ARASI_SANIYE)

    return sinyaller


def _kariyer_sirket(yol: str, kart_metni: str) -> str | None:
    """Şirket adını kart metninden ya da slug'dan çıkarır.

    Slug `sirket-adi-pozisyon-1234567` biçiminde; sondaki sayı ilan
    kimliği. Kart metni varsa o tercih ediliyor — slug kısaltılmış
    olabiliyor.
    """
    m = re.search(r"/is-ilani/(.+?)-(\d+)$", yol)
    slug = m.group(1).replace("-", " ") if m else ""
    return (kart_metni.split("  ")[0][:80] or slug[:80]) or None


def youthall(getir, sayfa_sayisi: int = 2) -> list[Sinyal]:
    """Youthall staj ilanı listelerinden metadata toplar."""
    sinyaller: list[Sinyal] = []
    gorulen: set[str] = set()

    for sayfa in range(1, sayfa_sayisi + 1):
        url = "https://www.youthall.com/tr/is-ilanlari/"
        if sayfa > 1:
            url = f"{url}?page={sayfa}"
        durum, govde = getir(url)
        if durum != 200 or not govde:
            break
        if _duvar_mi(govde):
            raise KaynakKapali("youthall bot duvarı döndürdü")

        for m in re.finditer(
            r'<a[^>]+href="(/tr/(?:is-ilani|job)/[^"]+)"[^>]*>(.*?)</a>', govde, re.I | re.S
        ):
            yol, ic = m.group(1), _metni_ayikla(m.group(2))
            if not ic or yol in gorulen:
                continue
            gorulen.add(yol)
            parcalar = [p for p in ic.split("  ") if p.strip()]
            baslik = parcalar[0][:120] if parcalar else ic[:120]
            sirket = parcalar[1][:80] if len(parcalar) > 1 else None
            if not sirket:
                continue
            sinyaller.append(
                Sinyal("youthall", "https://www.youthall.com" + yol, sirket, baslik, None)
            )
        time.sleep(ISTEK_ARASI_SANIYE)

    return sinyaller


# LinkedIn adaptörü BİLEREK YOK.
#
# linkedin.com/robots.txt: "User-agent: * / Disallow: /" — sitenin
# tamamı otomasyona kapalı ve beyaz liste başvurusu için e-posta adresi
# veriyor. Engeli aşmak bu ürünün kuralı değil; kaynak yazılmadı.
LINKEDIN_NEDEN_YOK = (
    "linkedin.com/robots.txt tüm yolları otomasyona kapatıyor "
    "(User-agent: * / Disallow: /). Beyaz liste başvurusu olmadan "
    "sürdürülebilir bir kamuya açık keşif yüzeyi yok."
)
