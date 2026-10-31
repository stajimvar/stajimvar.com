"""Sağlıksız ama hata fırlatmayan kaynak taramayı düşürmüyor (31 Ekim 2026).

`deactivation_allowed` yalnız sağlıklı turda atanıyordu; tur özetindeki
uyarı onu her yazma turunda okuyordu. Önceki turda ilan veren kaynak bu
turda boş dönünce (sağlıksız, ama istisna yok) koşucu UnboundLocalError
ile çöküyor ve sıradaki kaynakların hiçbiri taranmıyordu.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import discover  # noqa: E402


class _Sorgu:
    def __init__(self, veri):
        self._veri = veri

    def __getattr__(self, _ad):
        return lambda *a, **k: self

    @property
    def not_(self):
        return self

    def execute(self):
        return type("Cevap", (), {"data": self._veri})()


class _Db:
    """Önceki tur 5 ilan bulmuş; yazma çağrıları yalnız kaydediliyor."""

    def table(self, ad):
        return _Sorgu([{"fetched_count": 5}] if ad == "import_runs" else [])


def test_bos_donen_kaynak_yazma_turunda_cokmuyor(monkeypatch):
    olaylar: list[dict] = []
    monkeypatch.setitem(discover.scraper.ADAPTERS, "_test_bos", lambda config: [])
    monkeypatch.setattr(discover.repository, "start_run", lambda db, source_id: "run-1")
    monkeypatch.setattr(discover.repository, "now_iso", lambda: "2026-10-31T00:00:00+00:00")
    monkeypatch.setattr(discover.repository, "log_event", lambda db, **k: olaylar.append(k))
    monkeypatch.setattr(discover.repository, "finish_run", lambda db, run_id, **k: olaylar.append({"finish": k}))

    sonuc = discover.process_source(
        _Db(), {"id": "test-kaynak", "name": "Test", "type": "_test_bos"}, "kaynak-1",
        write=True, allow_deactivation=True,
    )

    assert sonuc["fetched"] == 0
    assert sonuc["deactivated"] == 0
    # Tur kapatıldı ve özet yazıldı: koşucu sonraki kaynağa geçebilir.
    assert any("finish" in o for o in olaylar)
    assert any(o.get("event_type") == "run_summary" for o in olaylar)
