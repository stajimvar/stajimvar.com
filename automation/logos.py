"""Şirket logolarını kendi sitelerinden alır ve Supabase Storage'a yükler.

Neden bu kadar kontrol var: yanlış şirketin logosunu göstermek, hiç logo
göstermemekten kötüdür. Domain `sources.json` içinde elle yazılı ve **tahmin
olarak kabul ediliyor**; kullanılmadan önce sayfanın gerçekten o şirkete ait
olduğu doğrulanıyor. Doğrulanamayan şirket logosuz kalır, arayüz baş harfleri
gösterir.

Logolar dışarıdan bağlanmıyor, `logos` kovasına indiriliyor: üçüncü taraf bir
adrese bağımlı kalmamak ve ziyaretçinin IP'sini o siteye sızdırmamak için.

Kullanım:
    python logos.py --dry-run
    python logos.py
"""
from __future__ import annotations

import argparse
import io
import json
import os
import re
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from dotenv import load_dotenv

import repository
from scraper import source_configs

UA = "StajimVarBot/1.0 (+https://stajimvar.com/bot)"
HEADERS = {"User-Agent": UA, "Accept": "text/html,image/*"}
MAX_BYTES = 1_000_000

# SVG bilerek yok: kova herkese açık ve dosyalar üçüncü taraf sitelerden
# geliyor. SVG içine script gömülebildiği için public bir kovada XSS riski.
EXT_BY_TYPE = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/x-icon": "ico",
    "image/vnd.microsoft.icon": "ico",
    "image/gif": "gif",
}


def fold(text: str) -> str:
    table = str.maketrans("İIıĞğÜüŞşÖöÇç", "iiiGgUuSsOoCc")
    return text.translate(table).lower()


def verify_site(html: str, final_url: str, company: str) -> tuple[bool, str]:
    """Sayfanın gerçekten bu şirkete ait olduğunu doğrular.

    Şirket adının ilk anlamlı kelimesi; alan adında, sayfa başlığında veya
    og:site_name alanında geçmeli. Geçmiyorsa logo alınmaz.
    """
    words = [w for w in re.split(r"[^\w]+", fold(company)) if len(w) > 2]
    if not words:
        return False, "şirket adı çok kısa"
    needle = words[0]

    host = fold(urlparse(final_url).netloc)
    if needle in host.replace("-", ""):
        return True, f"alan adında '{needle}'"

    title = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
    if title and needle in fold(title.group(1)):
        return True, "sayfa başlığında"

    site_name = re.search(
        r'<meta[^>]+property=["\']og:site_name["\'][^>]+content=["\']([^"\']+)', html, re.I
    )
    if site_name and needle in fold(site_name.group(1)):
        return True, "og:site_name"

    return False, f"'{needle}' sayfada bulunamadı"


def pick_icons(html: str, base_url: str) -> list[str]:
    """Logo adaylarını iyiden kötüye sıralar.

    `og:image` BİLEREK kullanılmıyor. İlk denemede onu da listeye koymuştum ve
    Zynga'da oyun afişi, Appier'de ekip fotoğrafı, Pointr'de blog görseli
    seçildi — og:image çoğu sitede paylaşım afişidir, marka işareti değil.

    Sıra: apple-touch-icon (genelde 180×180) → boyutu belirtilmiş en büyük
    icon → bilinen sabit yollar → /favicon.ico.
    """
    candidates: list[tuple[int, str]] = []

    for match in re.finditer(r"<link\b[^>]*>", html, re.I):
        tag = match.group(0)
        rel = re.search(r'rel=["\']([^"\']+)', tag, re.I)
        href = re.search(r'href=["\']([^"\']+)', tag, re.I)
        if not rel or not href:
            continue
        rel_value = rel.group(1).lower()
        if "icon" not in rel_value:
            continue

        sizes = re.search(r'sizes=["\'](\d+)x(\d+)', tag, re.I)
        size = int(sizes.group(1)) if sizes else 0
        priority = size
        if "apple-touch-icon" in rel_value:
            priority = max(priority, 180)
        candidates.append((priority, urljoin(base_url, href.group(1))))

    # Link etiketi vermeyen siteler için yaygın sabit yollar.
    candidates.append((170, urljoin(base_url, "/apple-touch-icon.png")))
    candidates.append((160, urljoin(base_url, "/apple-touch-icon-precomposed.png")))
    candidates.append((0, urljoin(base_url, "/favicon.ico")))

    candidates.sort(key=lambda c: -c[0])
    seen: set[str] = set()
    ordered: list[str] = []
    for _, url in candidates:
        if url not in seen:
            seen.add(url)
            ordered.append(url)
    return ordered


