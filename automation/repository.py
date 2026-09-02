"""StajımVar şemasına yazan kalıcılık katmanı.

`scraper.py` içindeki adaptörler kaynakların ham çıktısını üretir; bu modül onu
veritabanına bağlar. Ayrım bilinçli: adaptörler kırılgan ve dış API'lere bağlı,
şema ise bizim kontrolümüzde. İkisini karıştırmak, şema değişince adaptörleri
bozmak demek olurdu.

Yazma akışı:
    kaynak taraması → raw_listings (staging)  → [promote] → listings (yayın)

Bulunan hiçbir ilan doğrudan `listings`'e yazılmaz. Elenen kayıtlar
`raw_listings` içinde `reject_reason` ile kalır; böylece hangi kaynağın kaç
ilan getirdiği ve nerede kaybettiği ölçülebilir.
"""
from __future__ import annotations

import hashlib
import os
import re
import unicodedata
from datetime import UTC, datetime
from typing import Any, Iterable

from supabase import Client, create_client

# sources.json'daki `type` değerinin şemadaki `source_kind` enum karşılığı.
# Şema kaba bir sınıflandırma tutuyor; hangi adaptörün çalışacağını
# `sources.adapter` alanı söylüyor.
KIND_BY_ADAPTER = {
    "lever": "api",
    "greenhouse": "api",
    "ashby": "api",
    "workable": "api",
    "workday": "api",
    "smartrecruiters": "api",
    "json": "api",
    "rss": "rss",
    "workable_search": "api",
    # Şirketin KENDİ kariyer sayfası. `source_kind` enum'unda "html" yok
    # ve uydurmaya gerek de yok: bu adaptörün birincil kanıtı sayfadaki
    # JobPosting JSON-LD'si.
    "generic_career": "jsonld",
    "official_jsonld": "jsonld",
}

# Resmî ATS iş panosu API'leri: sağlayıcıların ilanların dışarıdan okunması
# için yayımladığı, belgelenmiş herkese açık uç noktalar. Bunlar "kazıma"
# değil, amacına uygun kullanım.
OFFICIAL_ADAPTERS = {
    "lever", "greenhouse", "ashby", "workable", "workday",
    "smartrecruiters", "workable_search",
    # Şirketin kendi kariyer sayfasından okunan ilan da resmî kaynaktır:
    # toplayıcı değil, işverenin kendi yayını.
    "generic_career", "official_jsonld",
}

TOS_NOTE = (
    "Resmî ve herkese açık kariyer veri kaynağı. İlan içeriği sağlayıcının "
    "yayımladığı API, akış veya schema.org yapılandırılmış verisinden okunur; "
    "kimlik doğrulaması, erişim engeli aşma ya da gizli uç nokta kullanımı yok."
)

#: Şirketin kendi kariyer sayfası için ayrı not: yukarıdaki metin ATS
#: API'lerini anlatıyor ve bu kaynağa uymuyor.
TOS_NOTE_KARIYER = (
    "Şirketin kendi kariyer sayfası. İlan verisi sayfanın yayımladığı "
    "JobPosting yapısal verisinden ya da açık ilan sayfasından okunuyor; "
    "giriş duvarı, CAPTCHA veya erişim engeli aşma yok."
)


