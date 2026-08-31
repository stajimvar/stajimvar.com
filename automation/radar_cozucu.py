"""KEŞİF RADARI — SİNYALDEN RESMÎ KAYNAĞA

Radar bir ilanı Kariyer.net ya da Youthall'da görür. Bu KANIT DEĞİL,
şüphedir: "bu şirkette böyle bir pozisyon olabilir."

Bu modül şüpheyi kanıta çevirmeye çalışır:

    şirket adı → resmî alan adı → kariyer sayfası / ATS
                → aynı ilanın resmî kaydı

Her adım KANIT üretir. Kanıt yoksa zincir kopar ve sinyal
`unresolved` kalır — tahminle yayına çıkmaz.

BU MODÜL AĞA ÇIKMAYAN KARARLARI SAF TUTAR
-----------------------------------------
Normalleştirme, benzerlik ve eşleştirme kararları saf işlevler;
testleri ağ olmadan çalışıyor. Ağ erişimi yalnızca `dogrula_alan_adi`
ve `kariyer_kaynagi_bul` içinde ve dışarıdan verilen bir `getir`
işleviyle — testler onu değiştirebiliyor.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from difflib import SequenceMatcher

# ------------------------------------------------------------- sabitler

#: Ticari unvan ekleri. Şirket kimliğini değiştirmiyorlar; karşılaştırma
#: için düşürülüyorlar. "A.Ş." ile "AŞ" aynı şirket.
HUKUKI_EKLER = (
    "anonim sirketi", "limited sirketi", "kollektif sirketi",
    "sanayi ve ticaret", "sanayi ticaret", "ticaret ve sanayi",
    "san ve tic", "san tic", "tic ve san",
    "a s", "as", "ltd sti", "ltd", "sti", "inc", "llc", "gmbh",
    "corp", "corporation", "co", "plc", "bv", "nv", "sarl", "sagl",
    "holding", "group", "grup",
)

#: Resmî kaynak SAYILMAYAN alanlar — Sprint 1'deki tanımla aynı.
#: Radar bunları keşif için kullanıyor, canonical kaynak yapmıyor.
TOPLAYICILAR = (
    "kariyer.net", "youthall.com", "linkedin.com", "secretcv.com",
    "indeed.com", "glassdoor.com", "yenibiris.com", "eleman.net",
    "jobs.tr", "toptalent.co",
)

#: ATS imzaları: adresten ya da sayfa gövdesinden tanınıyor.
#: Sprint 1'de altı adaptör vardı; radar bunlardan FAZLASINI TANIYOR
#: çünkü boşluk analizi "hangi adaptörü yazmalıyız" sorusuna sayıyla
#: cevap verecek. Tanımak ≠ toplamak.
ATS_IMZALARI: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("lever", ("jobs.lever.co", "api.lever.co")),
    ("greenhouse", ("boards.greenhouse.io", "job-boards.greenhouse.io", "greenhouse.io/embed")),
    ("workable", ("jobs.workable.com", "apply.workable.com", ".workable.com")),
    ("ashby", ("jobs.ashbyhq.com", "ashbyhq.com")),
    ("smartrecruiters", ("careers.smartrecruiters.com", "jobs.smartrecruiters.com")),
    ("workday", ("myworkdayjobs.com", "wd1.myworkdaysite.com", "wd3.myworkdayjobs.com")),
    ("successfactors", ("successfactors.eu", "successfactors.com", "sapsf.eu", "sapsf.com", "career5.successfactors")),
    ("teamtailor", ("teamtailor.com",)),
    ("recruitee", ("recruitee.com",)),
    ("taleo", ("taleo.net", "tbe.taleo.net")),
    ("personio", ("jobs.personio.de", "personio.de", "jobs.personio.com")),
    ("kariyer_kurumsal", ("kariyer.net/kurumsal",)),
)

#: Kariyer sayfası için denenen yollar. Sıra önemli: Türkçe yazımlar
#: önce, çünkü kaynak Türkiye şirketleri.
KARIYER_YOLLARI = (
    "/kariyer", "/kariyerimiz", "/tr/kariyer", "/insan-kaynaklari",
    "/careers", "/career", "/jobs", "/tr/careers",
    "/open-positions", "/vacancies", "/is-firsatlari",
)


def sadelestir(metin: str | None) -> str:
    """Karşılaştırma için sadeleştirir.

    Türkçe'ye özel iki tuzak var: noktasız `ı` NFKD ile AYRIŞMIYOR ve
    `İ` küçültülünce iki karaktere düşüyor. Bu yüzden harf eşlemesi
    elle yapılıyor.
    """
    if not metin:
        return ""
    t = metin.strip().lower()
    for a, b in (("ı", "i"), ("İ".lower(), "i"), ("ğ", "g"), ("ü", "u"),
                 ("ş", "s"), ("ö", "o"), ("ç", "c"), ("â", "a"), ("î", "i")):
        t = t.replace(a, b)
    t = unicodedata.normalize("NFKD", t)
    t = "".join(c for c in t if not unicodedata.combining(c))
    t = re.sub(r"[^a-z0-9]+", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def sirket_adini_normalize_et(ad: str | None) -> str:
    """Ticari unvan eklerini düşürür.

    `ABC Teknoloji A.Ş.` ile `ABC Technology` AYNI ada inmiyor —
    inmemeli de. Bu işlev yalnızca ekleri temizliyor; farklı iki adı
    birbirine EŞİTLEMİYOR. `ABC` ile `ABC Global` ayrı kalıyor.
    """
    t = sadelestir(ad)
    if not t:
        return ""
    degisti = True
    while degisti:
        degisti = False
        for ek in HUKUKI_EKLER:
            if t.endswith(" " + ek):
                t = t[: -(len(ek) + 1)].strip()
                degisti = True
    return t


def benzerlik(a: str, b: str) -> float:
    """0–1 arası deterministik benzerlik. Model yok, açıklanabilir."""
    x, y = sadelestir(a), sadelestir(b)
    if not x or not y:
        return 0.0
    return SequenceMatcher(None, x, y).ratio()


#: Başlıkta ayırt edici olmayan kelimeler. Tek başlarına eşleşme kanıtı
#: değiller: neredeyse her ilan başlığında geçiyorlar.
DOLGU_KELIMELER = frozenset({
    "for", "and", "the", "of", "in", "at", "ve", "ile", "icin",
    "intern", "internship", "staj", "stajyer", "stajyeri",
})


def baslik_benzerligi(sinyal: str, resmi: str) -> float:
    """İki İŞ BAŞLIĞININ aynı ilanı gösterme olasılığı.

    NEDEN ŞİRKET ADINDAN FARKLI BİR ÖLÇÜ
    ------------------------------------
    Resmî başlık çoğu zaman keşif başlığının UZATILMIŞ hâli:

        "Management Trainee"  ⊂  "Management Trainee for People &
                                  Culture (Fresh Grad)"

    Katı dizi benzerliği burada 0.55 veriyor ve aynı ilanı kaçırıyor.
    Kapsama ölçüsü doğru cevabı veriyor.

    Ama aynı ölçü ŞİRKET ADINDA yanlış olurdu: "ABC" ⊂ "ABC Global"
    kapsanıyor, oysa ikisi farklı şirket. Bu yüzden iki ayrı ölçü var —
    farklı sorular, farklı cevaplar.

    Dolgu kelimeler kapsama sayımına girmiyor: yalnız "intern" ortak
    diye iki farklı staj ilanı aynı sayılmıyor.
    """
    a = {k for k in sadelestir(sinyal).split() if k and k not in DOLGU_KELIMELER}
    b = {k for k in sadelestir(resmi).split() if k and k not in DOLGU_KELIMELER}
    oran = benzerlik(sinyal, resmi)
    # Ayırt edici kelime kalmadıysa yalnız dizi benzerliği konuşuyor.
    if len(a) < 2 or not b:
        return oran
    kapsama = len(a & b) / len(a)
    return max(oran, kapsama)


def toplayici_mi(url: str | None) -> bool:
    """Adres bir iş ilanı toplayıcısına mı ait?"""
    if not url:
        return False
    d = url.lower()
    return any(alan in d for alan in TOPLAYICILAR)


def ats_tani(url_veya_govde: str | None) -> str | None:
    """Adres ya da sayfa gövdesinden ATS'i tanır. Tanımıyorsa None."""
    if not url_veya_govde:
        return None
    d = url_veya_govde.lower()
    for ad, imzalar in ATS_IMZALARI:
        if any(i in d for i in imzalar):
            return ad
    return None


