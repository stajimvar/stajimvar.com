"""Shared, conservative country inference for listing imports and backfills."""

import re
import unicodedata

TURKEY_CITIES = {
    'adana', 'adiyaman', 'afyonkarahisar', 'agri', 'aksaray', 'amasya', 'ankara',
    'antalya', 'ardahan', 'artvin', 'aydin', 'balikesir', 'bartin', 'batman',
    'bayburt', 'bilecik', 'bingol', 'bitlis', 'bolu', 'burdur', 'bursa', 'canakkale',
    'cankiri', 'corum', 'denizli', 'diyarbakir', 'duzce', 'edirne', 'elazig',
    'erzincan', 'erzurum', 'eskisehir', 'gaziantep', 'giresun', 'gumushane',
    'hakkari', 'hatay', 'igdir', 'isparta', 'istanbul', 'izmir', 'kahramanmaras',
    'karabuk', 'karaman', 'kars', 'kastamonu', 'kayseri', 'kilis', 'kirikkale',
    'kirklareli', 'kirsehir', 'kocaeli', 'konya', 'kutahya', 'malatya', 'manisa',
    'mardin', 'mersin', 'mugla', 'mus', 'nevsehir', 'nigde', 'ordu', 'osmaniye',
    'rize', 'sakarya', 'samsun', 'sanliurfa', 'siirt', 'sinop', 'sirnak', 'sivas',
    'tekirdag', 'tokat', 'trabzon', 'tunceli', 'usak', 'van', 'yalova', 'yozgat',
    'zonguldak',
}

COUNTRY_NAMES = {
    'turkiye': 'TR', 'turkey': 'TR',
    'germany': 'DE', 'deutschland': 'DE',
    'france': 'FR',
    'united kingdom': 'GB',
    'netherlands': 'NL',
    'united states': 'US',
}

# ALMANYA VE FRANSA ŞEHİRLERİ (15 Eylül 2026)
#
# Ülke-duyarlı ilan hattı konumu yalnız şehir yazan ilanları ("Hamburg",
# "Köln") ancak bu listeden tanıyabiliyor. Başka ülkede de yaygın geçen
# adlar BİLEREK yok: "Nice" (İngilizce sıfat), "Hof", "Halle" gibi. Yanlış
# ülke, bir ilanı kaçırmaktan kötü.
GERMANY_CITIES = (
    'berlin', 'hamburg', 'munchen', 'muenchen', 'munich', 'koln', 'koeln', 'cologne',
    'frankfurt', 'stuttgart', 'dusseldorf', 'duesseldorf', 'leipzig', 'dortmund', 'essen',
    'bremen', 'dresden', 'hannover', 'hanover', 'nurnberg', 'nuernberg', 'nuremberg', 'bonn',
    'mannheim', 'karlsruhe', 'heidelberg', 'potsdam', 'boblingen', 'tubingen', 'herzogenaurach',
)
FRANCE_CITIES = (
    'paris', 'lyon', 'marseille', 'toulouse', 'nantes', 'strasbourg', 'montpellier',
    'bordeaux', 'lille', 'rennes', 'cannes',
)

LOCATION_COUNTRIES = {
    **COUNTRY_NAMES,
    **{city: 'DE' for city in GERMANY_CITIES},
    **{city: 'FR' for city in FRANCE_CITIES},
    'london': 'GB',
    'amsterdam': 'NL',
    'new york': 'US',
}

REMOTE_ONLY = {'remote', 'global', 'worldwide', 'anywhere'}

