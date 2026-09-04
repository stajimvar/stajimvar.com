import unittest
from types import SimpleNamespace

from automation.repository import raw_listing_payload


class GlobalImportCountryTests(unittest.TestCase):
    def test_raw_payload_carries_conservative_country_evidence(self):
        job = SimpleNamespace(title='Intern', description='', source_url='https://example.com/job', source_name='Example', organization_name='Example', city='Berlin', work_mode='onsite', country_code=None, original_language=None)
        row = raw_listing_payload(job, 'source-id', 'https://example.com/job', '2026-09-05T00:00:00Z')
        self.assertEqual(row['raw']['country_code'], 'DE')
        self.assertIsNone(row['raw']['original_language'])

    def test_remote_location_stays_unknown(self):
        job = SimpleNamespace(title='Global Internship', description='', source_url='https://example.com/job', source_name='Example', organization_name='Example', city='Remote', work_mode='remote', country_code=None, original_language=None)
        row = raw_listing_payload(job, 'source-id', 'https://example.com/job', '2026-09-05T00:00:00Z')
        self.assertIsNone(row['raw']['country_code'])


if __name__ == '__main__':
    unittest.main()
