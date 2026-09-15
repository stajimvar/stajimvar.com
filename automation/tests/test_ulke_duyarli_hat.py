"""ÜLKE-DUYARLI İLAN HATTI — TÜRKİYE BİREBİR AYNI, ALMANYA/FRANSA KARIŞMADAN

NEDEN
-----
Otomatik hat yapısal olarak yalnız Türkiye'yi işliyordu (ölçüldü,
15 Eylül 2026): her adaptör `is_turkey_location()` ile süzüyordu,
erken-kariyer ifadesi Almanca "Praktikum"u tanımıyordu. Kullanıcının
verdiği 13 Almanya kaynağı gerçek adaptörlerle kuru çalıştırıldı, 13'ü
de 0 ilan üretti. Bu yüzden canlıdaki bütün TR dışı ilanlar elle
girilmişti ve kapanış takibi yoktu.

KURAL
-----
Kaynağın `country` alanı profili seçer. Alan yoksa TR (bugünkü bütün
kaynaklar). Türkiye süzgeci BİREBİR korunur; Almanya/Fransa için konum
ancak TEK ülke sinyali verirse eşleşir — çelişen sinyal ilanı almaz.
Desteklenmeyen ülke kodu kaynak koşusunu düşürür (fail-closed).
"""
import json
import pathlib
import sys
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0, str(pathlib.Path(__file__).parents[1]))
import country_normalization  # noqa: E402
import repository  # noqa: E402
import scraper  # noqa: E402

KOK = pathlib.Path(__file__).parents[2]
DE = {"name": "Örnek DE", "country": "DE", "company_name": "Örnek"}
FR = {"name": "Örnek FR", "country": "FR", "company_name": "Örnek"}
TR = {"name": "Örnek TR", "company_name": "Örnek"}  # alan yok = bugünkü kaynaklar


def yanit(json_govde=None, text=None, status=200):
    r = Mock()
    r.status_code = status
    r.json.return_value = json_govde
    r.text = text or ""
    r.content = (text or "").encode()
    r.raise_for_status.return_value = None
    return r


# ------------------------------------------------------------ profil seçimi
class ProfilSecimi(unittest.TestCase):
    def test_ulke_alani_yoksa_turkiye(self):
        self.assertEqual(scraper.kaynak_ulkesi({}), "TR")
        self.assertEqual(scraper.kaynak_ulkesi({"country": "de"}), "DE")

    def test_desteklenmeyen_ulke_kosuyu_dusuruyor(self):
        """Bilinmeyen ülke sessizce TR'ye düşseydi Almanya ilanı Türkiye
        süzgecinden geçer ya da yanlış etiketlenirdi."""
        with self.assertRaises(ValueError):
            scraper.kaynak_ulkesi({"country": "IT"})


# ------------------------------------------------------------ konum süzgeci
class KonumSuzgeci(unittest.TestCase):
    def test_turkiye_suzgeci_birebir_ayni(self):
        ornekler = ["İstanbul, Türkiye", "Maslak", "Remote (Turkey)", "Berlin, Germany",
                    "Paris, France", "Remote", "İzmir tr", "MERKEZ", ""]
        for konum in ornekler:
            with self.subTest(konum=konum):
                self.assertEqual(scraper.konum_eslesiyor(TR, konum), scraper.is_turkey_location(konum))
        # Yapısal ülke Türkiye'de BİLEREK yok sayılıyor: davranış değişmesin.
        self.assertFalse(scraper.konum_eslesiyor(TR, "MERKEZ", "Türkiye"))

    def test_almanya(self):
        for konum in ["Berlin", "Hamburg, de", "München, Deutschland", "Köln", "Düsseldorf, North Rhine-Westphalia, Germany",
                      "Böblingen, Deutschland", "Tübingen, Deutschland", "Berlin, DE | Germany (REMOTE)"]:
            with self.subTest(konum=konum):
                self.assertTrue(scraper.konum_eslesiyor(DE, konum))
        for konum in ["İstanbul", "Paris, France", "Remote", "", "Berlin, İstanbul"]:
            with self.subTest(konum=konum):
                self.assertFalse(scraper.konum_eslesiyor(DE, konum))

    def test_yapisal_ulke_kaniti(self):
        self.assertTrue(scraper.konum_eslesiyor(DE, "PUMA Way PEG", "Germany"))
        self.assertTrue(scraper.konum_eslesiyor(DE, "Kusterdingen", "de"))
        # Yapısal ülke metinle çelişirse alınmıyor.
        self.assertFalse(scraper.konum_eslesiyor(DE, "Berlin", "fr"))
        self.assertFalse(scraper.konum_eslesiyor(DE, "", "Türkiye"))

    def test_fransa_ve_capraz_red(self):
        self.assertTrue(scraper.konum_eslesiyor(FR, "Paris"))
        self.assertTrue(scraper.konum_eslesiyor(FR, "Lyon, France"))
        self.assertFalse(scraper.konum_eslesiyor(FR, "Berlin"))
        self.assertFalse(scraper.konum_eslesiyor(DE, "Lyon"))


