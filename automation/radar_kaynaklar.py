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
    """Kariyer.net staj listelerinden metadata toplar.

    KART BAŞINA AYRIŞTIRMA
    ----------------------
    İlk sürüm bağlantı metnini olduğu gibi şirket adı sanıyordu ve
    gölge koşusunda ölçüldü: 61 sinyalin 61'i `company_unresolved`
    döndü, çünkü "şirket adı" gerçekte `Sponsorlu İlan Stajyer
    STRATEJİK İLETİŞİM OFİSİ...` gibi kart metninin tamamıydı.

    Sayfa kartları başlığı ve şehri YAPISAL alanlarda taşıyor
    (`positionName`, `cityName`); şirket adı kart metninde, başlıkla
    şehrin arasında. Artık ikisi kaynağından okunuyor, şirket de
    gürültü ayıklanarak bulunuyor.

    `/filtre` yolları robots.txt'te yasak — kullanılmıyor.
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

        for kart in _kariyer_kartlari(govde):
            yol = kart.get("yol")
            if not yol or yol in gorulen:
                continue
            sirket = kart.get("sirket")
            baslik = kart.get("baslik")
            if not sirket or not baslik:
                continue
            gorulen.add(yol)
            sinyaller.append(
                Sinyal("kariyer.net", "https://www.kariyer.net" + yol,
                       sirket, baslik, kart.get("sehir"))
            )
        time.sleep(ISTEK_ARASI_SANIYE)

    return sinyaller


#: Kart metninde şirket adı OLMAYAN parçalar.
KARIYER_GURULTU = re.compile(
    r"^(sponsorlu ilan|is yerinde|uzaktan|hibrit|yeni|guncellendi|bugun|dun)$",
    re.I,
)


def _oznitelik(blok: str, ad: str) -> str | None:
    m = re.search(ad + r'="([^"]*)"', blok)
    if not m:
        return None
    d = _metni_ayikla(m.group(1))
    return d or None


def _kariyer_kartlari(govde: str) -> list[dict]:
    """Liste sayfasındaki her ilan kartını alanlarına ayırır.

    KART `positionName` ÜZERİNDEN ÇAPALANIYOR
    -----------------------------------------
    İlk deneme `class="job-list-card-item"` üzerinden bölüyordu ve
    ölçümde görüldü: başlık ve şehir öznitelikleri o niteliğin ÖNÜNDE
    duruyor, dolayısıyla bölme onları bir önceki parçada bırakıyordu —
    `baslik` ve `sehir` boş, şirket alanına da başlık düşüyordu.

    Her kartta `positionName` bir kez geçiyor; doğru çapa o.
    """
    kartlar: list[dict] = []
    caplar = [m.start() for m in re.finditer(r'positionName="', govde)]
    for i, bas in enumerate(caplar):
        son = caplar[i + 1] if i + 1 < len(caplar) else min(len(govde), bas + 3000)
        pencere = govde[bas:son]

        m = re.search(r'href="(/is-ilani/[^"]+)"', pencere)
        if not m:
            continue

        baslik = _oznitelik(pencere, "positionName")
        sehir = _oznitelik(pencere, "cityName")
        if not baslik:
            continue

        # Metin parçaları yalnız ilk `>` işaretinden SONRA başlıyor:
        # öncesi hâlâ açılış etiketinin öznitelikleri.
        # ŞİRKET, ŞEHRİN BİR ÖNCESİ
        #
        # Kart metni sabit sırada geliyor:
        #     [Sponsorlu İlan] · görünür başlık · ŞİRKET · şehir · çalışma
        # Görünür başlık `positionName` özniteliğiyle birebir aynı
        # olmayabiliyor (kısaltılmış ya da farklı yazım), bu yüzden
        # "başlığa eşit olanı atla" kuralı yetmiyordu ve şirket yuvasına
        # başlık düşüyordu. Şehir yapısal olarak BİLİNİYOR — sağlam çapa
        # o: şirket, şehirden hemen önceki parça.
        govde_ici = pencere[pencere.find(">") + 1:] if ">" in pencere else pencere
        parcalar = [
            p for p in (_metni_ayikla(x) for x in re.split(r"<[^>]+>", govde_ici))
            if p and 2 <= len(p) <= 80 and not KARIYER_GURULTU.match(p)
        ]
        sirket = None
        if sehir:
            sehir_kok = sehir.split("(")[0].strip().lower()
            for i, p in enumerate(parcalar):
                if p.lower().startswith(sehir_kok) and i > 0:
                    sirket = parcalar[i - 1]
                    break
        if not sirket:
            # Şehir bulunamadıysa başlık olmayan ilk parçaya düşülüyor.
            sirket = next((p for p in parcalar if p.lower() != baslik.lower()), None)

        kartlar.append({"yol": m.group(1), "baslik": baslik, "sirket": sirket, "sehir": sehir})
    return kartlar


def youthall(getir, sayfa_sayisi: int = 2) -> list[Sinyal]:
    """Youthall staj ilanı listelerinden metadata toplar.

    ÖLÇÜLDÜ: BU KAYNAK HENÜZ SUNUCUDAN İLAN VERMİYOR
    ------------------------------------------------
    31 Ağustos 2026 gölge koşusunda 0 sinyal döndü ve nedeni ölçüldü:
    `/tr/is-ilanlari/` sayfası 200 dönüyor (286 KB) ama sunucudan gelen
    HTML'de tek bir ilan adresi YOK — yalnız kategori bağları
    (`/tr/is-ilanlari/stajyer/`, `/part-time/` gibi). `__NEXT_DATA__`
    ya da gömülü ilan JSON'u da yok; liste istemci tarafında
    çiziliyor.

    Bu bir ENGEL DEĞİL: robots.txt izin veriyor, bot duvarı yok. Teknik
    bir boşluk — ilanları görmek için sayfanın JavaScript'ini
    çalıştırmak gerekiyor ve bu sprintte tarayıcı çalıştırma yok.

    İşlev yerinde bırakılıyor: kaynak sunucu tarafı HTML vermeye
    başlarsa ya da bir sonraki turda kuyruk eklendiğinde arayüz hazır.
    """
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
