import test from 'node:test';
import assert from 'node:assert/strict';
import { basvuruYolu, basvuruSonucMesaji, EPOSTA_TESLIMI_CALISIYOR } from '../src/lib/basvuru-yolu.mjs';
import { guvenliDisAdres, yerelKonakMi } from '../src/lib/guvenli-url.mjs';

test('dış ilanda ana eylem resmî siteye gider ve teslim vaadi vermez', () => {
  const yol = basvuruYolu({ applicationMethod: 'external', applyUrl: 'https://ornek.com/staj' });
  assert.equal(yol.anaEylem, 'resmi-site');
  assert.equal(yol.anaEtiket, 'Resmî sitede başvur');
  assert.equal(yol.resmiAdres, 'https://ornek.com/staj');
  assert.equal(yol.teslimEdiliyor, false);
  assert.equal(yol.takipEtiketi, 'Başvurduğumu işaretle');
});

test('şemasız başvuru adresi mutlak HTTPS adrese çevrilir', () => {
  const yol = basvuruYolu({ applicationMethod: 'external', applyUrl: 'ornek.com/staj' });
  assert.equal(yol.resmiAdres, 'https://ornek.com/staj');
});

test('güvensiz başvuru adresi hiç bağlantıya dönüşmez', () => {
  for (const adres of ['javascript:alert(1)', 'http://ornek.com', 'https://127.0.0.1/staj', 'https://localhost/staj']) {
    const yol = basvuruYolu({ applicationMethod: 'external', applyUrl: adres });
    assert.equal(yol.resmiAdres, null, adres);
    assert.equal(yol.anaEylem, 'kayit', adres);
  }
});

test('platform içi ilan gerçekten teslim ediliyor sayılır', () => {
  const yol = basvuruYolu({ applicationMethod: 'internal' });
  assert.equal(yol.anaEylem, 'platform-ici');
  assert.equal(yol.teslimEdiliyor, true);
});

test('e-posta yolu, gönderici kapalıyken teslim vaadi vermez', () => {
  const yol = basvuruYolu({
    applicationMethod: 'email_application',
    applicationChannelId: 'kanal-1',
    applyUrl: 'https://ornek.com/staj',
  });
  if (EPOSTA_TESLIMI_CALISIYOR) {
    assert.equal(yol.teslimEdiliyor, true);
  } else {
    assert.equal(yol.teslimEdiliyor, false);
    assert.equal(yol.anaEtiket, 'Resmî sitede başvur');
  }
});

test('sonuç mesajı teslim edilmeyen başvuruda "iletildi" demiyor', () => {
  const mesaj = basvuruSonucMesaji({ applicationMethod: 'external', applyUrl: 'https://ornek.com' }, 'Örnek A.Ş.');
  assert.equal(/iletildi/.test(mesaj), false);
  assert.match(mesaj, /iletilmedi/);

  const icMesaj = basvuruSonucMesaji({ applicationMethod: 'internal' }, 'Örnek A.Ş.');
  assert.match(icMesaj, /iletildi/);
});

test('güvenli adres: şema tamamlama ve reddedilen durumlar', () => {
  assert.equal(guvenliDisAdres('alumil.com'), 'https://alumil.com/');
  assert.equal(guvenliDisAdres('  useinsider.com  '), 'https://useinsider.com/');
  assert.equal(guvenliDisAdres('https://ornek.com/yol?a=1'), 'https://ornek.com/yol?a=1');

  assert.equal(guvenliDisAdres(''), null);
  assert.equal(guvenliDisAdres(null), null);
  assert.equal(guvenliDisAdres('javascript:alert(1)'), null);
  assert.equal(guvenliDisAdres('data:text/html,<script>'), null);
  assert.equal(guvenliDisAdres('http://ornek.com'), null);
  assert.equal(guvenliDisAdres('https://kullanici:sifre@ornek.com'), null);
  assert.equal(guvenliDisAdres('https://10.0.0.5/ic'), null);
  assert.equal(guvenliDisAdres('https://169.254.169.254/latest/meta-data'), null);
  assert.equal(guvenliDisAdres('https://intranet'), null);
});

test('yerel konak listesi özel ağları kapsıyor', () => {
  for (const konak of ['localhost', 'app.local', '127.0.0.1', '10.1.2.3', '192.168.1.1', '172.20.0.1', '169.254.169.254', '::1']) {
    assert.equal(yerelKonakMi(konak), true, konak);
  }
  for (const konak of ['ornek.com', '8.8.8.8', 'alt.alan.ornek.com', '172.32.0.1']) {
    assert.equal(yerelKonakMi(konak), false, konak);
  }
});
