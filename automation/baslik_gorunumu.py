"""GÖRÜNEN BAŞLIK — DETERMINISTIK, KISALTMA GÜVENLİ

Kaynak başlığı (`source_title`) hiçbir zaman değişmiyor. Bu modül yalnız
KULLANICIYA GÖSTERİLEN başlığı üretiyor.

ÖNCELİK
-------
1. Elle yazılmış açık karşılık (TITLE_OVERRIDES)
2. Güvenilir deterministik dönüşüm (aşağıdaki kurallar)
3. Kaynağın kendi başlığı

Üçüncü basamak bir başarısızlık değil, bir güvence: kötü bir Türkçe,
resmî başlıktan daha kötüdür. Makine çevirisi burada KULLANILMIYOR —
ölçüldü, "IT intern" için "BT stajyeri" üretiyor ve kısaltmayı bozuyor.

KISALTMA GÜVENLİĞİ
------------------
Türkçe karşılığı ürün standardında tanımlı olmayan terimler olduğu gibi
korunuyor. "IT" → "BT" gibi bir dönüşüm, ilanı arayan öğrencinin
aradığı kelimeyi de yok ediyor.
"""

from __future__ import annotations

import re

#: Olduğu gibi korunacak terimler. Bunlar başlıkta geçiyorsa dokunulmuyor.
KORUNAN_TERIMLER = (
    "IT", "HR", "R&D", "QA", "UI", "UX", "UI/UX", "CRM", "ERP", "SAP",
    ".NET", "DevOps", "Full Stack", "Full-Stack", "Backend", "Frontend",
    "Data Science", "Machine Learning", "Customer Success", "Business Development",
    "Product", "Growth", "Cloud", "DevSecOps", "SRE", "MLOps", "ETL", "BI",
)

#: Deterministik son ek dönüşümleri. Yalnız BAŞLIK SONUNDA uygulanıyor;
#: cümle ortasındaki bir kelimeyi çevirmek anlam bozuyor.
SON_EKLER = (
    (re.compile(r"\bInternship\s+Program(me)?\b", re.I), "Staj Programı"),
    (re.compile(r"\bIntern(ship)?\b", re.I), "Stajyeri"),
    (re.compile(r"\bTrainee\b", re.I), "Yönetici Adayı"),
)

#: Başlık başındaki niteleyiciler.
ONEKLER = (
    (re.compile(r"^Long[-\s]?Term\s+", re.I), "Uzun Dönem "),
    (re.compile(r"^Summer\s+", re.I), "Yaz "),
    (re.compile(r"^Part[-\s]?Time\s+", re.I), "Yarı Zamanlı "),
    (re.compile(r"^Senior\s+", re.I), "Kıdemli "),
)

#: Elle yazılmış açık karşılıklar. Kural üretemediğimiz ya da kuralın
#: kötü sonuç verdiği başlıklar buraya yazılıyor.
ACIK_KARSILIKLAR = {
    "software engineer (new grad)": "Yazılım Mühendisi (Yeni Mezun / Stajyer)",
    "management trainee for people & culture": "İnsan Kaynakları Yönetici Adayı (MT)",
    "management trainee for people & culture (fresh grad)": "İnsan Kaynakları Yönetici Adayı (MT)",
    "product specialist (new grad)": "Ürün Uzmanı (Yeni Mezun / Stajyer)",
    # Kural "Developer" kelimesi yüzünden güvenli sayılmıyor ve kaynağa
    # dönüyor; oysa bu başlığın doğal Türkçesi belli. Staj dilinde
    # "long-term" karşılığı "uzun dönem" — "uzun vadeli" finans terimi.
    "long-term full stack developer intern":
        "Uzun Dönem Full Stack Geliştirici Stajyeri",
    "long term full stack developer intern":
        "Uzun Dönem Full Stack Geliştirici Stajyeri",
}

