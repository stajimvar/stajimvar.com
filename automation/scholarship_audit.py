"""Burs kayıtlarının resmî kaynağa karşı denetimi.

    kaydı oku → resmî kaynağı çek → ne DOĞRULANABİLİYOR → öneri üret

ÜRETİME HİÇBİR ŞEY YAZMIYOR
---------------------------
Bu araç bir rapor üretir. Alan güncellemesi insan onayından geçer:
burs tutarı, son başvuru tarihi, bölüm/seviye/şehir kısıtı yanlış
girildiğinde öğrenci başvuramayacağı bir bursa başvurur ya da
başvurabileceğini hiç öğrenemez. İkisi de sessiz hatadır.

ÇIKARIM DEĞİL, ALINTI
---------------------
Hiçbir alan "tahmin" edilmiyor. Bir öneri ancak resmî sayfada AÇIKÇA
yazan bir ifadeye dayanabiliyor ve öneriyle birlikte o ifadenin kısa
bağlamı (`kanit_metni`) taşınıyor. Belirsizlik öneri üretmiyor:
birden çok aday tarih bulunduğunda, tutarın dönemi anlaşılmadığında ya
da eşleşme bağlamı zayıf olduğunda alan BOŞ bırakılıyor.

    "Bilgiyi bulamamak başarısızlık değildir. Yanlış bilgi girmek
     başarısızlıktır."

KULLANIM
    python -m automation.scholarship_audit                # rapor
    python -m automation.scholarship_audit --limit 5      # deneme
    python -m automation.scholarship_audit --out rapor.json
"""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
import unicodedata
from dataclasses import asdict, dataclass, field
from datetime import UTC, date, datetime

import requests
from dotenv import load_dotenv

from automation import repository

KULLANICI_ARACI = "StajimVarScholarshipAudit/1.0"
ZAMAN_ASIMI = 20

# --------------------------------------------------------------- sınıflar

SINIF_ACIKLAMA = {
    "A": "kaynak erişilebilir",
    "B": "kaynak erişilebilir ama doğrulanabilir alan bulunamadı",
    "C": "kaynak kapanmış (404/410)",
    "D": "son başvuru tarihi geçmiş",
    "E": "kaynak kayıtla çelişiyor",
    "F": "kaynağa erişilemedi",
}


@dataclass
class Oneri:
    """Tek bir alan için insan onayına giden öneri."""

    opportunity_id: str
    alan: str
    mevcut_deger: object
    onerilen_deger: object
    kanit_url: str
    kanit_metni: str
    gerekce: str


@dataclass
class KayitRaporu:
    opportunity_id: str
    baslik: str
    kurum: str
    kaynak_url: str
    http_durumu: int | None
    sinif: str
    notlar: list[str] = field(default_factory=list)
    oneriler: list[Oneri] = field(default_factory=list)


# ----------------------------------------------------------- metin araçları


def _sadelestir(metin: str) -> str:
    """Küçült ve Türkçe harfleri eşleştirilebilir hale getir."""
    kucuk = metin.casefold().replace("ı", "i")
    ayrik = unicodedata.normalize("NFD", kucuk)
    return "".join(k for k in ayrik if not unicodedata.combining(k))


def _govde(html: str) -> str:
    """Etiketleri atıp okunabilir metne indirger. Tam ayrıştırıcı değil.

    Amaç kanıt aramak; sayfayı yeniden üretmek değil. script/style
    içeriği atılıyor çünkü orada geçen sayılar sayfada YAZMIYOR.
    """
    temiz = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", html)
    temiz = re.sub(r"(?s)<[^>]+>", " ", temiz)
    temiz = (
        temiz.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
    )
    return re.sub(r"\s+", " ", temiz).strip()