# YAPISAL ÜLKE ALANININ ADLARI (25 Ekim 2026, küresel kaynak profili)
#
# Yalnız ATS'nin yapısal `addressCountry` alanında aranıyor; serbest konum
# metninde ARANMIYOR ("Georgia", "Jordan" gibi adlar metinde başka şey
# olabilir). Kapsam sitenin ülke listesi (src/lib/ulkeler.mjs) ile aynı;
# İngilizce ve ATS'lerin yerel dil çıktısında görülen adlar ("Singapur").
# Listede olmayan ad ülke vermiyor ve küresel kaynakta ilan alınmıyor.
DUNYA_ULKE_ADLARI = {
    'united arab emirates': 'AE', 'uae': 'AE', 'birlesik arap emirlikleri': 'AE',
    'austria': 'AT', 'avusturya': 'AT', 'osterreich': 'AT',
    'azerbaijan': 'AZ', 'azerbaycan': 'AZ',
    'belgium': 'BE', 'belcika': 'BE', 'belgique': 'BE', 'belgie': 'BE',
    'bulgaria': 'BG', 'bulgaristan': 'BG',
    'canada': 'CA', 'kanada': 'CA',
    'switzerland': 'CH', 'isvicre': 'CH', 'schweiz': 'CH', 'suisse': 'CH',
    'cyprus': 'CY', 'kibris': 'CY',
    'czech republic': 'CZ', 'czechia': 'CZ', 'cekya': 'CZ', 'cek cumhuriyeti': 'CZ',
    'almanya': 'DE',
    'denmark': 'DK', 'danimarka': 'DK',
    'estonia': 'EE', 'estonya': 'EE',
    'spain': 'ES', 'ispanya': 'ES', 'espana': 'ES',
    'finland': 'FI', 'finlandiya': 'FI',
    'fransa': 'FR',
    'uk': 'GB', 'great britain': 'GB', 'birlesik krallik': 'GB', 'ingiltere': 'GB',
    'georgia': 'GE', 'gurcistan': 'GE',
    'greece': 'GR', 'yunanistan': 'GR',
    'croatia': 'HR', 'hirvatistan': 'HR',
    'hungary': 'HU', 'macaristan': 'HU',
    'ireland': 'IE', 'irlanda': 'IE',
    'israel': 'IL', 'israil': 'IL',
    'italy': 'IT', 'italya': 'IT', 'italia': 'IT',
    'japan': 'JP', 'japonya': 'JP',
    'south korea': 'KR', 'korea': 'KR', 'guney kore': 'KR',
    'kazakhstan': 'KZ', 'kazakistan': 'KZ',
    'lithuania': 'LT', 'litvanya': 'LT',
    'luxembourg': 'LU', 'luksemburg': 'LU',
    'latvia': 'LV', 'letonya': 'LV',
    'malta': 'MT',
    'hollanda': 'NL', 'nederland': 'NL', 'the netherlands': 'NL',
    'norway': 'NO', 'norvec': 'NO',
    'poland': 'PL', 'polonya': 'PL', 'polska': 'PL',
    'portugal': 'PT', 'portekiz': 'PT',
    'qatar': 'QA', 'katar': 'QA',
    'romania': 'RO', 'romanya': 'RO',
    'serbia': 'RS', 'sirbistan': 'RS',
    'saudi arabia': 'SA', 'suudi arabistan': 'SA',
    'sweden': 'SE', 'isvec': 'SE',
    'singapore': 'SG', 'singapur': 'SG',
    'slovenia': 'SI', 'slovenya': 'SI',
    'slovakia': 'SK', 'slovakya': 'SK',
    'ukraine': 'UA', 'ukrayna': 'UA',
    'usa': 'US', 'united states of america': 'US', 'amerika birlesik devletleri': 'US', 'abd': 'US',
}


def _fold(value):
    text = unicodedata.normalize('NFKD', str(value or '').casefold())
    return ' '.join(''.join(ch for ch in text if not unicodedata.combining(ch)).split())


def location_country_signals(location):
    """Konum metninin işaret ettiği ülkeler; uzaktan/boş metin sinyal vermez."""
    folded = _fold(location)
    if not folded or folded in REMOTE_ONLY:
        return set()
    tokens = set(re.findall(r'[a-z]+', folded))
    signals = {'TR'} if tokens & TURKEY_CITIES else set()
    for label, code in LOCATION_COUNTRIES.items():
        if re.search(rf'(?<![a-z]){re.escape(label)}(?![a-z])', folded):
            signals.add(code)
    return signals


def structured_country_code(value):
    """ATS'nin yapısal ülke alanı: ISO kodu ("de") ya da ülke adı ("Germany")."""
    raw = str(value or '').strip()
    if re.fullmatch(r'[A-Za-z]{2}', raw):
        return raw.upper()
    folded = _fold(raw)
    # NFKD noktasız ı'yı ayırmıyor ("Kıbrıs"); ad tablosu düz i ile yazılı.
    return COUNTRY_NAMES.get(folded) or DUNYA_ULKE_ADLARI.get(folded.replace('ı', 'i'))


def infer_country_code(*, structured_country=None, location=None, title=None):
    """Return a country only from structured or explicit location evidence; title is ignored."""
    signals = location_country_signals(location)
    structured_code = structured_country_code(structured_country)
    if structured_code:
        signals.add(structured_code)
    return next(iter(signals)) if len(signals) == 1 else None
