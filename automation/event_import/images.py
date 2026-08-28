from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from io import BytesIO
from pathlib import PurePosixPath
from urllib.parse import urlsplit

from PIL import Image, ImageOps, UnidentifiedImageError


@dataclass(frozen=True)
class ImageInfo:
    accepted: bool
    width: int = 0
    height: int = 0
    reason: str | None = None


@dataclass(frozen=True)
class CoverResult:
    card_url: str
    detail_url: str
    cover_kind: str = "official"


def validate_image(payload: bytes, content_type: str) -> ImageInfo:
    normalized_type = content_type.lower().split(";", 1)[0].strip()
    if not normalized_type.startswith("image/") and normalized_type != "application/octet-stream":
        return ImageInfo(False, reason="MIME türü görsel değil")
    try:
        with Image.open(BytesIO(payload)) as image:
            image.verify()
        with Image.open(BytesIO(payload)) as image:
            width, height = image.size
    except (UnidentifiedImageError, OSError, ValueError):
        return ImageInfo(False, reason="görsel çözülemedi")
    if width < 320 or height < 180:
        return ImageInfo(False, width, height, "görsel çok küçük")
    ratio = width / height
    if ratio < 0.6 or ratio > 3.0:
        return ImageInfo(False, width, height, "kapak oranı uygun değil")
    return ImageInfo(True, width, height)


def choose_candidate(urls: list[str]) -> str | None:
    blocked = ("logo", "favicon", "sprite", "pixel", "tracking", "avatar")
    for url in urls:
        path = PurePosixPath(urlsplit(url).path.lower())
        if not any(word in path.name for word in blocked):
            return url
    return None


def _variant(image: Image.Image, size: tuple[int, int]) -> bytes:
    fitted = ImageOps.fit(image.convert("RGB"), size, method=Image.Resampling.LANCZOS)
    output = BytesIO()
    fitted.save(output, "WEBP", quality=84, method=6)
    return output.getvalue()


def render_variants(payload: bytes) -> dict[str, bytes]:
    with Image.open(BytesIO(payload)) as image:
        return {
            "card.webp": _variant(image, (640, 360)),
            "detail.webp": _variant(image, (1280, 720)),
        }


def upload_variants(storage, fingerprint: str, variants: dict[str, bytes]) -> CoverResult:
    digest = sha256(b"".join(variants[key] for key in sorted(variants))).hexdigest()[:16]
    base = f"events/{fingerprint}/{digest}"
    bucket = storage.from_("event-covers")
    for filename, payload in variants.items():
        bucket.upload(
            f"{base}/{filename}",
            payload,
            {"content-type": "image/webp", "upsert": "true", "cache-control": "31536000"},
        )
    return CoverResult(
        bucket.get_public_url(f"{base}/card.webp"),
        bucket.get_public_url(f"{base}/detail.webp"),
    )
