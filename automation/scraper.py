"""Kaynak adaptörleri: resmî ATS/RSS uç noktalarından staj ilanı çeker.

Bu dosya SAF bir kütüphanedir — veritabanına yazmaz, ağ dışında yan etkisi yoktur.
Kalıcılık `repository.py`'de, koşucu `discover.py`'de.

Ayrım bilinçli: adaptörler dış API'lerin şekline bağlı ve kırılgan; şema ise bizim
kontrolümüzde. İkisi aynı dosyada olsaydı şema her değiştiğinde çalışan
adaptörleri riske atardık.
"""
from __future__ import annotations
import hashlib, json, os, re, unicodedata
from dataclasses import dataclass, replace
from html import unescape
from typing import Any, Iterable
from urllib.parse import urlsplit, urlunsplit
import feedparser, requests
from translation import translate_text, translate_title

@dataclass(frozen=True)
class Job:
    source_name: str; source_url: str; title: str
    organization_name: str | None = None; city: str | None = None; work_mode: str | None = None
    description: str = ""; hr_email: str | None = None
    # Bazı kaynaklar şirket sitesini ve logosunu ilanla birlikte veriyor;
    # bunlar şirket kaydını zenginleştirmek için taşınıyor.
    company_website: str | None = None; company_logo: str | None = None

def clean(text: str) -> str: return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", unescape(text))).strip()
def canonical(url: str) -> str:
    p = urlsplit(url)
    if p.scheme.lower() not in {"http", "https"} or not p.netloc: raise ValueError("unsafe or malformed URL")
    return urlunsplit((p.scheme.lower(), p.netloc.lower(), p.path.rstrip("/"), "", ""))
def key(job: Job) -> str: return hashlib.sha256(f"{job.source_name}|{canonical(job.source_url)}".encode()).hexdigest()
def mode(text: str) -> str | None:
    text = text.casefold()
    if "uzaktan" in text or "remote" in text: return "remote"
    if "hibrit" in text or "hybrid" in text: return "hybrid"
    if "ofis" in text or "onsite" in text or "on-site" in text: return "onsite"
    return None
