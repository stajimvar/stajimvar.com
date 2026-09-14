"""Yayindaki ilanlardan sitemap.xml uretir.

NEDEN OTOMASYONDA
-----------------
Site tek sayfa uygulamasi; ilanlar veritabaninda ve saat basi degisiyor.
Elle yazilan bir sitemap bir gun sonra yalan soyler: kapanan ilana yonlendirir,
yeni ilani hic tanitmaz.

Bu betik tarama turundan sonra calisiyor ve o anda GERCEKTEN yayinda olan
ilanlari yaziyor. Cikti public/sitemap.xml; bir sonraki dagitimda yayina
giriyor.

Kapsam bilincli olarak dar: yalnizca herkese acik sayfalar. Yonetim ekranlari
ve oturum gerektiren sayfalar disarida -- robots.txt de ayrica engelliyor.
"""
from __future__ import annotations

import os
import re
import unicodedata
from datetime import UTC, datetime
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

SITE = "https://stajimvar.com"

# Icerik sayfalari. Oncelik degerleri gorece: isveren rehberi sirketi
# siteye getiren tek kanal oldugu icin anasayfadan sonra geliyor.
DURAGAN = [
    ("/", "daily", "1.0"),
    # "STAJ ILANLARI" ARAMA NIYETININ BIRINCIL SAYFASI
    #
    # Ana sayfadan hemen sonra: olculdu (Search Console), "staj" iceren
    # sorgularda ana sayfa 137 gosterim aliyor ama TEK tiklama yok ve tam
    # "staj ilanlari" sorgusunda hic gosterim almiyor. Ana sayfa markayi
    # ve urunun tamamini anlatiyor; ilan aramanin kendi sayfasi burasi.
    # Gunluk: liste her gun degisiyor.
    ("/staj-ilanlari", "daily", "0.9"),
    ("/isveren", "weekly", "0.9"),
    ("/rehber", "weekly", "0.9"),
    ("/bolumler", "weekly", "0.9"),
    ("/staj-programlari", "weekly", "0.9"),
    ("/isveren/ilan-ver", "monthly", "0.8"),
    ("/universite-kariyer-merkezleri", "monthly", "0.8"),
    ("/firsatlar", "daily", "0.8"),
    ("/burslar", "daily", "0.7"),
    ("/kyk", "daily", "0.7"),
    # /kesfet KALDIRILDI (11 Eylul 2026): bolum kapandi, adres /firsatlar'a
    # 301 aliyor. Haritada yonlendirmeye giden adres olmaz.
    ("/yurtdisi-firsatlari", "daily", "0.7"),
    ("/yarismalar", "daily", "0.7"),
    ("/firsat-takvimi", "daily", "0.7"),
    # Hesaplama araclari. Arama trafiginin buyuk kismini bunlar getiriyor.
    ("/araclar", "monthly", "0.8"),
    ("/araclar/net-hesaplama", "monthly", "0.8"),
    ("/araclar/siralama-tahmini", "monthly", "0.8"),
    ("/araclar/staj-ucreti-hesaplama", "monthly", "0.8"),
    ("/araclar/staj-gunu-hesaplama", "monthly", "0.8"),
    ("/hakkimizda", "monthly", "0.5"),
    ("/iletisim", "monthly", "0.5"),
    ("/ilan-kurallari", "monthly", "0.4"),
    ("/ilan-bildir", "monthly", "0.4"),
    ("/kullanim-kosullari", "yearly", "0.3"),
    ("/gizlilik", "yearly", "0.3"),
    ("/cerez-politikasi", "yearly", "0.3"),
    ("/kvkk-aydinlatma-metni", "yearly", "0.3"),
]


def program_sluglari() -> list[str]:
    """Buyuk isveren dizinindeki kurumlarin sluglari.

    Kalite kapisi ON RENDER tarafinda uygulaniyor (src/lib/sirket-kimligi.mjs);
    burada ayni kurallari ikinci kez yazmak iki uygulamanin ayrisma riskini
    dogururdu. Dizin kaydinin kendisi zaten kariyer adresi, ozet ve bolum
    iliskisi tasiyor.
    """
    return kayit_sluglari("stajProgramlari.ts")


def kayit_sluglari(dosya: str) -> list[str]:
    """src/data altindaki bir kayittan slug'lari okur.

    NEDEN AYRISTIRIYORUZ, ELLE YAZMIYORUZ
    -------------------------------------
    Once bu listeler burada elle tutuluyordu. Yeni bir bolum ya da rehber
    eklerken sitemap'e satir eklemeyi unutmak, sayfanin var olup Google'a hic
    bildirilmemesi demek -- sessiz bir hata, kimse fark etmiyor.

    Iki kayit da duz bir dizi ve her girdi `slug: '...'` ile basliyor; tek
    satirlik bir duzenli ifade yetiyor. Dosya bulunamazsa bos donuyoruz:
    sitemap uretimi bu yuzden tur bosa dusmesin.
    """
    kaynak = Path(__file__).parent.parent / "src" / "data" / dosya
    if not kaynak.exists():
        print(f"UYARI: {dosya} bulunamadi, o sayfalar sitemap'e girmedi")
        return []
    return re.findall(r"^\s+slug: '([a-z0-9-]+)',", kaynak.read_text(encoding="utf-8"), re.M)


