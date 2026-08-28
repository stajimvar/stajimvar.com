import pathlib
import sys
import pytest

sys.path.insert(0, str(pathlib.Path(__file__).parents[1]))

from event_import.adapters import (
    fetch_source,
    parse_bursa_event,
    parse_eskisehir_news,
    parse_izmir_sessions,
    parse_json_ld,
    parse_wp_event_manager,
)


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


def test_source_scan_fails_closed_when_a_discovered_detail_cannot_be_parsed():
    class FakeClient:
        def get_text(self, url):
            return "<html><body>şema değişti</body></html>"

        def get_json(self, url):
            return [{"link": "https://official.example/etkinlik/bozuk/"}]

    with pytest.raises(ValueError, match="ayrıştırılamadı"):
        fetch_source(
            {
                "listing_url": "https://official.example/etkinlikler/",
                "api_url": "https://official.example/wp-json/wp/v2/event_listing",
                "adapter": "wp_event_manager",
                "default_category": "festival",
                "cities": ["Bursa"],
            },
            FakeClient(),
        )


def test_izmir_official_api_groups_sessions_without_inventing_fields():
    payload = {
        "data": [
            {
                "entityStatus": 0,
                "eventDate": "2026-09-04T21:00:00",
                "eventEndDate": "2026-09-04T22:30:00",
                "eventImageUrl": "https://kultursanatapi.izmir.bel.tr/uploads/event/concert.jpg",
                "shortDescription": "Öğrencilere açık konser.",
                "event": {"id": "event-1", "name": "Zeytin Altında Konserleri"},
                "venue": {"name": "AASSM Dış Mekan"},
                "company": {"name": "AASSM Şube Müdürlüğü"},
                "categories": [{"name": "Konser"}],
                "id": "session-1",
            },
            {
                "entityStatus": 0,
                "eventDate": "2026-09-05T21:00:00",
                "eventEndDate": "2026-09-05T22:30:00",
                "eventImageUrl": "https://kultursanatapi.izmir.bel.tr/uploads/event/concert.jpg",
                "event": {"id": "event-1", "name": "Zeytin Altında Konserleri"},
                "venue": {"name": "AASSM Dış Mekan"},
                "company": {"name": "AASSM Şube Müdürlüğü"},
                "categories": [{"name": "Konser"}],
                "id": "session-2",
            },
        ]
    }
    [event] = parse_izmir_sessions(payload)
    assert event.source_event_id == "event-1"
    assert event.source_url == "https://kultursanat.izmir.bel.tr/event/etkinlik/event-1"
    assert event.category == "concert"
    assert event.city == "İzmir"
    assert event.venue_name == "AASSM Dış Mekan"
    assert event.image_url.endswith("concert.jpg")
    assert event.is_free is False
    assert len(event.occurrences) == 2
    assert event.occurrences[0].starts_at.endswith("+03:00")


def test_eskisehir_official_news_extracts_verified_festival_range_and_cover():
    html = """
      <div class="post-item-description">
        <span class="post-meta-date">18.08.2026</span>
        <h1>ESKİŞEHİR'İN BİRLEŞTİRİCİ GÜCÜ PORSUK NEHRİ</h1>
        <p><strong>Eskişehir Büyükşehir Belediyesi tarafından 2026 Eskişehir Yılı kapsamında
        Uluslararası Eskişehir Porsuk Festivali düzenlenecek.</strong></p>
        <p>Festival, 2-6 Eylül tarihleri arasında kentin farklı noktalarında buluşacak.
        Festival kapsamında Porsuk Bulvarı Adalar mevki, Kentpark, Sümerpark ve İskele26
        çeşitli programlara ev sahipliği yapacak.</p>
      </div>
      <div class="portfolio-item"><img src="/img_icerik/2026/small-13165-cover.jpeg"></div>
    """

    event = parse_eskisehir_news(
        html,
        "https://www.eskisehir.bel.tr/icerik-detay.php?icerik_id=13165",
    )

    assert event.source_event_id == "13165"
    assert event.title == "Uluslararası Eskişehir Porsuk Festivali"
    assert event.starts_at == "2026-09-02T00:00:00+03:00"
    assert event.ends_at == "2026-09-06T23:59:59+03:00"
    assert event.city == "Eskişehir"
    assert event.venue_name == "Porsuk Bulvarı Adalar mevki, Kentpark, Sümerpark ve İskele26"
    assert event.organizer == "Eskişehir Büyükşehir Belediyesi"
    assert event.image_url == "https://www.eskisehir.bel.tr/img_icerik/2026/small-13165-cover.jpeg"


def test_bursa_official_event_extracts_single_day_schedule_and_cover():
    html = """
      <div class="container card"><div class="row"><div class="col-md-6">
        <h3>30 Ağustos Zafer Bayramı - Yürüyüş & Konser</h3>
        <ul class="list list-legend"><li>Konser</li><li>30.08.2026 19:30</li>
        <li>Bursa Millet Bahçesi</li></ul>
        <div class="icerik"><p>Resmî etkinlik açıklaması.</p></div></div>
        <div class="col-md-6"><img src="/dosyalar/resimler/etkinlik/cover.jpg"></div>
      </div></div>
    """
    event = parse_bursa_event(html, "https://www.bursa.bel.tr/etkinlik/zafer-bayrami-1542")
    assert event.source_event_id == "1542"
    assert event.category == "concert"
    assert event.starts_at == "2026-08-30T19:30:00+03:00"
    assert event.ends_at == "2026-08-30T23:59:59+03:00"
    assert event.city == "Bursa"
    assert event.venue_name == "Bursa Millet Bahçesi"
    assert event.image_url == "https://www.bursa.bel.tr/dosyalar/resimler/etkinlik/cover.jpg"


def test_bursa_official_event_extracts_date_range_without_inventing_time():
    html = """
      <div class="card"><h3>30 Ağustos Zafer Haftası</h3>
      <ul class="list-legend"><li>Etkinlik</li><li>25.08.2026 - 30.08.2026</li><li>Bursa</li></ul>
      <div class="icerik">Resmî program.</div>
      <img src="/dosyalar/resimler/etkinlik/week.jpg"></div>
    """
    event = parse_bursa_event(html, "https://www.bursa.bel.tr/etkinlik/zafer-haftasi-1540")
    assert event.starts_at == "2026-08-25T00:00:00+03:00"
    assert event.ends_at == "2026-08-30T23:59:59+03:00"
