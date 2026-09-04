import unittest

from automation.country_normalization import infer_country_code


class CountryNormalizationTests(unittest.TestCase):
    def test_structured_iso_wins_when_location_agrees(self):
        self.assertEqual(infer_country_code(structured_country='fr', location='Paris, France'), 'FR')

    def test_reliable_city_location_maps_to_country(self):
        cases = [('İstanbul', 'TR'), ('Ankara, Türkiye', 'TR'), ('Berlin', 'DE'), ('Paris, France', 'FR')]
        for location, expected in cases:
            with self.subTest(location=location):
                self.assertEqual(infer_country_code(location=location), expected)

    def test_remote_global_and_blank_remain_unknown(self):
        for location in ('Remote', 'Global', 'Worldwide', '', None):
            with self.subTest(location=location):
                self.assertIsNone(infer_country_code(location=location))

    def test_title_alone_is_never_country_evidence(self):
        self.assertIsNone(infer_country_code(title='Berlin Global Internship'))

    def test_conflicting_strong_signals_remain_unknown(self):
        self.assertIsNone(infer_country_code(structured_country='FR', location='Berlin'))


if __name__ == '__main__':
    unittest.main()
