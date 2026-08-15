"""Processes only verified email-application notifications from the Supabase outbox."""
from __future__ import annotations
import hashlib, html, os, secrets, requests
from datetime import UTC, datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client

def send(to: str, subject: str, body: str, notification_id: str) -> str:
    response = requests.post("https://api.resend.com/emails", headers={"Authorization": f"Bearer {os.environ['RESEND_API_KEY']}", "Idempotency-Key": f"stajimvar-{notification_id}"}, json={"from": os.environ["RESEND_FROM"], "to": [to], "subject": subject, "html": body}, timeout=20)
    response.raise_for_status(); return response.json()["id"]

def review_url(token: str) -> str:
    return f"{os.environ['APPLICATION_REVIEW_BASE_URL'].rstrip('/')}/basvuru-goruntule/{token}"

def email_body(name: str, listing: dict, url: str) -> str:
    esc = lambda value: html.escape(str(value or "Belirtilmedi"))
    return f'<div style="font-family:Arial,sans-serif;color:#0f172a"><h2>Yeni staj başvurusu — Stajım Var</h2><p><b>{esc(listing["organization_name"] or "Şirketiniz")}</b> için yeni aday başvurusu alındı.</p><p><b>Aday:</b> {esc(name)}</p><p><a href="{html.escape(url, quote=True)}">Başvuruyu Görüntüle</a></p><p style="color:#64748b">Bu bağlantı 7 gün geçerlidir.</p></div>'

def main() -> None:
    load_dotenv(); db = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    processed = sent = failed = 0
    for notification in db.rpc("claim_application_notifications", {"batch_size": 20}).execute().data or []:
        processed += 1
        try:
            app = db.table("applications").select("id,listing_id,applicant_id,share_contact_consent").eq("id", notification["application_id"]).single().execute().data
            listing = db.table("listings").select("id,title,organization_name,application_method").eq("id", app["listing_id"]).single().execute().data
            channel = db.table("listing_application_channels").select("application_email,application_email_verified_at").eq("listing_id", app["listing_id"]).single().execute().data
            if not app["share_contact_consent"] or listing["application_method"] != "email_application" or not channel.get("application_email_verified_at"): raise RuntimeError("Doğrulanmış e-posta kanalı veya aday onayı yok")
            token = secrets.token_urlsafe(32); token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest(); expiry = (datetime.now(UTC) + timedelta(days=7)).isoformat()
            db.table("applications").update({"application_view_token_hash": token_hash, "application_view_expires_at": expiry}).eq("id", app["id"]).execute()
            user = db.table("users").select("full_name").eq("id", app["applicant_id"]).single().execute().data
            message_id = send(channel["application_email"], "Yeni staj başvurusu — Stajım Var", email_body(user["full_name"], listing, review_url(token)), notification["id"])
            db.table("application_notifications").update({"status": "sent", "sent_at": datetime.now(UTC).isoformat(), "provider_message_id": message_id, "last_error": None}).eq("id", notification["id"]).execute()
            sent += 1
        except Exception:
            failed += 1
            # Provider exceptions can include recipient data; retain a stable, non-PII failure code instead.
            db.table("application_notifications").update({"status": "failed", "last_error": "provider_error"}).eq("id", notification["id"]).execute()
            print(f'{{"event":"application_notification","outcome":"failed","notification_id":"{notification["id"]}","category":"email"}}')
    print(f'{{"event":"application_notification_job","processed":{processed},"sent":{sent},"failed":{failed}}}')
    if failed:
        raise SystemExit(1)

if __name__ == "__main__": main()