# --------------------------------------------------------- erken kariyer
class ErkenKariyer(unittest.TestCase):
    def test_almanca_terimler_yalniz_almanya_profilinde(self):
        self.assertTrue(scraper.erken_kariyer_mi(DE, "Praktikum Medienproduktion (w/m/d)", ""))
        self.assertTrue(scraper.erken_kariyer_mi(DE, "Praktikant*in Marketing & Campaign Management", ""))
        self.assertFalse(scraper.erken_kariyer_mi(DE, "Werkstudent Marketing", ""))
        self.assertFalse(scraper.erken_kariyer_mi(DE, "Senior Brand Manager", ""))
        # Türkiye profili değişmedi.
        self.assertFalse(scraper.erken_kariyer_mi(TR, "Praktikum Medienproduktion", ""))

    def test_fransizca_terim_yalniz_baslikta(self):
        self.assertTrue(scraper.erken_kariyer_mi(FR, "Stagiaire Marketing", ""))
        # "early stage" açıklamada geçiyor diye ilan staj sayılmıyor.
        self.assertFalse(scraper.erken_kariyer_mi(FR, "Product Manager", "Join an early stage startup"))

    def test_ingilizce_terimler_her_profilde(self):
        for profil in (TR, DE, FR):
            self.assertTrue(scraper.erken_kariyer_mi(profil, "Marketing Internship", ""))


