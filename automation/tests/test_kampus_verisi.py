"""KAMPÜSÜM VERİSİ — resmî kaynak ayrıştırıcıları

Örnek dosya MSGSÜ'nün kendi sitesinde yayımladığı Eylül 2026 menüsü:
https://msgsu.edu.tr/wp-content/uploads/2026/09/2026-Eylul-Ayi-Menu.pdf
(24 Eylül 2026'da indirildi, değiştirilmedi).
"""

import pathlib
from datetime import date

import pytest

from automation import kampus_verisi as kv

FIXTURE = pathlib.Path(__file__).parent / "fixtures" / "kampus" / "msgsu-2026-eylul-menu.pdf"


@pytest.fixture(scope="module")
def eylul():
    return kv.menu_pdf_ayristir(FIXTURE.read_bytes())


def test_ayin_butun_is_gunleri_okunuyor(eylul):
    gunler, uyarilar = eylul
    assert uyarilar == []
    assert len(gunler) == 22
    assert all(g.tarih.month == 9 and g.tarih.weekday() < 5 for g in gunler)
    assert len({g.tarih for g in gunler}) == 22, "aynı gün iki kez yazılmamalı"


def test_gun_icerigi_sutundan_dogru_geliyor(eylul):
    gunler = {g.tarih: g for g in eylul[0]}
    g = gunler[date(2026, 9, 25)]
    assert g.kalori == 1030
    assert g.yemekler == ("TARHANA ÇORBA", "ET DÖNER/PARMAK PATATES", "PİRİNÇ PİLAVI", "MEVSİM SALATA")
    assert gunler[date(2026, 9, 1)].yemekler[1] == "KARNIYARIK"


def test_kaynakta_olmayan_kalori_uydurulmuyor(eylul):
    gunler = {g.tarih: g for g in eylul[0]}
    assert gunler[date(2026, 9, 18)].kalori is None
    assert gunler[date(2026, 9, 18)].yemekler[0] == "EZOGELİN ÇORBA"


@pytest.mark.parametrize(
    "url, beklenen",
    [
        ("https://msgsu.edu.tr/a.pdf", True),
        ("https://sks.msgsu.edu.tr/a", True),
        ("http://msgsu.edu.tr/a.pdf", False),
        ("https://msgsu.edu.tr.kotu.com/a", False),
        ("https://kotumsgsu.edu.tr/a", False),
    ],
)
def test_resmi_alan_denetimi(url, beklenen):
    assert kv.resmi_alanda(url, "msgsu.edu.tr") is beklenen


def test_ay_ileri_yil_donumunu_geciyor():
    assert kv.ay_ileri(date(2026, 12, 1), 1) == date(2027, 1, 1)
    assert kv.ay_ileri(date(2026, 11, 1), 2) == date(2027, 1, 1)


class _Cevap:
    def __init__(self, veri=None, icerik=b""):
        self._veri, self.content = veri, icerik

    def json(self):
        return self._veri


def test_menu_yalniz_bu_ay_ve_gelecek_ay(monkeypatch):
    pdf = FIXTURE.read_bytes()

    def sahte_getir(url, alan, **_):
        if url.endswith("/media"):
            return _Cevap([
                {"source_url": "https://msgsu.edu.tr/eylul.pdf", "mime_type": "application/pdf"},
                {"source_url": "https://baska.site/eylul.pdf", "mime_type": "application/pdf"},
                {"source_url": "https://msgsu.edu.tr/foto.jpg", "mime_type": "image/jpeg"},
            ])
        return _Cevap(icerik=pdf)

    monkeypatch.setattr(kv, "getir", sahte_getir)
    kaynak = {"url": "https://msgsu.edu.tr/wp-json/wp/v2/media", "ayar": {}}

    eylulde = kv.wordpress_aylik_menu_pdf(kaynak, "msgsu.edu.tr", date(2026, 9, 25))
    assert len(eylulde.menuler) == 22
    assert all(m["ogun"] == "gunluk" for m in eylulde.menuler), "kaynak öğün vermiyor; öğle denmemeli"
    assert any("resmî alanda değil" in u for u in eylulde.uyarilar)

    kasimda = kv.wordpress_aylik_menu_pdf(kaynak, "msgsu.edu.tr", date(2026, 11, 2))
    assert kasimda.menuler == [], "geçmiş ayın menüsü yazılmamalı"
    assert "bu ay için menü bulunamadı" in kasimda.uyarilar


def test_duyurular_basligi_temizleniyor_ve_resmi_alan_disini_atiyor(monkeypatch):
    def sahte_getir(url, alan, **_):
        return _Cevap([
            {"date": "2026-09-24T16:39:09", "link": "https://msgsu.edu.tr/d/1/",
             "title": {"rendered": "Yabanc&#305; Dil <em>&#350;art&#305;</em>"}},
            {"date": "2026-09-23T10:00:00", "link": "https://baska.site/d/2/",
             "title": {"rendered": "Dış bağlantı"}},
        ])

    monkeypatch.setattr(kv, "getir", sahte_getir)
    s = kv.wordpress_kategori(
        {"url": "https://msgsu.edu.tr/wp-json/wp/v2/posts", "ayar": {"kategori": 1}},
        "msgsu.edu.tr",
        date(2026, 9, 25),
    )
    assert [d["baslik"] for d in s.duyurular] == ["Yabancı Dil Şartı"]
    assert s.duyurular[0]["yayin_tarihi"] == "2026-09-24"
    assert len(s.uyarilar) == 1