def rehber_sluglari() -> list[str]:
    """Butun rehber sluglari: eski kayit + konu konu dosyalar.

    NEDEN AYRI FONKSIYON
    --------------------
    Ilk on bir rehber rehberler.tsx icinde duruyor; yeni yazilar
    src/data/rehber-yazilari/ altinda konuya gore ayri dosyalarda. Yalnizca
    rehberler.tsx okundugunda sitemap 70 sayfanin 11'ini bildiriyordu --
    kalan 59 sayfa yayinda ama Google'a hic haber verilmemis oluyordu.
    Sessiz ve pahali bir hata; o yuzden dizin de taraniyor.
    """
    sluglar = list(kayit_sluglari("rehberler.tsx"))
    dizin = Path(__file__).parent.parent / "src" / "data" / "rehber-yazilari"
    if not dizin.exists():
        print("UYARI: rehber-yazilari dizini yok, yeni rehberler sitemap'e girmedi")
        return sluglar
    for dosya in sorted(dizin.glob("*.tsx")):
        sluglar += re.findall(
            r"^\s+slug: '([a-z0-9-]+)',", dosya.read_text(encoding="utf-8"), re.M
        )
    # Ayni slug iki yerde olmamali; olursa sitemap'te de tekrar etmesin.
    return list(dict.fromkeys(sluglar))


def slugla(metin: str) -> str:
    """src/lib/slug.ts ile ayni kurali uygular."""
    tablo = str.maketrans("İIıĞğÜüŞşÖöÇç", "iiiGgUuSsOoCc")
    t = metin.translate(tablo)
    t = "".join(c for c in unicodedata.normalize("NFKD", t) if not unicodedata.combining(c))
    t = re.sub(r"[^a-zA-Z0-9]+", "-", t).strip("-").lower()
    return re.sub(r"-{2,}", "-", t)


def kacir(metin: str) -> str:
    return (
        metin.replace("&", "&amp;").replace("<", "&lt;")
        .replace(">", "&gt;").replace('"', "&quot;")
    )


