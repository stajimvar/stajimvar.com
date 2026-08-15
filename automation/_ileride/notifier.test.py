from pathlib import Path

source = Path(__file__).with_name("notifier.py").read_text(encoding="utf-8")
assert '"last_error": "provider_error"' in source
assert 'raise SystemExit(1)' in source
assert 'application_notification_job' in source
assert 'str(exc)' not in source
print("notifier observability source tests: 4/4 passed")
