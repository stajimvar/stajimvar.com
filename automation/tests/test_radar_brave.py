"""BRAVE SAĞLAYICI REGRESYONU

Ana kural: ARAMA SONUCU ADAY ÜRETİR, KANIT ÜRETMEZ.

Anahtar hiçbir çıktıya sızmamalı; sağlayıcı düşerse radar ayakta
kalmalı.
"""

import json

import pytest

from automation.radar_brave import BraveArama, saglayici_kur
from automation.radar_sirket import (
    AramaYok,
    aramadan_coz,
    sirket_alani_olamaz,
    sirketi_coz,
)

ANAHTAR = "test-anahtari-DEGIL-GERCEK"


class SahteYanit:
    def __init__(self, durum=200, govde=None, patla=False):
        self.status_code = durum
        self._govde = govde if govde is not None else {"web": {"results": []}}
        self._patla = patla

    def json(self):
        if self._patla:
            raise ValueError("bozuk json")
        return self._govde


class SahteOturum:
    def __init__(self, yanitlar):
        self.yanitlar = list(yanitlar)
        self.cagri = 0
        self.son_header = None
        self.son_params = None

    def get(self, url, params=None, headers=None, timeout=None):
        self.cagri += 1
        self.son_header = headers
        self.son_params = params
        y = self.yanitlar.pop(0)
        if isinstance(y, Exception):
            raise y
        return y


def sonuc(*urller):
    return {"web": {"results": [{"title": f"{u} başlık", "url": u, "description": "özet"} for u in urller]}}


# ------------------------------------------------------------ A: anahtar


def test_a_anahtar_yoksa_fail_soft(monkeypatch):
    monkeypatch.delenv("BRAVE_SEARCH_API_KEY", raising=False)
    b = BraveArama(anahtar=None)
    assert not b.kullanilabilir
    assert b.ara("x") == []
    assert b.olcum.sorgu == 0


def test_anahtar_yoksa_saglayici_kapali_donuyor(monkeypatch):
    monkeypatch.delenv("BRAVE_SEARCH_API_KEY", raising=False)
    s = saglayici_kur()
    assert isinstance(s, AramaYok)
    assert not s.kullanilabilir


# --------------------------------------------------------- B: ayrıştırma


def test_b_gecerli_yanit_ayristiriliyor():
    o = SahteOturum([SahteYanit(200, sonuc("https://koton.com/", "https://x.com/koton"))])
    b = BraveArama(ANAHTAR, oturum=o)
    r = b.ara("koton resmi site")
    assert [x["url"] for x in r] == ["https://koton.com/", "https://x.com/koton"]
    assert b.olcum.basarili == 1


def test_anahtar_header_ile_gidiyor_paramda_degil():
    o = SahteOturum([SahteYanit(200, sonuc("https://a.com"))])
    BraveArama(ANAHTAR, oturum=o).ara("q")
    assert o.son_header["X-Subscription-Token"] == ANAHTAR
    assert ANAHTAR not in json.dumps(o.son_params)


# ------------------------------------------- C, D, E: aday süzgeci


def test_c_sosyal_sonuc_aday_olamaz():
    for u in ["https://www.instagram.com/koton", "https://x.com/koton", "https://facebook.com/koton"]:
        assert sirket_alani_olamaz(u), u


def test_d_toplayici_sonuc_aday_olamaz():
    for u in ["https://www.kariyer.net/firma/koton", "https://www.linkedin.com/company/koton",
              "https://tr.wikipedia.org/wiki/Koton"]:
        assert sirket_alani_olamaz(u), u


def test_e_kurumsal_sonuc_aday_oluyor():
    assert not sirket_alani_olamaz("https://www.koton.com/")


def test_f_ilk_sonuc_rehberse_ikincisi_secilebiliyor():
    """İlk sonuç = resmî site DEĞİL. Engelli olanlar atlanıyor."""
    o = SahteOturum([SahteYanit(200, sonuc(
        "https://www.linkedin.com/company/koton",
        "https://tr.wikipedia.org/wiki/Koton",
        "https://www.koton.com/",
    ))])
    b = BraveArama(ANAHTAR, oturum=o)
    cozum, sorgu = aramadan_coz("Koton", b)
    assert cozum.alan_adi == "koton.com"
    assert sorgu == 1


def test_hicbir_aday_kurumsal_degilse_cozum_yok():
    o = SahteOturum([SahteYanit(200, sonuc("https://www.linkedin.com/company/x")),
                     SahteYanit(200, sonuc("https://www.instagram.com/x"))])
    cozum, _ = aramadan_coz("X", BraveArama(ANAHTAR, oturum=o))
    assert not cozum.var


# --------------------------------------------------- G, H: kanıt değil


def test_g_arama_sonucu_tek_basina_high_degil():
    """Aday MEDIUM doğuyor; HIGH ancak kimlik doğrulamasıyla geliyor."""
    o = SahteOturum([SahteYanit(200, sonuc("https://koton.com/"))])
    cozum, _ = aramadan_coz("Koton", BraveArama(ANAHTAR, oturum=o))
    assert cozum.guven == "MEDIUM"
    assert not cozum.otomatik_kullanilabilir