# ------------------------------------------------------------- adaptörler
class Adaptorler(unittest.TestCase):
    @patch("scraper.requests.get")
    def test_greenhouse_almanya(self, get):
        get.return_value = yanit({"jobs": [
            {"title": "Marketing Internship", "content": "", "location": {"name": "Berlin"}, "absolute_url": "https://job-boards.greenhouse.io/x/jobs/1"},
            {"title": "Marketing Intern", "content": "", "location": {"name": "Istanbul"}, "absolute_url": "https://job-boards.greenhouse.io/x/jobs/2"},
        ]})
        isler = list(scraper.greenhouse({**DE, "board_token": "x"}))
        self.assertEqual([j.source_url for j in isler], ["https://job-boards.greenhouse.io/x/jobs/1"])
        self.assertEqual(isler[0].country_code, "DE")

    @patch("scraper.requests.get")
    def test_ashby_yapisal_adres(self, get):
        get.return_value = yanit({"jobs": [
            {"id": "a", "title": "Social Media Intern", "location": "Berlin", "jobUrl": "https://jobs.ashbyhq.com/x/a",
             "address": {"postalAddress": {"addressCountry": "Germany", "addressLocality": "Berlin"}}},
            {"id": "b", "title": "Social Media Intern", "location": "Berlin",  # metin DE ama yapısal TR: çelişki
             "jobUrl": "https://jobs.ashbyhq.com/x/b", "address": {"postalAddress": {"addressCountry": "Turkey"}}},
        ]})
        isler = list(scraper.ashby({**DE, "job_board": "x"}))
        self.assertEqual([j.source_url for j in isler], ["https://jobs.ashbyhq.com/x/a"])
        self.assertEqual(isler[0].country_code, "DE")

    @patch("scraper.requests.get")
    def test_personio_almanya(self, get):
        xml = ("<workzag-jobs><position><id>7</id><name>Praktikum (m/w/d) HR &amp; Recruiting</name>"
               "<office>Berlin</office><seniority>student</seniority></position></workzag-jobs>")
        get.return_value = yanit(text=xml)
        isler = list(scraper.personio({**DE, "tenant": "careloop", "domain": "com"}))
        self.assertEqual(len(isler), 1)
        self.assertEqual(isler[0].source_url, "https://careloop.jobs.personio.com/job/7")
        self.assertEqual(isler[0].country_code, "DE")

    @patch("scraper.requests.get")
    @patch("scraper.requests.post")
    def test_workday_konumsuz_ilanda_detaydan_ulke(self, post, get):
        """PUMA'nın konum metni yalnız "PUMA Way PEG"; ülke yalnız ilan
        detayında ("Germany"). Detay yalnız erken-kariyer başlıklarında ve
        sınırlı sayıda soruluyor."""
        post.return_value = yanit({"jobPostings": [
            {"title": "Internship Planning E-Commerce Europe", "locationsText": "PUMA Way PEG",
             "externalPath": "/job/PUMA-Way-PEG/Internship-Planning--E-Commerce-Europe_R42934"},
            {"title": "Intern Paris Office", "locationsText": "Somewhere",
             "externalPath": "/job/X/Intern_R1"},
        ]})
        get.side_effect = lambda url, **kw: yanit({"jobPostingInfo": {"country": {"descriptor": "Germany" if "R42934" in url else "France"}}})
        isler = list(scraper.workday({**DE, "host": "puma.wd502.myworkdayjobs.com", "tenant": "puma", "site": "Jobs_at_Puma"}))
        self.assertEqual([j.source_url for j in isler],
                         ["https://puma.wd502.myworkdayjobs.com/Jobs_at_Puma/job/PUMA-Way-PEG/Internship-Planning--E-Commerce-Europe_R42934"])
        self.assertEqual(isler[0].country_code, "DE")

    @patch("scraper.requests.get")
    @patch("scraper.requests.post")
    def test_workday_turkiye_detay_sormuyor(self, post, get):
        post.return_value = yanit({"jobPostings": [
            {"title": "Intern, Quality Engrg", "locationsText": "MERKEZ", "externalPath": "/job/MERKEZ/Intern_1"}]})
        self.assertEqual(list(scraper.workday({**TR, "host": "h", "tenant": "t", "site": "s"})), [])
        get.assert_not_called()

    @patch("scraper.requests.get")
    def test_smartrecruiters_ulke_kucuk_harf_ve_herkese_acik_adres(self, get):
        """`country=TR` API'de 0 döndürüyordu; `country=tr` 6 (ölçüldü).
        Liste öğesinin `ref` alanı API adresi — başvuru adresi olamaz."""
        get.return_value = yanit({"content": [
            {"id": "744000149294710", "name": "Software Engineering Intern",
             "ref": "https://api.smartrecruiters.com/v1/companies/deliveryhero/postings/744000149294710",
             "location": {"city": "İzmir", "country": "tr"}}]})
        isler = list(scraper.smartrecruiters({**TR, "company_identifier": "deliveryhero"}))
        self.assertIn("country=tr", get.call_args[0][0])
        self.assertEqual(isler[0].source_url, "https://jobs.smartrecruiters.com/deliveryhero/744000149294710")
        self.assertNotIn("api.smartrecruiters.com", isler[0].source_url)

    @patch("scraper.requests.get")
    def test_smartrecruiters_dogrulanmis_ilan_kimlikle_cekiliyor(self, get):
        """Bertelsmann'ın Almanya'da 471 ilanı var; doğrulanmış
        744000144324449 ilk 100'de değildi. Doğrulanmış kipte liste
        taranmıyor, ilan kimliğiyle çekiliyor."""
        detaylar = {
            "1": yanit({"id": "1", "name": "Praktikum Produktion", "active": True,
                        "postingUrl": "https://jobs.smartrecruiters.com/B/1-praktikum",
                        "location": {"city": "Köln", "country": "de"}}),
            "2": yanit(status=404),
            "3": yanit({"id": "3", "name": "Praktikum Alt", "active": False, "location": {"city": "Köln", "country": "de"}}),
            "4": yanit({"id": "4", "name": "Praktikum Istanbul", "active": True, "location": {"city": "İstanbul", "country": "tr"}}),
        }
        get.side_effect = lambda url, **kw: detaylar[url.rsplit("/", 1)[1]]
        isler = list(scraper.smartrecruiters({**DE, "company_identifier": "B", "dogrulanmis_ilanlar": ["1", "2", "3", "4"]}))
        self.assertEqual([j.source_url for j in isler], ["https://jobs.smartrecruiters.com/B/1-praktikum"])
        self.assertEqual(isler[0].country_code, "DE")
        self.assertTrue(all("/postings/" in c[0][0] and "country=" not in c[0][0] for c in get.call_args_list))

    @patch("scraper.requests.get")
    def test_official_jsonld_uzaktan_basvuru_ulkesi(self, get):
        """JOIN'in uzaktan ilanları konum değil `applicantLocationRequirements`
        taşıyor (schema.org). Konumsuz diye elenmesinler, ama ülke kanıtı
        yalnız bu alan."""
        uzaktan = {"@type": "JobPosting", "title": "Praktikant Marketing", "jobLocationType": "TELECOMMUTE",
                   "applicantLocationRequirements": {"@type": "Country", "name": "Deutschland"},
                   "hiringOrganization": {"name": "Wegain GmbH"}, "url": "https://join.com/companies/wegain/1"}
        yerinde = {"@type": "JobPosting", "title": "Intern - Marketing",
                   "jobLocation": {"address": {"addressLocality": "Berlin", "addressCountry": "Deutschland"}},
                   "hiringOrganization": {"name": "Atrya"}, "url": "https://join.com/companies/atryaio/2"}
        turkiye = {"@type": "JobPosting", "title": "Marketing Intern",
                   "jobLocation": {"address": {"addressLocality": "Istanbul", "addressCountry": "Turkey"}},
                   "url": "https://example.com/3"}
        sayfalar = {u["url"]: u for u in (uzaktan, yerinde, turkiye)}
        get.side_effect = lambda url, **kw: yanit(text=f'<script type="application/ld+json">{json.dumps(sayfalar[url])}</script>')
        isler = list(scraper.official_jsonld({**DE, "urls": list(sayfalar)}))
        self.assertEqual([j.source_url for j in isler], ["https://join.com/companies/wegain/1", "https://join.com/companies/atryaio/2"])
        self.assertEqual(isler[0].work_mode, "remote")
        self.assertTrue(all(j.country_code == "DE" for j in isler))


