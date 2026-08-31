"""ŞİRKET KİMLİĞİ ÇÖZÜCÜSÜ V2 — ÜÇ KATMAN

V1 tek şey yapıyordu: şirket adından alan adı TAHMİN edip sayfayı
açıyor, kimlik tutuyorsa kabul ediyordu. Üretim gölge koşusunda
ölçüldü: 47 şirketin 20'si çözüldü, 27'si çözülemedi.

Tahmin `SCO GRUP DANIŞMANLIK İNŞAAT SANAYİ TİCARET LİMİTED` gibi
adlarda çalışmıyor — çalışması da beklenmez.

V2 SIRASI
---------
    KATMAN 1 — StajımVar'ın zaten bildiği şirketler   (kanıt: kendi verimiz)
    KATMAN 2 — Keşif kaynağının şirket metadata'sı     (kanıt: kaynak)
    KATMAN 3 — Kamuya açık arama                        (kanıt: sağlayıcı)
    ——— ancak bunlardan sonra ———
    TAHMİN   — yalnız DESTEKLEYİCİ, tek başına HIGH vermiyor

ANA KURAL
---------
DOMAIN TAHMİNİ KANIT DEĞİLDİR. ARAMA SONUCU DA KANIT DEĞİLDİR.
Adres bulunduktan sonra KİMLİĞİ DOĞRULANIR; doğrulanmadan güven
yükselmez. Yanlış alan adı, çözülememiş olmaktan kötüdür.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Protocol
from urllib.parse import urlparse

from automation.radar_cozucu import (
    Kanit,
    benzerlik,
    sadelestir,
    sirket_adini_normalize_et,
    toplayici_mi,
)

# ---------------------------------------------------------------- engel

#: Şirketin resmî alan adı OLAMAYACAK alanlar.
#:
#: İKİNCİ BİR GÜVEN SİSTEMİ DEĞİL: toplayıcı listesi `radar_cozucu`
#: içindeki canonical `toplayici_mi` yardımcısından geliyor. Buradaki
#: liste yalnızca ONA EK — sosyal ağlar, rehberler ve ansiklopediler.
#: Bir alan bu listede ya da toplayıcı listesindeyse şirket adresi
#: sayılmıyor.
EK_ENGELLI_ALANLAR = (
    "instagram.com", "facebook.com", "twitter.com", "x.com",
    "youtube.com", "tiktok.com", "medium.com", "blogspot.com",
    "wordpress.com", "wikipedia.org", "vikipedi.org",
    "firmarehberi", "sirketrehberi", "ticaretsicil",
    "haberturk.com", "hurriyet.com.tr", "milliyet.com.tr",
    "sozcu.com.tr", "dunya.com", "bloomberght.com",
    "google.com", "bing.com", "yandex.com",
)


def sirket_alani_olamaz(alan_veya_url: str | None) -> bool:
    """Bu adres bir şirketin resmî alan adı olabilir mi?"""
    if not alan_veya_url:
        return True
    if toplayici_mi(alan_veya_url):
        return True
    d = alan_veya_url.lower()
    return any(e in d for e in EK_ENGELLI_ALANLAR)


def alan_adini_normalize_et(url_veya_alan: str | None) -> str | None:
    """Adresten karşılaştırılabilir alan adı çıkarır.

    `http/https`, `www.` ve yol atılıyor: `https://www.abc.com.tr/kariyer`
    ile `abc.com.tr` aynı alan.
    """
    if not url_veya_alan:
        return None
    t = url_veya_alan.strip()
    if "//" not in t:
        t = "https://" + t
    ag = urlparse(t).netloc.lower()
    if not ag:
        return None
    if ag.startswith("www."):
        ag = ag[4:]
    return ag.split(":")[0] or None


# ------------------------------------------------------------ katman 3


class AramaSaglayici(Protocol):
    """Kamuya açık arama sağlayıcısı arayüzü.

    SERP HTML kazımak YOK: sağlayıcı resmî bir API olmalı. Anahtar
    ortam değişkeninden geliyor, depoya yazılmıyor ve loglanmıyor.
    """

    def ara(self, sorgu: str) -> list[dict]:  # pragma: no cover - arayüz
        """`[{"title": ..., "url": ...}]` döndürür."""
        ...


class AramaYok:
    """Yapılandırılmış sağlayıcı yokken kullanılan sessiz sağlayıcı.

    Radar ÇALIŞMAYA DEVAM EDİYOR; yalnızca üçüncü katman devre dışı
    kalıyor ve raporda böyle görünüyor. Sağlayıcı hatası da radarı
    düşürmüyor — aynı yol.
    """

    kullanilabilir = False
    ad = "yapilandirilmamis"

    def ara(self, sorgu: str) -> list[dict]:
        return []


# ------------------------------------------------------------- kanıtlar


@dataclass
class SirketCozumu:
    """Alan adı, güveni ve NEDENİ."""

    alan_adi: str | None
    guven: str  # HIGH | MEDIUM | LOW
    katman: str  # ic_veri | kaynak | arama | tahmin | yok
    kanitlar: list[str] = field(default_factory=list)

    @property
    def var(self) -> bool:
        return bool(self.alan_adi)

    @property
    def otomatik_kullanilabilir(self) -> bool:
        """Yalnız HIGH aşağı akışa gidiyor. MEDIUM insan kuyruğunda."""
        return self.var and self.guven == "HIGH"


COZULEMEDI = SirketCozumu(None, "LOW", "yok", ["hiçbir katman kanıt üretmedi"])


# ------------------------------------------------------------ katman 1


def ic_veriden_coz(sirket: str, bilgi_tabani: dict[str, str]) -> SirketCozumu:
    """StajımVar'ın zaten bildiği şirketler.

    `bilgi_tabani`: normalize edilmiş şirket adı → alan adı. İçerik
    `companies.website_url`, mevcut ilanların resmî adresleri ve ATS
    kiracılarından geliyor (bkz. `bilgi_tabani_kur`).

    Burada eşleşme varsa ARAMA YAPILMIYOR: kendi doğruladığımız veri
    en güçlü kanıt ve en ucuz yol.
    """
    kok = sirket_adini_normalize_et(sirket)
    if not kok:
        return COZULEMEDI

    if kok in bilgi_tabani:
        return SirketCozumu(
            bilgi_tabani[kok], "HIGH", "ic_veri",
            [f"StajımVar kaydı: '{kok}' → {bilgi_tabani[kok]}"],
        )

    # Yakın ad: yalnız ÇOK yüksek benzerlikte ve tek adayda kabul.
    # "ABC" ile "ABC Global" burada birleşmesin diye eşik yüksek.
    adaylar = [(ad, alan) for ad, alan in bilgi_tabani.items() if benzerlik(kok, ad) >= 0.93]
    if len(adaylar) == 1:
        ad, alan = adaylar[0]
        return SirketCozumu(
            alan, "HIGH", "ic_veri",
            [f"StajımVar kaydıyla yakın ad eşleşmesi: '{ad}' → {alan}"],
        )
    if len(adaylar) > 1:
        return SirketCozumu(
            None, "LOW", "ic_veri",
            [f"{len(adaylar)} farklı StajımVar kaydı eşleşti — belirsiz"],
        )
    return COZULEMEDI


def bilgi_tabani_kur(sirketler: list[dict], ilanlar: list[dict]) -> dict[str, str]:
    """Kendi verimizden şirket → alan adı sözlüğü.

    Üç kaynak: şirket kaydındaki site adresi, yayındaki ilanların resmî
    adresleri ve ATS kiracıları. ATS adresleri (jobs.lever.co/x) şirket
    ALANI değil ama kariyer kaynağı olarak değerli — ayrı tutuluyor.
    """
    tabani: dict[str, str] = {}
    for s in sirketler:
        ad = sirket_adini_normalize_et(s.get("name"))
        alan = alan_adini_normalize_et(s.get("website_url"))
        if ad and alan and not sirket_alani_olamaz(alan):
            tabani.setdefault(ad, alan)

    for i in ilanlar:
        ad = sirket_adini_normalize_et((i.get("companies") or {}).get("name") or i.get("company_name"))
        if not ad or ad in tabani:
            continue
        for anahtar in ("canonical_url", "apply_url", "source_url"):
            alan = alan_adini_normalize_et(i.get(anahtar))
            if alan and not sirket_alani_olamaz(alan):
                tabani.setdefault(ad, alan)
                break
    return tabani


# ------------------------------------------------------------ katman 3


def aramadan_coz(sirket: str, saglayici, sorgu_butcesi: int = 2) -> tuple[SirketCozumu, int]:
    """Kamuya açık aramadan aday alan adları çıkarır.

    Arama sonucu KANIT DEĞİL, aday üretiyor. Kimlik doğrulaması
    `kimligi_dogrula` içinde ve ayrı.

    Sorgu bütçesi şirket başına sınırlı: keşif kaynağında 47 şirket
    varken 47×n sorgu atmak hem pahalı hem gereksiz.
    """
    if not getattr(saglayici, "kullanilabilir", False):
        return SirketCozumu(None, "LOW", "arama", ["arama katmanı yapılandırılmamış"]), 0

    kok = sirket_adini_normalize_et(sirket)
    sorgular = [f'"{sirket}" resmi site', f'"{sirket}" kariyer'][:sorgu_butcesi]
    adaylar: list[str] = []
    kullanilan = 0
    for sorgu in sorgular:
        try:
            sonuclar = saglayici.ara(sorgu)
        except Exception:
            # Sağlayıcı hatası radarı düşürmüyor.
            return SirketCozumu(None, "LOW", "arama", ["arama sağlayıcı hatası"]), kullanilan
        kullanilan += 1
        for s in sonuclar[:5]:
            alan = alan_adini_normalize_et(s.get("url"))
            if alan and not sirket_alani_olamaz(alan) and alan not in adaylar:
                adaylar.append(alan)
        if adaylar:
            break

    if not adaylar:
        return SirketCozumu(None, "LOW", "arama", ["arama aday alan adı vermedi"]), kullanilan
    return SirketCozumu(
        adaylar[0], "MEDIUM", "arama",
        [f"arama adayı: {', '.join(adaylar[:3])}"],
    ), kullanilan


# --------------------------------------------------------- kimlik kanıtı


def _ld_json_adlari(govde: str) -> list[str]:
    """Organization/LocalBusiness gibi yapısal veri adları."""
    adlar: list[str] = []
    for m in re.finditer(r'"name"\s*:\s*"([^"]{2,80})"', govde[:200000]):
        adlar.append(m.group(1))
    return adlar[:20]


def kimligi_dogrula(sirket: str, alan_adi: str, getir) -> tuple[str, list[str]]:
    """Adresi açar ve ŞİRKET KİMLİĞİ arar.

    Birden fazla BAĞIMSIZ sinyal HIGH üretiyor:
      · sayfa başlığı
      · og:site_name
      · yapısal veri adı (Organization)
      · alan adının kendisi şirket adını taşıyor

    Tek sinyal MEDIUM. Hiçbiri yoksa LOW — ve LOW kullanılmıyor.
    """
    kok = sirket_adini_normalize_et(sirket)
    if not kok:
        return "LOW", ["şirket adı normalleştirilemedi"]

    try:
        durum, govde = getir(f"https://{alan_adi}/")
    except Exception:
        return "LOW", ["adres açılamadı"]
    if durum != 200 or not govde:
        return "LOW", [f"adres {durum} döndü"]

    kanitlar: list[str] = []

    baslik = ""
    m = re.search(r"<title[^>]*>(.*?)</title>", govde, re.I | re.S)
    if m:
        baslik = m.group(1)
        if kok in sadelestir(baslik) or benzerlik(kok, sirket_adini_normalize_et(baslik)) >= 0.72:
            kanitlar.append(f"sayfa başlığı: {baslik.strip()[:60]}")

    for og in re.finditer(
        r'<meta[^>]+property=["\']og:site_name["\'][^>]+content=["\']([^"\']+)', govde, re.I
    ):
        if kok in sadelestir(og.group(1)) or benzerlik(kok, sirket_adini_normalize_et(og.group(1))) >= 0.72:
            kanitlar.append(f"og:site_name: {og.group(1)[:40]}")
            break

    for ad in _ld_json_adlari(govde):
        if kok in sadelestir(ad) or benzerlik(kok, sirket_adini_normalize_et(ad)) >= 0.80:
            kanitlar.append(f"yapısal veri adı: {ad[:40]}")
            break

    # Alan adının kendisi: "koton.com" → kok "koton" içinde geçiyor.
    alan_kok = sadelestir(alan_adi.split(".")[0])
    if alan_kok and (alan_kok in kok.replace(" ", "") or kok.replace(" ", "").startswith(alan_kok)):
        kanitlar.append(f"alan adı şirket adını taşıyor: {alan_adi}")

    if len(kanitlar) >= 2:
        return "HIGH", kanitlar
    if len(kanitlar) == 1:
        return "MEDIUM", kanitlar
    return "LOW", ["sayfada şirket kimliği bulunamadı"]


# ------------------------------------------------------------- tahmin


def tahmin_adaylari(sirket: str) -> list[str]:
    """Ad'dan alan adı adayları. KANIT DEĞİL, yalnız aday.

    V1'e göre iki ekleme: kesme işareti düşürülüyor (`COLIN'S` →
    `colins`) ve ilk İKİ kelime de deneniyor (`ahlatci holding` →
    `ahlatciholding`), çünkü Türkiye şirketlerinde marka çoğu zaman ilk
    iki kelimede.
    """
    kok = sirket_adini_normalize_et(sirket)
    if not kok:
        return []
    kelimeler = kok.split()

    # "HOLDING" MARKANIN PARÇASI OLABİLİR
    #
    # Normalleştirme `holding`, `group`, `grup` gibi ekleri düşürüyor —
    # karşılaştırma için doğru, ama alan adı için bilgi kaybı:
    # "Ahlatcı Holding" gerçekte `ahlatciholding.com.tr`. Bu yüzden
    # adaylar HEM eksiz kökten HEM de yalnız hukuki biçim atılmış
    # hâlden üretiliyor.
    genis = re.sub(r"(a s|as|ltd sti|ltd|sti|inc|llc|gmbh|sanayi|ticaret|san|tic|ve)", " ",
                   sadelestir(sirket))
    genis = re.sub(r"\s+", " ", genis).strip()
    genis_kelimeler = genis.split()

    govdeler = [
        kok.replace(" ", ""),
        "-".join(kelimeler),
        kelimeler[0] if kelimeler else "",
        "".join(kelimeler[:2]) if len(kelimeler) >= 2 else "",
        genis.replace(" ", ""),
        "".join(genis_kelimeler[:2]) if len(genis_kelimeler) >= 2 else "",
    ]
    adaylar: list[str] = []
    for g in dict.fromkeys(x for x in govdeler if len(x) >= 3):
        for uzanti in (".com.tr", ".com", ".net", ".tr"):
            aday = g + uzanti
            if aday not in adaylar:
                adaylar.append(aday)
    return adaylar[:16]


# ------------------------------------------------------------ orkestra


def sirketi_coz(
    sirket: str,
    getir,
    bilgi_tabani: dict[str, str],
    saglayici=None,
    onbellek: dict[str, SirketCozumu] | None = None,
) -> tuple[SirketCozumu, int]:
    """Üç katmanı sırayla dener ve kimliği doğrular.

    Dönen ikinci değer harcanan arama sorgusu sayısı — maliyet
    raporlanabilsin diye.
    """
    kok = sirket_adini_normalize_et(sirket)
    if onbellek is not None and kok in onbellek:
        c = onbellek[kok]
        return SirketCozumu(c.alan_adi, c.guven, c.katman, c.kanitlar + ["önbellekten"]), 0

    saglayici = saglayici or AramaYok()
    sorgu = 0

    # KATMAN 1 — kendi verimiz. Doğrulama gerekmiyor: zaten bizim.
    ic = ic_veriden_coz(sirket, bilgi_tabani)
    if ic.otomatik_kullanilabilir:
        if onbellek is not None:
            onbellek[kok] = ic
        return ic, 0

    # KATMAN 3 — arama (KATMAN 2 keşif kaynağı CAPTCHA arkasında; bkz.
    # radar_kaynaklar. Aşılmıyor, o yüzden burada yok.)
    aday_listesi: list[tuple[str, str]] = []
    arama, sorgu = aramadan_coz(sirket, saglayici)
    if arama.var:
        aday_listesi.append((arama.alan_adi, "arama"))

    # TAHMİN — en sonda ve yalnız destekleyici.
    for t in tahmin_adaylari(sirket):
        if not sirket_alani_olamaz(t):
            aday_listesi.append((t, "tahmin"))

    # İLK MEDIUM'DA DURMUYORUZ
    #
    # Önceki sürüm ilk MEDIUM adayda dönüyordu ve kalan adaylara hiç
    # bakmıyordu. Üretimde ölçüldü: Brave 69 sorgu attı, 40'ı sonuç
    # verdi, ama HIGH sayısı 18'de kaldı — çünkü zayıf bir aday güçlü
    # olanın önünü kesiyordu. MEDIUM saklanıyor, tarama HIGH için
    # sürüyor; HIGH bulunmazsa en iyi MEDIUM dönüyor.
    en_iyi_orta: SirketCozumu | None = None
    for alan, katman in aday_listesi:
        guven, kanitlar = kimligi_dogrula(sirket, alan, getir)
        if guven == "HIGH":
            sonuc = SirketCozumu(alan, "HIGH", katman, kanitlar)
            if onbellek is not None:
                onbellek[kok] = sonuc
            return sonuc, sorgu
        if guven == "MEDIUM" and en_iyi_orta is None:
            en_iyi_orta = SirketCozumu(alan, "MEDIUM", katman, kanitlar)

    if en_iyi_orta is not None:
        if onbellek is not None:
            onbellek[kok] = en_iyi_orta
        return en_iyi_orta, sorgu

    sonuc = SirketCozumu(None, "LOW", "yok", ["hiçbir aday kimlik doğrulayamadı"])
    if onbellek is not None:
        onbellek[kok] = sonuc
    return sonuc, sorgu