def test_h_kimlik_dogrulanamazsa_high_olmuyor():
    o = SahteOturum([SahteYanit(200, sonuc("https://alakasiz.com/"))])
    getir = lambda u: (200, "<html><title>Bambaska Bir Sirket</title></html>")  # noqa: E731
    cozum, _ = sirketi_coz("Koton Mağazacılık", getir, {}, BraveArama(ANAHTAR, oturum=o))
    assert cozum.guven != "HIGH"


def test_kimlik_dogrulanirsa_high_oluyor():
    o = SahteOturum([SahteYanit(200, sonuc("https://koton.com/"))])
    sayfa = ('<html><head><title>Koton | Giyim</title>'
             '<meta property="og:site_name" content="Koton"></head></html>')
    getir = lambda u: (200, sayfa) if "koton.com" in u else (404, "")  # noqa: E731
    cozum, _ = sirketi_coz("Koton", getir, {}, BraveArama(ANAHTAR, oturum=o))
    assert cozum.guven == "HIGH"
    assert cozum.katman == "arama"


# ------------------------------------------------- I, J: hata yolları


def test_i_429_fail_soft_ve_yeniden_deneme_yok():
    o = SahteOturum([SahteYanit(429)])
    b = BraveArama(ANAHTAR, oturum=o)
    assert b.ara("q") == []
    assert o.cagri == 1, "429 sonrası yeniden denendi"
    assert b.olcum.hata["429"] == 1


def test_j_zaman_asimi_fail_soft():
    b = BraveArama(ANAHTAR, oturum=SahteOturum([TimeoutError("zaman asimi")]))
    assert b.ara("q") == []
    assert "TimeoutError" in b.olcum.hata


@pytest.mark.parametrize("durum", [401, 403, 500, 503])
def test_yetki_ve_sunucu_hatalari_fail_soft(durum):
    b = BraveArama(ANAHTAR, oturum=SahteOturum([SahteYanit(durum)]))
    assert b.ara("q") == []
    assert b.olcum.hata


def test_bozuk_json_fail_soft():
    b = BraveArama(ANAHTAR, oturum=SahteOturum([SahteYanit(200, patla=True)]))
    assert b.ara("q") == []
    assert b.olcum.hata["json"] == 1


# ------------------------------------------------- K, L: önbellek, tavan


def test_k_ayni_sorgu_ikinci_kez_ucretlendirilmiyor():
    o = SahteOturum([SahteYanit(200, sonuc("https://a.com"))])
    b = BraveArama(ANAHTAR, oturum=o)
    b.ara("ayni sorgu")
    b.ara("ayni sorgu")
    assert o.cagri == 1
    assert b.olcum.sorgu == 1


def test_l_sorgu_tavani_uygulaniyor():
    o = SahteOturum([SahteYanit(200, sonuc("https://a.com")) for _ in range(5)])
    b = BraveArama(ANAHTAR, tavan=2, oturum=o)
    for i in range(5):
        b.ara(f"sorgu {i}")
    assert b.olcum.sorgu == 2
    assert b.olcum.tavana_takildi == 3


# ------------------------------------------------------ M: iç veri önce


def test_m_ic_veri_varsa_brave_cagrilmiyor():
    o = SahteOturum([SahteYanit(200, sonuc("https://yanlis.com"))])
    b = BraveArama(ANAHTAR, oturum=o)
    tabani = {"koton": "koton.com"}
    cozum, sorgu = sirketi_coz("Koton", lambda u: (404, ""), tabani, b)
    assert cozum.katman == "ic_veri"
    assert o.cagri == 0, "iç veri varken Brave çağrıldı"
    assert sorgu == 0


# ------------------------------------------------- N, O: anahtar sızmıyor


def test_n_olcum_ozeti_anahtar_icermiyor():
    b = BraveArama(ANAHTAR, oturum=SahteOturum([SahteYanit(429)]))
    b.ara("q")
    metin = json.dumps(b.olcum.ozet(), ensure_ascii=False)
    assert ANAHTAR not in metin
    assert "anahtar" not in metin.lower() or "token" not in metin.lower()


def test_o_hata_kaydi_mesaj_degil_tur_tutuyor():
    """Hata mesajı adres/başlık taşıyabilir; yalnız tür yazılıyor."""
    b = BraveArama(ANAHTAR, oturum=SahteOturum([RuntimeError("https://gizli.example/q?key=abc")]))
    b.ara("q")
    metin = json.dumps(b.olcum.ozet())
    assert "gizli.example" not in metin
    assert "RuntimeError" in metin


def test_anahtar_istemci_paketine_girmiyor():
    """Brave yalnız automation tarafında; istemci kodunda geçmiyor."""
    from pathlib import Path

    kok = Path(__file__).resolve().parents[2]
    for yol in (kok / "src").rglob("*.ts*"):
        assert "BRAVE_SEARCH_API_KEY" not in yol.read_text(encoding="utf-8"), yol
