"""Kampüsüm kaynak keşfi: öğrenciler okul girdikçe kaynağı OTOMATİK bul, doğrula, devreye al.

Her koşuda iki iş:

1. TOHUM — depodaki `automation/kampus_kaynaklari.json` (elle doğrulanmış
   okullar ve kaynaklar) veritabanına işleniyor. Dosya kod incelemesinden
   geçiyor; bir kaynağı düzeltmek dosyayı düzeltmek demek.

2. KEŞİF — `student_profiles.university`de geçen ama katalogda olmayan
   okullar için:
     a) Okul adı YÖK'ün resmî üniversite listesinde BİREBİR aranıyor
        (yok.gov.tr/tr/university, devlet ve vakıf). Alan adı oradaki
        "Web Sitesi" alanından alınıyor — addan tahmin YOK. Eşleşmeyen okul
        eklenmiyor.
     b) Katalog satırı yazılıyor (`dogrulama_kaynagi = 'yok.gov.tr'`).
     c) Resmî alan adında bilinen kalıplar deneniyor: WordPress REST
        (duyuru kategorisi, aylık menü PDF'i), ana sayfadaki "Duyurular" ve
        "Yemek menüsü / listesi" bağlantıları. Her aday kaynak BİR KEZ
        gerçekten çalıştırılıyor; yalnız doğrulamayı geçen etkinleşiyor:
          duyuru  en az 3 tarihli duyuru, en yenisi son 60 gün içinde
          menü    bu ay ya da gelecek ay için en az 3 gün, biri bugünden
                  en çok 7 gün uzakta
        Geçemeyen kaynak EKLENMİYOR; sonuç `kesif_notu`na yazılıyor ve
        okul 7 gün sonra yeniden deneniyor.

Çalıştırma:
    python -m automation.kampus_kesif            # yaz
    python -m automation.kampus_kesif --kuru     # yalnız göster
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
from datetime import UTC, date, datetime, timedelta
from typing import Any
from urllib.parse import urljoin, urlsplit

from automation import kampus_verisi as kv

TOHUM = pathlib.Path(__file__).with_name("kampus_kaynaklari.json")
YOK_LISTELERI = [
    "https://www.yok.gov.tr/tr/university?type=1",  # devlet
    "https://www.yok.gov.tr/tr/university?type=2",  # vakıf
]
YENIDEN_DENEME = timedelta(days=7)


# ------------------------------------------------------------------ adlar


def ad_anahtari(ad: str) -> str:
    """Veritabanındaki `kampus_ad_anahtari` ile AYNI kural."""
    tablo = str.maketrans("İIıŞşĞğÜüÖöÇçÂâÎîÛû", "iiissgguuooccaaiiuu")
    return re.sub(r"\s+", " ", (ad or "").strip().translate(tablo).lower())


def kimlik(ad: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", ad_anahtari(ad)).strip("-")


def kayitli_alan(url: str) -> str:
    host = (urlsplit(url).hostname or "").lower()
    return host[4:] if host.startswith("www.") else host


# ------------------------------------------------------------------ YÖK listesi


def yok_listesi_ayristir(html_metni: str) -> dict[str, tuple[str, str]]:
    """YÖK üniversite kartları → {ad anahtarı: (ad, resmî site)}."""
    out: dict[str, tuple[str, str]] = {}
    for m in re.finditer(r'data-name="([^"]+)"(.*?)(?=data-name=|\Z)', html_metni, re.S):
        site = re.search(r'Web Sitesi:</div>\s*<div class="detail-value-uni">\s*<a href="([^"]+)"', m.group(2))
        if site and site.group(1).startswith("https://") and site.group(1).rstrip("/").endswith(".edu.tr"):
            out[ad_anahtari(m.group(1))] = (m.group(1), site.group(1))
    return out


def yok_listesi() -> dict[str, tuple[str, str]]:
    out: dict[str, tuple[str, str]] = {}
    for url in YOK_LISTELERI:
        out.update(yok_listesi_ayristir(kv.getir(url, "yok.gov.tr").text))
    return out


# ------------------------------------------------------------------ doğrulama


ARSIV_ADRESI = re.compile(r"/(date|category|kategori|tag|etiket|page|sayfa|arsiv|archive)/|/\d{4}/\d{1,2}/?$", re.I)
KIRINTI = re.compile(r"\s/\s")


def gecerli_duyuru(sonuc: kv.Sonuc, gun: date) -> bool:
    """Liste GERÇEKTEN tek tek duyurulardan mı oluşuyor?

    Ölçülen iki yanlış keşif (25 Eylül 2026): Akdeniz'in aylık arşiv
    sayfaları (hepsinin başlığı "Duyurular", adresi /date/2026/9) ve
    Hacettepe'nin kategori sayfaları ("Personel / Senato Kararları").
    İkisi de "en az 3 tarihli bağlantı" kuralını geçiyordu.
    """
    ds = [
        d for d in sonuc.duyurular
        if not ARSIV_ADRESI.search(urlsplit(d["url"]).path) and not KIRINTI.search(d["baslik"])
    ]
    basliklar = {d["baslik"].strip().lower() for d in ds}
    uzunluklar = sorted(len(b) for b in basliklar)
    yakin = [d for d in ds if date.fromisoformat(d["yayin_tarihi"]) >= gun - timedelta(days=60)]
    return (
        len(basliklar) >= 3
        and len(basliklar) == len(ds)  # aynı başlık iki kez: arşiv ya da menü
        and uzunluklar[len(uzunluklar) // 2] >= 20
        and len(yakin) >= 3
        and len(ds) >= 0.7 * len(sonuc.duyurular)  # listenin çoğu elenmişse liste duyuru listesi değil
    )


def yemek_gibi(kalem: str) -> bool:
    """En az üç harf içeren kalem; birim, noktalama ya da sayı değil."""
    return len(re.findall(r"[A-Za-zÇĞİÖŞÜçğıöşü]", kalem)) >= 3 and not kv.GURULTU.match(kalem.strip())


def gecerli_menu(sonuc: kv.Sonuc, gun: date) -> bool:
    """Bugüne yakın en az 3 gün ve kalemlerin en az %90'ı yemek adına benziyor.

    İkinci şart ölçülen bir hatadan (25 Eylül 2026): Üsküdar'ın sayfası
    her yemeğin ardından "-" ve "cal." yer tutucusu basıyordu ve menü
    yarı yarıya gürültüyle doğrulamayı geçmişti.
    """
    tarihler = {date.fromisoformat(m["tarih"]) for m in sonuc.menuler}
    kalemler = [k for m in sonuc.menuler for k in m["yemekler"]]
    oran = sum(yemek_gibi(k) for k in kalemler) / len(kalemler) if kalemler else 0
    return len(tarihler) >= 3 and any(abs((t - gun).days) <= 7 for t in tarihler) and oran >= 0.9


def dene(kaynak: dict[str, Any], alan: str, gun: date) -> kv.Sonuc | None:
    try:
        return kv.AYRISTIRICILAR[kaynak["ayristirici"]](kaynak, alan, gun)
    except Exception as e:  # aday kaynak; hata bir sonuç
        print(f"   aday düştü {kaynak['ayristirici']} {kaynak['url']}: {type(e).__name__}: {str(e)[:120]}")
        return None


# ------------------------------------------------------------------ aday kaynaklar


def wordpress_adaylari(site: str, alan: str) -> list[dict[str, Any]]:
    adaylar: list[dict[str, Any]] = []
    try:
        kategoriler = kv.getir(f"{site}/wp-json/wp/v2/categories", alan, search="duyuru", per_page=20).json()
    except Exception:
        return adaylar
    uygun = [
        k for k in kategoriler
        if isinstance(k, dict) and re.fullmatch(r"(genel-)?duyurular?", k.get("slug", "")) and k.get("count", 0) > 0
    ]
    if uygun:
        en = max(uygun, key=lambda k: k["count"])
        adaylar.append({"tur": "duyuru", "ayristirici": "wordpress_kategori",
                        "url": f"{site}/wp-json/wp/v2/posts", "ayar": {"kategori": en["id"]}})
    for arama in ("menu", "yemek"):
        adaylar.append({"tur": "yemek", "ayristirici": "wordpress_aylik_menu_pdf",
                        "url": f"{site}/wp-json/wp/v2/media", "ayar": {"arama": arama}})
    return adaylar


DUYURU_BAGLANTISI = re.compile(r"^(tüm |bütün )?duyurular$|^duyurular ", re.I)
MENU_BAGLANTISI = re.compile(r"yemek\s*(menü|listesi)|menü\w*\s*yemek|yemekhane menü", re.I)


def sayfa_adaylari(site: str, alan: str) -> list[dict[str, Any]]:
    """Ana sayfa ve SKS alt alanındaki bağlantılardan aday liste/menü sayfaları."""
    from bs4 import BeautifulSoup

    adaylar: list[dict[str, Any]] = []
    gorulen: set[str] = set()
    for giris in (site, f"https://sks.{alan}"):
        try:
            r = kv.getir(giris, alan)
        except Exception:
            continue
        b = BeautifulSoup(r.text, "html.parser")
        for link in b.find_all("a", href=True):
            href = urljoin(r.url, link["href"]).split("#")[0]
            if href in gorulen or not kv.resmi_alanda(href, alan):
                continue
            metin = link.get_text(" ", strip=True)
            yol = urlsplit(href).path.rstrip("/")
            if DUYURU_BAGLANTISI.search(metin) or re.search(r"/(duyurular|announcements|allnotices)$", yol):
                gorulen.add(href)
                for onek in {yol + "/", "/duyuru/", "/duyurular/", "/notice/", "/announcements/"}:
                    adaylar.append({"tur": "duyuru", "ayristirici": "html_duyuru_listesi", "url": href, "ayar": {"onek": onek}})
            elif MENU_BAGLANTISI.search(metin):
                gorulen.add(href)
                adaylar.append({"tur": "yemek", "ayristirici": "html_satir_menu", "url": href, "ayar": {"varsayilan_ogun": "gunluk"}})
                adaylar.append({"tur": "yemek", "ayristirici": "sayfadaki_pdf_menu", "url": href,
                                "ayar": {"ogunler": {"ogle": "ogle|öğle|oglen|öğlen", "aksam": "aksam|akşam"}, "haric": "vegan"}})
    return adaylar


def cms_adaylari(site: str, alan: str) -> list[dict[str, Any]]:
    """Ortak üniversite CMS'i (service-cms.<alan>): İÜ ve İÜ-Cerrahpaşa kullanıyor.

    Ana sayfa `service-cms.<alan>/api/webclient/js?site=<anahtar>` yüklüyorsa
    duyurular aynı servisin `f_getNoticeBox` ucundan JSON olarak geliyor.
    """
    try:
        r = kv.getir(site, alan)
    except Exception:
        return []
    m = re.search(r"service-cms\." + re.escape(alan) + r"/api/webclient/js\?site=(\w+)", r.text)
    if not m:
        return []
    ana = f"{urlsplit(r.url).scheme}://{urlsplit(r.url).netloc}"
    return [{
        "tur": "duyuru", "ayristirici": "json_duyuru_listesi",
        "url": f"https://service-cms.{alan}/api/webclient/f_getNoticeBox",
        "ayar": {"parametreler": {"siteKey": m.group(1), "Value": 1}, "veri": "Data", "baslik": "Header",
                 "tarih": "Date", "url_sablonu": ana + "/tr/duyurular/{Route}"},
    }]


YAYGIN_DUYURU_YOLLARI = ["/tr/duyurular", "/duyurular", "/tr/duyuru", "/duyuru", "/announcements"]
YAYGIN_MENU_ADRESLERI = ["https://sks.{alan}/yemek-listesi", "https://sks.{alan}/yemek-menusu", "https://sks.{alan}/yemek",
                         "https://sks.{alan}/tr/yemek-listesi", "https://www.{alan}/yemek-listesi"]


def yaygin_adaylar(site: str, alan: str) -> list[dict[str, Any]]:
    """Bağlantısı HTML'de görünmeyen (JavaScript ile çizilen) sitelerde yaygın yollar.

    Yalnız resmî alan adında; her aday yine gerçekten çalıştırılıp
    doğrulanıyor — var olmayan yol boş sonuç verip eleniyor.
    """
    adaylar: list[dict[str, Any]] = []
    for yol in YAYGIN_DUYURU_YOLLARI:
        adaylar.append({"tur": "duyuru", "ayristirici": "html_duyuru_listesi", "url": site + yol, "ayar": {"onek": yol + "/"}})
    for sablon in YAYGIN_MENU_ADRESLERI:
        url = sablon.format(alan=alan)
        adaylar.append({"tur": "yemek", "ayristirici": "html_satir_menu", "url": url, "ayar": {"varsayilan_ogun": "gunluk"}})
    return adaylar


def kesfet(site: str, alan: str, gun: date) -> tuple[list[dict[str, Any]], list[str]]:
    """Tür başına doğrulamayı geçen İLK kaynak."""
    secilen: dict[str, dict[str, Any]] = {}
    notlar: list[str] = []
    adaylar = cms_adaylari(site, alan) + wordpress_adaylari(site, alan) + sayfa_adaylari(site, alan)
    for aday in adaylar + yaygin_adaylar(site, alan):
        if aday["tur"] in secilen:
            continue
        sonuc = dene(aday, alan, gun)
        if sonuc is None:
            continue
        gecerli = gecerli_duyuru(sonuc, gun) if aday["tur"] == "duyuru" else gecerli_menu(sonuc, gun)
        if gecerli:
            secilen[aday["tur"]] = aday
            notlar.append(f"{aday['tur']}: {aday['ayristirici']} {aday['url']}")
    for tur in ("yemek", "duyuru"):
        if tur not in secilen:
            notlar.append(f"{tur}: doğrulamayı geçen kaynak bulunamadı")
    return list(secilen.values()), notlar


# ------------------------------------------------------------------ yazma


def tohumu_isle(db: Any, kuru: bool) -> None:
    veri = json.loads(TOHUM.read_text(encoding="utf-8"))
    for u in veri["universiteler"]:
        satir = {
            "id": u["id"],
            "resmi_ad": u["resmi_ad"],
            "resmi_alan_adi": u["resmi_alan_adi"],
            "ad_anahtarlari": sorted({ad_anahtari(a) for a in [u["resmi_ad"], *u.get("kisa_adlar", [])]}),
            "yemekhane_sayfasi": u.get("yemekhane_sayfasi"),
            "duyurular_sayfasi": u.get("duyurular_sayfasi"),
            "dogrulama_kaynagi": "elle",
        }
        print(f"TOHUM {u['id']}: {len(u['kaynaklar'])} kaynak")
        if kuru:
            continue
        db.table("universiteler").upsert(satir, on_conflict="id").execute()
        for k in u["kaynaklar"]:
            db.table("universite_kaynaklari").upsert(
                {"universite_id": u["id"], "tur": k["tur"], "ayristirici": k["ayristirici"],
                 "url": k["url"], "ayar": k.get("ayar", {}), "etkin": True},
                on_conflict="universite_id,tur,url",
            ).execute()


def okullar(db: Any) -> set[str]:
    """Öğrencilerin girdiği okul adları (tekil)."""
    adlar: set[str] = set()
    bas = 0
    while True:
        satirlar = (
            db.table("student_profiles").select("university").not_.is_("university", "null")
            .range(bas, bas + 999).execute().data
        )
        adlar |= {s["university"].strip() for s in satirlar if (s.get("university") or "").strip()}
        if len(satirlar) < 1000:
            return adlar
        bas += 1000


def kos(kuru: bool = False, en_cok: int = 5) -> int:
    db = kv.istemci()
    tohumu_isle(db, kuru)

    katalog = db.table("universiteler").select("id, ad_anahtarlari, kesif_at, dogrulama_kaynagi").execute().data
    bilinen = {a for u in katalog for a in u["ad_anahtarlari"]}
    kesif_zamani = {u["id"]: u.get("kesif_at") for u in katalog}
    eksik = sorted(ad for ad in okullar(db) if ad_anahtari(ad) not in bilinen)

    # Katalogda olup kaynağı olmayan, YÖK'ten gelen okullar da yeniden deneniyor.
    tekrar = [
        u for u in katalog
        if u["dogrulama_kaynagi"] == "yok.gov.tr"
        and (not u.get("kesif_at") or datetime.fromisoformat(u["kesif_at"]) < datetime.now(UTC) - YENIDEN_DENEME)
    ]
    # Koşu başına sınır: keşif her aday için siteye nazikçe (1 sn arayla)
    # gidiyor; kalan okullar bir sonraki koşuda.
    eksik, tekrar = eksik[:en_cok], tekrar[: max(0, en_cok - len(eksik[:en_cok]))]
    print(f"KEŞİF katalogda olmayan {len(eksik)} okul, yeniden denenecek {len(tekrar)} okul")
    if not eksik and not tekrar:
        return 0

    yok = yok_listesi()
    gun = kv.bugun()
    for ad in eksik:
        eslesme = yok.get(ad_anahtari(ad))
        if not eslesme:
            print(f"ATLA  {ad}: YÖK listesinde birebir karşılığı yok")
            continue
        yok_adi, site = eslesme
        alan = kayitli_alan(site)
        uid = kimlik(ad)
        if uid in kesif_zamani:
            continue
        kaynaklar, notlar = kesfet(site.rstrip("/"), alan, gun)
        print(f"YENİ  {ad} ({alan}) → {len(kaynaklar)} kaynak: {'; '.join(notlar)}")
        if kuru:
            continue
        simdi = datetime.now(UTC).isoformat()
        db.table("universiteler").upsert({
            "id": uid, "resmi_ad": ad, "resmi_alan_adi": alan,
            "ad_anahtarlari": sorted({ad_anahtari(ad), ad_anahtari(yok_adi)}),
            "dogrulama_kaynagi": "yok.gov.tr", "kesif_at": simdi, "kesif_notu": "; ".join(notlar)[:1000],
        }, on_conflict="id").execute()
        for k in kaynaklar:
            db.table("universite_kaynaklari").upsert(
                {"universite_id": uid, **k, "etkin": True}, on_conflict="universite_id,tur,url"
            ).execute()

    for u in tekrar:
        satir = db.table("universiteler").select("resmi_alan_adi").eq("id", u["id"]).single().execute().data
        alan = satir["resmi_alan_adi"]
        var = {k["tur"] for k in db.table("universite_kaynaklari").select("tur").eq("universite_id", u["id"]).execute().data}
        if {"yemek", "duyuru"} <= var:
            continue
        kaynaklar, notlar = kesfet(f"https://www.{alan}", alan, gun)
        kaynaklar = [k for k in kaynaklar if k["tur"] not in var]
        print(f"TEKRAR {u['id']} → {len(kaynaklar)} yeni kaynak: {'; '.join(notlar)}")
        if kuru:
            continue
        db.table("universiteler").update(
            {"kesif_at": datetime.now(UTC).isoformat(), "kesif_notu": "; ".join(notlar)[:1000]}
        ).eq("id", u["id"]).execute()
        for k in kaynaklar:
            db.table("universite_kaynaklari").upsert(
                {"universite_id": u["id"], **k, "etkin": True}, on_conflict="universite_id,tur,url"
            ).execute()
    return 0


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--kuru", action="store_true", help="veritabanına yazma, yalnız göster")
    ap.add_argument("--en-cok", type=int, default=5, help="bir koşuda keşfedilecek en çok okul")
    a = ap.parse_args()
    raise SystemExit(kos(kuru=a.kuru, en_cok=a.en_cok))


if __name__ == "__main__":
    main()
