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


WIKIMEDIA_SVG = re.compile(
    r"^https://upload\.wikimedia\.org/wikipedia/commons/([0-9a-f])/([0-9a-f]{2})/([^/]+\.svg)$", re.I
)


def kurator_adaylari(config: dict) -> list[str]:
    """KÜRATÖRÜN VERDİĞİ LOGO ADRESLERİ — ÖNCE `logo_url`, SONRA `fallback_logo_url`.

    Kullanıcı ilan teslimlerinde şirket başına iki adres veriyor (1 Kasım
    2026). Bunlar tahmin değil, açık beyan; sitenin simgesinden önce
    deneniyor. İkisi de inmezse eski yol (şirketin kendi sitesi) devam
    ediyor; o da olmazsa arayüz baş harfleri gösteriyor.

    SVG depoya alınmıyor (EXT_BY_TYPE'ta yok: içinde betik taşıyabilir).
    Wikimedia her SVG için hazır PNG küçük resmi sunuyor; o adrese
    çevriliyor (250 px: Wikimedia yalnız standart genişlikleri veriyor,
    256 px 400 dönüyor — ölçüldü). Başka bir yerdeki SVG indirilemez ve sıradaki adaya geçilir.
    """
    adaylar = []
    for alan in ("logo_url", "fallback_logo_url"):
        adres = str(config.get(alan) or "").strip()
        if not adres.startswith("https://"):
            continue
        svg = WIKIMEDIA_SVG.match(adres)
        if svg:
            a, ab, ad = svg.groups()
            adres = f"https://upload.wikimedia.org/wikipedia/commons/thumb/{a}/{ab}/{ad}/250px-{ad}.png"
        if adres not in adaylar:
            adaylar.append(adres)
    return adaylar


# İLAN SİSTEMİNİN ŞİRKET LOGOSU (25 Kasım 2026)
#
# Almanya teslimiyle gelen kaynakların `website` alanı yoktu ve bu adım
# onları "atlandı" diye geçiyordu: yayındaki 13 ilan logosuz kaldı, elle
# tamamlandı (20270121010000). Oysa logo kaynağın kendi panosunda duruyordu.
# Pano adresi kaynakta küratörün yazdığı kimlikten (job_board, tenant,
# board_token, site) kuruluyor; logo yalnız o sistemin KENDİ görsel
# sunucusundan kabul ediliyor — panoya şirketin koyduğu başka bir adres
# (ör. emnify'ın kendi sitesi) aday sayılmıyor.
_ATS_PANOLARI = {
    "ashby": ("job_board", "https://jobs.ashbyhq.com/{}", (
        r"https://app\.ashbyhq\.com/api/images/org-theme-logo/[A-Za-z0-9/._-]+",
        r"https://app\.ashbyhq\.com/api/images/org-theme-wordmark/[A-Za-z0-9/._-]+",
    )),
    "personio": ("tenant", "https://{}.jobs.personio.{domain}", (
        r"https://assets\.cdn\.personio\.de/logos/\d+/[A-Za-z0-9/._-]+\.(?:png|jpe?g)",
    )),
    "greenhouse": ("board_token", "https://job-boards.greenhouse.io/{}", (
        r"https://[a-z0-9-]*recruiting\.cdn\.greenhouse\.io/external_greenhouse_job_boards/logos/[A-Za-z0-9/._%-]+\.(?:png|jpe?g)(?:\?\d+)?",
    )),
    # Workable panosu betikle çiziliyor; hesap API'si logoyu açıkça veriyor.
    "workable": ("account", "https://apply.workable.com/api/v1/accounts/{}", (
        r"https://workablehr\.s3\.amazonaws\.com/uploads/account/logo/\d+/logo",
    )),
    "lever": ("site", "https://jobs.lever.co/{}", (
        r"https://lever-client-logos\.s3\.[a-z0-9-]+\.amazonaws\.com/[A-Za-z0-9._-]+\.(?:png|jpe?g)",
    )),
}


def ats_pano_adresi(config: dict) -> str | None:
    pano = _ATS_PANOLARI.get(config.get("type"))
    kimlik = str(config.get(pano[0]) or "").strip() if pano else ""
    if not pano or not re.fullmatch(r"[A-Za-z0-9_.-]+", kimlik):
        return None
    return pano[1].format(kimlik, domain=config.get("domain") or "de")


