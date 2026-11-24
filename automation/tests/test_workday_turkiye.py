"""Workday Türkiye kaynakları (25 Kasım 2026).

PwC'nin ilanı "Long Term Trainees" (çoğul) ve "trainee" araması dünya
genelinde 300+ sonuç veriyordu; Bentley'nin ilanının konum metni yalnız
"2 Locations", ülke detayda. İkisi de hiç alınmıyordu.
"""
from __future__ import annotations

import sys
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import scraper  # noqa: E402

TR = {"name": "X", "type": "workday", "country": "TR", "company_name": "X",
      "host": "x.wd3.myworkdayjobs.com", "tenant": "x", "site": "s"}


def test_cogul_staj_basliklari_taniniyor():
    for baslik in ["Audit Services Long Term Trainees", "Summer Internships 2027", "Interns - Finance", "Trainee"]:
        assert scraper.EARLY_CAREER.search(baslik), baslik


class _Yanit:
    def __init__(self, veri):
        self.veri = veri
        self.status_code = 200

    def raise_for_status(self):
        pass

    def json(self):
        return self.veri


def _calistir(config, detay_ulkesi):
    ilan = {"title": "Software Quality Analyst, Intern", "locationsText": "2 Locations",
            "externalPath": "/job/Ankara/Software-Quality-Analyst--Intern_R62"}
    with mock.patch.object(scraper.requests, "post", return_value=_Yanit({"jobPostings": [ilan]})) as post, \
         mock.patch.object(scraper, "_workday_detay_ulkesi", return_value=detay_ulkesi):
        sonuc = list(scraper.workday(config))
    return sonuc, post


def test_dogrulanmis_turkiye_ilani_detaydaki_ulkeyle_aliniyor_ve_sehir_yazilmiyor():
    sonuc, _ = _calistir({**TR, "dogrulanmis_ilanlar": ["R62"]}, "Türkiye")
    assert len(sonuc) == 1
    assert sonuc[0].city is None
    sonuc, _ = _calistir({**TR, "dogrulanmis_ilanlar": ["R62"]}, "Germany")
    assert sonuc == []


def test_pano_taramasinda_turkiye_davranisi_degismedi():
    """Doğrulanmış kip değilse detay sorulmuyor: konum metni Türkiye demiyorsa ilan yok."""
    sonuc, _ = _calistir(TR, "Türkiye")
    assert sonuc == []


def test_arama_metni_kaynaktan_varsayilan_intern():
    _, post = _calistir({**TR, "dogrulanmis_ilanlar": ["R62"], "arama": "Long Term Trainees"}, "Türkiye")
    assert post.call_args.kwargs["json"]["searchText"] == "Long Term Trainees"
    _, post = _calistir({**TR, "dogrulanmis_ilanlar": ["R62"]}, "Türkiye")
    assert post.call_args.kwargs["json"]["searchText"] == "intern"