def _baglam(metin: str, indis: int, yaricap: int = 90) -> str:
    """Kanıt için KISA bağlam. Telif nedeniyle uzun kopya taşınmıyor.

    HTML varlıkları çözülüyor: kanıtı okuyan kişi kaynaktaki cümleyi
    görmeli, "Lisans&uuml;st&uuml;" gibi kaçış dizisi değil. Bu metin
    yönetici ekranında karar dayanağı olarak gösteriliyor; okunamayan
    kanıt karar verdirmez.
    """
    bas = max(0, indis - yaricap)
    son = min(len(metin), indis + yaricap)
    kesit = html.unescape(metin[bas:son]).strip()
    kesit = re.sub(r"\s+", " ", kesit)
    return ("…" if bas > 0 else "") + kesit + ("…" if son < len(metin) else "")


# ------------------------------------------------------------- son tarih

AYLAR = {
    "ocak": 1, "subat": 2, "mart": 3, "nisan": 4, "mayis": 5, "haziran": 6,
    "temmuz": 7, "agustos": 8, "eylul": 9, "ekim": 10, "kasim": 11, "aralik": 12,
}
_AY_DESENI = "|".join(AYLAR)
TARIH_DESENI = re.compile(rf"(\d{{1,2}})\s+({_AY_DESENI})\s+(20\d{{2}})")
SAYISAL_TARIH = re.compile(r"(\d{1,2})[./](\d{1,2})[./](20\d{2})")
# "basvuru son" deseni "başvuru SONUÇLARI" ifadesine takılıyordu: KYK
# sayfasındaki bir sonuç duyurusu son başvuru tarihi olarak önerilmişti.
# Artık ifadenin tamamı aranıyor ve "sonuç/sonuclar" açıkça dışlanıyor.
SON_TARIH_IZI = re.compile(
    # "son basvuru" sirasi guvenli; yanlis pozitif TERS siradan geldi:
    # "basvuru son" deseni "basvuru SONUCLARI" ifadesine takiliyordu ve
    # KYK sayfasindaki bir sonuc duyurusunu son basvuru tarihi sanmisti.
    r"son\s+basvuru(?![a-z])|"
    # Ters sira yalnizca "tarihi/gunu" ile birlikte kabul ediliyor.
    r"basvuru\s+son\s+(?:tarihi|gunu)|"
    r"basvurular\s+.{0,25}?sona\s+er"
)


def son_tarih_adaylari(duz: str, ham: str) -> list[tuple[date, str]]:
    """Yalnızca "son başvuru" ifadesinin YAKININDAKİ tarihleri topluyor.

    Sayfadaki her tarihi toplamak yanlış olur: duyuru tarihi, açılış
    tarihi ve sonuç tarihi de aynı sayfada geçiyor.
    """
    bulunan: list[tuple[date, str]] = []
    for iz in SON_TARIH_IZI.finditer(duz):
        pencere_bas = iz.start()
        pencere = duz[pencere_bas : pencere_bas + 160]
        for m in TARIH_DESENI.finditer(pencere):
            gun, ay, yil = int(m.group(1)), AYLAR[m.group(2)], int(m.group(3))
            try:
                bulunan.append((date(yil, ay, gun), _baglam(ham, pencere_bas)))
            except ValueError:
                continue
        for m in SAYISAL_TARIH.finditer(pencere):
            gun, ay, yil = int(m.group(1)), int(m.group(2)), int(m.group(3))
            try:
                bulunan.append((date(yil, ay, gun), _baglam(ham, pencere_bas)))
            except ValueError:
                continue
    return bulunan


# ---------------------------------------------------------------- tutar

# Aylık olduğu AÇIKÇA yazan tutar. Dönemi belirsiz tutar öneri üretmiyor:
# "40.000 TL burs" yıllık toplam da olabilir, üst sınır da.
AYLIK_TUTAR = [
    re.compile(r"ayl[ıi]k\s+(?:olarak\s+)?([\d][\d.,]{2,})\s*(?:tl|₺|turk lirasi)", re.I),
    re.compile(r"([\d][\d.,]{2,})\s*(?:tl|₺)\s*(?:/\s*ay|\s+ayl[ıi]k|\s+ayda)", re.I),
]


