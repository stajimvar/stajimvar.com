"""Kaynak adaptörleri: resmî ATS/RSS uç noktalarından staj ilanı çeker.

Bu dosya SAF bir kütüphanedir — veritabanına yazmaz, ağ dışında yan etkisi yoktur.
Kalıcılık `repository.py`'de, koşucu `discover.py`'de.

Ayrım bilinçli: adaptörler dış API'lerin şekline bağlı ve kırılgan; şema ise bizim
kontrolümüzde. İkisi aynı dosyada olsaydı şema her değiştiğinde çalışan
adaptörleri riske atardık.
"""
from __future__ import annotations
import hashlib, json, os, re, time, unicodedata
from dataclasses import dataclass, replace
from html import unescape
from html.parser import HTMLParser
from typing import Any, Iterable
from urllib.parse import parse_qsl, urlencode, urljoin, urlsplit, urlunsplit
import feedparser, requests
from country_normalization import location_country_signals, structured_country_code
from translation import translate_text, translate_title

@dataclass(frozen=True)
class Job:
    source_name: str; source_url: str; title: str
    organization_name: str | None = None; city: str | None = None; work_mode: str | None = None
    description: str = ""; hr_email: str | None = None
    # Bazı kaynaklar şirket sitesini ve logosunu ilanla birlikte veriyor;
    # bunlar şirket kaydını zenginleştirmek için taşınıyor.
    company_website: str | None = None; company_logo: str | None = None
    # KAYNAĞIN KENDİ BAŞLIĞI — ÇEVİRİ BUNU DEĞİŞTİRMİYOR
    #
    # `translate_job` başlığın üzerine yazıyordu ve orijinal hiçbir yere
    # ulaşmıyordu: yayındaki 9 ilanın 9'unda da şirketin resmî ilan adı
    # kayıptı (ölçüldü). Çeviri bir GÖRÜNÜM katmanı; kaynak veriyi
    # değiştiremez.
    source_title: str | None = None
    country_code: str | None = None
    original_language: str | None = None
    # AÇIKLIĞI DOĞRULANMADI
    #
    # Kaynak sayfası duruyor ama ilanın HÂLÂ AÇIK olduğu makine-okunur
    # biçimde kanıtlanamıyor (JSON-LD yok, ATS API'si yok). Bu ilanlar
    # yayına çıkmıyor; `promote` onları taslak olarak kaydediyor.
    aciklik_dogrulanmadi: bool = False

def clean(text: str) -> str: return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", unescape(text))).strip()
# TIKLAMA İZİ PARAMETRELERİ
#
# Bunlar ilanı değil, ziyaretin nereden geldiğini anlatıyor; kimliğin
# parçası değiller ve atılıyorlar. LİSTE KAPALI: tanımadığımız bir
# parametre KİMLİK SAYILIYOR. Ters tercih (her şeyi at) ölçülmüş zarar
# verdi — Porsche'nin dört ayrı ilanı tek kayda düşüyordu.
TAKIP_PARAMETRELERI = {
    "utm", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "fbclid", "gclid", "msclkid", "yclid", "igshid", "mc_cid", "mc_eid",
}

def canonical(url: str) -> str:
    """Adresin kimliği: şema + alan adı + yol + KİMLİK TAŞIYAN sorgu.

    Sorgu dizesi tümüyle atılıyordu. Ölçüldü (15 Eylül 2026, üretim):
    `jobs.porsche.com/index.php?ac=jobad&id=...` biçimindeki dört ilan
    tek kimliğe düştü ve birbirinin üzerine yazdı ("bulunan=4 yeni=1
    güncel=3"). Aynı tuzak Greenhouse'un `?gh_jid=` adreslerinde de var:
    yolun tek başına ilanı ayırt etmediği kaynaklar yaygın.

    Parametreler sıralanıyor: aynı ilanın adresi farklı sırayla gelse de
    kimliği değişmiyor.
    """
    p = urlsplit(url)
    if p.scheme.lower() not in {"http", "https"} or not p.netloc: raise ValueError("unsafe or malformed URL")
    kimlik = sorted(
        (ad, deger) for ad, deger in parse_qsl(p.query, keep_blank_values=True)
        if ad.casefold() not in TAKIP_PARAMETRELERI
    )
    return urlunsplit((p.scheme.lower(), p.netloc.lower(), p.path.rstrip("/"), urlencode(kimlik), ""))
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

