"""AÇIKLIĞI BELİRSİZ İLANLAR — "sayfa duruyor" ile "ilan açık" ayrı şeyler

NEDEN
-----
Kullanıcının verdiği 15 Almanya ilanının kaynak sayfası açılıyor ama
hiçbiri makine-okunur JobPosting verisi vermiyor (ölçüldü, 15 Eylül
2026): JSON-LD yok, ülke ve açıklık kanıtı yok. Bunları doğrulanmış 34
ilanla aynı kaba koymak, öğrenciye kapanmış olabilecek bir ilanı "açık"
diye göstermek olurdu.

KURAL
-----
Bu ilanlar AYRI BİR HATTA işleniyor: kaynak sayfası gerçekten çağrılıyor,
başlık sayfanın kendi metninden alınıyor, ülke KÜRATÖR beyanı olarak
işaretleniyor ve ilan `draft` olarak kaydediliyor — yayına çıkmıyor.
Kapanma işareti taşıyan sayfa hiç alınmıyor. Günlük bağlantı kontrolü
bu taslakları da geziyor.
"""
import json
import pathlib
import sys
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0, str(pathlib.Path(__file__).parents[1]))
import promote  # noqa: E402
import repository  # noqa: E402
import scraper  # noqa: E402

KOK = pathlib.Path(__file__).parents[2]
BELIRSIZ = {"name": "Örnek", "type": "resmi_ilan_sayfasi", "country": "DE", "company_name": "Örnek GmbH",
            "aciklik_dogrulanmadi": True, "urls": ["https://ornek.de/job/1"]}

ILAN_SAYFASI = ("<html><head><title>Praktikum Logistik Stellendetails | Örnek GmbH</title></head>"
                "<body><h1>Praktikum Logistik</h1><p>Wir suchen.</p></body></html>")


def sayfa(govde: str, status: int = 200):
    r = Mock()
    r.status_code = status
    r.text = govde
    r.raise_for_status.return_value = None
    return r


class AdaptorKapilari(unittest.TestCase):
    def test_bayrak_yoksa_kaynak_kosusu_dusuyor(self):
        """Bu adaptör ülkeyi küratör beyanından alıyor ve ilanı doğrulanmış
        saymıyor. Bayraksız çalışsaydı kanıtsız ilan yayına çıkardı."""
        with self.assertRaises(ValueError):
            list(scraper.resmi_ilan_sayfasi({**BELIRSIZ, "aciklik_dogrulanmadi": False}))

    @patch("scraper.time.sleep", lambda *a: None)
    @patch("scraper.requests.get")
    def test_kapanmis_ya_da_erisilemeyen_sayfa_alinmiyor(self, get):
        for durum in (404, 410, 403, 500):
            with self.subTest(durum=durum):
                get.return_value = sayfa(ILAN_SAYFASI, durum)
                self.assertEqual(list(scraper.resmi_ilan_sayfasi(dict(BELIRSIZ))), [])

    @patch("scraper.time.sleep", lambda *a: None)
    @patch("scraper.requests.get")
    def test_kapanma_isareti_tasiyan_sayfa_alinmiyor(self, get):
        """UBS ilanının sayfası 200 dönüyor ama içinde "expired" ve
        "no longer" geçiyor (ölçüldü)."""
        for isaret in ["This job posting has expired", "We are no longer accepting applications",
                       "Diese Stelle ist nicht mehr verfügbar", "Die Anzeige ist abgelaufen"]:
            with self.subTest(isaret=isaret):
                get.return_value = sayfa(ILAN_SAYFASI.replace("Wir suchen.", isaret))
                self.assertEqual(list(scraper.resmi_ilan_sayfasi(dict(BELIRSIZ))), [])

    @patch("scraper.time.sleep", lambda *a: None)
    @patch("scraper.requests.get")
    def test_baslik_sayfanin_kendi_metninden(self, get):
        get.return_value = sayfa(ILAN_SAYFASI)
        (is_,) = list(scraper.resmi_ilan_sayfasi(dict(BELIRSIZ)))
        self.assertEqual(is_.title, "Praktikum Logistik")
        self.assertEqual(is_.source_url, "https://ornek.de/job/1")
        self.assertTrue(is_.aciklik_dogrulanmadi)
        self.assertEqual(is_.country_code, "DE")

    @patch("scraper.time.sleep", lambda *a: None)
    @patch("scraper.requests.get")
    def test_h1_yoksa_sayfa_basligi_temizleniyor(self, get):
        """Festool ve Renault sayfalarında h1 yok; <title> site adını ve
        "Stellendetails" ekini taşıyor (ölçüldü)."""
        get.return_value = sayfa("<html><head><title>Praktikum HR: Recruiting (SoSe 27) Stellendetails"
                                 " | Festool Group</title></head><body><p>x</p></body></html>")
        (is_,) = list(scraper.resmi_ilan_sayfasi(dict(BELIRSIZ)))
        self.assertEqual(is_.title, "Praktikum HR: Recruiting (SoSe 27)")

    @patch("scraper.time.sleep", lambda *a: None)
    @patch("scraper.requests.get")
    def test_staj_olmayan_baslik_alinmiyor(self, get):
        get.return_value = sayfa(ILAN_SAYFASI.replace("<h1>Praktikum Logistik</h1>", "<h1>Senior Logistics Manager</h1>"))
        self.assertEqual(list(scraper.resmi_ilan_sayfasi(dict(BELIRSIZ))), [])

    @patch("scraper.time.sleep", lambda *a: None)
    @patch("scraper.requests.get")
    def test_basliksiz_sayfa_alinmiyor(self, get):
        """Audi ve EF sayfaları sunucudan boş geliyor (SPA). Uydurma
        başlıkla ilan üretilmiyor."""
        get.return_value = sayfa("<html><head><title></title></head><body></body></html>")
        self.assertEqual(list(scraper.resmi_ilan_sayfasi(dict(BELIRSIZ))), [])