def email(text: str) -> str | None:
    found = re.search(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", text, re.I); return found.group(0).lower() if found else None

EARLY_CAREER = re.compile(r"\b(staj(?:yer)?|intern(?:ship)?|summer\s+intern|winter\s+intern|trainee|co-op)\b", re.I)
# TURKIYE KONUM FILTRESI
#
# Once yalnizca alti sehir taniniyordu: istanbul, ankara, izmir, bursa,
# kocaeli ve "turkey/turkiye". Konumu SADECE "Antalya" veya "Gaziantep"
# yazan bir ilan eleniyordu. Kendi arama kaynagimiz yirmi sehri ayri ayri
# sorgularken filtrenin altisini tanimasi tutarsizdi.
#
# NOKTASIZ I TUZAGI
# normalized() NFKD uygulayip birlesen isaretleri atiyor: s<-s, g<-g,
# u<-u, o<-o, c<-c ve I<-i doniyor. Ama noktasiz "i" (U+0131) AYRISMIYOR,
# oldugu gibi kaliyor. Yani "Diyarbakir" normalize edilince icinde noktasiz
# i tasiyor, oysa ilanlarin cogu ASCII yaziyor. Bu yuzden o harflerin
# gectigi yerlerde [ii] siniflari var — iki yazim da esleser.
#
# VAN, BATMAN VE MUS BILEREK YOK
# Tek baslarina yabanci metinlerde de geciyorlar ("Van Nuys", "van der",
# Batman markasi). Yanlis eslesme, bir ilani kacirmaktan kotu: yurt disi
# bir ilani Turkiye ilani diye gostermek guveni bozar. O illerdeki ilanlar
# zaten "Van, Turkey" yazarsa "turkey" uzerinden geciyor.
_ILLER = (
    "adana|ad[ii]yaman|afyon(?:karahisar)?|agr[ii]|aksaray|amasya|ankara|antalya|ardahan|"
    "artvin|ayd[ii]n|bal[ii]kesir|bart[ii]n|bayburt|bilecik|bingol|bitlis|bolu|burdur|bursa|"
    "canakkale|cank[ii]r[ii]|corum|denizli|diyarbak[ii]r|duzce|edirne|elaz[ii]g|erzincan|"
    "erzurum|eskisehir|gaziantep|giresun|gumushane|hakkari|hatay|[ii]gd[ii]r|isparta|istanbul|"
    "izmir|kahramanmaras|karabuk|karaman|kars|kastamonu|kayseri|kilis|k[ii]r[ii]kkale|"
    "k[ii]rklareli|k[ii]rsehir|kocaeli|konya|kutahya|malatya|manisa|mardin|mersin|mugla|"
    "nevsehir|nigde|ordu|osmaniye|rize|sakarya|samsun|sanl[ii]urfa|siirt|sinop|s[ii]rnak|"
    "sivas|tekirdag|tokat|trabzon|tunceli|usak|yalova|yozgat|zonguldak"
)

# Ilan metinlerinde il yerine dogrudan gecen, baska hicbir seye benzemeyen
# is merkezleri. "Sisli" veya "Gebze" yazan ilan il adi hic gecmeden geliyor.
_SEMTLER = (
    "maslak|levent|sisli|kad[ii]koy|atasehir|umraniye|besiktas|sar[ii]yer|"
    "gebze|cay[ii]rova|tuzla|kozyatag[ii]|altunizade|bomonti"
)

TURKEY_LOCATION = re.compile(
    rf"(?:turkey|turkiye|remote\s*\(\s*turkey\s*\)|\b(?:{_ILLER}|{_SEMTLER})\b)",
    re.I,
)
def normalized(text: str) -> str:
    return "".join(char for char in unicodedata.normalize("NFKD", text).casefold() if not unicodedata.combining(char))
def is_turkey_location(location: str | None) -> bool: return bool(TURKEY_LOCATION.search(normalized(location or "")))
def is_early_career(title: str, description: str) -> bool:
    return bool(EARLY_CAREER.search(f"{title} {description}"))

def translate_job(job: Job, config: dict[str, Any]) -> Job:
    """Yabanci kaynak ilanlarini Supabase'e daima Turkce kaydeder."""
    if config.get("translate_to_turkish", True) is False:
        return job
    return replace(
        job,
        title=translate_title(job.title),
        description=translate_text(job.description) if job.description else job.description,
    )

def rss(config: dict[str, Any]) -> Iterable[Job]:
    feed = feedparser.parse(config["url"])
    if getattr(feed, "bozo", False): raise RuntimeError(f"{config['name']}: RSS okunamadı")
    for item in feed.entries:
        description = clean(item.get("summary", item.get("description", ""))); url = item.get("link"); title = clean(item.get("title", ""))
        if url and title: yield Job(config["name"], url, title, item.get("author") or None, description=description, work_mode=mode(title + " " + description), hr_email=email(description))

def json_api(config: dict[str, Any]) -> Iterable[Job]:
    response = requests.get(config["url"], timeout=20, headers={"User-Agent":"StajimVarJobs/1.0"}); response.raise_for_status()
    data = response.json(); rows = data.get("jobs", data) if isinstance(data, dict) else data
    for item in rows:
        if not item.get("title") or not item.get("url"): continue
        description = clean(item.get("description", ""))
        yield Job(config["name"], item["url"], clean(item["title"]), item.get("company"), item.get("city"), item.get("work_mode") or mode(description), description, item.get("hr_email") or email(description))

def greenhouse(config: dict[str, Any]) -> Iterable[Job]:
    """Greenhouse resmî Job Board API: yalnızca yayımlanmış iş panoları."""
    url = f"https://boards-api.greenhouse.io/v1/boards/{config['board_token']}/jobs?content=true"
    response = requests.get(url, timeout=25, headers={"User-Agent":"StajimVarJobs/1.0"}); response.raise_for_status()
    for item in response.json().get("jobs", []):
        description = clean(item.get("content", "")); title = clean(item.get("title", ""))
        location = (item.get("location") or {}).get("name")
        if not is_turkey_location(location) or not is_early_career(title, description): continue
        yield Job(config["name"], item["absolute_url"], title, config.get("organization_name") or item.get("company_name"), location, mode(title + " " + description), description, email(description))

def ashby(config: dict[str, Any]) -> Iterable[Job]:
    """Ashby resmî Public Job Postings API: yalnızca yayımlanmış ilanlar."""
    url = f"https://api.ashbyhq.com/posting-api/job-board/{config['job_board']}"
    response = requests.get(url, timeout=25, headers={"User-Agent":"StajimVarJobs/1.0"}); response.raise_for_status()
    for item in response.json().get("jobs", []):
        if not item.get("isListed", True): continue
        description = clean(item.get("descriptionPlain", item.get("descriptionHtml", ""))); title = clean(item.get("title", ""))
        locations = " ".join([item.get("location") or ""] + [entry.get("location", "") for entry in item.get("secondaryLocations") or []])
        if not is_turkey_location(locations) or not is_early_career(title, description): continue
        workplace = (item.get("workplaceType") or "").lower()
        work_mode = "remote" if item.get("isRemote") or workplace == "remote" else ("hybrid" if workplace == "hybrid" else mode(title + " " + description))
        yield Job(config["name"], item.get("jobUrl") or item["applyUrl"], title, config.get("organization_name"), item.get("location"), work_mode, description, email(description))

def lever(config: dict[str, Any]) -> Iterable[Job]:
    """Lever'in herkese açık Postings API'si; yalnızca Türkiye konumlu erken kariyer ilanları."""
    url = f"https://api.lever.co/v0/postings/{config['site']}?mode=json"
    response = requests.get(url, timeout=25, headers={"User-Agent":"StajimVarJobs/1.0"}); response.raise_for_status()
    for item in response.json():
        categories = item.get("categories") or {}; location = " ".join([categories.get("location") or ""] + (categories.get("allLocations") or []))
        title = clean(item.get("text", "")); description = clean(item.get("descriptionPlain", item.get("description", "")))
        if not is_turkey_location(location) or not is_early_career(title, description): continue
        workplace = (item.get("workplaceType") or "").lower()
        work_mode = "remote" if workplace == "remote" else ("hybrid" if workplace == "hybrid" else "onsite")
        yield Job(config["name"], item.get("hostedUrl") or item["applyUrl"], title, config.get("organization_name"), categories.get("location"), work_mode, description, email(description))

def location_text(locations: Any) -> str:
    """Konum listesini arama metnine çevirir. Workable sözlük, diğerleri düz metin döndürür."""
    parts: list[str] = []
    for entry in locations or []:
        if isinstance(entry, dict):
            parts.extend(str(value) for value in entry.values() if isinstance(value, str))
        elif entry:
            parts.append(str(entry))
    return " ".join(parts)

def city_of(locations: Any) -> str | None:
    """Konum listesinden şehir adını çıkarır.

    Workable `locations` alanı {'country','city','region',...} sözlükleri döndürür;
    listeyi olduğu gibi şehir alanına yazmak veritabanına stringe çevrilmiş sözlük
    kaydeder. Sözlükten yalnızca `city` alınır.
    """
    for entry in locations or []:
        if isinstance(entry, dict):
            city = entry.get("city") or entry.get("region")
            if city: return str(city)
        elif entry:
            return str(entry)
    return None

def workable(config: dict[str, Any]) -> Iterable[Job]:
    """Workable'ın yayımlanmış ilanlar için önerdiği açık account endpoint'i."""
    url = f"https://www.workable.com/api/accounts/{config['account']}?details=true"
    response = requests.get(url, timeout=25, headers={"User-Agent":"StajimVarJobs/1.0"}); response.raise_for_status()
    for item in response.json().get("jobs", []):
        locations = item.get("locations", [])
        location = location_text(locations)
        title = clean(item.get("title", "")); description = clean(item.get("description", ""))
        if not is_turkey_location(location) or not is_early_career(title, description): continue
        yield Job(config["name"], item["url"], title, config.get("organization_name") or config.get("company_name"), city_of(locations), mode(str(item.get("workplace_type", ""))), description, email(description))

def workday(config: dict[str, Any]) -> Iterable[Job]:
    """Public Workday CXS search; bounded pagination and no company-specific DOM parsing."""
    host, tenant, site = config["host"], config["tenant"], config["site"]
    endpoint = f"https://{host}/wday/cxs/{tenant}/{site}/jobs"
    for offset in range(0, 200, 20):
        response = requests.post(endpoint, json={"limit":20,"offset":offset,"searchText":"intern"}, timeout=25, headers={"User-Agent":"StajimVarJobs/1.0"}); response.raise_for_status()
        postings = response.json().get("jobPostings", [])
        if not postings: break
        for item in postings:
            title=clean(item.get("title", "")); location=item.get("locationsText") or ""; path=item.get("externalPath")
            if not path or not is_turkey_location(location) or not is_early_career(title, ""): continue
            yield Job(config["name"], f"https://{host}{path}", title, config.get("company_name"), location, mode(item.get("timeType", "")), "")
        if len(postings) < 20: break

def smartrecruiters(config: dict[str, Any]) -> Iterable[Job]:
    """SmartRecruiters herkese açık Posting API'si.

    Eskiden burada SMARTRECRUITERS_API_KEY zorunlu tutuluyordu; oysa
    `/v1/companies/{id}/postings` uç noktası anahtarsız çalışıyor (test edildi).
    Anahtar şartı, çalışabilecek bir kaynağı gereksiz yere kapatıyordu.
    """
    url = f"https://api.smartrecruiters.com/v1/companies/{config['company_identifier']}/postings?country=TR&limit=100"
    response = requests.get(url, timeout=25, headers={"User-Agent":"StajimVarJobs/1.0"}); response.raise_for_status()
    for item in response.json().get("content", []):
        location = " ".join(filter(None, [item.get("location", {}).get("city"), item.get("location", {}).get("country")])); title = clean(item.get("name", ""))
        if not is_turkey_location(location) or not is_early_career(title, ""): continue
        yield Job(config["name"], item["ref"], title, config.get("organization_name"), location, None, "Detay için kaynak ilana gidin.")

def workable_search(config: dict[str, Any]) -> Iterable[Job]:
    """Workable'ın şirketler arası herkese açık iş arama uç noktası.

    Diğer adaptörler tek bir şirketin panosunu okur; bu adaptör konuma göre
    TÜM Workable müşterilerini tarar. Yani hangi şirketin Workable kullandığını
    önceden bilmemize gerek kalmıyor — kaynak keşfi ile ilan keşfi tek adımda.

    Sınırlar: sayfa başına 20 kayıt, `page` ile sayfalama. Türkçe sorgular
    ("staj", "stajyer") sonuç döndürmüyor, bu yüzden İngilizce terimler
    kullanılıyor; ilan başlıkları Türkçe olsa bile dizin İngilizce eşliyor.
    """
    queries = config.get("queries") or ["intern", "internship", "trainee", "co-op"]
    # Tek "Turkey" sorgusu sayfa başına 20 ile sınırlı geliyor ve şehir bazlı
    # ilanları kaçırıyor. Şehirleri ayrı sorgulamak kapsamı belirgin artırıyor
    # (ölçüldü: 8 -> 25 benzersiz aday).
    locations = config.get("locations") or [config.get("location", "Turkey")]
    max_pages = int(config.get("max_pages", 5))
    gorulen: set[str] = set()

    # ARAMA BİRİMİ KAPSAMASI
    #
    # Bu kaynak tek bir istek değil, şehir × sorgu kadar ALT İSTEK yapıyor
    # (20 × 14 = 280). Toplam ilan sayısı bu alt isteklerin kaçının
    # gerçekten çalıştığını söylemiyor: yarısı sessizce boş dönse sonuç
    # yine "sağlıklı ama daha az ilan" gibi görünürdü ve o ilanlar
    # kapanmış sayılırdı.
    #
    # Sayaç çağıranın sözlüğüne yazılıyor; discover.py bunu okuyup turun
    # sağlığına karar veriyor.
    kapsama = {
        "beklenen_birim": len(locations) * len(queries),
        "denenen_birim": 0,
        "basarili_birim": 0,
        "bos_birim": 0,
        "bozuk_birim": 0,
        "sayfalama_tamamlanmadi": 0,
    }
    config["_kapsama"] = kapsama

    for location in locations:
      for query in queries:
        kapsama["denenen_birim"] += 1
        birim_sonucu = 0
        birim_bozuk = False
        sayfa_bitti = False
        for page in range(1, max_pages + 1):
            url = (
                "https://jobs.workable.com/api/v1/jobs"
                f"?query={requests.utils.quote(query)}"
                f"&location={requests.utils.quote(location)}&page={page}"
            )
            response = requests.get(
                url, timeout=25,
                headers={"User-Agent": "StajimVarJobs/1.0", "Accept": "application/json"},
            )
            # 4xx/5xx (429 dahil) yükseltiliyor: tur FAILED olur ve hiçbir
            # ilan kapanmaz. Ölçüldü: hız sınırı gerçekten 429 dönüyor,
            # sessiz boş yanıt değil.
            response.raise_for_status()

            # YUMUŞAK HATA BURADA YAKALANIYOR
            #
            # `data.get("jobs") or []` bir zamanlar beklenmedik gövdeyi de
            # "boş sonuç" sayıyordu: HTTP 200 + {"error": ...} gerçek bir
            # sıfır sonuçtan ayırt edilemiyordu. Artık `jobs` anahtarı
            # YOKSA bu birim BOZUK sayılıyor ve tur DEGRADED oluyor.
            try:
                data = response.json()
            except ValueError:
                birim_bozuk = True
                break
            if not isinstance(data, dict) or "jobs" not in data:
                birim_bozuk = True
                break

            jobs = data.get("jobs") or []
            if not jobs:
                # Boş sayfa gerçek sayfalama sonu: 1. sayfada sıfır sonuç
                # bu şehir+sorgu için geçerli bir cevap.
                sayfa_bitti = True
                break

            for item in jobs:
                job_url = item.get("url")
                if not job_url or job_url in gorulen:
                    continue
                gorulen.add(job_url)

                title = clean(item.get("title", ""))
                description = clean(
                    item.get("description", "") or item.get("socialSharingDescription", "")
                )
                loc = item.get("location") or {}
                location_text = " ".join(
                    str(v) for v in [loc.get("city"), loc.get("region"), loc.get("countryName")] if v
                )
                if not is_turkey_location(location_text):
                    continue
                if not is_early_career(title, description):
                    continue

                birim_sonucu += 1
                company = item.get("company") or {}
                yield Job(
                    config["name"],
                    job_url,
                    title,
                    company.get("title"),
                    loc.get("city"),
                    mode(f"{title} {description} {item.get('workplace', '')}"),
                    description,
                    email(description),
                    company_website=company.get("website"),
                    company_logo=company.get("image"),
                )

            # Bu sorgunun son sayfasına gelindiyse dur.
            if len(jobs) < 20:
                sayfa_bitti = True
                break

        # --- birim sonucu ---
        if birim_bozuk:
            kapsama["bozuk_birim"] += 1
        else:
            kapsama["basarili_birim"] += 1
            if birim_sonucu == 0:
                kapsama["bos_birim"] += 1
            if not sayfa_bitti:
                # max_pages'e dayandık: bu birimde daha fazla ilan olabilir.
                kapsama["sayfalama_tamamlanmadi"] += 1


def personio(config: dict[str, Any]) -> Iterable[Job]:
    """Personio'nun herkese açık XML iş akışı.

    Personio her müşteriye `https://<tenant>.jobs.personio.de/xml` adresinde
    kimlik doğrulaması istemeyen bir XML akışı veriyor. Bu akış ilanların
    dışarıdan okunması için yayınlanıyor — kazıma değil.

    `seniority` alanı ayrıca işe yarıyor: Personio "intern" ve "student"
    değerlerini kendi ayırıyor, yani başlıkta "staj" geçmese bile stajı
    yakalayabiliyoruz. Başlığa güvenen diğer adaptörlerde bu bilgi yok.
    """
    import xml.etree.ElementTree as ET

    tenant = config["tenant"]
    alan = config.get("domain", "de")  # personio.de veya personio.com
    url = f"https://{tenant}.jobs.personio.{alan}/xml"
    response = requests.get(url, timeout=25, headers={"User-Agent": "StajimVarJobs/1.0"})
    response.raise_for_status()

    kok = ET.fromstring(response.content)
    for item in kok.findall("position"):
        def al(etiket: str) -> str:
            dugum = item.find(etiket)
            return clean(dugum.text or "") if dugum is not None and dugum.text else ""

        ilan_id = al("id")
        title = al("name")
        if not ilan_id or not title:
            continue

        ofisler = " ".join(filter(None, [al("office"), al("additionalOffices")]))
        # Açıklama iç içe düğümlerde duruyor; hepsini düz metne indiriyoruz.
        aciklama_dugumu = item.find("jobDescriptions")
        description = clean(ET.tostring(aciklama_dugumu, encoding="unicode")) if aciklama_dugumu is not None else ""

        kidem = al("seniority").casefold()
        erken_kariyer = kidem in {"intern", "student", "entry"} or is_early_career(title, description)

        if not is_turkey_location(ofisler) or not erken_kariyer:
            continue

        yield Job(
            config["name"],
            f"https://{tenant}.jobs.personio.{alan}/job/{ilan_id}",
            title,
            config.get("organization_name") or al("subcompany") or None,
            al("office") or None,
            mode(f"{title} {description} {al('schedule')}"),
            description,
            email(description),
        )


def recruitee(config: dict[str, Any]) -> Iterable[Job]:
    """Recruitee'nin herkese açık teklif (offers) API'si.

    `https://<tenant>.recruitee.com/api/offers/` kimlik doğrulaması istemiyor
    ve Recruitee bunu kariyer sayfalarının kendi verisini çekmesi için
    yayınlıyor.
    """
    tenant = config["tenant"]
    url = f"https://{tenant}.recruitee.com/api/offers/"
    response = requests.get(url, timeout=25, headers={"User-Agent": "StajimVarJobs/1.0"})
    response.raise_for_status()

    for item in response.json().get("offers", []):
        if item.get("status") and item["status"] != "published":
            continue
        title = clean(item.get("title", ""))
        description = clean(f"{item.get('description', '')} {item.get('requirements', '')}")
        location = " ".join(
            str(v) for v in [item.get("city"), item.get("country_code"), item.get("location")] if v
        )
        if not is_turkey_location(location) or not is_early_career(title, description):
            continue

        yield Job(
            config["name"],
            item.get("careers_url") or item.get("url"),
            title,
            config.get("organization_name") or item.get("company_name"),
            item.get("city"),
            mode(f"{title} {description} {item.get('remote', '')}"),
            description,
            email(description),
        )


def source_configs() -> list[dict[str, Any]]:
    with open(os.path.join(os.path.dirname(__file__), "sources.json"), encoding="utf-8") as handle:
        registry = json.load(handle).get("sources", [])
    # A checked-in verified registry is preferred; legacy SOURCES_JSON remains a fallback.
    return registry or json.loads(os.getenv("SOURCES_JSON", "[]"))

ADAPTERS = {
    "rss": rss,
    "json": json_api,
    "greenhouse": greenhouse,
    "ashby": ashby,
    "lever": lever,
    "workable": workable,
    "workday": workday,
    "smartrecruiters": smartrecruiters,
    "workable_search": workable_search,
    "personio": personio,
    "recruitee": recruitee,
}