# ÜLKE PROFİLLERİ — TÜRKİYE BİREBİR AYNI
#
# Hat yapısal olarak yalnız Türkiye'yi işliyordu: kullanıcının verdiği 13
# Almanya kaynağı gerçek adaptörlerle kuru çalıştırıldı, 13'ü de 0 ilan
# üretti (15 Eylül 2026). Kaynağın `country` alanı artık profili seçiyor.
#
# Türkiye profili eski iki fonksiyonu olduğu gibi çağırıyor. Almanya ve
# Fransa'da konum ancak TEK ülke sinyali verirse eşleşiyor; yapısal ülke
# alanı metinle çelişirse ilan alınmıyor. Bilinmeyen ülke kodu sessizce
# Türkiye'ye düşmüyor: kaynak koşusu hata veriyor.
DESTEKLENEN_ULKELER = frozenset({"TR", "DE", "FR"})

# Türkiye dışı profillerde staj terimleri YALNIZ BAŞLIKTA aranıyor:
# Almanca açıklamada "intern" ("dahilî") sıradan bir kelime, Fransızca
# metinde "stage" başka anlamlarda da geçiyor; açıklama her ilanı staj
# sayardı.
YEREL_STAJ_TERIMLERI = {
    "DE": re.compile(r"\b(?:pflicht)?praktik(?:um|ant\w*)", re.I),
    "FR": re.compile(r"\b(?:stagiaire|stage)s?\b", re.I),
}

def kaynak_ulkesi(config: dict[str, Any]) -> str:
    ulke = str(config.get("country") or "TR").strip().upper()
    if ulke not in DESTEKLENEN_ULKELER:
        raise ValueError(f"{config.get('name', 'kaynak')}: desteklenmeyen ülke {ulke!r}")
    return ulke

def konum_eslesiyor(config: dict[str, Any], konum: str | None, yapisal_ulke: Any = None) -> bool:
    ulke = kaynak_ulkesi(config)
    if ulke == "TR":
        return is_turkey_location(konum)
    sinyaller = location_country_signals(konum)
    yapisal = structured_country_code(yapisal_ulke)
    if yapisal and yapisal != ulke:
        return False
    if sinyaller and sinyaller != {ulke}:
        return False
    return yapisal == ulke or sinyaller == {ulke}

def erken_kariyer_mi(config: dict[str, Any], baslik: str, aciklama: str) -> bool:
    ulke = kaynak_ulkesi(config)
    if ulke == "TR":
        return is_early_career(baslik, aciklama)
    return bool(EARLY_CAREER.search(baslik) or YEREL_STAJ_TERIMLERI[ulke].search(baslik))

def ulke_etiketi(config: dict[str, Any]) -> str | None:
    """Türkiye ilanlarında alan boş kalıyor (davranış değişmesin); ülke
    eskisi gibi şehirden çıkarılıyor."""
    ulke = kaynak_ulkesi(config)
    return None if ulke == "TR" else ulke

def dogrulanmis_ilanlarla_sinirla(config: dict[str, Any], jobs: Iterable[Job]) -> list[Job]:
    """DOĞRULANMIŞ KİP: kaynak şirketin bütün panosunu değil, resmî
    kaynaktan açık olduğu tek tek doğrulanmış ilanları alır.

    `dogrulanmis_ilanlar` ilan kimlikleri; kimlik adreste bağımsız bir
    parça olarak geçmeli ("222", ".../jobs/2224"ü tutmaz). Alan yoksa
    sınırlama yok; alan var ama boşsa HİÇBİR ilan alınmıyor (fail-closed).
    """
    jobs = list(jobs)
    if "dogrulanmis_ilanlar" not in config:
        return jobs
    kimlikler = [str(k) for k in config.get("dogrulanmis_ilanlar") or []]
    return [
        job for job in jobs
        if any(re.search(rf"(?<![A-Za-z0-9]){re.escape(k)}(?![A-Za-z0-9])", job.source_url) for k in kimlikler)
    ]