# ------------------------------------------------------------- kanıtlar


@dataclass
class Kanit:
    """Bir çözüm adımının sonucu ve NEDENİ.

    Gerekçesiz karar yok: her adım neye dayandığını yazıyor.
    """

    deger: str | None
    guven: str  # HIGH | MEDIUM | LOW
    neden: str
    ekler: dict[str, str] = field(default_factory=dict)

    @property
    def var(self) -> bool:
        return bool(self.deger)


BULUNAMADI = Kanit(None, "LOW", "bulunamadı")


def alan_adi_adaylari(sirket: str) -> list[str]:
    """Şirket adından denenecek alan adı adayları.

    Bu yalnızca ADAY üretiyor. Hiçbiri kanıt değil — `dogrula_alan_adi`
    sayfayı çekip şirket kimliğini görmeden hiçbirini kabul etmiyor.
    """
    kok = sirket_adini_normalize_et(sirket)
    if not kok:
        return []
    bitisik = kok.replace(" ", "")
    tireli = kok.replace(" ", "-")
    ilk = kok.split(" ")[0]
    adaylar: list[str] = []
    for govde in dict.fromkeys([bitisik, tireli, ilk]):
        if len(govde) < 3:
            continue
        adaylar += [f"{govde}.com.tr", f"{govde}.com", f"{govde}.tr", f"{govde}.net"]
    return adaylar


