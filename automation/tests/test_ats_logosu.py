"""İlan sisteminin şirket logosu (25 Kasım 2026).

`website` alanı olmayan kaynaklar logosuz kalıyordu; logo artık kaynağın
kendi panosundan (Ashby, Personio, Greenhouse, Lever) alınıyor.
"""
from __future__ import annotations

import io
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import logos  # noqa: E402


def png(boyut, renk, kutu=None, zemin=(0, 0, 0, 0)):
    gorsel = Image.new("RGBA", boyut, zemin)
    if kutu:
        gorsel.paste(Image.new("RGBA", (kutu[2] - kutu[0], kutu[3] - kutu[1]), renk), kutu[:2])
    cikti = io.BytesIO()
    gorsel.save(cikti, "PNG")
    return cikti.getvalue()


def test_pano_adresi_kaynak_kimliginden():
    assert logos.ats_pano_adresi({"type": "ashby", "job_board": "doctolib"}) == "https://jobs.ashbyhq.com/doctolib"
    assert logos.ats_pano_adresi({"type": "personio", "tenant": "careloop", "domain": "com"}) == "https://careloop.jobs.personio.com"
    assert logos.ats_pano_adresi({"type": "personio", "tenant": "mercanis"}) == "https://mercanis.jobs.personio.de"
    assert logos.ats_pano_adresi({"type": "greenhouse", "board_token": "prophet"}) == "https://job-boards.greenhouse.io/prophet"
    assert logos.ats_pano_adresi({"type": "lever", "site": "trendyol"}) == "https://jobs.lever.co/trendyol"


def test_pano_adresi_yoksa_ya_da_kimlik_bozuksa_none():
    assert logos.ats_pano_adresi({"type": "official_jsonld", "urls": ["https://x.de/1"]}) is None
    assert logos.ats_pano_adresi({"type": "ashby"}) is None
    assert logos.ats_pano_adresi({"type": "greenhouse", "board_token": "x/../y"}) is None


def test_yalniz_sistemin_kendi_gorsel_sunucusu_aday():
    html = (
        '<img src="https://www.emnify.com/hubfs/logo.png">'
        '<img src="https://s5-recruiting.cdn.greenhouse.io/external_greenhouse_job_boards/logos/400/196/300/original/P.png?1652108549">'
    )
    assert logos.ats_logo_adaylari({"type": "greenhouse"}, html) == [
        "https://s5-recruiting.cdn.greenhouse.io/external_greenhouse_job_boards/logos/400/196/300/original/P.png?1652108549"
    ]
    ashby = (
        '"https://app.ashbyhq.com/api/images/org-theme-wordmark/a/b/w.png" '
        '"https://app.ashbyhq.com/api/images/org-theme-logo/a/b/l.png" '
        '"https://app.ashbyhq.com/api/images/org-theme-social/a/b/s.png"'
    )
    # Önce kare logo, sonra yazı logosu; paylaşım afişi hiç.
    assert logos.ats_logo_adaylari({"type": "ashby"}, ashby) == [
        "https://app.ashbyhq.com/api/images/org-theme-logo/a/b/l.png",
        "https://app.ashbyhq.com/api/images/org-theme-wordmark/a/b/w.png",
    ]


def test_paylasim_karti_kirpilip_128_kareye_sigiyor():
    kart = png((1170, 658), (90, 30, 200, 255), kutu=(400, 300, 770, 360), zemin=(255, 255, 255, 255))
    sonuc = Image.open(io.BytesIO(logos.logo_normallestir(kart)))
    assert sonuc.size == (128, 128)
    assert sonuc.mode == "RGBA"
    # Kırpıldı: logo kenar boşluğu hariç tüm genişliği kaplıyor.
    kutu = sonuc.getchannel("A").getbbox()
    assert kutu[2] - kutu[0] == 116


def test_beyaz_ya_da_bos_logo_reddediliyor():
    assert logos.logo_normallestir(png((200, 80), (255, 255, 255, 255), kutu=(10, 10, 190, 70))) is None
    assert logos.logo_normallestir(png((200, 80), (0, 0, 0, 0))) is None
    assert logos.logo_normallestir(b"<svg></svg>") is None