class HamKayit(unittest.TestCase):
    def test_belirsizlik_ve_ulke_kaniti_ham_kayitta(self):
        job = scraper.Job("K", "https://ornek.de/job/1", "Praktikum", city=None,
                          country_code="DE", aciklik_dogrulanmadi=True)
        ham = repository.raw_listing_payload(job, "kaynak", job.source_url, "2026-09-15T00:00:00Z")["raw"]
        self.assertTrue(ham["aciklik_dogrulanmadi"])
        self.assertEqual(ham["country_code"], "DE")
        self.assertEqual(ham["ulke_kaniti"], "kurator")

    def test_dogrulanmis_ilanda_bayrak_yok(self):
        job = scraper.Job("K", "https://ornek.de/job/2", "Intern", city="Berlin", country_code="DE")
        ham = repository.raw_listing_payload(job, "kaynak", job.source_url, "2026-09-15T00:00:00Z")["raw"]
        self.assertFalse(ham["aciklik_dogrulanmadi"])
        self.assertEqual(ham["ulke_kaniti"], "kaynak")


class YayinDurumu(unittest.TestCase):
    def test_belirsiz_ilan_taslak_kaliyor(self):
        self.assertEqual(promote.ilan_durumu({"raw": {"aciklik_dogrulanmadi": True}}), "draft")

    def test_dogrulanmis_ilan_yayinlaniyor(self):
        for ham in ({"raw": {}}, {"raw": {"aciklik_dogrulanmadi": False}}, {}):
            with self.subTest(ham=ham):
                self.assertEqual(promote.ilan_durumu(ham), "published")

    def test_promote_bu_karari_kullaniyor(self):
        kod = (KOK / "automation" / "promote.py").read_text(encoding="utf-8")
        self.assertIn('"status": ilan_durumu(raw),', kod)


class KaynakKaydi(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.kaynaklar = json.loads((KOK / "automation" / "sources.json").read_text(encoding="utf-8"))["sources"]
        cls.belirsiz = [k for k in cls.kaynaklar if k.get("aciklik_dogrulanmadi")]

    def test_belirsiz_kapsami_12_ilan(self):
        self.assertEqual(sum(len(k["urls"]) for k in self.belirsiz), 12)
        self.assertTrue(all(k["type"] == "resmi_ilan_sayfasi" and k.get("country") == "DE" for k in self.belirsiz))

    def test_dogrulanmis_34_ilan_karismiyor(self):
        dogrulanmis = [k for k in self.kaynaklar
                       if k.get("country") == "DE" and not k.get("aciklik_dogrulanmadi")]
        self.assertEqual(sum(len(k.get("dogrulanmis_ilanlar") or k.get("urls") or []) for k in dogrulanmis), 34)

    def test_kapanma_isaretli_ve_verisiz_sayfalar_yok(self):
        """UBS sayfasında "expired"/"no longer" geçiyor; Audi ve EF
        sayfaları sunucudan boş geliyor (ölçüldü)."""
        metin = json.dumps(self.kaynaklar).lower()
        for yasak in ["jobs.ubs.com", "careers.audi.com", "jobs.ef.com", "louisvuitton", "traderepublic", "loreal"]:
            with self.subTest(yasak=yasak):
                self.assertNotIn(yasak, metin)

    def test_belirsiz_adresler_tekil_ve_dogrulanmislarla_cakismiyor(self):
        adresler = [u for k in self.belirsiz for u in k["urls"]]
        self.assertEqual(len(adresler), len(set(adresler)))
        digerleri = {u for k in self.kaynaklar if not k.get("aciklik_dogrulanmadi") for u in (k.get("urls") or [])}
        self.assertFalse(set(adresler) & digerleri)

    def test_belirsiz_kaynaklar_pasiflestirme_izin_listesinde_degil(self):
        akis = (KOK / ".github" / "workflows" / "stajimvar-automation.yml").read_text(encoding="utf-8")
        satir = next(s for s in akis.splitlines() if "DEACTIVATION_ENABLED_SOURCES:" in s)
        izinli = set(satir.split(":", 1)[1].strip().strip('"').split(","))
        for k in self.belirsiz:
            with self.subTest(kaynak=k["id"]):
                self.assertNotIn(k["id"], izinli)


if __name__ == "__main__":
    unittest.main()