def _sayfa_kimligi(govde: str) -> str:
    """Sayfanın kendini nasıl adlandırdığı: başlık + og:site_name."""
    parcalar: list[str] = []
    m = re.search(r"<title[^>]*>(.*?)</title>", govde, re.I | re.S)
    if m:
        parcalar.append(m.group(1))
    for og in re.finditer(
        r'<meta[^>]+property=["\']og:site_name["\'][^>]+content=["\']([^"\']+)', govde, re.I
    ):
        parcalar.append(og.group(1))
    return " ".join(parcalar)


def dogrula_alan_adi(sirket: str, getir, adaylar: list[str] | None = None) -> Kanit:
    """Aday alan adlarını çeker ve ŞİRKET KİMLİĞİNİ arar.

    "200 döndü" kanıt değil: park edilmiş alan adları da 200 döner.
    Kabul için sayfanın kendini şirketin adıyla adlandırması gerekiyor.

    `getir(url) -> (durum, govde)` dışarıdan geliyor; testler ağa
    çıkmadan çalışıyor.
    """
    hedef = sirket_adini_normalize_et(sirket)
    if not hedef:
        return Kanit(None, "LOW", "şirket adı normalleştirilemedi")

    for aday in adaylar if adaylar is not None else alan_adi_adaylari(sirket):
        try:
            durum, govde = getir(f"https://{aday}/")
        except Exception:
            continue
        if durum != 200 or not govde:
            continue

        kimlik = _sayfa_kimligi(govde)
        oran = benzerlik(hedef, sirket_adini_normalize_et(kimlik))
        # Kimlik metni uzun olabilir ("ABC | Anasayfa"); adın geçmesi de
        # güçlü bir işaret.
        iceriyor = hedef and hedef in sadelestir(kimlik)

        if iceriyor or oran >= 0.72:
            return Kanit(
                aday, "HIGH",
                "sayfa kimliği şirket adıyla eşleşti",
                {"sayfa_kimligi": kimlik.strip()[:120], "oran": f"{oran:.2f}"},
            )
        if oran >= 0.55:
            return Kanit(
                aday, "MEDIUM",
                "sayfa kimliği kısmen eşleşti",
                {"sayfa_kimligi": kimlik.strip()[:120], "oran": f"{oran:.2f}"},
            )

    return Kanit(None, "LOW", "resmî alan adı doğrulanamadı")