def translate_job(job: Job, config: dict[str, Any]) -> Job:
    """Ilani gorunum icin Turkcelestirir; KAYNAK BASLIGI korunur.

    `source_title` her durumda dolduruluyor — ceviri kapali olsa bile.
    Boylece "bu baslik kaynagin kendi basligi mi, bizim cevirimiz mi"
    sorusu her kayitta cevaplanabiliyor.
    """
    kaynak_basligi = job.source_title or job.title
    if config.get("translate_to_turkish", True) is False:
        return replace(job, source_title=kaynak_basligi)
    return replace(
        job,
        source_title=kaynak_basligi,
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


class _JsonLdScripts(HTMLParser):
    """Sayfadaki JSON-LD bloklarını HTML'i kazımadan güvenli biçimde toplar."""

    def __init__(self) -> None:
        super().__init__()
        self._inside = False
        self._parts: list[str] = []
        self.scripts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {name.casefold(): value for name, value in attrs}
        if tag.casefold() == "script" and (values.get("type") or "").casefold() == "application/ld+json":
            self._inside = True
            self._parts = []

    def handle_data(self, data: str) -> None:
        if self._inside:
            self._parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.casefold() == "script" and self._inside:
            self.scripts.append("".join(self._parts))
            self._inside = False
            self._parts = []


def _jsonld_items(value: Any) -> Iterable[dict[str, Any]]:
    if isinstance(value, list):
        for item in value:
            yield from _jsonld_items(item)
    elif isinstance(value, dict):
        graph = value.get("@graph")
        if graph is not None:
            yield from _jsonld_items(graph)
        else:
            yield value


def _basvuru_ulkesi(item: dict[str, Any]) -> str | None:
    gereksinim = item.get("applicantLocationRequirements")
    adaylar = gereksinim if isinstance(gereksinim, list) else [gereksinim]
    adlar = {str(a.get("name")) for a in adaylar if isinstance(a, dict) and a.get("name")}
    # Birden çok başvuru ülkesi tek ülke kanıtı değil.
    return next(iter(adlar)) if len(adlar) == 1 else None


def official_jsonld(config: dict[str, Any]) -> Iterable[Job]:
    """İzinli resmî kariyer sayfalarındaki schema.org JobPosting verisini okur."""
    for requested_url in config.get("urls", []):
        response = requests.get(
            requested_url, timeout=25, headers={"User-Agent": "StajimVarJobs/1.0"}
        )
        response.raise_for_status()
        parser = _JsonLdScripts()
        parser.feed(response.text)

        for block in parser.scripts:
            try:
                values = list(_jsonld_items(json.loads(block)))
            except (TypeError, ValueError, json.JSONDecodeError):
                continue

            for item in values:
                types = item.get("@type", [])
                if isinstance(types, str):
                    types = [types]
                if "JobPosting" not in types:
                    continue

                title = clean(str(item.get("title") or ""))
                description = clean(str(item.get("description") or ""))
                organization = item.get("hiringOrganization") or {}
                location = item.get("jobLocation") or {}
                if isinstance(location, list):
                    location = location[0] if location else {}
                address = location.get("address") or {} if isinstance(location, dict) else {}
                city = address.get("addressLocality") if isinstance(address, dict) else None
                country = address.get("addressCountry") if isinstance(address, dict) else None
                if isinstance(country, dict):
                    country = country.get("name")
                location_label = " ".join(str(x) for x in (city, country) if x)
                uzaktan = str(item.get("jobLocationType") or "").upper() == "TELECOMMUTE"

                if not title:
                    continue
                if kaynak_ulkesi(config) == "TR":
                    if not is_turkey_location(location_label):
                        continue
                elif city or country:
                    if not konum_eslesiyor(config, city, country):
                        continue
                elif not (uzaktan and konum_eslesiyor(config, None, _basvuru_ulkesi(item))):
                    # Uzaktan ilanın ülke kanıtı schema.org
                    # `applicantLocationRequirements`; o da yoksa ilan alınmıyor.
                    continue
                if not erken_kariyer_mi(config, title, description):
                    continue

                source_url = item.get("url") or requested_url
                yield Job(
                    config["name"],
                    source_url,
                    title,
                    organization.get("name") or config.get("company_name"),
                    city,
                    "remote" if uzaktan and ulke_etiketi(config) else mode(f"{title} {description} {item.get('jobLocationType', '')}"),
                    description,
                    email(description),
                    company_website=organization.get("sameAs"),
                    company_logo=organization.get("logo"),
                    country_code=ulke_etiketi(config),
                )

class _Baglantilar(HTMLParser):
    """Sayfadaki tum href'leri toplar."""

    def __init__(self) -> None:
        super().__init__()
        self.hrefs: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag != "a":
            return
        for ad, deger in attrs:
            if ad == "href" and deger:
                self.hrefs.append(deger)


class _GorunurMetin(HTMLParser):
    """Betik ve stil disindaki metni toplar."""

    def __init__(self) -> None:
        super().__init__()
        self.parcalar: list[str] = []
        self._atla = 0
        self.baslik: str | None = None
        self._h1 = False

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in {"script", "style", "noscript"}:
            self._atla += 1
        elif tag == "h1":
            self._h1 = True

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "noscript"} and self._atla:
            self._atla -= 1
        elif tag == "h1":
            self._h1 = False

    def handle_data(self, veri: str) -> None:
        if self._atla:
            return
        if self._h1 and self.baslik is None:
            metin = clean(veri)
            if metin:
                self.baslik = metin
        self.parcalar.append(veri)

    @property
    def metin(self) -> str:
        return clean(" ".join(self.parcalar))


