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

LOCATION_COUNTRIES = {
    'turkiye': 'TR', 'turkey': 'TR',
    'berlin': 'DE', 'germany': 'DE', 'deutschland': 'DE',
    'paris': 'FR', 'france': 'FR',
    'london': 'GB', 'united kingdom': 'GB',
    'amsterdam': 'NL', 'netherlands': 'NL',
    'new york': 'US', 'united states': 'US',
}

REMOTE_ONLY = {'remote', 'global', 'worldwide', 'anywhere'}


def _fold(value):
    text = unicodedata.normalize('NFKD', str(value or '').casefold())
    return ' '.join(''.join(ch for ch in text if not unicodedata.combining(ch)).split())


def _location_signals(location):
    folded = _fold(location)
    if not folded or folded in REMOTE_ONLY:
        return set()
    tokens = set(re.findall(r'[a-z]+', folded))
    signals = {'TR'} if tokens & TURKEY_CITIES else set()
    for label, code in LOCATION_COUNTRIES.items():
        if re.search(rf'(?<![a-z]){re.escape(label)}(?![a-z])', folded):
            signals.add(code)
    return signals


def infer_country_code(*, structured_country=None, location=None, title=None):
    """Return a country only from structured or explicit location evidence; title is ignored."""
    structured = str(structured_country or '').strip().upper()
    structured_code = structured if re.fullmatch(r'[A-Z]{2}', structured) else LOCATION_COUNTRIES.get(_fold(structured_country))
    signals = _location_signals(location)
    if structured_code:
        signals.add(structured_code)
    return next(iter(signals)) if len(signals) == 1 else None