def main() -> None:
    load_dotenv(Path(__file__).parent / ".env")
    db = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    ilanlar = (
        db.table("listings")
        # `application_deadline` SECIMDE OLMAK ZORUNDA: asagidaki
        # `ilan_acik` suzgeci onu okuyor. Tasinmadiginda suzgec her kaydi
        # "acik" sayiyor ve suresi gecmis ilan yine haritaya giriyor.
        # Ayni sinifta hata bu iste UC KEZ yasandi (opportunity_type,
        # countries, application_deadline).
        .select("id,title,updated_at,application_deadline,companies(slug)")
        .eq("status", "published")
        .execute()
        .data
        or []
    )
    firsatlar = (
        db.table("opportunities")
        .select("slug,updated_at")
        .eq("status", "published")
        # Tarihsiz firsatlar da haritaya girer.
        #
        # Filtre yalnizca "son basvuru gecmemis" kayitlari aliyordu; ama
        # application_deadline NULL olan kayit bu kosulu HIC saglamiyor ve
        # sessizce dusuyordu. Sitede bu kayitlarin sayfasi uretiliyor ve
        # /burslar listesinde gorunuyorlar ("Kurum bu donemin takvimini
        # aciklamadi" notuyla) - yani var olan, calisan sayfalar haritada
        # yoktu. Olculdu: 83 yayinda firsatin tamami bu durumdaydi.
        #
        # Suresi GECMIS olanlar hala disarida: onlar icin deadline dolu ve
        # gecmis tarihli.
        .or_(
            f"application_deadline.is.null,"
            f"application_deadline.gte.{datetime.now(UTC).isoformat()}"
        )
        .execute()
        .data
        or []
    )

    bolumler = kayit_sluglari("bolumler.ts")
    rehberler = rehber_sluglari()
    duragan = (
        DURAGAN
        + [(f"/bolum/{s}", "monthly", "0.8") for s in bolumler]
        + [(f"/rehber/{s}", "monthly", "0.8") for s in rehberler]
    )

    satirlar: list[str] = []
    for yol, sik, oncelik in duragan:
        satirlar.append(
            f"  <url><loc>{SITE}{yol}</loc>"
            f"<changefreq>{sik}</changefreq><priority>{oncelik}</priority></url>"
        )

    sirketler: set[str] = set()
    # SURESI GECMIS ILAN HARITADA DEGIL
    #
    # Firsatlarda bu kural zaten vardi (`application_deadline.gte.now`),
    # ilanlarda YOKTU. Olculdu (14 Eylul 2026): "KEY+ Uzun Donem Staj
    # Programi" son basvurusu 2026-09-06, sekiz gun gecmis, hala
    # status=published ve adresi haritada bildiriliyordu. Yapisal veri
    # `validThrough` ile Google'a "kapandi" derken harita "bunu tara"
    # diyordu -- celiskili sinyal.
    #
    # Sayfa SILINMIYOR: kapanmis ilanin sayfasi duruyor ve gorunur
    # metninde kapandigi yaziyor (bkz. scripts/onrender.mjs). Degisen
    # tek sey, arama motorunu ona yonlendirmemek.
    simdi_ilan = datetime.now(UTC)

    def ilan_acik(kayit: dict) -> bool:
        son = kayit.get("application_deadline")
        if not son:
            return True
        try:
            bitis = datetime.fromisoformat(str(son).replace("Z", "+00:00"))
        except ValueError:
            return True
        if bitis.tzinfo is None:
            bitis = bitis.replace(tzinfo=UTC)
        return bitis >= simdi_ilan

    for ilan in ilanlar:
        if not ilan_acik(ilan):
            continue
        onek = ilan["id"].split("-")[0]
        yol = f"/ilan/{slugla(ilan['title'])}-{onek}"
        tarih = (ilan.get("updated_at") or "")[:10]
        tarih_etiketi = f"<lastmod>{tarih}</lastmod>" if tarih else ""
        satirlar.append(
            f"  <url><loc>{kacir(SITE + yol)}</loc>{tarih_etiketi}"
            f"<changefreq>daily</changefreq><priority>0.8</priority></url>"
        )
        sirket = (ilan.get("companies") or {}).get("slug")
        if sirket:
            sirketler.add(sirket)

    for firsat in firsatlar:
        tarih = (firsat.get("updated_at") or "")[:10]
        tarih_etiketi = f"<lastmod>{tarih}</lastmod>" if tarih else ""
        satirlar.append(
            f"  <url><loc>{SITE}/firsatlar/{kacir(firsat['slug'])}</loc>{tarih_etiketi}"
            f"<changefreq>daily</changefreq><priority>0.7</priority></url>"
        )

    # /kesfet ADRESLERI HARITADAN CIKTI
    #
    # Kesfet bolumu 11 Eylul 2026'da kapandi ve /kesfet/* adresleri
    # public/_redirects ile /firsatlar'a 301 aliyor. Durağan listeden o
    # tarihte cikarilmis ama BU DONGU yerinde kalmisti: harita her
    # uretimde 99 yonlendirilmis adres bildiriyordu.
    #
    # Olculdu (canli, 14 Eylul 2026): haritadaki /kesfet/ adreslerinden
    # uc ornek de HTTP 301 dondu. Arama motoruna "bunu tara" derken ayni
    # adres icin "baska yere git" demek celiskili sinyal.
    #
    # Kayitlar SILINMEDI, arsivde duruyor (goc 20260926120000); yalniz
    # adresleri artik bildirilmiyor. `etkinlikler` sorgusu da kalkti:
    # kullanilmayan bir okuma, yarin yanlislikla geri baglanmayi
    # kolaylastirir.

    # Buyuk isveren sayfalari: dizindeki kurumlarin kendi adresleri.
    # Tabloda karsiligi olan slug iki kez yazilmasin diye set birlestiriliyor.
    for slug in sorted(set(program_sluglari()) - sirketler):
        satirlar.append(
            f"  <url><loc>{SITE}/sirket/{kacir(slug)}</loc>"
            f"<changefreq>weekly</changefreq><priority>0.6</priority></url>"
        )

    # Sirket sayfalari: sirketin kendi adini arayip bizi bulmasinin yolu.
    for slug in sorted(sirketler):
        satirlar.append(
            f"  <url><loc>{SITE}/sirket/{kacir(slug)}</loc>"
            f"<changefreq>weekly</changefreq><priority>0.7</priority></url>"
        )

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(satirlar)
        + "\n</urlset>\n"
    )

    hedef = Path(__file__).parent.parent / "public" / "sitemap.xml"
    hedef.write_text(xml, encoding="utf-8")
    print(
        f"sitemap.xml yazildi: {len(duragan)} duragan ({len(bolumler)} bolum) "
        f"+ {len(ilanlar)} ilan + {len(firsatlar)} firsat "
        # `etkinlikler` yukarida sorgusuyla birlikte kalkti ama BU SATIRDA
        # kaldi: dosya yazildiktan SONRA NameError firlatiyordu, yani
        # sitemap.xml dogru uretiliyor, betik exit 1 veriyordu.
        # supabase-production.yml'nin dagitim isi bu yuzden kirikti.
        f"+ {len(sirketler)} sirket = {len(satirlar)} adres "
        f"({datetime.now(UTC).isoformat(timespec='seconds')})"
    )


if __name__ == "__main__":
    main()
