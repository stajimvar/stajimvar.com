import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
  İŞVEREN → ADAY MESAJLAŞMASI

  Aday listesindeki ve aday profilindeki tek iletişim yolu `mailto:` idi:
  işveren siteden çıkıyor, konuşma dışarıda sürüyor, aday kimin yazdığını
  yalnız e-posta başlığından anlıyor ve iki taraf da yazışmayı panelinde
  göremiyordu.

  Bu testler dört şeyi koruyor: İKİNCİ BİR MESAJ SİSTEMİ KURULMAMASI,
  yetkinin sunucuda kalması, adayın rızasının kapı olması ve var olan
  aday profili sözleşmesinin bozulmaması.
*/

const KOK = path.resolve(import.meta.dirname, '..');
const oku = (p) => fs.readFileSync(path.join(KOK, p), 'utf8').replace(/\r\n/g, '\n');

/* Yokluk iddiaları gerekçe yorumlarına takılmasın. */
const kodu = (metin) =>
  metin
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*(--|\/\/).*$/gm, ' ');

const GOC = oku('supabase/migrations/20261116010000_isveren_aday_mesajlasmasi.sql');
const GOC_KOD = kodu(GOC);
const LISTE = oku('src/sirket/SirketAdaylar.tsx');
const PROFIL = oku('src/sirket/SirketAdayProfili.tsx');

/* ------------------------------------------------------- arayüz */

test('iki ekranda da site DIŞINA çıkaran e-posta kalmadı', () => {
  for (const [ad, dosya] of [['liste', LISTE], ['profil', PROFIL]]) {
    assert.doesNotMatch(kodu(dosya), /mailto:/, `${ad}: mailto kalmamalı`);
    assert.doesNotMatch(kodu(dosya), /E-posta gönder/, `${ad}: eski etiket kalmamalı`);
    assert.match(dosya, /Mesaj gönder/, `${ad}: yeni etiket olmalı`);
  }
});

test('düğme site İÇİ konuşmayı açıyor', () => {
  /*
    `/mesajlar/<kullaniciadi>`: aynı adayla önceden sohbet varsa ekran
    onu açıyor, yoksa yenisini başlatıyor. "Aynı iki kişi tek sohbet"
    kuralı sunucuda (`sohbetler` çift tekil indeksi), istemcide değil.
  */
  assert.match(LISTE, /onNavigate\(`\/mesajlar\/\$\{encodeURIComponent\(ad\)\}`\)/);
  assert.match(PROFIL, /onNavigate\(`\/mesajlar\/\$\{encodeURIComponent\(aday\.kullaniciAdi as string\)\}`\)/);
});