def kariyer_kaynagi_bul(alan_adi: str, getir) -> Kanit:
    """Şirketin kariyer sayfasını ya da ATS'ini bulur.

    İki yol var ve ikisi de KANIT arıyor:

      1. Ana sayfadaki gerçek bağlantılar — "kariyer" yazan bir bağ.
      2. Bilinen kariyer yolları — ama yalnızca 200 dönmesi YETMİYOR;
         sayfada ilan yapısı ya da ATS imzası da aranıyor.

    Sadece adres tahmin edip 200 geldi diye kariyer sayfası saymak, bir
    şirketin 404 sayfasını kariyer sayfası ilan etmek olurdu.
    """
    try:
        durum, govde = getir(f"https://{alan_adi}/")
    except Exception:
        return Kanit(None, "LOW", "ana sayfa okunamadı")

    if durum == 200 and govde:
        # ATS'e doğrudan bağ veriyor mu?
        ats = ats_tani(govde)
        if ats:
            m = re.search(r'href=["\']([^"\']*(?:' + "|".join(
                re.escape(i) for _, imzalar in ATS_IMZALARI for i in imzalar
            ) + r')[^"\']*)', govde, re.I)
            return Kanit(
                m.group(1) if m else f"https://{alan_adi}/",
                "HIGH", f"ana sayfada {ats} imzası", {"ats": ats},
            )

        # Gerçek gezinme bağı: metninde kariyer/career geçen anchor.
        for m in re.finditer(
            r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.{0,80}?)</a>', govde, re.I | re.S
        ):
            adres, metin = m.group(1), sadelestir(m.group(2))
            if re.search(r"\b(kariyer|career|careers|is firsatlari|jobs)\b", metin):
                tam = adres if adres.startswith("http") else f"https://{alan_adi}{adres if adres.startswith('/') else '/' + adres}"
                return Kanit(tam, "HIGH", "ana sayfada kariyer bağlantısı", {"anchor": metin[:40]})

    # Bilinen yollar — kanıt şart.
    for yol in KARIYER_YOLLARI:
        url = f"https://{alan_adi}{yol}"
        try:
            durum, govde = getir(url)
        except Exception:
            continue
        if durum != 200 or not govde:
            continue
        ats = ats_tani(govde)
        if ats:
            return Kanit(url, "HIGH", f"{yol} sayfasında {ats} imzası", {"ats": ats})
        if re.search(r"\b(a[çc][ıi]k pozisyon|open position|iş ilanlar[ıi]|job openings|pozisyonlar)\b",
                     sadelestir(govde)):
            return Kanit(url, "MEDIUM", f"{yol} sayfasında ilan yapısı")

    return Kanit(None, "LOW", "kariyer kaynağı bulunamadı")


def resmi_ilani_esle(
    sinyal_baslik: str,
    sinyal_konum: str | None,
    resmi_ilanlar: list[dict],
) -> Kanit:
    """Radar sinyalini resmî kaynaktaki ilanlarla eşleştirir.

    Başlıklar birebir olmak zorunda değil: "Yazılım Stajyeri" ile
    "Software Engineering Intern" aynı ilan olabilir. Ama karar
    DETERMİNİSTİK ve açıklanabilir — gizli bir model yok.

    HIGH   → otomatik doğrulanabilir
    MEDIUM → insan kuyruğu
    LOW    → çözülmedi
    """
    if not resmi_ilanlar:
        return Kanit(None, "LOW", "resmî kaynakta ilan bulunamadı")

    en_iyi = None
    en_iyi_oran = 0.0
    for ilan in resmi_ilanlar:
        oran = baslik_benzerligi(sinyal_baslik, ilan.get("title", ""))
        # Konum uyuşması küçük bir destek: tek başına karar vermiyor.
        if sinyal_konum and ilan.get("location"):
            if sadelestir(sinyal_konum) in sadelestir(ilan["location"]):
                oran = min(1.0, oran + 0.08)
        if oran > en_iyi_oran:
            en_iyi_oran, en_iyi = oran, ilan

    if en_iyi is None:
        return Kanit(None, "LOW", "eşleşme yok")

    url = en_iyi.get("url")
    if toplayici_mi(url):
        return Kanit(None, "LOW", "eşleşen adres toplayıcıya ait — resmî kaynak değil")

    if en_iyi_oran >= 0.82:
        return Kanit(url, "HIGH", f"başlık eşleşmesi {en_iyi_oran:.2f}",
                     {"resmi_baslik": en_iyi.get("title", "")[:80]})
    if en_iyi_oran >= 0.60:
        return Kanit(url, "MEDIUM", f"başlık kısmen eşleşti {en_iyi_oran:.2f}",
                     {"resmi_baslik": en_iyi.get("title", "")[:80]})
    return Kanit(None, "LOW", f"en iyi eşleşme zayıf {en_iyi_oran:.2f}")