def ats_logo_adaylari(config: dict, html: str) -> list[str]:
    """Pano sayfasındaki logo adresleri, sistemin tercih sırasıyla."""
    pano = _ATS_PANOLARI.get(config.get("type"))
    if not pano:
        return []
    adaylar: list[str] = []
    for desen in pano[2]:
        for adres in re.findall(desen, html):
            if adres not in adaylar:
                adaylar.append(adres)
    return adaylar


def logo_normallestir(data: bytes) -> bytes | None:
    """Kenar boşluğunu kırpıp öteki işveren logoları gibi 128 × 128 şeffaf PNG yapar.

    Personio logoyu 1170 × 658 paylaşım kartının ortasında veriyor; kırpılmazsa
    kartta toz kadar görünürdü. Görünür pikselleri neredeyse beyaz olan logo
    (CRA'nın Greenhouse logosu "CRA-short-white.png", koyu zemin için) beyaz
    kartta kaybolur: None döner, sıradaki adaya geçilir.
    """
    from PIL import Image

    try:
        gorsel = Image.open(io.BytesIO(data)).convert("RGBA")
    except Exception:
        return None
    zemin = Image.new("RGBA", gorsel.size, (255, 255, 255, 255))
    duz = Image.alpha_composite(zemin, gorsel).convert("L")
    # Görünür = saydam değil VE beyaz zeminden ayrışıyor.
    maske = Image.eval(duz, lambda p: 255 if p < 235 else 0)
    alfa = gorsel.getchannel("A").point(lambda a: 255 if a > 16 else 0)
    gorunur = Image.composite(maske, Image.new("L", gorsel.size, 0), alfa)
    kutu = gorunur.getbbox()
    if not kutu:
        return None
    kirpik = gorsel.crop(kutu)
    kirpik.thumbnail((116, 116), Image.LANCZOS)
    sonuc = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    sonuc.paste(kirpik, ((128 - kirpik.width) // 2, (128 - kirpik.height) // 2), kirpik)
    cikti = io.BytesIO()
    sonuc.save(cikti, "PNG", optimize=True)
    return cikti.getvalue()


def ats_logosu(config: dict) -> tuple[tuple[bytes, str], str] | None:
    pano = ats_pano_adresi(config)
    if not pano:
        return None
    try:
        sayfa = requests.get(pano, headers=HEADERS, timeout=20)
        sayfa.raise_for_status()
    except Exception:
        return None
    for aday in ats_logo_adaylari(config, sayfa.text)[:3]:
        # İçerik türüne bakılmıyor: Lever'ın S3 kovası logoyu
        # application/octet-stream diye veriyor. Görseli Pillow açabiliyorsa
        # görseldir; açamazsa logo_normallestir None döner.
        try:
            yanit = requests.get(aday, headers=HEADERS, timeout=20)
            yanit.raise_for_status()
        except Exception:
            continue
        if not 200 <= len(yanit.content) <= MAX_BYTES:
            continue
        png = logo_normallestir(yanit.content)
        if png:
            return (png, "png"), aday
    return None


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
        if company.get("logo_url") and not args.force:
            skipped += 1
            continue

        # Önce küratörün adresleri; inen ilk görsel kullanılıyor.
        downloaded = None
        used_url = ""
        for candidate in kurator_adaylari(config):
            if args.dry_run:
                downloaded, used_url = (b"", "dry"), candidate
                break
            result = download_icon(candidate)
            if result:
                downloaded, used_url = result, candidate
                break
        kaynak = "küratör"
        # Küratör adresi yoksa ya da inmediyse ilan sisteminin şirket logosu.
        if not downloaded:
            bulunan = ats_logosu(config)
            if bulunan:
                downloaded, used_url = bulunan
                kaynak = f"{config['type']} panosu"
        if downloaded:
            if args.dry_run:
                print(f"  {company_name:<28} OK ({kaynak}) -> {used_url[:66]}")
                ok += 1
                continue
            data, ext = downloaded
            try:
                public_url = upload_logo(company["slug"], data, ext)
            except Exception as error:
                detail = getattr(getattr(error, "response", None), "text", "")[:120]
                print(f"  {company_name:<28} yüklenemedi — {detail or error}")
                failed += 1
                continue
            db.table("companies").update({"logo_url": public_url}).eq("id", company["id"]).execute()
            print(f"  {company_name:<28} OK ({kaynak}, {len(data) // 1024} KB, .{ext})")
            ok += 1
            continue

        if not website:
            print(f"  {company_name:<28} atlandı — sources.json'da website yok")
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
