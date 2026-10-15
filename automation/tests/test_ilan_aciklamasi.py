"""İLAN AÇIKLAMASI — YER TUTUCU YAZILMIYOR (15 Ekim 2026)

Toplama hattı kaynak açıklama vermediğinde "Bu ilanın ayrıntıları şirketin
kendi kariyer sayfasında. Başvurmak için ilana git." yazıyordu; cümle web
tarafında JobPosting'e iş tanımı gibi giriyordu. Artık açıklama yoksa alan
boş (None); kaynakta aynı yer tutucu gelirse o da boş sayılıyor. Uydurma
açıklama üretilmiyor.
"""
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).parents[1]))

import promote  # noqa: E402

KOK = pathlib.Path(__file__).parents[2]
YER_TUTUCU = "Bu ilanın ayrıntıları şirketin kendi kariyer sayfasında. Başvurmak için ilana git."


class IlanAciklamasi(unittest.TestCase):
    def test_bos_aciklama_none(self):
        for ham in (None, "", "   ", "\n\t"):
            with self.subTest(ham=ham):
                self.assertIsNone(promote.ilan_aciklamasi(ham))

    def test_yer_tutucu_ve_esdegerleri_none(self):
        for ham in (
            YER_TUTUCU,
            "BU İLANIN AYRINTILARI ŞİRKETİN KENDİ KARİYER SAYFASINDA.",
            "<p>Bu ilanın ayrıntıları şirketin kendi kariyer sayfasında.</p>  Başvurmak için ilana git",
            "Başvurmak için ilana git!",
        ):
            with self.subTest(ham=ham):
                self.assertIsNone(promote.ilan_aciklamasi(ham))

    def test_gercek_aciklama_aynen_kaliyor(self):
        for ham in (
            "Wir suchen eine/n Praktikant/in für unser Marketing-Team.",
            "Kalite ekibinde süreç iyileştirme çalışmalarına katılım.",
            f"Gerçek açıklama. {YER_TUTUCU}",
        ):
            with self.subTest(ham=ham):
                self.assertEqual(promote.ilan_aciklamasi(ham), ham.strip())

    def test_yayin_kaydi_yer_tutucu_yazmiyor(self):
        kod = (KOK / "automation" / "promote.py").read_text(encoding="utf-8")
        self.assertIn('"description": aciklama,', kod)
        self.assertIn('aciklama = ilan_aciklamasi(raw.get("description"))', kod)
        self.assertNotIn('description or "Bu ilanın', kod)


if __name__ == "__main__":
    unittest.main()