def download_icon(url: str) -> tuple[bytes, str] | None:
    try:
        response = requests.get(url, headers=HEADERS, timeout=20, stream=True)
        response.raise_for_status()
    except Exception:
        return None

    content_type = response.headers.get("content-type", "").split(";")[0].strip().lower()
    ext = EXT_BY_TYPE.get(content_type)
    if not ext:
        return None

    data = response.content
    # 200 bayttan küçük dosyalar genelde boş/yer tutucu ikon oluyor;
    # kartta görünmeyen bir görsel, baş harflerden kötüdür.
    if not data or len(data) < 200 or len(data) > MAX_BYTES:
        return None
    return data, ext


def upload_logo(slug: str, data: bytes, ext: str) -> str:
    """Supabase Storage'a yükler ve herkese açık adresi döndürür."""
    url = os.environ["SUPABASE_URL"].rstrip("/")
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    path = f"{slug}.{ext}"
    content_type = next(k for k, v in EXT_BY_TYPE.items() if v == ext)

    response = requests.post(
        f"{url}/storage/v1/object/logos/{path}",
        headers={
            "Authorization": f"Bearer {key}",
            "apikey": key,
            "Content-Type": content_type,
            # Aynı şirket yeniden işlenirse üzerine yaz.
            "x-upsert": "true",
        },
        data=data,
        timeout=30,
    )
    response.raise_for_status()
    return f"{url}/storage/v1/object/public/logos/{path}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Şirket logolarını topla")
    parser.add_argument("--dry-run", action="store_true", help="İndirme ve yazma yapma")
    parser.add_argument("--force", action="store_true", help="Logosu olanları da yenile")
    args = parser.parse_args()

    load_dotenv()
    db = repository.client()

    companies = {
        c["name"]: c
        for c in (db.table("companies").select("id,name,slug,logo_url").execute().data or [])
    }

    ok = skipped = failed = 0
    for config in source_configs():
        company_name = config.get("company_name") or config.get("name")
        website = config.get("website")
        company = companies.get(company_name)

        if not company:
            continue
        if not website:
            print(f"  {company_name:<28} atlandı — sources.json'da website yok")
            skipped += 1
            continue
        if company.get("logo_url") and not args.force:
            skipped += 1
            continue

        try:
            page = requests.get(f"https://{website}", headers=HEADERS, timeout=20, allow_redirects=True)
            page.raise_for_status()
            html = page.text
        except Exception as error:
            print(f"  {company_name:<28} sayfa açılmadı — {type(error).__name__}")
            failed += 1
            continue

        verified, reason = verify_site(html, page.url, company_name)
        if not verified:
            # Doğrulanamadıysa logo alınmaz; yanlış marka göstermektense boş kalsın.
            print(f"  {company_name:<28} DOĞRULANMADI — {reason}")
            failed += 1
            continue

        # Adaylar sırayla denenir: ilki 404 verirse veya görsel değilse bir
        # sonrakine geçilir. Tek adayla yetinmek, apple-touch-icon'u olmayan
        # sitelerde logosuz kalmak demekti.
        downloaded = None
        used_url = ""
        for candidate in pick_icons(html, page.url)[:5]:
            if args.dry_run:
                used_url = candidate
                downloaded = (b"", "dry")
                break
            result = download_icon(candidate)
            if result:
                downloaded, used_url = result, candidate
                break

        if not downloaded:
            print(f"  {company_name:<28} logo indirilemedi")
            failed += 1
            continue

        if args.dry_run:
            print(f"  {company_name:<28} OK ({reason}) -> {used_url[:66]}")
            ok += 1
            continue

        data, ext = downloaded
        try:
            public_url = upload_logo(company["slug"], data, ext)
        except Exception as error:
            # Tek bir yükleme hatası tüm çalıştırmayı düşürmemeli.
            detail = getattr(getattr(error, "response", None), "text", "")[:120]
            print(f"  {company_name:<28} yüklenemedi — {detail or error}")
            failed += 1
            continue

        db.table("companies").update({"logo_url": public_url}).eq("id", company["id"]).execute()
        print(f"  {company_name:<28} OK ({reason}, {len(data) // 1024} KB, .{ext})")
        ok += 1

    print(f"\nbaşarılı={ok} atlandı={skipped} başarısız={failed}")


if __name__ == "__main__":
    main()