def client() -> Client:
    """service_role ile Supabase istemcisi. Yalnızca sunucu tarafında çalışır."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit(
            "SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY tanımlı değil. "
            "automation/.env dosyasına ekle (bkz. automation/.env.example)."
        )
    return create_client(url, key)


def slugify(value: str) -> str:
    """Türkçe adlardan ASCII slug üretir: 'Vertigo Games' -> 'vertigo-games'."""
    folded = value.replace("ı", "i").replace("İ", "i").replace("ğ", "g").replace("Ğ", "g")
    folded = folded.replace("ş", "s").replace("Ş", "s").replace("ö", "o").replace("Ö", "o")
    folded = folded.replace("ü", "u").replace("Ü", "u").replace("ç", "c").replace("Ç", "c")
    ascii_only = "".join(
        ch for ch in unicodedata.normalize("NFKD", folded) if not unicodedata.combining(ch)
    )
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_only).strip("-").lower()
    return slug or hashlib.sha256(value.encode()).hexdigest()[:12]


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


# ---------------------------------------------------------------- şirketler


def domain_of(url: str | None) -> str | None:
    """Adresten karşılaştırılabilir alan adı çıkarır: www ve şema atılır."""
    if not url:
        return None
    temiz = re.sub(r"^https?://", "", url.strip().lower())
    temiz = temiz.split("/")[0].split("?")[0]
    temiz = re.sub(r"^www\.", "", temiz)
    return temiz or None


def ensure_company(db: Client, name: str, website: str | None = None,
                   logo: str | None = None) -> str:
    """Şirket kaydını bulur, yoksa oluşturur ve id'sini döndürür.

    Eşleştirme sırası bilinçli:

    1. **Alan adı.** En güvenilir sinyal. Workable araması şirketi "Vertigo",
       doğrudan panosu "Vertigo Games" diye veriyordu; ikisi ayrı kayda düşünce
       aynı ilan sitede iki kez göründü. İkisinin de sitesi vertigogames.com
       olduğu için alan adı üzerinden birleşiyorlar.
    2. **Slug.** Alan adı bilinmiyorsa ada göre.

    `companies.name_normalized` benzersiz indeksi yalnızca yazım farklarını
    (büyük/küçük harf, noktalama) yakalar; kelime farkını yakalayamaz.
    """
    site = domain_of(website)
    if site:
        eslesen = (
            db.table("companies").select("id,logo_url,website_url")
            .ilike("website_url", f"%{site}%").limit(1).execute().data
        )
        if eslesen:
            kayit = eslesen[0]
            # Eksik logo varsa bu fırsatta tamamla.
            if logo and not kayit.get("logo_url"):
                db.table("companies").update({"logo_url": logo}).eq("id", kayit["id"]).execute()
            return kayit["id"]

    slug = slugify(name)
    found = db.table("companies").select("id,website_url").eq("slug", slug).limit(1).execute().data
    if found:
        kayit = found[0]
        # Adres sonradan öğrenildiyse kaydet: bir dahaki eşleştirme kolaylaşır.
        if site and not kayit.get("website_url"):
            db.table("companies").update({"website_url": website}).eq("id", kayit["id"]).execute()
        return kayit["id"]

    try:
        payload: dict[str, Any] = {
            "name": name, "slug": slug, "origin": "scraped", "verified": False,
        }
        if website:
            payload["website_url"] = website
        if logo:
            payload["logo_url"] = logo
        created = db.table("companies").insert(payload).execute().data
        return created[0]["id"]
    except Exception:
        # name_normalized benzersizliği devreye girdiyse aynı şirket başka bir
        # yazımla zaten var demektir; onu bul.
        existing = db.table("companies").select("id,name").execute().data or []
        target = re.sub(r"[^a-z0-9]", "", slugify(name).replace("-", ""))
        for row in existing:
            if re.sub(r"[^a-z0-9]", "", slugify(row["name"]).replace("-", "")) == target:
                return row["id"]
        raise


# ---------------------------------------------------------------- kaynaklar


def sync_sources(db: Client, configs: Iterable[dict[str, Any]]) -> dict[str, str]:
    """sources.json içeriğini `sources` tablosuna yansıtır, slug -> id döndürür.

    JSON tek doğruluk kaynağı: kaynak eklemek için tabloya değil dosyaya satır
    eklenir. Bu fonksiyon var olanı günceller, olmayanı ekler; hiçbir kaydı
    silmez — silinen bir kaynağın geçmişi `import_events` içinde kalmalı.
    """
    mapping: dict[str, str] = {}

    for config in configs:
        adapter = config["type"]
        slug = str(config.get("id") or slugify(config["name"]))
        company_name = config.get("company_name") or config.get("organization_name")
        company_id = (
            ensure_company(db, company_name, website=config.get("website"))
            if company_name
            else None
        )
        official = adapter in OFFICIAL_ADAPTERS

        payload: dict[str, Any] = {
            "slug": slug,
            "name": config["name"],
            "base_url": config.get("careers_url") or config.get("url") or "",
            "kind": KIND_BY_ADAPTER.get(adapter, "api"),
            "adapter": adapter,
            "trust": "official" if official else "discovery_signal",
            "company_id": company_id,
            # Şemadaki sources_enable_requires_review kısıtı, uyum kontrolü
            # yapılmadan bir kaynağın açılmasına izin vermiyor.
            "robots_allowed": official,
            "tos_reviewed_at": now_iso() if official else None,
            "tos_notes": (TOS_NOTE_KARIYER if adapter in {"generic_career", "official_jsonld"}
                          else TOS_NOTE) if official else None,
            "is_enabled": bool(config.get("enabled", True)) and official,
        }

        existing = db.table("sources").select("id").eq("slug", slug).limit(1).execute().data
        if existing:
            source_id = existing[0]["id"]
            # tos_reviewed_at'i her çalıştırmada tazelemeyelim; inceleme tarihi
            # gerçek bir olay, senkronizasyonun yan etkisi değil.
            payload.pop("tos_reviewed_at", None)
            db.table("sources").update(payload).eq("id", source_id).execute()
        else:
            source_id = db.table("sources").insert(payload).execute().data[0]["id"]

        mapping[slug] = source_id

    return mapping


def load_source_ids(db: Client, configs: Iterable[dict[str, Any]]) -> dict[str, str]:
    """Var olan kaynakların slug -> id eşlemesini okur. Hiçbir şey yazmaz.

    `--dry-run` için: kuru çalıştırma kaynak tablosuna da dokunmamalı, yoksa
    "hiçbir şey yazmıyorum" sözü yalan olur.
    """
    slugs = [str(config.get("id") or slugify(config["name"])) for config in configs]
    rows = db.table("sources").select("id,slug").in_("slug", slugs).execute().data or []
    return {row["slug"]: row["id"] for row in rows}


def start_run(db: Client, source_id: str) -> str:
    return db.table("import_runs").insert({"source_id": source_id}).execute().data[0]["id"]


def finish_run(db: Client, run_id: str, **counts: Any) -> None:
    payload = {"finished_at": now_iso(), **counts}
    db.table("import_runs").update(payload).eq("id", run_id).execute()


def log_event(
    db: Client,
    *,
    run_id: str | None,
    source_id: str,
    event_type: str,
    message: str | None = None,
    raw_listing_id: str | None = None,
    payload: dict[str, Any] | None = None,
) -> None:
    db.table("import_events").insert(
        {
            "run_id": run_id,
            "source_id": source_id,
            "raw_listing_id": raw_listing_id,
            "event_type": event_type,
            "message": message,
            "payload": payload,
        }
    ).execute()


# ---------------------------------------------------------------- keşif kayıtları


def raw_listing_payload(job: Any, source_id: str, canonical_url: str, now: str) -> dict[str, Any]:
    """Adaptör çıktısını `raw_listings` satırına çevirir.

    `content_hash` yalnızca anlamlı içerikten üretilir. Kaynağın kendi
    kendine değiştirdiği alanlar (görüntülenme sayısı vb.) girseydi her
    taramada ilan değişmiş görünürdü.
    """
    fingerprint = hashlib.sha256(
        f"{job.title}|{job.description}|{canonical_url}".encode()
    ).hexdigest()

    return {
        "source_id": source_id,
        "external_id": None,
        "url": job.source_url,
        "canonical_url": canonical_url,
        "content_hash": fingerprint,
        "raw": {
            "title": job.title,
            # Kaynagin kendi basligi. `title` cevrilmis olabilir; bu alan
            # sirketin resmi ilan adini tasiyor ve uzerine yazilmiyor.
            "source_title": getattr(job, "source_title", None) or job.title,
            "organization_name": job.organization_name,
            "city": job.city,
            "work_mode": job.work_mode,
            "source_name": job.source_name,
            # Bazı kaynaklar şirket sitesini ve logosunu ilanla veriyor;
            # promote adımı yeni şirket açarken bunları kullanıyor.
            "company_website": getattr(job, "company_website", None),
            "company_logo": getattr(job, "company_logo", None),
            # DİKKAT: job.hr_email bilerek `raw` içine yazılmıyor.
            # İK adresi ancak application_channels üzerinden, kanıtıyla
            # doğrulanarak kaydedilir.
        },
        "title": job.title,
        "company_name_raw": job.organization_name,
        "description": job.description,
        "city": job.city,
        "work_type_guess": job.work_mode,
        "apply_url": job.source_url,
        "last_seen_at": now,
        "source_last_checked_at": now,
        "consecutive_missing_runs": 0,
        "stale_eligible_at": None,
    }


def upsert_raw_listing(db: Client, payload: dict[str, Any]) -> tuple[str, bool]:
    """Keşif kaydını yazar. (raw_listing_id, yeni_mi) döndürür.

    KİMLİK = (kaynak, canonical_url). İÇERİK HASH'İ KİMLİK DEĞİL.
    ---------------------------------------------------------------
    Önce kayıt `content_hash` ile aranıyordu ve hash `title|description|url`
    üzerinden üretiliyor. Ama açıklamayı Türkçeye ÇEVİRİYORUZ ve çeviri her
    turda birebir aynı gelmiyor — birkaç karakterlik fark bile hash'i
    değiştiriyor.

    Sonuç ölçüldü: 14 benzersiz ilan adresi için 21 satır oluşmuştu. Aynı
    Alumil ilanı üç kez kayıtlıydı, açıklamaları 3231 / 3227 / 3148 karakter.
    Her yeni satır açıldığında eskisi "kaynakta görünmüyor" sayılıp
    `consecutive_missing_runs` sayacı tırmanıyordu.

    Bunun bir sonucu var ve önemli: ALLOW_DEACTIVATION açılsaydı sistem
    AÇIK ilanları kapanmış sanıp listeden düşürecekti. Şalterin kapalı
    kalmasının gerçek sebebi buymuş.

    Artık bir ilanın kimliği adresidir. İçerik hash'i yalnızca "metin
    değişmiş mi" sorusunu cevaplıyor; değiştiyse alanlar tazeleniyor,
    yeni satır açılmıyor.
    """
    existing = (
        db.table("raw_listings")
        .select("id,status,content_hash,promoted_listing_id")
        .eq("source_id", payload["source_id"])
        .eq("canonical_url", payload["canonical_url"])
        .limit(1)
        .execute()
        .data
    )

    if existing:
        row_id = existing[0]["id"]
        refresh = {
            "last_seen_at": payload["last_seen_at"],
            "source_last_checked_at": payload["source_last_checked_at"],
            "consecutive_missing_runs": 0,
            "stale_eligible_at": None,
        }
        # Kaynakta yeniden görülen bir kayıt artık bayat değildir.
        if existing[0]["status"] == "stale":
            refresh["status"] = "discovered"
            # Ve yayından kaldırılmışsa geri açılır.
            #
            # Bu simetri şart: kapatma otomatikse açma da otomatik olmalı.
            # Aksi hâlde tek bir yanlış pozitif — kaynağın bir tur boyunca
            # ilanı döndürmemesi — ilanı kalıcı olarak siteden siliyordu ve
            # kimse fark etmiyordu. Yalnızca BİZİM kapattığımız ilanlar
            # açılıyor; elle kapatılana dokunulmuyor.
            reopen_promoted_listing(db, existing[0])

        # Metin gerçekten değiştiyse içeriği de tazele; değişmediyse dokunma.
        if existing[0].get("content_hash") != payload["content_hash"]:
            for alan in (
                "content_hash",
                "raw",
                "title",
                "company_name_raw",
                "description",
                "city",
                "work_type_guess",
                "url",
                "apply_url",
            ):
                refresh[alan] = payload[alan]

        db.table("raw_listings").update(refresh).eq("id", row_id).execute()

        # YAYINDAKI ILANIN "SON GORULME"SI DE TAZELENIYOR
        #
        # Bu adim eksikti ve sessizce yanlis veri uretiyordu: kesif kaydinin
        # last_seen_at'i her turda guncelleniyor ama `listings` tablosundaki
        # ayni alan ilk yayina alma anindan beri hic degismiyordu.
        #
        # Olculdu: 24 Agustos'ta 18 ham kayit yeniden gorulmus, bunlarin
        # 8'inin yayinda karsiligi var; buna ragmen o ilanlarin last_seen_at
        # degeri 17 Agustos'ta duruyordu. Yani ilan her saat dogrulaniyordu
        # ama veritabani bir haftadir kontrol edilmemis gibi gorunuyordu.
        #
        # Bu alan arayuzde "Son kontrol" olarak gosteriliyor. Kaynagi surekli
        # kontrol ettigimiz iddiasi, ancak bu tarih gercek oldugunda dogru.
        promoted_id = existing[0].get("promoted_listing_id")
        if promoted_id:
            db.table("listings").update(
                {"last_seen_at": payload["last_seen_at"]}
            ).eq("id", promoted_id).execute()

        return row_id, False

    created = db.table("raw_listings").insert(payload).execute().data
    return created[0]["id"], True


def close_promoted_listing(db: Client, raw_row: dict[str, Any], reason: str) -> bool:
    """Bayatlayan keşif kaydının YAYINDAKİ ilanını da kapatır.

    NEDEN AYRI BİR ADIM
    -------------------
    Düşürme yolu yalnızca `raw_listings.status = 'stale'` yazıyordu. Yani
    otomatik düşürme açılsaydı bile kapanan ilan sitede durmaya devam
    edecekti — şalterin asıl amacı tam olarak buydu ve halka eksikti.

    `listings` tablosunda `deactivated_at` ve `deactivation_reason` sütunları
    en baştan vardı; kimse bağlamamış.

    İKİ KAYIT AYNI İLANI GÖSTEREBİLİR
    ---------------------------------
    Yinelenen satırlar temizlendi ve artık veritabanı kısıtı engelliyor, ama
    farklı KAYNAKLAR aynı ilanı bulabiliyor (örneğin şirketin kendi Lever
    sayfası ve çok şirketli Workable araması). O yüzden kapatmadan önce aynı
    ilana bakan başka bir taze kayıt var mı diye bakılıyor: varsa ilan
    kapanmıyor, çünkü hâlâ bir kaynakta görünüyor demektir.

    Döndürdüğü değer: ilan gerçekten kapatıldı mı.
    """
    listing_id = raw_row.get("promoted_listing_id")
    if not listing_id:
        return False

    hala_goruluyor = (
        db.table("raw_listings")
        .select("id")
        .eq("promoted_listing_id", listing_id)
        .neq("id", raw_row["id"])
        .in_("status", ["discovered", "needs_verification", "promoted"])
        .limit(1)
        .execute()
        .data
    )
    if hala_goruluyor:
        return False

    db.table("listings").update(
        {
            "status": "closed",
            "deactivated_at": datetime.now(UTC).isoformat(),
            "deactivation_reason": reason,
        }
    # origin süzgeci kasıtlı: yalnızca içe aktarılmış ilanlar kapatılabilir.
    # Bir şirketin kendi girdiği ilana otomasyon dokunmamalı.
    ).eq("id", listing_id).eq("origin", "scraped").execute()
    return True


def reopen_promoted_listing(db: Client, raw_row: dict[str, Any]) -> bool:
    """Bizim bayat diye kapattığımız ilanı yeniden yayına alır.

    `deactivation_reason` süzgeci kasıtlı: yalnızca otomasyonun `stale`
    gerekçesiyle kapattığı ilanlar geri açılıyor. Yönetici elle kapattıysa
    ya da şirket kendi kapattıysa otomasyon onu geri açmamalı.
    """
    listing_id = raw_row.get("promoted_listing_id")
    if not listing_id:
        return False

    sonuc = (
        db.table("listings")
        .update(
            {
                "status": "published",
                "deactivated_at": None,
                "deactivation_reason": None,
                "last_seen_at": datetime.now(UTC).isoformat(),
            }
        )
        .eq("id", listing_id)
        .eq("origin", "scraped")
        .eq("deactivation_reason", "stale")
        .execute()
    )
    return bool(sonuc.data)
