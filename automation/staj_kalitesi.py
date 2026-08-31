"""STAJ KALİTE KAPISI — ÇOK SİNYALLİ VE AÇIKLANABİLİR

NEDEN
-----
Eldeki süzgeç tek bir düzenli ifadeydi ve başlık ile açıklamayı aynı
torbaya atıyordu::

    EARLY_CAREER = staj|stajyer|intern(ship)|trainee|co-op

`trainee` tek başına POZİTİF sayıldığı için tam zamanlı yönetici
yetiştirme programları staj diye içeri giriyordu. Tersi de mümkündü:
başlığında "intern" geçmeyen gerçek bir staj programı elenebilirdi.

Ölçüldü (üretim, 31 Ağustos 2026): `İnsan Kaynakları Yönetici Adayı
(MT)` kaydı bu yüzden yayındaydı. Resmi kaynağında (Lever) unvan
"Management Trainee for People & Culture (Fresh Grad)", istihdam türü
"Full-Time" ve metinde tek bir staj/öğrenci sinyali yok — geçen dört
"intern" eşleşmesinin dördü de "internal" kelimesinin içinde.

KURAL
-----
BAŞLIK TEK BAŞINA HÜKÜM VERMEZ. Sinyal önceliği:

    1. İstihdam türü / ATS meta verisi
    2. Açıklamadaki açık öğrenci-staj ifadeleri
    3. Program ayrıntıları
    4. Başlık

Karar deterministik ve gerekçeli: her sınıflandırma hangi sinyale
dayandığını yazıyor. Puan yok, model yok — "%87 kaliteli" gibi
açıklanamayan bir sayı üretmiyoruz.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field

# ---------------------------------------------------------------- sınıflar

VALID_INTERNSHIP = "VALID_INTERNSHIP"
LIKELY_INTERNSHIP = "LIKELY_INTERNSHIP"
AMBIGUOUS = "AMBIGUOUS"
NOT_INTERNSHIP = "NOT_INTERNSHIP"

#: Yayına çıkabilecek sınıflar. AMBIGUOUS insan bakışı bekliyor.
YAYINLANABILIR = frozenset({VALID_INTERNSHIP, LIKELY_INTERNSHIP})


# ---------------------------------------------------------------- sinyaller

#: Açık staj kanıtı.
#:
#: `intern` için sınır ŞART: "internal", "international" ve "internet"
#: kelimeleri sık geçiyor ve dördü de staj sinyali DEĞİL. Insider One
#: kaydında bulunan dört "intern" eşleşmesinin dördü de "internal"
#: içindeydi — kapının düştüğü yer tam olarak burasıydı.
STAJ_KANITI = re.compile(
    r"""
    \b(?:
        staj(?:yer|yeri|ı|i)?\b            # staj, stajyer, stajı
      | intern(?:ship|s)?\b(?!al|ational|et)
      | co-?op\b
      | working\s+student\b
      | student\s+(?:program|programme|placement)\b
      | üniversite\s+öğrenci
      | lisans\s+öğrenci
      | zorunlu\s+staj | gönüllü\s+staj
      | yaz\s+staj | dönem\s+staj
    )
    """,
    re.I | re.X,
)

#: Mezunlara yönelik TAM ZAMANLI program işaretleri.
#:
#: Bunlar tek başına RET SEBEBİ DEĞİL: yalnızca açıklamada geçtiklerinde
#: ve yanlarında açık staj kanıtı yokken karar veriyorlar. Başlıkta
#: geçmeleri hiçbir şeyi eleme — "İnsan Kaynakları Yönetici Adayı (MT)"
#: başlıklı bir ilan gerçekten staj programı olabilir.
MEZUN_PROGRAMI = re.compile(
    r"""
    \b(?:
        management\s+trainee | yönetici\s+aday | yönetici\s+yetiştirme
      | leadership\s+program(?:me)?
      | graduate\s+program(?:me)? | mezun\s+programı
      | fresh\s+grad(?:uate)?s? | new\s+grad(?:uate)?s?
      | yeni\s+mezun
    )
    """,
    re.I | re.X,
)

#: Kıdem işaretleri: açıklama kalıcı/deneyimli bir rolü tarif ediyor.
KIDEM = re.compile(
    r"""
    \b(?:
        senior | kıdemli | director | direktör
      | experienced\s+hire | deneyimli\s+profesyonel
      | (?:en\s+az|minimum)\s+\d+\+?\s*(?:yıl|year)
      | \d+\+\s*(?:years?|yıl)\s+(?:of\s+)?(?:experience|deneyim)
      | permanent\s+(?:position|role|employee)
      | kalıcı\s+(?:pozisyon|kadro)
    )
    """,
    re.I | re.X,
)

#: İstihdam türü meta verisi — ATS'ten geliyor, en güvenilir sinyal.
META_STAJ = re.compile(r"\b(intern(?:ship)?|student|staj|stajyer|co-?op)\b", re.I)
META_TAM_ZAMANLI = re.compile(r"\b(full[\s-]?time|tam\s*zamanlı|permanent|kadrolu)\b", re.I)


def _duz(metin: str | None) -> str:
    """Karşılaştırma için sadeleştirir; noktasız `ı` da eşleşsin diye."""
    if not metin:
        return ""
    # Etiketler metni yapıştırmasın: <li>staj</li><li>x</li> → "staj x"
    metin = re.sub(r"<[^>]+>", " ", metin)
    metin = unicodedata.normalize("NFKC", metin)
    return re.sub(r"\s+", " ", metin)


@dataclass
class Karar:
    """Sınıflandırma ve GEREKÇESİ. Gerekçe olmadan karar verilmiyor."""

    sinif: str
    nedenler: list[str] = field(default_factory=list)

    @property
    def yayinlanabilir(self) -> bool:
        return self.sinif in YAYINLANABILIR


def _bulunanlar(kalip: re.Pattern[str], metin: str, sinir: int = 3) -> list[str]:
    return sorted({m.group(0).strip().lower() for m in kalip.finditer(metin)})[:sinir]


def sinifla(
    baslik: str,
    aciklama: str | None = None,
    istihdam_turu: str | None = None,
) -> Karar:
    """Bir ilanı staj kalitesine göre sınıflandırır.

    `istihdam_turu` ATS'in kendi alanı (Lever `commitment`, Greenhouse
    `employment_type`, Workable `employment_type`). Elde varsa EN AĞIR
    sinyal — şirketin kendi beyanı.
    """
    b = _duz(baslik)
    a = _duz(aciklama)
    tur = _duz(istihdam_turu)

    nedenler: list[str] = []

    kanit_aciklama = _bulunanlar(STAJ_KANITI, a)
    kanit_baslik = _bulunanlar(STAJ_KANITI, b)
    # Mezun programı ve kıdem YALNIZCA açıklamadan okunuyor: başlıktaki
    # "(MT)" gerçek bir staj programını eleyemez.
    mezun = _bulunanlar(MEZUN_PROGRAMI, a)
    kidem = _bulunanlar(KIDEM, a)

    # ------------------------------------------------ 1. istihdam türü
    if tur:
        if META_STAJ.search(tur):
            nedenler.append(f"istihdam türü staj/öğrenci: {tur}")
            return Karar(VALID_INTERNSHIP, nedenler)
        if META_TAM_ZAMANLI.search(tur):
            nedenler.append(f"istihdam türü tam zamanlı: {tur}")
            if not kanit_aciklama:
                nedenler.append("açıklamada açık staj kanıtı yok")
                return Karar(NOT_INTERNSHIP, nedenler)
            # Tam zamanlı ama açıklamada staj deniyorsa çelişki var.
            nedenler.append(f"açıklamada staj kanıtı: {', '.join(kanit_aciklama)}")
            return Karar(AMBIGUOUS, nedenler)

    # ------------------------------------------- 2. açıklamadaki kanıt
    if kanit_aciklama:
        nedenler.append(f"açıklamada staj kanıtı: {', '.join(kanit_aciklama)}")
        if mezun:
            nedenler.append(f"ama mezun programı işareti de var: {', '.join(mezun)}")
            return Karar(AMBIGUOUS, nedenler)
        if kidem:
            nedenler.append(f"ama kıdem işareti var: {', '.join(kidem)}")
            return Karar(AMBIGUOUS, nedenler)
        return Karar(VALID_INTERNSHIP, nedenler)

    # --------------------------------- 3. açıklamada kanıt yok: elemeler
    if mezun:
        nedenler.append(f"açıklama mezun programı tarif ediyor: {', '.join(mezun)}")
        nedenler.append("açıklamada staj/öğrenci ifadesi yok")
        return Karar(NOT_INTERNSHIP, nedenler)

    if kidem:
        nedenler.append(f"açıklama kıdemli/kalıcı rol tarif ediyor: {', '.join(kidem)}")
        nedenler.append("açıklamada staj/öğrenci ifadesi yok")
        return Karar(NOT_INTERNSHIP, nedenler)

    # ------------------------------------------------ 4. yalnızca başlık
    if kanit_baslik:
        nedenler.append(f"yalnızca başlıkta staj kanıtı: {', '.join(kanit_baslik)}")
        if not a:
            nedenler.append("açıklama boş — doğrulanamadı")
            return Karar(LIKELY_INTERNSHIP, nedenler)
        nedenler.append("açıklamada doğrulanmadı")
        return Karar(LIKELY_INTERNSHIP, nedenler)

    nedenler.append("hiçbir staj sinyali bulunamadı")
    return Karar(NOT_INTERNSHIP, nedenler)


# ------------------------------------------------------------- kaynak

#: Resmi kaynak SAYILMAYAN alanlar. Bunlar ileride keşif radarı olabilir
#: ama canonical kaynak değiller: ilan metni oradan kopyalanmaz.
TOPLAYICI_ALANLAR = (
    "linkedin.com",
    "kariyer.net",
    "youthall.com",
    "secretcv.com",
    "indeed.com",
    "glassdoor.com",
    "jobs.tr",
    "eleman.net",
    "yenibiris.com",
)


def toplayici_mi(url: str | None) -> bool:
    """Adres bir iş ilanı toplayıcısına mı ait?

    Resmi kaynak yalnızca şirketin kendi alan adı ya da doğrulanmış ATS
    kiracısıdır. Toplayıcıdaki kopya, ilanın kendisi değil.
    """
    if not url:
        return False
    d = url.lower()
    return any(alan in d for alan in TOPLAYICI_ALANLAR)