test('KULLANICI ADI YOKSA DÜĞME YOK', () => {
  /*
    Adres kurulamaz; çalışmayan bir düğme çizmek olmayan bir yolu varmış
    gibi göstermek olurdu. E-postaya da geri düşülmüyor — istenen şey
    site içi konuşma.
  */
  assert.match(kodu(LISTE), /\{ogrenci\.kullaniciAdi && \(/);
  assert.match(kodu(PROFIL), /\{aday\.kullaniciAdi && \(/);
});

test('işverende Mesajlar girişi ve okunmamış rozeti var', () => {
  /*
    Koşul `userRole === 'student'` idi. Girişi olmayan bir kutuya yazmak,
    adayın yanıtını hiç okuyamamak demekti. Rozeti bileşenin kendisi
    okuyor (`MesajKutusuDugmesi`), burada yalnız kapı açılıyor.
  */
  const header = oku('src/components/Header.tsx');
  assert.match(header, /userRole === 'student' \|\| userRole === 'company'/);
  assert.match(header, /<MesajKutusuDugmesi/);
});

/* ------------------------------------------------------- sunucu */

test('İKİNCİ BİR MESAJ SİSTEMİ KURULMUYOR', () => {
  /*
    Göç yeni tablo yaratmıyor; var olan `mesaj_gonder`i genişletiyor.
    Ayrı bir tablo açılsaydı okundu, engel, şikâyet ve anlık gelme
    akışlarının hepsi ikinci kez yazılmak zorunda kalırdı.
  */
  assert.doesNotMatch(GOC_KOD, /create table/i);
  assert.match(GOC, /create or replace function public\.mesaj_gonder/);
});

test('YETKİ SUNUCUDA: üç dal, ötekiler reddediliyor', () => {
  assert.match(GOC, /sosyal_gizli\.ogrenci_sosyal_mi\(ben\) and sosyal_gizli\.ogrenci_sosyal_mi\(p_alici\)/);
  assert.match(GOC, /sosyal_gizli\.sirket_sosyal_mi\(ben\)/);
  assert.match(GOC, /raise exception 'yalniz-ogrenciler'/);
});

test('şirket yetkisi DOĞRULAMAYA ve gerçek üyeliğe bağlı', () => {
  /*
    Üçü birden: sosyal profil şirkete bağlı, şirket doğrulanmış, kişi o
    şirketin üyesi. Üyelik şartı olmadan bir hesabın kendi satırına
    `sirket_id` yazması yetki almaya yeterdi.
  */
  const fn = GOC.slice(GOC.indexOf('function sosyal_gizli.sirket_sosyal_mi'), GOC.indexOf('İşverenin yazabileceği aday'));
  assert.match(fn, /join public\.company_members cm/);
  assert.match(fn, /cm\.user_id = sp\.profile_id and cm\.company_id = sp\.sirket_id/);
  assert.match(fn, /public\.sirket_dogrulandi\(sp\.sirket_id\)/);
});

test('ADAYIN RIZASI KAPI: yeni sohbet arayış anahtarına bağlı', () => {
  /*
    `aday_mi` listenin kapısıyla AYNI koşulu kullanıyor (is_arayan ya da
    staj_arayan). İki yerde ayrı yazılsaydı listede görünen bir adaya
    mesaj reddedilebilir ya da tersi olurdu.
  */
  const fn = GOC.slice(GOC.indexOf('function sosyal_gizli.aday_mi'), GOC.indexOf('İki kişi arasında sohbet var mı'));
  assert.match(fn, /sp\.is_arayan or sp\.staj_arayan/);
  assert.match(fn, /s\.sirket_id is null/);
});

test('anahtar kapansa da SÜREN sohbet kesilmiyor', () => {
  /*
    Kesilseydi konuşmanın ortasında anahtarı kapatan aday karşı tarafı
    sessizce susturmuş olurdu. 20261107010000 aynı ilkeyi yazıyor: açık
    sohbet, profil sonradan gizlense de sürüyor; yalnız engel kesiyor.
  */
  assert.match(GOC, /sosyal_gizli\.aday_mi\(p_alici\) or sosyal_gizli\.sohbet_var_mi\(ben, p_alici\)/);
});

test('aday işverene SOĞUK başlatamıyor', () => {
  /* Öğrenci → şirket dalı yalnız sohbet VARSA açık; yanıt, başlatma değil. */
  assert.match(
    GOC,
    /sosyal_gizli\.ogrenci_sosyal_mi\(ben\) and sosyal_gizli\.sirket_sosyal_mi\(p_alici\)\s*\n\s*and sosyal_gizli\.sohbet_var_mi\(ben, p_alici\)/,
  );
});

test('işverenin ilk mesajı da İSTEK; ayrıcalık yok', () => {
  /*
    Doğrulanmış şirket diye sohbeti doğrudan açmak, adayın elindeki tek
    frene — istemediği konuşmayı hiç başlatmama hakkına — dokunurdu.
    İstek silme izi (30 gün) ve 3 mesaj sınırı işverene de işliyor.
  */
  assert.match(GOC, /values \(a, b, ben, 'istek'\)/);
  assert.match(GOC, /istek-reddedildi/);
  assert.match(GOC, /istek-bekliyor/);
});

test('engel ve hız sınırı işveren dalında da geçerli', () => {
  const govde = GOC.slice(GOC.indexOf('create or replace function public.mesaj_gonder'));
  /* İzin dallarından SONRA, yani her dal buradan geçiyor. */
  assert.ok(
    govde.indexOf("raise exception 'yalniz-ogrenciler'") < govde.indexOf('engelli_mi(p_alici)'),
    'engel kontrolü izin dallarından sonra olmalı',
  );
  assert.match(govde, /cok-hizli/);
});

test('yardımcılar PostgREST\'e kapalı', () => {
  /* İstemci bu yüklemleri doğrudan çağırıp varlık/yokluk sorgulayamıyor. */
  for (const fn of ['sirket_sosyal_mi', 'aday_mi', 'sohbet_var_mi']) {
    assert.match(GOC, new RegExp(`revoke all on function sosyal_gizli\\.${fn}`), `${fn} kapatılmalı`);
  }
});

/* ------------------------------------------------- sözleşme koruması */

test('aday_profili SÖZLEŞMESİ tek satır dışında DEĞİŞMEDİ', () => {
  /*
    Bu göç `aday_profili`yi yeniden yazıyor (create or replace kısmi yama
    kabul etmiyor). İlk denemede gövde elle yazılmıştı ve olmayan kolon
    adları uydurulmuştu (sp.tanitim, student_competencies, pr.baslik),
    `is_admin()` yedeği ile sıralamalar düşmüş, parametre adı `p_id` →
    `p_aday` olmuştu — istemci `p_id` ile çağırdığı için o tek başına
    ekranı kırardı.

    Bu test gövdeyi ÖNCEKİ GÖÇLE karşılaştırıyor: tek fark eklenen
    `kullaniciAdi` satırı olmalı. Başka her sapma kırılıyor.
  */
  const govde = (metin) => {
    const i = metin.indexOf('create or replace function public.aday_profili(');
    return metin.slice(i, metin.indexOf('$$;', i) + 3);
  };
  const onceki = govde(oku('supabase/migrations/20261114010000_aday_profili.sql'));
  const simdiki = govde(GOC);

  const eklenen = simdiki.split('\n').filter((s) => !onceki.includes(s.trim()) || s.includes('kullaniciAdi'));
  assert.deepEqual(
    eklenen.map((s) => s.trim()).filter(Boolean),
    ["'kullaniciAdi', s.username,"],
    'yalnız kullanıcı adı satırı eklenmeliydi',
  );
  /* Parametre adı istemcinin çağırdığı adla aynı kalmalı. */
  assert.match(simdiki, /function public\.aday_profili\(p_id uuid\)/);
  assert.match(oku('src/lib/queries/index.ts'), /p_id: id,/);
});

test('öğrenciye verilen metin MESAJI da anlatıyor', () => {
  /*
    Rıza metni neyin GÖRÜNECEĞİNİ sayıyordu, mesaj alacağını
    söylemiyordu. Yeni yetenek açılmadan metin genişletilmeli; sıra
    tersine dönseydi öğrenci onaylamadığı bir şeye maruz kalırdı.
  */
  const kart = oku('src/components/ArayisKartlari.tsx');
  assert.match(kart, /StajımVar üzerinden mesaj/);
  assert.match(kart, /engelleyebilirsin/);
  /* Anahtarın ne yaptığı da doğru yazılmalı: yeni mesaj gelmez, süren yazışma sürer. */
  assert.match(kart, /yeni mesaj almazsın/);
});

/* ------------------------------------------------- adayın yanıt yolu */

test('ADAY İŞVERENE YANIT VEREBİLİYOR (ölçülen tıkanma)', () => {
  /*
    `SohbetEkrani` karşı taraf şirketse sohbeti KOŞULSUZ reddediyordu
    (`if (profil.sirketId) return setAsama('sirket')`). O satır dururken
    işverenin mesajı gönderilebiliyor ama aday kendi kutusundaki sohbete
    dokunduğunda "yalnız öğrenciler arasında" ekranına düşüyordu — yani
    özellik yarım kalırdı.

    Kapı artık sunucudaki kuralın aynısı: şirketle sohbet YALNIZ
    sohbet varsa açılıyor, soğuk başlatma yok.
  */
  const ekran = oku('src/components/mesaj/SohbetEkrani.tsx');
  assert.match(ekran, /if \(profil\.sirketId && !sid\) return setAsama\('sirket'\);/);
  assert.doesNotMatch(kodu(ekran), /if \(profil\.sirketId\) return setAsama/);
  /* Sohbet kimliği artık karardan ÖNCE okunuyor. */
  const g = ekran.slice(ekran.indexOf('const profil = await sosyalProfiliGetir'));
  assert.ok(
    g.indexOf('const sid = await sohbetKimligiGetir') < g.indexOf("if (profil.sirketId && !sid)"),
    'sohbet kimliği karardan önce okunmalı',
  );
});

test('kapalı ekranın cümlesi gerçeğe uyuyor', () => {
  /*
    "Mesajlaşma şimdilik yalnız öğrenciler arasında açık" artık DOĞRU
    DEĞİL: işveren yazabiliyor. Yanlış kalan bir cümle, kullanıcıya
    olmayan bir kısıt anlatırdı.
  */
  const ekran = oku('src/components/mesaj/SohbetEkrani.tsx');
  assert.doesNotMatch(kodu(ekran), /yalnız öğrenciler arasında açık/);
  assert.match(ekran, /yazışmayı şirket başlatıyor/);
});

test('ŞİRKET KİMLİĞİ: ad ve LOGO iki ekranda da görünüyor', () => {
  /*
    Şirket sosyal profillerinde `avatar_path` çoğunlukla boş ve ekranlar
    baş harf çiziyordu. Aday kimin yazdığını hem sohbet başlığında hem
    listede görmeli; `AkisKarti` aynı yedeği zaten kullanıyor.
  */
  const sorgular = oku('src/lib/queries/sosyal.ts');
  assert.match(sorgular, /companies!social_profiles_sirket_id_fkey \( logo_url \)/);
  assert.match(sorgular, /logoAdresi: satir\.companies\?\.logo_url \?\? null,/);

  const ekran = oku('src/components/mesaj/SohbetEkrani.tsx');
  assert.match(ekran, /yedekAdres=\{karsi\.logoAdresi\}/);

  const liste = oku('src/components/mesaj/SohbetListesi.tsx');
  assert.match(liste, /yedekAdres=\{sohbet\.karsiLogoAdresi\}/);
  /* RPC gerçekten döndürmeli; yoksa yedek hep null kalırdı. */
  assert.match(GOC, /karsi_logo_url\s+text,/);
  assert.match(GOC, /left join public\.companies c on c\.id = sp\.sirket_id/);
});

test('sohbetlerim GÖVDESİ elle yazılmadı: üç satır dışında aynı', () => {
  /*
    Dönüş tablosuna kolon eklemek `create or replace` ile olmuyor, bu
    yüzden fonksiyon drop edilip yeniden yazılıyor. Gövde elle
    kopyalansaydı sessizce bir kolon ya da süzgeç kaybolabilirdi —
    `aday_profili`de bir kez tam olarak bu oldu.
  */
  const govde = (metin) => {
    const i = metin.indexOf('create or replace function public.sohbetlerim(');
    return metin.slice(i, metin.indexOf('$$;', i) + 3);
  };
  const onceki = govde(oku('supabase/migrations/20261107010000_mesajlasma.sql'));
  const simdiki = govde(GOC);
  const eklenen = simdiki
    .split('\n')
    .map((x) => x.trim())
    .filter((x) => x && !onceki.split('\n').map((y) => y.trim()).includes(x));
  assert.deepEqual(eklenen, [
    'karsi_logo_url      text,',
    'c.logo_url,',
    'left join public.companies c on c.id = sp.sirket_id',
  ]);
  assert.match(GOC, /drop function if exists public\.sohbetlerim\(text\);/);
});

test('yerel doğrulama betiği var ve üretime dokunmuyor', () => {
  /*
    Akışın kendisi (liste → konuşma → yanıt → yetkisiz erişim) yalnız
    gerçek bir veritabanında sınanabiliyor. Betik yerel Supabase için;
    tek işlemde çalışıp `rollback` ile bitiyor.
  */
  const betik = oku('supabase/tests/isveren-aday-mesajlasmasi.sql');
  assert.match(betik, /^begin;/m);
  assert.match(betik, /^rollback;/m);
  assert.doesNotMatch(betik, /^commit;/m);
  for (const durum of ['liste', 'ACIK', 'ucuncu kisi', 'DOGRULANMAMIS', 'SOGUK', 'engel']) {
    assert.ok(betik.includes(durum), `senaryo eksik: ${durum}`);
  }
});
