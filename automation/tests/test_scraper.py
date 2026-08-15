import pathlib, sys, unittest
from datetime import UTC, datetime, timedelta
from unittest.mock import Mock, patch
sys.path.insert(0, str(pathlib.Path(__file__).parents[1]))
import repository
import scraper
import stale_safety

class ScraperFixtureTests(unittest.TestCase):
    def test_internship_and_rejection(self):
        self.assertTrue(scraper.is_early_career("Software Intern", "Summer internship"))
        self.assertFalse(scraper.is_early_career("Senior Engineer", "Full-time role"))
    def test_turkey_and_url_safety(self):
        self.assertTrue(scraper.is_turkey_location("İstanbul, Türkiye"))
        self.assertFalse(scraper.is_turkey_location("Berlin, Germany"))
        self.assertEqual(scraper.canonical("https://Example.com/jobs/?utm=x"), "https://example.com/jobs")
        with self.assertRaises(ValueError): scraper.canonical("javascript:alert(1)")
    def test_stable_key(self):
        job=scraper.Job("S","https://example.com/a?x=1","Intern")
        self.assertEqual(scraper.key(job), scraper.key(job))

    def test_workable_location_dicts_yield_plain_city(self):
        """Workable `locations` sözlük döndürür; şehir alanına sözlük yazılmamalı."""
        locations = [{"country": "Turkey", "countryCode": "TR", "city": "İzmir",
                      "region": "İzmir", "hidden": False}]
        self.assertEqual(scraper.city_of(locations), "İzmir")
        # Arama metni ülke adını da içermeli ki Türkiye filtresi çalışsın.
        self.assertTrue(scraper.is_turkey_location(scraper.location_text(locations)))

    def test_location_helpers_accept_plain_strings(self):
        self.assertEqual(scraper.city_of(["Istanbul"]), "Istanbul")
        self.assertEqual(scraper.city_of([]), None)
        self.assertEqual(scraper.location_text(["Istanbul", "Ankara"]), "Istanbul Ankara")

    def test_raw_listing_payload_has_reconciliation_state(self):
        job = scraper.Job("Source", "https://example.com/jobs/1?utm=x", "Intern")
        row = repository.raw_listing_payload(
            job, "src-1", scraper.canonical(job.source_url), "2026-08-11T00:00:00+00:00"
        )
        self.assertEqual(row["source_id"], "src-1")
        self.assertEqual(row["canonical_url"], "https://example.com/jobs/1")
        self.assertEqual(row["source_last_checked_at"], row["last_seen_at"])
        self.assertEqual(row["consecutive_missing_runs"], 0)
        self.assertIsNone(row["stale_eligible_at"])
        self.assertEqual(len(row["content_hash"]), 64)

    def test_raw_listing_payload_never_carries_hr_email(self):
        """İK adresi ancak application_channels üzerinden, kanıtıyla kaydedilir.

        Adaptör açıklamadan bir e-posta yakalasa bile keşif kaydına yazılmamalı;
        yoksa doğrulanmamış bir adres sisteme sızmış olur.
        """
        job = scraper.Job(
            "Source", "https://example.com/jobs/2", "Intern",
            description="Başvuru: kariyer@ornek.com", hr_email="kariyer@ornek.com",
        )
        row = repository.raw_listing_payload(job, "src-1", "https://example.com/jobs/2", "2026-08-11T00:00:00+00:00")
        self.assertNotIn("hr_email", row)
        self.assertNotIn("hr_email", row["raw"])

    def test_company_slugs_fold_turkish_characters(self):
        self.assertEqual(repository.slugify("Vertigo Games"), "vertigo-games")
        self.assertEqual(repository.slugify("Şişecam Ürün A.Ş."), "sisecam-urun-a-s")

    @patch("scraper.requests.post")
    def test_workday_public_cxs_fixture(self, post):
        response = Mock()
        response.json.return_value = {"jobPostings": [{
            "title": "Software Engineering Intern",
            "locationsText": "Istanbul, Turkey",
            "externalPath": "/en-US/Careers/job/Istanbul/Intern_REQ-1",
            "timeType": "Full time",
        }]}
        post.return_value = response
        jobs = list(scraper.workday({
            "host": "example.wd3.myworkdayjobs.com", "tenant": "example", "site": "Careers",
            "name": "Example", "company_name": "Example",
        }))
        self.assertEqual(len(jobs), 1)
        self.assertEqual(jobs[0].source_url, "https://example.wd3.myworkdayjobs.com/en-US/Careers/job/Istanbul/Intern_REQ-1")
        self.assertEqual(jobs[0].city, "Istanbul, Turkey")
        self.assertEqual(post.call_count, 1)

    def source_run(self, **overrides):
        now = datetime.now(UTC)
        values = dict(source_id="fixture", started_at=now, finished_at=now + timedelta(seconds=1), http_status=200, fetch_success=True, parser_success=True, pagination_complete=True, previous_job_count=10, current_job_count=10)
        values.update(overrides)
        return stale_safety.SourceRun(**values)

    def state(self, **overrides):
        values = dict(type="external", importer_managed=True, company_id=None, author_id=None, application_method="external", consecutive_missing_runs=0, last_seen_at=datetime.now(UTC) - timedelta(hours=49))
        values.update(overrides)
        return stale_safety.ListingState(**values)

    def test_stale_health_failures_and_anomalies_do_not_deactivate(self):
        for run in (self.source_run(fetch_success=False), self.source_run(parser_success=False), self.source_run(http_status=429), self.source_run(http_status=500), self.source_run(pagination_complete=False), self.source_run(previous_job_count=10, current_job_count=0), self.source_run(previous_job_count=100, current_job_count=3)):
            self.assertNotEqual(stale_safety.health(run)[0], stale_safety.Health.HEALTHY)
            self.assertFalse(stale_safety.eligible_for_deactivation(run, self.state(consecutive_missing_runs=2), False, datetime.now(UTC)))

    def test_consecutive_miss_and_age_requirements(self):
        run = self.source_run()
        self.assertEqual(stale_safety.next_missing_runs(run, self.state(), False), 1)
        self.assertFalse(stale_safety.eligible_for_deactivation(run, self.state(consecutive_missing_runs=1), False, datetime.now(UTC)))
        self.assertFalse(stale_safety.eligible_for_deactivation(run, self.state(consecutive_missing_runs=2, last_seen_at=datetime.now(UTC) - timedelta(hours=1)), False, datetime.now(UTC)))
        self.assertTrue(stale_safety.eligible_for_deactivation(run, self.state(consecutive_missing_runs=2), False, datetime.now(UTC)))
        self.assertEqual(stale_safety.next_missing_runs(run, self.state(consecutive_missing_runs=2), True), 0)

    def test_protected_listings_never_change_stale_state(self):
        run = self.source_run()
        for state in (self.state(type="company_internship"), self.state(importer_managed=False), self.state(company_id="company"), self.state(author_id="author"), self.state(application_method="email_application"), self.state(application_method="manual_test")):
            self.assertTrue(stale_safety.protected(state))
            self.assertFalse(stale_safety.eligible_for_deactivation(run, state, False, datetime.now(UTC)))
            self.assertEqual(stale_safety.next_missing_runs(run, state, False), state.consecutive_missing_runs)

    def test_closed_signal_does_not_treat_transport_errors_as_closed(self):
        self.assertTrue(stale_safety.closed_signal(404))
        self.assertTrue(stale_safety.closed_signal(200, explicit_closed=True))
        self.assertFalse(stale_safety.closed_signal(429))
        self.assertFalse(stale_safety.closed_signal(503))
        self.assertFalse(stale_safety.closed_signal(None))

    def test_circuit_breaker_and_reactivation(self):
        self.assertTrue(stale_safety.mass_deactivation_blocked(3, 10))
        self.assertFalse(stale_safety.mass_deactivation_blocked(2, 10))
        self.assertTrue(stale_safety.may_reactivate(self.state(deactivation_reason="stale"), True))
        self.assertFalse(stale_safety.may_reactivate(self.state(company_id="company", deactivation_reason="stale"), True))

    def test_controlled_lifecycle_and_false_flag_are_write_free_decisions(self):
        now = datetime.now(UTC)
        run = self.source_run()
        state = self.state(last_seen_at=now - timedelta(hours=49))
        seen = stale_safety.reconcile(run, state, True, now, False)
        self.assertEqual(seen.consecutive_missing_runs, 0)
        self.assertFalse(seen.would_deactivate)
        miss1 = stale_safety.reconcile(run, state, False, now, False)
        miss2 = stale_safety.reconcile(run, self.state(consecutive_missing_runs=1, last_seen_at=now - timedelta(hours=49)), False, now, False)
        miss3 = stale_safety.reconcile(run, self.state(consecutive_missing_runs=2, last_seen_at=now - timedelta(hours=49)), False, now, False)
        self.assertEqual((miss1.consecutive_missing_runs, miss2.consecutive_missing_runs, miss3.consecutive_missing_runs), (1, 2, 3))
        self.assertTrue(miss3.stale_eligible)
        self.assertTrue(miss3.would_deactivate)
        self.assertNotIn("is_active", stale_safety.reconciliation_payload(miss3, False, now, False))
        controlled = stale_safety.reconciliation_payload(miss3, False, now, True)
        self.assertEqual((controlled["is_active"], controlled["deactivation_reason"]), (False, "stale"))
        self.assertFalse(stale_safety.reconcile(run, self.state(last_seen_at=now - timedelta(hours=1),), False, now, False).stale_eligible)

    def test_reactivation_only_for_importer_reasons(self):
        run = self.source_run(); now = datetime.now(UTC)
        self.assertTrue(stale_safety.reconcile(run, self.state(deactivation_reason="stale"), True, now, False).would_reactivate)
        self.assertFalse(stale_safety.reconcile(run, self.state(deactivation_reason="manual"), True, now, False).would_reactivate)
        self.assertFalse(stale_safety.reconcile(run, self.state(deactivation_reason="company"), True, now, False).would_reactivate)
        payload = stale_safety.reconciliation_payload(stale_safety.reconcile(run, self.state(deactivation_reason="stale"), True, now, False), True, now, False)
        self.assertEqual((payload["is_active"], payload["consecutive_missing_runs"], payload["stale_eligible_at"]), (True, 0, None))

    def test_source_allowlist_is_fail_closed(self):
        sources = {"ready-source"}
        self.assertFalse(stale_safety.source_deactivation_allowed("ready-source", False, sources))
        self.assertFalse(stale_safety.source_deactivation_allowed("unknown", True, sources))
        self.assertTrue(stale_safety.source_deactivation_allowed("ready-source", True, sources))
        failed = self.source_run(fetch_success=False)
        self.assertFalse(stale_safety.reconcile(failed, self.state(consecutive_missing_runs=2), False, datetime.now(UTC), True).would_deactivate)

if __name__ == "__main__": unittest.main()
