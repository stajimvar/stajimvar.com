import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const privateHost = /^(localhost|.+\.localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.|\[::1\]|\[(fc|fd|fe80))/i;
const safe = (value: string) => { const url = new URL(value); if (url.protocol !== 'https:' || url.username || url.password || privateHost.test(url.hostname)) throw new Error('Güvenli HTTPS adresi gerekli.'); return url; };

Deno.serve(async (request) => {
  try {
    const token = request.headers.get('Authorization') || '';
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: token } } });
    const { data: { user } } = await client.auth.getUser();
    const { data: admin } = await client.rpc('is_admin');
    if (!user || !admin) return Response.json({ error: 'Yetkisiz.' }, { status: 403 });
    let url = safe((await request.json()).url);
    for (let redirects = 0; redirects <= 3; redirects++) {
      const response = await fetch(url, { redirect: 'manual', credentials: 'omit', headers: { Accept: 'text/html', 'User-Agent': 'StajimVar-source-check/1.0' }, signal: AbortSignal.timeout(7000) });
      const next = response.headers.get('location');
      if (response.status >= 300 && response.status < 400 && next) { url = safe(new URL(next, url).href); continue; }
      return Response.json({ ok: response.ok, status: response.status, finalUrl: url.href });
    }
    return Response.json({ error: 'Çok fazla yönlendirme.' }, { status: 422 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Kaynak kontrolü başarısız.' }, { status: 422 }); }
});