def _sayi_coz(metin: str) -> int | None:
    temiz = metin.replace(".", "").replace(",", "")
    return int(temiz) if temiz.isdigit() else None


def aylik_tutar_adaylari(duz: str, ham: str) -> list[tuple[int, str]]:
    bulunan: list[tuple[int, str]] = []
    for desen in AYLIK_TUTAR:
        for m in desen.finditer(duz):
            deger = _sayi_coz(m.group(1))
            # 500 TL altı ve 200.000 TL üstü aylık burs gerçekçi değil;
            # büyük ihtimalle yıllık toplam ya da alakasız bir sayı.
            if deger is not None and 500 <= deger <= 200_000:
                bulunan.append((deger, _baglam(ham, m.start())))
    return bulunan


# ------------------------------------------------------- eğitim seviyesi

SEVIYE_IZLERI = [
    ("Doktora", re.compile(r"(?<![a-z])doktora(?![a-z])")),
    ("Yüksek Lisans", re.compile(r"yuksek\s+lisans")),
    ("Ön Lisans", re.compile(r"on\s?lisans")),
    # "lisans" tek başına: önünde "yüksek"/"ön" OLMAYAN geçiş.
    ("Lisans", re.compile(r"(?<!yuksek\s)(?<!on\s)(?<!on)(?<![a-z])lisans(?![a-z])")),
]
# "lisansüstü" ikisini birden kapsıyor ve "lisans" DEMEK DEĞİL.
LISANSUSTU = re.compile(r"lisansustu")

# BAĞLAM ŞART: SAYFADA GEÇMESİ YETMİYOR
#
# Ölçüldü: bir üniversite sayfasında "Enstitüler / Lisansüstü Eğitim
# Enstitüsü" gezinme menüsü, bursun lisansüstüne açık olduğu sanılıp
# öneri üretmişti. Menü bir başvuru şartı değil.
#
# Seviye ancak bir UYGUNLUK ifadesinin yakınında geçiyorsa öneriye
# giriyor. Bağlam bulunamazsa alan boş kalıyor — eksik bilgi, yanlış
# bilgiden iyidir.
SEVIYE_SART_IZI = re.compile(
    r"basvurabil|basvuru\s+sart|basvuru\s+kosul|kimler\s+(?:basvur|burs)|"
    r"burs\s+alabil|aranan\s+sart|genel\s+sart|adaylarda\s+aranan|"
    r"ogrencilerine?\s+yonelik|ogrencileri\s+icin|ogrenim\s+goren|okuyan\s+ogrenci|"
    r"ogrencisi\s+olmak|ogrenci\s+olmak|ogrencilere?\s+aciktir|"
    r"ogrencilere?\s+acik|burs\s+verilecek|burstan\s+yararlan"
)
SEVIYE_PENCERESI = 320