# ------------------------------------------------------ doğrulanmış kip
class DogrulanmisKip(unittest.TestCase):
    def test_izin_listesi(self):
        isler = [scraper.Job("S", "https://x/jobs/111", "Intern"), scraper.Job("S", "https://x/jobs/222", "Intern")]
        self.assertEqual(len(scraper.dogrulanmis_ilanlarla_sinirla({}, isler)), 2)
        self.assertEqual([j.source_url for j in scraper.dogrulanmis_ilanlarla_sinirla({"dogrulanmis_ilanlar": ["222"]}, isler)],
                         ["https://x/jobs/222"])
        # Boş liste fail-closed: hiçbir ilan.
        self.assertEqual(scraper.dogrulanmis_ilanlarla_sinirla({"dogrulanmis_ilanlar": []}, isler), [])

    def test_kosucu_sinirlamayi_uyguluyor(self):
        kod = (KOK / "automation" / "discover.py").read_text(encoding="utf-8")
        self.assertIn("scraper.dogrulanmis_ilanlarla_sinirla(config, adapter(config))", kod)


# --------------------------------------------------- ülke kaydı ve güven
class UlkeKaydi(unittest.TestCase):
    def test_yeni_sehirler_tek_listede(self):
        for konum, beklenen in [("Hamburg", "DE"), ("München", "DE"), ("Köln", "DE"), ("Düsseldorf", "DE"),
                                ("Böblingen", "DE"), ("Tübingen", "DE"), ("Lyon", "FR")]:
            with self.subTest(konum=konum):
                self.assertEqual(country_normalization.infer_country_code(location=konum), beklenen)

    def test_yapisal_ulke_kodu(self):
        for deger, beklenen in [("de", "DE"), ("Germany", "DE"), ("Deutschland", "DE"), ("Türkiye", "TR"), ("fr", "FR"), ("", None), (None, None)]:
            with self.subTest(deger=deger):
                self.assertEqual(country_normalization.structured_country_code(deger), beklenen)

    def test_ham_kayit_almanya(self):
        job = scraper.Job("S", "https://x/1", "Praktikum", city="Hamburg, de", country_code="DE")
        satir = repository.raw_listing_payload(job, "kaynak", "https://x/1", "2026-09-15T00:00:00Z")
        self.assertEqual(satir["raw"]["country_code"], "DE")

    def test_personio_resmi_akis(self):
        """Personio XML akışı herkese açık, belgelenmiş besleme. Resmî
        sayılmadığında kaynak `discovery_signal` oluyor ve promote ilanı
        hiçbir zaman yayına almıyordu."""
        self.assertIn("personio", repository.OFFICIAL_ADAPTERS)