def kurumsal_html(config: dict[str, Any]) -> Iterable[Job]:
    """Kurumun kendi sitesindeki ilan sayfalarini okur.

    Yapilandirma:
      list_url          ilan listesinin adresi
      job_url_pattern   TEK ILANA giden adres kalibi (regex)
      company_name      ilan sahibi
      max_jobs          bir kosuda en fazla kac ilan sayfasi (varsayilan 40)

    UCUNCU TARAFIN SUNUCUSUNA SAYGI: ilan sayfalari SIRAYLA ve arada
    bekleyerek cagriliyor; ust sinir var. Engel (401/403/429) gorulurse
    o kaynak BIRAKILIYOR -- asilmiyor.
    """
    liste_adresi = config.get("list_url")
    kalip_metni = config.get("job_url_pattern")
    if not liste_adresi or not kalip_metni:
        return
    kalip = re.compile(kalip_metni)
    basliklar = {"User-Agent": "StajimVarJobs/1.0 (+https://stajimvar.com/bot)"}

    yanit = requests.get(liste_adresi, timeout=25, headers=basliklar)
    if yanit.status_code in {401, 403, 429}:
        # Engeli asmak bu projenin isi degil: kaynak sessizce birakiliyor.
        return
    yanit.raise_for_status()

    ayirici = _Baglantilar()
    ayirici.feed(yanit.text)

    adresler: list[str] = []
    gorulen: set[str] = set()
    for href in ayirici.hrefs:
        tam = urljoin(liste_adresi, href.strip())
        # Kirik kacis dizileri (%0D%0A) ayni ilani ikiye bolerdi.
        tam = tam.split("%0D")[0].split("#")[0].rstrip("/")
        if not kalip.search(tam) or tam in gorulen:
            continue
        gorulen.add(tam)
        adresler.append(tam)

    ust_sinir = int(config.get("max_jobs") or 40)
    for adres in adresler[:ust_sinir]:
        try:
            sayfa = requests.get(adres, timeout=25, headers=basliklar)
            if sayfa.status_code in {401, 403, 429}:
                return
            sayfa.raise_for_status()
        except requests.RequestException:
            # Tek bir ilanin okunamamasi kaynagi dusurmemeli.
            continue
        finally:
            time.sleep(float(config.get("crawl_delay_seconds") or 1.5))

        okuyucu = _GorunurMetin()
        okuyucu.feed(sayfa.text)
        baslik = okuyucu.baslik or ""
        aciklama = okuyucu.metin[:12000]
        if not baslik:
            continue

        # STAJ/YENI MEZUN OLMAYAN POZISYON ALINMIYOR: kurumun listesinde
        # 20 ilan olup hicbiri staj degilse sonuc 0 olur.
        if not erken_kariyer_mi(config, baslik, aciklama):
            continue

        sehir = config.get("city_hint")
        if ulke_etiketi(config) and not konum_eslesiyor(config, sehir):
            return
        yield Job(
            config["name"],
            adres,
            baslik,
            config.get("company_name"),
            sehir,
            mode(f"{baslik} {aciklama}"),
            aciklama,
            email(aciklama),
            company_website=config.get("website"),
            country_code=ulke_etiketi(config),
        )


