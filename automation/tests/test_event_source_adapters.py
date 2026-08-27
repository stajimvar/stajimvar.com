import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parents[1]))

from event_import.adapters import fetch_source, parse_json_ld, parse_wp_event_manager


FIXTURES = pathlib.Path(__file__).parent / "fixtures" / "events"


def test_json_ld_adapter_extracts_real_fields_without_guessing():
    html = (FIXTURES / "json-ld-event.html").read_text(encoding="utf-8")
    events = parse_json_ld(
        html,
        "https://kultur.example.gov.tr/etkinlik/kariyer-fuari",
        default_category="fair",
    )
    assert len(events) == 1
    assert events[0].title == "Kariyer Fuarı"
    assert events[0].image_url == "https://kultur.example.gov.tr/media/fuar.jpg"
    assert events[0].city == "İzmir"
    assert events[0].district == "Konak"
    assert events[0].student_price is None
    assert events[0].is_free is False


def test_json_ld_adapter_ignores_non_event_schema():
    html = '<script type="application/ld+json">{"@type":"Organization","name":"Kurum"}</script>'
    assert parse_json_ld(html, "https://example.gov.tr/page", "festival") == []


def test_json_ld_adapter_uses_og_image_only_when_event_has_no_image():
    html = """
      <meta property="og:image" content="/media/event.webp">
      <script type="application/ld+json">{
        "@type":"Event", "name":"Sergi", "startDate":"2026-09-01",
        "url":"https://example.gov.tr/sergi",
        "location":{"name":"Galeri","address":{"addressRegion":"Ankara"}}
      }</script>
    """
    [event] = parse_json_ld(html, "https://example.gov.tr/sergi", "exhibition")
    assert event.image_url == "https://example.gov.tr/media/event.webp"
    assert event.ends_at is None


def test_wp_event_manager_extracts_dates_location_free_and_twitter_cover():
    html = """
      <meta name="twitter:image" content="https://official.example/cover.webp">
      <h1>Hatıralar Bahçesinde Buluşma</h1>
      <div class="wpem-single-event-body-content"><p>Resmî sergi açıklaması.</p></div>
      <div class="wpem-single-event-sidebar-info">
        <h3>Tarih ve Zaman</h3><div class="wpem-event-date-time">
          <span>16-06-2026</span><span>30-08-2026</span><span> </span>
        </div>
        <h3>Etkinlik Türü</h3><div class="wpem-event-type">
          <span class="wpem-event-type-text">Sergi</span>
          <span class="wpem-event-type-text">Ücretsiz</span>
        </div>
        <h3>Etkinlik Konumu</h3><div>Müze Gazhane</div>
      </div>
    """
    event = parse_wp_event_manager(html, "https://official.example/etkinlik/sergi")
    assert event.title == "Hatıralar Bahçesinde Buluşma"
    assert event.starts_at == "2026-06-16T00:00:00+03:00"
    assert event.ends_at == "2026-08-30T23:59:59+03:00"
    assert event.venue_name == "Müze Gazhane"
    assert event.is_free is True
    assert event.image_url == "https://official.example/cover.webp"


def test_wp_event_manager_source_uses_rest_api_detail_links():
    detail = """
      <meta name="twitter:image" content="https://official.example/cover.webp">
      <h1>Festival</h1><div class="wpem-single-event-body-content">Açıklama</div>
      <div class="wpem-single-event-sidebar-info">
        <h3>Tarih ve Zaman</h3><div class="wpem-event-date-time"><span>05-09-2026</span><span>06-09-2026</span></div>
        <h3>Etkinlik Türü</h3><div class="wpem-event-type"><span class="wpem-event-type-text">Festival</span></div>
        <h3>Etkinlik Konumu</h3><div>Meydan</div>
      </div>
    """

    class FakeClient:
        def get_text(self, url):
            return "<html></html>" if url.endswith("/etkinlikler/") else detail

        def get_json(self, url):
            return [{"link": "https://official.example/etkinlik/festival/"}]

    events = fetch_source(
        {
            "listing_url": "https://official.example/etkinlikler/",
            "api_url": "https://official.example/wp-json/wp/v2/event_listing",
            "adapter": "wp_event_manager",
            "default_category": "festival",
            "cities": ["Bursa"],
        },
        FakeClient(),
    )
    assert len(events) == 1
    assert events[0].city == "Bursa"
