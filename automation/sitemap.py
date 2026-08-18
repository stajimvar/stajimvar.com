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
    ("/isveren", "weekly", "0.9"),
    ("/rehber", "weekly", "0.9"),
    ("/bolumler", "weekly", "0.9"),
    ("/staj-programlari", "weekly", "0.9"),
    ("/isveren/ilan-ver", "monthly", "0.8"),
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
    return re.findall(r"^\s{4}slug: '([a-z0-9-]+)',", kaynak.read_text(encoding="utf-8"), re.M)


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
        .select("id,title,updated_at,companies(slug)")
        .eq("status", "published")
        .execute()
        .data
        or []
    )

    bolumler = kayit_sluglari("bolumler.ts")
    rehberler = kayit_sluglari("rehberler.tsx")
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
    for ilan in ilanlar:
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
        f"+ {len(ilanlar)} ilan "
        f"+ {len(sirketler)} sirket = {len(satirlar)} adres "
        f"({datetime.now(UTC).isoformat(timespec='seconds')})"
    )


if __name__ == "__main__":
    main()