# ------------------------------------------------------ kaynak kaydı kuralı
class KaynakKaydi(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.kaynaklar = json.loads((KOK / "automation" / "sources.json").read_text(encoding="utf-8"))["sources"]
        cls.akis = (KOK / ".github" / "workflows" / "stajimvar-automation.yml").read_text(encoding="utf-8")

    def test_ulkeler_desteklenen_profillerde(self):
        for k in self.kaynaklar:
            with self.subTest(kaynak=k["id"]):
                self.assertIn(k.get("country", "TR"), {"TR", "DE", "FR"})

    def test_turkiye_disi_kaynaklar_yalniz_dogrulanmis_ilanlarla(self):
        """İlk kapsam kuralı: TR dışı kaynak şirketin bütün panosunu değil,
        yalnız resmî kaynaktan açık olduğu doğrulanmış ilanları alır."""
        for k in self.kaynaklar:
            if k.get("country", "TR") == "TR":
                continue
            with self.subTest(kaynak=k["id"]):
                self.assertTrue(k.get("dogrulanmis_ilanlar") or k.get("urls"), "doğrulanmış ilan listesi ya da urls şart")

    def test_almanya_ilk_kapsami_34_ilan(self):
        de = [k for k in self.kaynaklar if k.get("country") == "DE"]
        adet = sum(len(k.get("dogrulanmis_ilanlar") or k.get("urls") or []) for k in de)
        self.assertEqual(adet, 34)

    def test_kanitsiz_ya_da_ulkesi_belirsiz_kaynak_yok(self):
        metin = json.dumps(self.kaynaklar).lower()
        for yasak in ["traderepublic", "loreal", "bmwgroup", "porsche", "amazon.jobs", "festool", "barilla",
                      "stiebel", "umantis", "jobs.ubs.com", "careers.audi.com", "jobs.ef.com", "interny",
                      "notion.site", "docs.google.com", "ausbildung-autohaus", "successfactors.eu", "sapsf.eu",
                      "lufthansa", "fcbayern", "ai-academy", "louisvuitton"]:
            with self.subTest(yasak=yasak):
                self.assertNotIn(yasak, metin)

    def test_yeni_ulkeler_pasiflestirme_izin_listesinde_degil(self):
        """İzin listesine giriş 14 günlük ölçülmüş tur geçmişine bağlı (iş
        akışında yazılı ölçüt). Yeni kaynak ölçülmeden kapatma yetkisi almaz;
        o sürede kapanış günlük bağlantı kontrolüyle yakalanıyor."""
        satir = next(s for s in self.akis.splitlines() if "DEACTIVATION_ENABLED_SOURCES:" in s)
        izinli = set(satir.split(":", 1)[1].strip().strip('"').split(","))
        for k in self.kaynaklar:
            if k.get("country", "TR") != "TR":
                with self.subTest(kaynak=k["id"]):
                    self.assertNotIn(k["id"], izinli)


if __name__ == "__main__":
    unittest.main()
