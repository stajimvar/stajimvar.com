from __future__ import annotations

from urllib.parse import urlsplit
from urllib.robotparser import RobotFileParser

import requests


USER_AGENT = "StajimVarEventBot/1.0 (+https://stajimvar.com/iletisim)"


class OfficialHttpClient:
    def __init__(self, timeout: float = 15.0) -> None:
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT, "Accept-Language": "tr-TR,tr;q=0.9"})

    def allowed(self, url: str) -> bool:
        parts = urlsplit(url)
        robots_url = f"{parts.scheme}://{parts.netloc}/robots.txt"
        robots = RobotFileParser(robots_url)
        try:
            response = self.session.get(robots_url, timeout=self.timeout)
            if response.status_code in {404, 410}:
                return True
            response.raise_for_status()
            robots.parse(response.text.splitlines())
        except requests.RequestException:
            return False
        return robots.can_fetch(USER_AGENT, url)

    def get_text(self, url: str) -> str:
        if not self.allowed(url):
            raise PermissionError(f"robots.txt bu adresi taramaya kapatıyor: {url}")
        response = self.session.get(url, timeout=self.timeout)
        response.raise_for_status()
        if "text/html" not in response.headers.get("content-type", ""):
            raise ValueError("beklenen HTML yanıtı alınamadı")
        return response.text

    def get_json(self, url: str):
        if not self.allowed(url):
            raise PermissionError(f"robots.txt bu adresi taramaya kapatıyor: {url}")
        response = self.session.get(url, timeout=self.timeout)
        response.raise_for_status()
        return response.json()
