import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parents[1]))

from event_import.http import OfficialHttpClient, USER_AGENT


class FakeResponse:
    status_code = 200
    text = "User-agent: *\nDisallow:\n"

    def raise_for_status(self):
        return None


class FakeSession:
    def __init__(self):
        self.calls = []
        self.headers = {}

    def get(self, url, timeout):
        self.calls.append((url, timeout))
        return FakeResponse()


def test_robots_check_uses_configured_http_session_and_timeout():
    client = OfficialHttpClient(timeout=7)
    client.session = FakeSession()

    assert client.allowed("https://official.example/etkinlik") is True
    assert client.session.calls == [("https://official.example/robots.txt", 7)]
    assert USER_AGENT.startswith("StajimVarEventBot/")


def test_missing_robots_file_means_no_published_restrictions():
    class MissingResponse(FakeResponse):
        status_code = 404

        def raise_for_status(self):
            raise AssertionError("404 robots yanıtı hata olarak yükseltilmemeli")

    client = OfficialHttpClient()
    session = FakeSession()
    session.get = lambda url, timeout: MissingResponse()
    client.session = session

    assert client.allowed("https://official.example/etkinlik") is True