def greenhouse(config: dict[str, Any]) -> Iterable[Job]:
    """Greenhouse resmî Job Board API: yalnızca yayımlanmış iş panoları."""
    url = f"https://boards-api.greenhouse.io/v1/boards/{config['board_token']}/jobs?content=true"
    response = requests.get(url, timeout=25, headers={"User-Agent":"StajimVarJobs/1.0"}); response.raise_for_status()
    for item in response.json().get("jobs", []):
        description = clean(item.get("content", "")); title = clean(item.get("title", ""))
        location = (item.get("location") or {}).get("name")
        if not konum_eslesiyor(config, location) or not erken_kariyer_mi(config, title, description): continue
        yield Job(config["name"], item["absolute_url"], title, config.get("organization_name") or item.get("company_name"), location, mode(title + " " + description), description, email(description), country_code=ulke_etiketi(config))

def ashby(config: dict[str, Any]) -> Iterable[Job]:
    """Ashby resmî Public Job Postings API: yalnızca yayımlanmış ilanlar."""
    url = f"https://api.ashbyhq.com/posting-api/job-board/{config['job_board']}"
    response = requests.get(url, timeout=25, headers={"User-Agent":"StajimVarJobs/1.0"}); response.raise_for_status()
    for item in response.json().get("jobs", []):
        if not item.get("isListed", True): continue
        description = clean(item.get("descriptionPlain", item.get("descriptionHtml", ""))); title = clean(item.get("title", ""))
        locations = " ".join([item.get("location") or ""] + [entry.get("location", "") for entry in item.get("secondaryLocations") or []])
        yapisal = ((item.get("address") or {}).get("postalAddress") or {}).get("addressCountry")
        if not konum_eslesiyor(config, locations, yapisal) or not erken_kariyer_mi(config, title, description): continue
        workplace = (item.get("workplaceType") or "").lower()
        work_mode = "remote" if item.get("isRemote") or workplace == "remote" else ("hybrid" if workplace == "hybrid" else mode(title + " " + description))
        yield Job(config["name"], item.get("jobUrl") or item["applyUrl"], title, config.get("organization_name"), item.get("location"), work_mode, description, email(description), country_code=ulke_etiketi(config))

def lever(config: dict[str, Any]) -> Iterable[Job]:
    """Lever'in herkese açık Postings API'si; yalnızca Türkiye konumlu erken kariyer ilanları."""
    url = f"https://api.lever.co/v0/postings/{config['site']}?mode=json"
    response = requests.get(url, timeout=25, headers={"User-Agent":"StajimVarJobs/1.0"}); response.raise_for_status()
    for item in response.json():
        categories = item.get("categories") or {}; location = " ".join([categories.get("location") or ""] + (categories.get("allLocations") or []))
        title = clean(item.get("text", "")); description = clean(item.get("descriptionPlain", item.get("description", "")))
        if not konum_eslesiyor(config, location, item.get("country")) or not erken_kariyer_mi(config, title, description): continue
        workplace = (item.get("workplaceType") or "").lower()
        work_mode = "remote" if workplace == "remote" else ("hybrid" if workplace == "hybrid" else "onsite")
        yield Job(config["name"], item.get("hostedUrl") or item["applyUrl"], title, config.get("organization_name"), categories.get("location"), work_mode, description, email(description), country_code=ulke_etiketi(config))

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
        if not konum_eslesiyor(config, location) or not erken_kariyer_mi(config, title, description): continue
        yield Job(config["name"], item["url"], title, config.get("organization_name") or config.get("company_name"), city_of(locations), mode(str(item.get("workplace_type", ""))), description, email(description), country_code=ulke_etiketi(config))