def seviye_adaylari(duz: str, ham: str) -> tuple[list[str], str]:
    """Yalnızca uygunluk bağlamındaki seviye ifadelerini döndürüyor."""
    seviyeler: list[str] = []
    kanit = ""

    for iz in SEVIYE_SART_IZI.finditer(duz):
        bas = max(0, iz.start() - SEVIYE_PENCERESI // 2)
        pencere = duz[bas : iz.start() + SEVIYE_PENCERESI]

        if LISANSUSTU.search(pencere):
            for ad in ("Yüksek Lisans", "Doktora"):
                if ad not in seviyeler:
                    seviyeler.append(ad)
            kanit = kanit or _baglam(ham, iz.start(), 140)

        for ad, desen in SEVIYE_IZLERI:
            if desen.search(pencere) and ad not in seviyeler:
                seviyeler.append(ad)
                kanit = kanit or _baglam(ham, iz.start(), 140)

    return seviyeler, kanit


# ---------------------------------------------------------------- bölüm


def bolum_adlari_yukle(kok: str) -> list[str]:
    """Bölüm adları src/data/bolumler.ts'ten okunuyor.

    Taksonomi tek yerde: burada ikinci bir liste tutmak, iki listenin
    zamanla ayrışması demek olurdu.
    """
    try:
        with open(f"{kok}/src/data/bolumler.ts", encoding="utf-8") as dosya:
            icerik = dosya.read()
    except OSError:
        return []
    return re.findall(r"^\s*ad: '([^']+)'", icerik, re.M)


# Bölüm adı sayfada geçiyor diye kısıt yoktur: "bilgisayar mühendisliği
# mezunlarımız" cümlesi bir başvuru şartı değil. Yalnızca şart bağlamında
# geçen adlar öneriye giriyor.
BOLUM_SART_IZI = re.compile(
    r"bolum(?:u|leri|unde|lerinde)?\s+(?:ogrenci|okuyan)|"
    r"asagidaki\s+bolum|su\s+bolum|bolumlerde\s+okuyan|"
    r"(?:yalnizca|sadece)\s+.{0,40}bolum"
)


def bolum_adaylari(duz: str, ham: str, bolumler: list[str]) -> tuple[list[str], str]:
    iz = BOLUM_SART_IZI.search(duz)
    if not iz:
        return [], ""
    pencere = duz[iz.start() : iz.start() + 400]
    bulunan = [ad for ad in bolumler if _sadelestir(ad) in pencere]
    return bulunan, _baglam(ham, iz.start(), 140) if bulunan else ""


# ------------------------------------------------------------------ şehir

# "İstanbul'da ikamet eden" gibi AÇIK bir ikamet şartı aranıyor. Kurumun
# adresinin İstanbul olması şehir kısıtı DEĞİLDİR.
IKAMET_IZI = re.compile(
    r"([a-z]+)\s*['’]?\s*(?:da|de|ta|te)\s+(?:ikamet|oturan|yasayan|preslerinde)"
)


def sehir_adaylari(duz: str, ham: str, sehirler: set[str]) -> tuple[list[str], str]:
    bulunan: list[str] = []
    kanit = ""
    for m in IKAMET_IZI.finditer(duz):
        aday = m.group(1)
        for sehir in sehirler:
            if _sadelestir(sehir) == aday:
                bulunan.append(sehir)
                kanit = kanit or _baglam(ham, m.start())
    return sorted(set(bulunan)), kanit


# ------------------------------------------------------------- denetleyici


def kaynak_getir(url: str) -> tuple[int | None, str, str | None]:
    try:
        cevap = requests.get(
            url, timeout=ZAMAN_ASIMI, allow_redirects=True,
            headers={"User-Agent": KULLANICI_ARACI, "Accept": "text/html"},
        )
    except Exception as hata:  # noqa: BLE001
        return None, "", f"{type(hata).__name__}"
    icerik = cevap.text if "html" in cevap.headers.get("content-type", "") or cevap.text else ""
    return cevap.status_code, icerik, None


def kaydi_denetle(kayit: dict, bolumler: list[str], sehirler: set[str], bugun: date) -> KayitRaporu:
    rapor = KayitRaporu(
        opportunity_id=kayit["id"],
        baslik=(kayit.get("title") or "")[:70],
        kurum=(kayit.get("organization_name") or "")[:40],
        kaynak_url=kayit.get("source_url") or "",
        http_durumu=None,
        sinif="F",
    )

    if not rapor.kaynak_url:
        rapor.notlar.append("kaynak adresi yok")
        return rapor

    durum, html, hata = kaynak_getir(rapor.kaynak_url)
    rapor.http_durumu = durum
    if hata:
        rapor.notlar.append(f"erişilemedi: {hata}")
        return rapor
    if durum in (404, 410):
        rapor.sinif = "C"
        rapor.notlar.append(f"kaynak kapanmış (HTTP {durum})")
        return rapor
    if durum is None or durum >= 400:
        rapor.notlar.append(f"HTTP {durum}")
        return rapor

    ham = _govde(html)
    duz = _sadelestir(ham)
    rapor.sinif = "B"

    def ekle(alan: str, mevcut, onerilen, kanit: str, gerekce: str) -> None:
        rapor.oneriler.append(
            Oneri(rapor.opportunity_id, alan, mevcut, onerilen, rapor.kaynak_url, kanit, gerekce)
        )

    # --- son başvuru ---
    tarihler = son_tarih_adaylari(duz, ham)
    benzersiz = {t for t, _ in tarihler}
    mevcut_tarih = (kayit.get("application_deadline") or "")[:10] or None
    if len(benzersiz) == 1:
        bulunan = next(iter(benzersiz))
        kanit = next(k for t, k in tarihler if t == bulunan)
        if bulunan < bugun:
            rapor.sinif = "D"
            rapor.notlar.append(f"kaynaktaki son tarih geçmiş: {bulunan}")
        if str(bulunan) != mevcut_tarih:
            ekle("application_deadline", mevcut_tarih, str(bulunan), kanit,
                 "kaynakta tek bir son başvuru tarihi bulundu")
            if mevcut_tarih:
                rapor.sinif = "E"
                rapor.notlar.append(f"kayıt {mevcut_tarih}, kaynak {bulunan}")
    elif len(benzersiz) > 1:
        rapor.notlar.append(
            f"birden çok aday tarih ({', '.join(str(t) for t in sorted(benzersiz))}) — öneri üretilmedi"
        )

    # --- tutar ---
    tutarlar = aylik_tutar_adaylari(duz, ham)
    benzersiz_tutar = {t for t, _ in tutarlar}
    if len(benzersiz_tutar) == 1 and kayit.get("amount_min") is None:
        deger = next(iter(benzersiz_tutar))
        kanit = next(k for t, k in tutarlar if t == deger)
        ekle("amount_min", None, deger, kanit, "kaynakta AYLIK olduğu açıkça yazan tek tutar")
        ekle("payment_period", kayit.get("payment_period"), "monthly", kanit,
             "tutarın yanında 'aylık' ifadesi geçiyor")
    elif len(benzersiz_tutar) > 1:
        rapor.notlar.append(f"birden çok aylık tutar adayı: {sorted(benzersiz_tutar)} — öneri üretilmedi")

    # --- eğitim seviyesi ---
    seviyeler, seviye_kanit = seviye_adaylari(duz, ham)
    mevcut_seviye = kayit.get("education_levels") or []
    if seviyeler and sorted(seviyeler) != sorted(mevcut_seviye):
        ekle("education_levels", mevcut_seviye, sorted(seviyeler), seviye_kanit,
             "kaynakta geçen eğitim seviyesi ifadeleri")

    # --- bölüm ---
    bolum, bolum_kanit = bolum_adaylari(duz, ham, bolumler)
    if bolum:
        ekle("eligible_departments", kayit.get("eligible_departments") or [], sorted(bolum),
             bolum_kanit, "şart bağlamında geçen bölüm adları")
    else:
        rapor.notlar.append("açık bölüm kısıtı bulunamadı (kısıt yok olabilir)")

    # --- şehir ---
    sehir, sehir_kanit = sehir_adaylari(duz, ham, sehirler)
    if sehir:
        ekle("cities", kayit.get("cities") or [], sehir, sehir_kanit,
             "açık ikamet şartı ifadesi bulundu")

    if rapor.oneriler and rapor.sinif == "B":
        rapor.sinif = "A"
    return rapor


def oneri_verisi(raporlar: list[KayitRaporu]) -> dict:
    """Yonetici ekraninin okudugu kompakt bicim.

    NEDEN AYRI DOSYA
    ----------------
    Yirmi iki oneri icin kalici bir aday tablosu acmak, cozdugunden fazla
    bakim yuku getirirdi (senkron tutma, RLS, temizlik). Oneriler statik
    bir veri dosyasi olarak geliyor: yonetim ekrani ONERIYI gosteriyor,
    KARARI veritabanina security definer RPC yaziyor.

    Dosya kaynak sayfalardan yalnizca KISA kanit alintisi tasiyor.
    """
    kayitlar = {}
    for r in raporlar:
        if not r.oneriler and r.sinif in ("A", "B"):
            continue
        kayitlar[r.opportunity_id] = {
            "sinif": r.sinif,
            "http": r.http_durumu,
            "notlar": r.notlar,
            "oneriler": [
                {
                    "alan": o.alan,
                    "mevcut": o.mevcut_deger,
                    "onerilen": o.onerilen_deger,
                    "kanit": o.kanit_metni[:220],
                    "gerekce": o.gerekce,
                    "kaynak": o.kanit_url,
                }
                for o in r.oneriler
            ],
        }
    return {"olusturuldu": datetime.now(UTC).isoformat(), "kayitlar": kayitlar}


# ------------------------------------------------------------- inceleme

YONETIM_ADRESI = "https://stajimvar.com/yonetim/firsatlar/{id}/duzenle"


def inceleme_sayfasi(raporlar: list[KayitRaporu], ozet: dict) -> str:
    """İnsanın karar vereceği sayfa.

    YENİ EKRAN YAZILMADI
    --------------------
    Öneriler mevcut yönetici formuna bağlanıyor: her satırda kaydın
    düzenleme adresi, önerilen değer ve kanıt var. Yönetici kaynağı açıp
    doğruluyor, değeri forma giriyor. Ondokuz öneri için ayrı bir onay
    kuyruğu tablosu açmak, çözdüğünden fazla bakım yükü getirirdi.

    Karar hep insanda: bu dosya hiçbir şey yazmıyor.
    """
    satirlar = [
        "# Burs verisi inceleme sayfası",
        "",
        f"Üretildi: {ozet['olusturuldu']}",
        f"İncelenen kayıt: {ozet['incelenen']} · Öneri: {ozet['toplam_oneri']}",
        "",
        "Her öneri resmî kaynakta AÇIKÇA yazan bir ifadeye dayanıyor. Yine de",
        "kaynağı açıp doğrulamadan uygulama: sayfa değişmiş olabilir.",
        "",
        "> `amount_verified_at` yalnızca tutarı kaynakta GÖRDÜKTEN sonra",
        "> doldurulmalı. Bu araç onu asla önermiyor.",
        "",
    ]

    onerili = [r for r in raporlar if r.oneriler]
    if onerili:
        satirlar += ["## Önerisi olan kayıtlar", ""]
    for r in onerili:
        satirlar += [
            f"### {r.kurum} — {r.baslik}",
            "",
            f"- Kaynak: {r.kaynak_url} (HTTP {r.http_durumu})",
            f"- Düzenle: {YONETIM_ADRESI.format(id=r.opportunity_id)}",
            "",
            "| Alan | Mevcut | Önerilen | Kanıt |",
            "| --- | --- | --- | --- |",
        ]
        for o in r.oneriler:
            kanit = o.kanit_metni.replace("|", "/").replace(chr(10), " ")[:150]
            satirlar.append(
                f"| `{o.alan}` | {o.mevcut_deger or '—'} | **{o.onerilen_deger}** | {kanit} |"
            )
        satirlar.append("")

    sorunlu = [r for r in raporlar if r.sinif in ("C", "D", "E", "F")]
    if sorunlu:
        satirlar += ["## İnsan bakması gereken kaynaklar", "",
                     "| Sınıf | Kurum | HTTP | Not | Düzenle |", "| --- | --- | --- | --- | --- |"]
        for r in sorunlu:
            not_ = "; ".join(r.notlar)[:110].replace("|", "/")
            satirlar.append(
                f"| {r.sinif} | {r.kurum} | {r.http_durumu} | {not_} | "
                f"{YONETIM_ADRESI.format(id=r.opportunity_id)} |"
            )
        satirlar.append("")

    kisitsiz = [
        r for r in raporlar
        if r.sinif in ("A", "B") and any("açık bölüm kısıtı bulunamadı" in n for n in r.notlar)
    ]
    satirlar += [
        "## Bölüm kısıtı",
        "",
        f"{len(kisitsiz)} kayıtta açık bir bölüm kısıtı BULUNAMADI.",
        "",
        "Bu, kısıtın olmadığı anlamına GELMEZ — bulunamadığı anlamına gelir.",
        "Kaynağı okuyup gerçekten kısıt yoksa alan boş bırakılmalı: boş liste",
        "zaten 'kısıt yok' demek ve o burs her bölüm süzgecinden geçiyor.",
        "",
    ]
    return chr(10).join(satirlar)


# ------------------------------------------------------------------ koşucu


def main() -> None:
    ayrist = argparse.ArgumentParser(description="Burs kayıtlarını resmî kaynağa karşı denetler")
    ayrist.add_argument("--limit", type=int, default=0, help="yalnızca ilk N kayıt")
    ayrist.add_argument("--out", default="", help="JSON raporun yazılacağı dosya")
    ayrist.add_argument("--kok", default=".", help="depo kökü (bolumler.ts için)")
    ayrist.add_argument(
        "--oneri-veri", default="",
        help="yonetici ekraninin okudugu kompakt oneri dosyasi (src/data/burs-onerileri.json)",
    )
    ayrist.add_argument(
        "--inceleme", default="",
        help="insan için okunabilir inceleme sayfası (markdown) yazılacak dosya",
    )
    secim = ayrist.parse_args()

    load_dotenv()
    db = repository.client()

    sorgu = (
        db.table("opportunities")
        .select(
            "id,title,organization_name,source_url,application_url,application_deadline,"
            "amount_min,amount_text,payment_period,amount_verified_at,education_levels,"
            "eligible_departments,cities,status"
        )
        .eq("status", "published")
        .order("organization_name")
    )
    kayitlar = sorgu.execute().data or []
    if secim.limit:
        kayitlar = kayitlar[: secim.limit]

    bolumler = bolum_adlari_yukle(secim.kok)
    sehirler = {
        "Adana", "Ankara", "Antalya", "Bursa", "Denizli", "Diyarbakır", "Erzurum",
        "Eskişehir", "Gaziantep", "İstanbul", "İzmir", "Kayseri", "Kocaeli", "Konya",
        "Malatya", "Manisa", "Mersin", "Sakarya", "Samsun", "Tekirdağ", "Trabzon", "Van",
    }
    bugun = datetime.now(UTC).date()

    raporlar = [kaydi_denetle(k, bolumler, sehirler, bugun) for k in kayitlar]

    sayim: dict[str, int] = {}
    for r in raporlar:
        sayim[r.sinif] = sayim.get(r.sinif, 0) + 1
    alan_sayimi: dict[str, int] = {}
    for r in raporlar:
        for o in r.oneriler:
            alan_sayimi[o.alan] = alan_sayimi.get(o.alan, 0) + 1

    cikti = {
        "olusturuldu": datetime.now(UTC).isoformat(),
        "incelenen": len(raporlar),
        "sinif_dagilimi": {k: {"sayi": v, "aciklama": SINIF_ACIKLAMA[k]} for k, v in sorted(sayim.items())},
        "alan_bazli_oneri": alan_sayimi,
        "toplam_oneri": sum(alan_sayimi.values()),
        "kayitlar": [asdict(r) for r in raporlar],
    }

    if secim.oneri_veri:
        with open(secim.oneri_veri, "w", encoding="utf-8") as dosya:
            json.dump(oneri_verisi(raporlar), dosya, ensure_ascii=False, indent=2)

    if secim.inceleme:
        with open(secim.inceleme, "w", encoding="utf-8") as dosya:
            dosya.write(inceleme_sayfasi(raporlar, cikti))

    metin = json.dumps(cikti, ensure_ascii=False, indent=2, default=str)
    if secim.out:
        with open(secim.out, "w", encoding="utf-8") as dosya:
            dosya.write(metin)
        print(json.dumps({k: cikti[k] for k in
                          ("incelenen", "sinif_dagilimi", "alan_bazli_oneri", "toplam_oneri")},
                         ensure_ascii=False, indent=2))
    else:
        print(metin)


if __name__ == "__main__":
    sys.exit(main())