# TÜRKÇE TESPİTİNDE `re.I` YOK — NOKTASIZ i TUZAĞI
#
# `re.IGNORECASE` altında `ı` ile `I` eşleşiyor (Python'da 'ı'.upper()
# 'I' veriyor). Sınıfı büyük/küçük duyarsız yazınca büyük "I" içeren HER
# başlık Türkçe sayılıyordu: "IT intern" Türkçe kabul edilip hiç
# dönüştürülmüyordu (ölçüldü). Karakter sınıfı duyarlı, anahtar
# kelimeler ayrı ve duyarsız aranıyor.
_TURKCE_HARF = re.compile(r"[çğıöşüÇĞİÖŞÜ]")
_TURKCE_KELIME = re.compile(r"stajyer|staj|program[ıi]|geliştirici|mühendis", re.I)


def _turkce_mi(metin: str) -> bool:
    return bool(_TURKCE_HARF.search(metin) or _TURKCE_KELIME.search(metin))

#: Dönüşümden sonra hâlâ İngilizce kalan kelime var mı? Varsa dönüşüm
#: güvenilir sayılmıyor ve kaynak başlığa dönülüyor.
_INGILIZCE_ARTIK = re.compile(
    r"\b(and|the|for|with|our|team|new|grad|graduate|position|role|engineer|"
    r"specialist|assistant|analyst|manager|developer|designer)\b", re.I)


def _korunanlari_maskele(metin: str) -> tuple[str, dict[str, str]]:
    """Korunan terimleri geçici belirteçle değiştirir."""
    maske: dict[str, str] = {}
    # Uzun terim önce: "Full Stack" ile "Stack" çakışmasın.
    for i, terim in enumerate(sorted(KORUNAN_TERIMLER, key=len, reverse=True)):
        kalip = re.compile(r"(?<![\w.])" + re.escape(terim) + r"(?![\w])", re.I)
        if kalip.search(metin):
            belirtec = f"\x00{i}\x00"
            metin = kalip.sub(belirtec, metin)
            maske[belirtec] = terim
    return metin, maske


def _maskeyi_ac(metin: str, maske: dict[str, str]) -> str:
    for belirtec, terim in maske.items():
        metin = metin.replace(belirtec, terim)
    return metin


def gorunen_baslik(kaynak_basligi: str | None) -> str:
    """Kaynak başlığından kullanıcıya gösterilecek başlığı üretir.

    Dönüşüm güvenilir değilse KAYNAK BAŞLIĞINI döndürüyor. Yarı Türkçe
    yarı İngilizce bir başlık, tamamen İngilizce olandan kötü.
    """
    if not kaynak_basligi:
        return ""
    ham = re.sub(r"\s+", " ", kaynak_basligi).strip()
    if not ham:
        return ""

    acik = ACIK_KARSILIKLAR.get(ham.casefold())
    if acik:
        return acik

    # Zaten Türkçeyse dokunma.
    if _turkce_mi(ham) and not _INGILIZCE_ARTIK.search(ham):
        return ham

    metin, maske = _korunanlari_maskele(ham)
    for kalip, karsilik in ONEKLER:
        metin = kalip.sub(karsilik, metin)
    for kalip, karsilik in SON_EKLER:
        metin = kalip.sub(karsilik, metin)
    metin = re.sub(r"\s+", " ", metin).strip()
    sonuc = _maskeyi_ac(metin, maske)

    # Dönüşüm bir şeyi değiştirmediyse ya da hâlâ İngilizce kaldıysa
    # kaynağa dönülüyor.
    if sonuc == ham:
        return ham
    if _INGILIZCE_ARTIK.search(_korunanlari_maskele(sonuc)[0]):
        return ham
    return sonuc


def farkli_mi(gorunen: str | None, kaynak: str | None) -> bool:
    """Detay sayfasında "Resmî ilan adı" satırı gösterilmeli mi?"""
    if not gorunen or not kaynak:
        return False
    return re.sub(r"\s+", " ", gorunen).strip() != re.sub(r"\s+", " ", kaynak).strip()