def workday_ilan_adresi(host: str, site: str, path: str) -> str:
    """Workday ilanının herkese açık adresi.

    GERÇEK CXS YANITINDA `externalPath` SİTEYİ TAŞIMIYOR. Ölçüldü
    (15 Eylül 2026): `/job/Istanbul-Baglar-Street/..._R100607`. Eskiden
    `https://{host}{path}` diye birleştiriliyordu ve adres 404 veriyordu;
    site parçasıyla aynı adres 200. Canlı zarar: AstraZeneca R-259544
    Workday API'sine göre AÇIK iken bağlantı kontrolü 404 görüp ilanı
    kapatmıştı.

    Yol site parçasını zaten taşıyorsa (`/Careers/job/...` ya da
    `/en-US/Careers/job/...`) ikinci kez eklenmiyor.
    """
    parcalar = [p for p in path.split("/") if p]
    if site in parcalar[:2]:
        return f"https://{host}{path}"
    return f"https://{host}/{site}{path}"

WORKDAY_DETAY_UST_SINIRI = 25

def workday(config: dict[str, Any]) -> Iterable[Job]:
    """Public Workday CXS search; bounded pagination and no company-specific DOM parsing.

    Türkiye dışı profilde konum metni ülke vermeyebiliyor: PUMA'nın
    ilanında yalnız "PUMA Way PEG" yazıyor, "Germany" yalnız ilan
    detayında (`jobPostingInfo.country`). Detay yalnız erken-kariyer
    başlıklarında ve koşu başına üst sınırla soruluyor; Türkiye profilinde
    hiç sorulmuyor (davranış aynı).
    """
    host, tenant, site = config["host"], config["tenant"], config["site"]
    endpoint = f"https://{host}/wday/cxs/{tenant}/{site}/jobs"
    detay_hakki = WORKDAY_DETAY_UST_SINIRI
    for offset in range(0, 200, 20):
        response = requests.post(endpoint, json={"limit":20,"offset":offset,"searchText":"intern"}, timeout=25, headers={"User-Agent":"StajimVarJobs/1.0"}); response.raise_for_status()
        postings = response.json().get("jobPostings", [])
        if not postings: break
        for item in postings:
            title=clean(item.get("title", "")); location=item.get("locationsText") or ""; path=item.get("externalPath")
            if not path or not erken_kariyer_mi(config, title, ""): continue
            if not konum_eslesiyor(config, location):
                if kaynak_ulkesi(config) == "TR" or detay_hakki <= 0: continue
                detay_hakki -= 1
                if not konum_eslesiyor(config, None, _workday_detay_ulkesi(host, tenant, site, path)): continue
            yield Job(config["name"], workday_ilan_adresi(host, site, path), title, config.get("company_name"), location, mode(item.get("timeType", "")), "", country_code=ulke_etiketi(config))
        if len(postings) < 20: break

def _workday_detay_ulkesi(host: str, tenant: str, site: str, path: str) -> str | None:
    try:
        yanit = requests.get(f"https://{host}/wday/cxs/{tenant}/{site}{path}", timeout=25, headers={"User-Agent":"StajimVarJobs/1.0"})
        if yanit.status_code != 200:
            return None
        return ((yanit.json().get("jobPostingInfo") or {}).get("country") or {}).get("descriptor")
    except (requests.RequestException, ValueError, AttributeError):
        return None

