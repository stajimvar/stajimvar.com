# Stajım Var otomasyonları

`scraper.py` yalnızca API, RSS veya yazılı izinli iş ortağı kaynaklarından ilanları `listings` tablosuna aktarır. `notifier.py`, açık rıza verilmiş başvurular için e-posta kuyruğunu işler.

```powershell
cd automation
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python scraper.py
python notifier.py
```

`SUPABASE_SERVICE_ROLE_KEY` ve `RESEND_API_KEY` yalnızca cron sunucusunda ya da GitHub Actions Secrets'ta tutulur; Git'e ve tarayıcıdaki Next.js koduna konmaz.

Cloudflare Pages Python çalıştırmaz. `scraper.py` saatlik, `notifier.py` ise 5 dakikada bir GitHub Actions, Railway Cron veya benzeri güvenli bir Python zamanlayıcıda çalışmalıdır. Kaynak eklemek için `.env` içindeki `SOURCES_JSON` dizisine yalnızca izinli RSS/JSON uç noktası ekleyin.
