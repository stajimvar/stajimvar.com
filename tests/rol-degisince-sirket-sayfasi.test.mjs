import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
  ŞİRKET SAYFASI BAĞI (9 Kasım 2026): Modmere'de "Şirket sayfan henüz
  açılmamış" — onay işlevleri önce üyeliği, sonra rolü yazıyordu; üyelik
  tetikleyicisi hesabı öğrenci görüp sayfayı şirkete bağlamıyordu.
*/
const KOK = path.resolve(import.meta.dirname, '..');
const GOC = readFileSync(path.join(KOK, 'supabase/migrations/20270102010000_rol_degisince_sirket_sayfasi.sql'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

test('rol şirkete dönünce sayfa açma yeniden deneniyor; hata rol değişikliğini durdurmuyor', () => {
  assert.match(GOC, /after update of role on public\.profiles/);
  assert.match(GOC, /when \(new\.role = 'company' and old\.role is distinct from new\.role\)/);
  assert.match(GOC, /perform sosyal_gizli\.sosyal_profil_ac\(new\.id\);\s*exception\s*when others then/);
});

test('geriye dönük yalnız bağlanmamış şirket sahipleri', () => {
  assert.match(GOC, /where cm\.is_owner\s*and p\.role = 'company'\s*and not exists \(\s*select 1 from public\.social_profiles sp\s*where sp\.profile_id = cm\.user_id and sp\.sirket_id is not null\)/);
});