def smartrecruiters(config: dict[str, Any]) -> Iterable[Job]:
    """SmartRecruiters herkese açık Posting API'si.

    Eskiden burada SMARTRECRUITERS_API_KEY zorunlu tutuluyordu; oysa
    `/v1/companies/{id}/postings` uç noktası anahtarsız çalışıyor (test edildi).
    Anahtar şartı, çalışabilecek bir kaynağı gereksiz yere kapatıyordu.

    ÜLKE PARAMETRESİ KÜÇÜK HARF. Ölçüldü (15 Eylül 2026): Delivery Hero
    için `country=TR` 0 ilan, `country=tr` 6 ilan döndürüyor. Büyük harf
    sabit olduğu için bu kaynak sessizce hep boş dönüyordu.

    `ref` API ADRESİ, BAŞVURU ADRESİ DEĞİL. Liste öğesinin `ref` alanı
    `api.smartrecruiters.com/.../postings/<id>`; öğrenciye JSON açılırdı.
    Herkese açık ilan `jobs.smartrecruiters.com/<şirket>/<id>` (200).

    DOĞRULANMIŞ KİPTE liste taranmıyor: Bertelsmann'ın Almanya'da 471
    ilanı var, doğrulanmış ilan ilk 100'de değildi. İlan kimliğiyle
    çekiliyor; 404 ya da `active=false` ilan alınmıyor.
    """
    sirket = config["company_identifier"]
    basliklar = {"User-Agent":"StajimVarJobs/1.0"}
    if "dogrulanmis_ilanlar" in config:
        for kimlik in config.get("dogrulanmis_ilanlar") or []:
            response = requests.get(f"https://api.smartrecruiters.com/v1/companies/{sirket}/postings/{kimlik}", timeout=25, headers=basliklar)
            if response.status_code == 404: continue
            response.raise_for_status()
            item = response.json()
            if item.get("active") is False: continue
            yield from _smartrecruiters_ilani(config, item, item.get("postingUrl"))
        return
    url = f"https://api.smartrecruiters.com/v1/companies/{sirket}/postings?country={kaynak_ulkesi(config).lower()}&limit=100"
    response = requests.get(url, timeout=25, headers=basliklar); response.raise_for_status()
    for item in response.json().get("content", []):
        yield from _smartrecruiters_ilani(config, item, None)

def _smartrecruiters_ilani(config: dict[str, Any], item: dict[str, Any], ilan_adresi: str | None) -> Iterable[Job]:
    konum = item.get("location") or {}
    location = " ".join(filter(None, [konum.get("city"), konum.get("country")])); title = clean(item.get("name", ""))
    eslesme = is_turkey_location(location) if kaynak_ulkesi(config) == "TR" else konum_eslesiyor(config, konum.get("city"), konum.get("country"))
    if not eslesme or not erken_kariyer_mi(config, title, ""): return
    adres = ilan_adresi or f"https://jobs.smartrecruiters.com/{config['company_identifier']}/{item['id']}"
    yield Job(config["name"], adres, title, config.get("organization_name"), location, None, "Detay için kaynak ilana gidin.", country_code=ulke_etiketi(config))

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
                if not konum_eslesiyor(config, location_text, loc.get("countryCode")):
                    continue
                if not erken_kariyer_mi(config, title, description):
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
                    country_code=ulke_etiketi(config),
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
        erken_kariyer = kidem in {"intern", "student", "entry"} or erken_kariyer_mi(config, title, description)

        if not konum_eslesiyor(config, ofisler) or not erken_kariyer:
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
            country_code=ulke_etiketi(config),
        )


# SAYFANIN KENDİ KAPANMA BEYANI
#
# Bu kalıplar ilanın kapandığını SAYFANIN SÖYLEDİĞİ durumlar. Ölçüldü
# (15 Eylül 2026): UBS ilan sayfası HTTP 200 dönüyor ama metninde
# "expired" ve "no longer" geçiyor — sayfa duruyor diye açık saymak
# öğrenciyi kapanmış ilana gönderirdi.
KAPANMA_ISARETLERI = re.compile(
    r"(?:no longer accept|position (?:has been )?(?:filled|closed)"
    r"|job\s*(?:posting|ad)?\s*(?:has\s*)?expired|posting has expired"
    r"|nicht mehr verf[uü]gbar|anzeige ist abgelaufen|bewerbungsfrist abgelaufen"
    r"|stelle ist besetzt)",
    re.I,
)

