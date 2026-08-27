from io import BytesIO
import pathlib
import sys

from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).parents[1]))

from event_import.images import choose_candidate, render_variants, validate_image


def image_bytes(width=1200, height=675, fmt="JPEG"):
    output = BytesIO()
    Image.new("RGB", (width, height), (34, 104, 245)).save(output, format=fmt)
    return output.getvalue()


def test_rejects_tracking_pixel_and_tiny_image():
    assert validate_image(image_bytes(1, 1), "image/jpeg").accepted is False
    assert validate_image(image_bytes(200, 200), "image/jpeg").accepted is False


def test_rejects_corrupt_or_non_image_payload():
    assert validate_image(b"not an image", "image/jpeg").accepted is False
    assert validate_image(image_bytes(), "text/html").accepted is False


def test_prefers_event_image_over_site_logo():
    selected = choose_candidate(
        [
            "https://official.example/assets/logo.png",
            "https://official.example/events/kariyer-fuari.jpg",
        ]
    )
    assert selected.endswith("kariyer-fuari.jpg")


def test_outputs_bounded_webp_card_and_detail_variants():
    variants = render_variants(image_bytes())
    assert set(variants) == {"card.webp", "detail.webp"}
    card = Image.open(BytesIO(variants["card.webp"]))
    detail = Image.open(BytesIO(variants["detail.webp"]))
    assert card.format == "WEBP"
    assert card.size == (640, 360)
    assert detail.size == (1280, 720)
