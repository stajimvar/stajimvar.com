"""Şirketlerin işe alım e-posta adresini kendi sitelerinden bulur.

Bu modülün tamamı tek bir soruya hizmet ediyor: **bu adresi şirket gerçekten
işe alım için mi yayımlamış?** Bulunan her adres, nerede görüldüğünün kanıt
URL'siyle birlikte kaydedilir. Kanıt yoksa kayıt yoktur.

Neden bu kadar katı: doğrulanmamış bir adrese öğrenci CV'si göndermek, kişisel
veriyi yanlış yere yollamaktır. Şema da buna izin vermiyor —
`application_channels` tablosundaki `channels_verified_needs_evidence` kısıtı
kanıt olmadan "doğrulanmış" işaretlemeyi reddediyor, `channels_no_generic_mailbox`
kısıtı da info@/iletisim@ gibi genel kutuları baştan eliyor.

Bu betik adresleri **unverified** olarak yazar. `verified` işaretlemek insan
kararıdır ve `--verify` bayrağıyla ayrıca yapılır.

Kullanım:
    python hr_channels.py --dry-run
    python hr_channels.py
"""
from __future__ import annotations

import argparse
import re
from urllib.parse import urljoin, urlparse

import requests
from dotenv import load_dotenv

import repository

HEADERS = {
    "User-Agent": "StajimVarBot/1.0 (+https://stajimvar.com/bot)",
    "Accept": "text/html,application/xhtml+xml",
}
TIMEOUT = 20

# İşe alım amaçlı olduğu adından belli olan kutular. Sıra önem sırası:
# staj@ en spesifik, hr@ en genel ama yine de işe alım kutusu.
ISE_ALIM_KUTULARI = [
    "staj", "stajyer", "internship", "intern",
    "kariyer", "kariyer.tr", "career", "careers", "jobs", "job",
    "ik", "insankaynaklari", "insan.kaynaklari", "hr", "humanresources",
    "basvuru", "cv", "isbasvuru", "recruitment", "recruiting", "talent",
]

# Kesinlikle işe alım kutusu olmayanlar. Şema da bunları reddediyor ama
# buraya kadar getirmemek daha temiz.
YASAK_KUTULAR = {
    "info", "iletisim", "contact", "destek", "support", "hello", "merhaba",
    "admin", "webmaster", "sales", "satis", "pazarlama", "marketing",
    "noreply", "no-reply", "postmaster", "abuse", "bilgi", "muhasebe",
    "finans", "fatura", "kvkk", "legal", "press", "basin",
}

# Kariyer sayfası olma ihtimali olan yollar.
KARIYER_YOLLARI = [
    "/kariyer", "/careers", "/career", "/tr/kariyer", "/en/careers",
    "/insan-kaynaklari", "/ik", "/jobs", "/is-basvurusu", "/kariyer/basvuru",
]

EPOSTA_KALIBI = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")


def sayfadan_adresler(html: str) -> list[str]:
    """Sayfadaki e-posta adreslerini toplar (mailto: ve düz metin)."""
    bulunan = set()
    for m in re.finditer(r'mailto:([^"\'>\s?]+)', html, re.I):
        bulunan.add(m.group(1).strip().lower())
    for m in EPOSTA_KALIBI.finditer(html):
        bulunan.add(m.group(0).strip().lower())
    return sorted(bulunan)


def ise_alim_adresi_mi(adres: str, site_alan_adi: str | None) -> tuple[bool, str]:
    """(uygun_mu, sebep).

    İki şart: kutu adı işe alımı işaret etmeli VE adres şirketin kendi alan
    adında olmalı. İkincisi olmadan, sayfada geçen rastgele bir üçüncü taraf
    adresini şirketin başvuru kanalı sanabilirdik.
    """
    if "@" not in adres:
        return False, "geçersiz"
    kutu, _, alan = adres.partition("@")
    kutu = kutu.lower()

    if kutu in YASAK_KUTULAR:
        return False, f"genel kutu ({kutu}@)"

    if site_alan_adi and site_alan_adi not in alan.lower():
        return False, f"farklı alan adı ({alan})"

    for anahtar in ISE_ALIM_KUTULARI:
        if kutu == anahtar or kutu.startswith(anahtar + ".") or kutu.startswith(anahtar + "-"):
            return True, f"işe alım kutusu ({kutu}@)"

    return False, f"işe alımla ilgisi belirsiz ({kutu}@)"


def kariyer_sayfalari(site: str) -> list[str]:
    """Denenecek adresler: ana sayfa + yaygın kariyer yolları."""
    kok = f"https://{site}"
    return [kok] + [urljoin(kok, yol) for yol in KARIYER_YOLLARI]


def sirket_icin_ara(site: str) -> tuple[str, str] | None:
    """(adres, kanıt_url) döndürür; bulamazsa None."""
    alan = site.lower().replace("www.", "")
    # Alan adının ana parçası: "vertigogames.com" -> "vertigogames"
    kok_ad = alan.split(".")[0]

    for url in kariyer_sayfalari(site):
        try:
            r = requests.get(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)
        except Exception:
            continue
        if r.status_code != 200 or "text/html" not in r.headers.get("content-type", ""):
            continue

        for adres in sayfadan_adresler(r.text):
            uygun, _ = ise_alim_adresi_mi(adres, kok_ad)
            if uygun:
                return adres, r.url
    return None


def main() -> None:
    parser = argparse.ArgumentParser(description="Şirket işe alım adresi keşfi")
    parser.add_argument("--dry-run", action="store_true", help="Hiçbir şey yazma")
    parser.add_argument("--limit", type=int, default=0, help="En fazla kaç şirket")
    args = parser.parse_args()

    load_dotenv()
    db = repository.client()

    sirketler = (
        db.table("companies")
        .select("id,name,website_url")
        .not_.is_("website_url", "null")
        .execute()
        .data
        or []
    )
    if args.limit:
        sirketler = sirketler[: args.limit]

    mevcut = {
        (c["company_id"], c["value"])
        for c in (db.table("application_channels").select("company_id,value").execute().data or [])
    }

    bulundu = atlandi = yok = 0
    for sirket in sirketler:
        site = repository.domain_of(sirket.get("website_url"))
        if not site:
            continue

        if any(cid == sirket["id"] for cid, _ in mevcut):
            atlandi += 1
            continue

        sonuc = sirket_icin_ara(site)
        if not sonuc:
            print(f"  {sirket['name'][:26]:<28} adres bulunamadı")
            yok += 1
            continue

        adres, kanit = sonuc
        print(f"  {sirket['name'][:26]:<28} {adres:<34} <- {kanit[:52]}")
        bulundu += 1

        if args.dry_run:
            continue

        try:
            db.table("application_channels").insert(
                {
                    "company_id": sirket["id"],
                    "type": "email",
                    "value": adres,
                    # BİLEREK unverified: doğrulama insan kararı.
                    "verification": "unverified",
                    "verification_method": "published_on_career_page",
                    "evidence_url": kanit,
                }
            ).execute()
        except Exception as error:
            print(f"      kaydedilemedi: {str(error)[:90]}")
            bulundu -= 1

    print(f"\nbulunan={bulundu} zaten_var={atlandi} bulunamadı={yok}")
    if bulundu and not args.dry_run:
        print("Kayıtlar 'unverified' durumda. Doğrulamadan hiçbir başvuru gönderilmez.")


if __name__ == "__main__":
    main()