# Sayfa başlığındaki site ekleri. "Praktikum HR: Recruiting (SoSe 27)
# Stellendetails | Festool Group" ilanın adı değil; ilanın adı + sitenin
# imzası. İmza atılıyor, uydurma yapılmıyor.
BASLIK_EKLERI = re.compile(r"\s*(?:stellendetails|stellenangebot|stellenanzeige|job details|job description)\s*$", re.I)

def ilan_sayfasi_basligi(html: str) -> str | None:
    """Önce h1, yoksa <title>. Hiçbiri yoksa None — başlık uydurulmuyor."""
    okuyucu = _GorunurMetin()
    okuyucu.feed(html)
    if okuyucu.baslik:
        return okuyucu.baslik
    eslesme = re.search(r"<title[^>]*>(.*?)</title>", html, re.S | re.I)
    if not eslesme:
        return None
    baslik = BASLIK_EKLERI.sub("", clean(eslesme.group(1)).split("|")[0].strip()).strip()
    return baslik or None


def resmi_ilan_sayfasi(config: dict[str, Any]) -> Iterable[Job]:
    """AÇIKLIĞI DOĞRULANMAMIŞ ilan sayfası: tek tek adresler okunur.

    Kullanıcının verdiği 15 Almanya ilanının hiçbiri makine-okunur
    JobPosting verisi vermiyor (ölçüldü, 15 Eylül 2026): ne JSON-LD ne de
    resmî bir ATS uç noktası var. Yani "bu ilan açık" diyemiyoruz; yalnız
    "şirketin resmî ilan sayfası şu anda duruyor" diyebiliyoruz.

    Bu yüzden:
      · başlık SAYFANIN KENDİ metninden alınır (h1, yoksa <title>),
      · ülke KÜRATÖR beyanıdır (`country`) ve ham kayıtta öyle işaretlenir,
      · her ilan `aciklik_dogrulanmadi` ile damgalanır ve TASLAK kalır,
      · sayfa kapandığını söylüyorsa ya da 404/410 dönüyorsa alınmaz,
      · 401/403/429 görülürse kaynak BIRAKILIR — engel aşılmaz.

    Bayrak zorunlu: bu adaptör yanlışlıkla doğrulanmış hatta kullanılırsa
    kanıtsız ilan yayına çıkardı.
    """
    if config.get("aciklik_dogrulanmadi") is not True:
        raise ValueError(f"{config.get('name', 'kaynak')}: resmi_ilan_sayfasi yalnız açıklığı doğrulanmamış hatta kullanılır")

    basliklar = {"User-Agent": "StajimVarJobs/1.0 (+https://stajimvar.com/bot)"}
    for adres in config.get("urls", []):
        try:
            yanit = requests.get(adres, timeout=25, headers=basliklar)
        except requests.RequestException:
            # Tek sayfanın okunamaması kaynağı düşürmemeli.
            continue
        finally:
            time.sleep(float(config.get("crawl_delay_seconds") or 1.5))

        if yanit.status_code in {401, 403, 429}:
            return
        if yanit.status_code != 200:
            continue

        okuyucu = _GorunurMetin()
        okuyucu.feed(yanit.text)
        if KAPANMA_ISARETLERI.search(okuyucu.metin):
            continue

        baslik = ilan_sayfasi_basligi(yanit.text)
        if not baslik or not erken_kariyer_mi(config, baslik, ""):
            continue

        yield Job(
            config["name"],
            adres,
            baslik,
            config.get("company_name"),
            config.get("city_hint"),
            None,
            "",
            country_code=ulke_etiketi(config),
            aciklik_dogrulanmadi=True,
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
        if not konum_eslesiyor(config, location, item.get("country_code")) or not erken_kariyer_mi(config, title, description):
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
            country_code=ulke_etiketi(config),
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
    "official_jsonld": official_jsonld,
    "kurumsal_html": kurumsal_html,
    "resmi_ilan_sayfasi": resmi_ilan_sayfasi,
}
