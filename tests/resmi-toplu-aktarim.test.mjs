import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aktarilacak,
  aktarimKarari,
  setiAktar,
  setleriOku,
} from '../scripts/resmi-paylasim-aktar.mjs';

/*
  TOPLU AKTARIMIN İKİ GÜVENCESİ

  Toplu yazma ÜRETİME dokunuyor ve geri alması pahalı. Bu yüzden iki
  soru yazılıp geçilmiyor, ÇALIŞTIRILARAK ölçülüyor:

    1. İkinci çalıştırma kopya üretiyor mu?
    2. Bir set hata verirse ötekiler belirsiz durumda kalıyor mu?

  Sahte bir istemciyle: hiçbir ağ çağrısı yok, üretimde hiçbir satır
  değişmiyor. Sahte istemci Supabase'in kullanılan yüzeyini taklit
  ediyor — zincirlenebilir sorgu kurucusu ve `storage`.
*/

/* ------------------------------------------------------- sahte istemci */

function sahteDb({ mevcut = null, yuklemeHatasi = null } = {}) {
  const kayit = {
    eklenenPost: [],
    eklenenMedya: [],
    guncellemeler: [],
    silinenMedya: 0,
    silinenObje: [],
    yuklenen: [],
  };

  /*
    Supabase sorgu kurucusu "thenable": zincirin sonunda await ediliyor.

    `maybeSingle` ile `single` AYRI sonuç veriyor ve ayrım anlamlı:
    `maybeSingle` VARLIK SORUSU (satır var mı), `single` ise insert'in
    döndürdüğü yeni satır. İkisi aynı sonucu verseydi "satır yok" hâli
    hiç kurulamaz, betik her zaman onarım dalına girerdi.
  */
  const kurucu = (varlik, tekil, kancalar = {}) => {
    const nesne = {
      select: () => nesne,
      eq: () => nesne,
      insert: (satir) => {
        kancalar.insert?.(satir);
        return nesne;
      },
      update: (satir) => {
        kancalar.update?.(satir);
        return nesne;
      },
      delete: () => {
        kancalar.delete?.();
        return nesne;
      },
      maybeSingle: async () => varlik,
      single: async () => tekil,
      then: (coz) => Promise.resolve(varlik).then(coz),
    };
    return nesne;
  };

  return {
    kayit,
    from(tablo) {
      if (tablo === 'posts') {
        return kurucu(
          { data: mevcut, error: null },
          { data: { id: 'post-yeni' }, error: null },
          {
            insert: (satir) => kayit.eklenenPost.push(satir),
            update: (satir) => kayit.guncellemeler.push(satir),
          },
        );
      }
      if (tablo === 'post_media') {
        return kurucu(
          { data: [{ storage_path: 'eski/yol/1.jpg' }], error: null },
          { data: null, error: null },
          {
            insert: (satir) => kayit.eklenenMedya.push(satir),
            delete: () => {
              kayit.silinenMedya += 1;
            },
          },
        );
      }
      throw new Error(`beklenmeyen tablo: ${tablo}`);
    },
    storage: {
      from: () => ({
        upload: async (yol) => {
          kayit.yuklenen.push(yol);
          if (yuklemeHatasi && kayit.yuklenen.length === yuklemeHatasi.sira) {
            return { error: { message: yuklemeHatasi.mesaj } };
          }
          return { error: null };
        },
        remove: async (yollar) => {
          kayit.silinenObje.push(...yollar);
          return { error: null };
        },
      }),
    },
  };
}

const SET = setleriOku().find((s) => (s.kartlar ?? []).length > 0);
assert.ok(SET, 'aktarımı sınamak için en az bir görselli paylaşım seti bulunmalı');
const YAZAR = '00000000-0000-4000-8000-000000000001';

/* ------------------------------------------------------------ kararlar */

test('üç durum, üçü de ayrı: yok / hazır / yarım', () => {
  /*
    "Onar" dalı olmasaydı toplu aktarımda şu olurdu: bir set görseller
    yüklenirken düşer, geriye `durum='taslak'` bir satır kalır — akışta
    GÖRÜNMEZ, çünkü akış `durum='hazir'` istiyor. Betik ikinci kez
    koştuğunda o satırı "zaten aktarılmış" sayıp ATLARDI ve set sonsuza
    kadar yarım kalırdı: hiç kimsenin göremediği bir paylaşım, ama
    envanterde "aktarıldı" görünen bir kayıt.
  */
  assert.equal(aktarimKarari(null), 'aktar');
  assert.equal(aktarimKarari({ id: 'p', durum: 'hazir' }), 'atla');
  assert.equal(aktarimKarari({ id: 'p', durum: 'taslak' }), 'onar');
});

/* ------------------------------------------------------------ kopya yok */

test('ikinci çalıştırma kopya üretmiyor: tamamlanmış set ATLANIYOR', async () => {
  const db = sahteDb({ mevcut: { id: 'post-var', durum: 'hazir' } });
  const sonuc = await setiAktar(db, SET, YAZAR);

  assert.equal(sonuc.sonuc, 'atlandi');
  assert.equal(sonuc.postId, 'post-var');
  /* Hiçbir şey yazılmadı: ne satır, ne görsel, ne yükleme. */
  assert.deepEqual(db.kayit.eklenenPost, []);
  assert.deepEqual(db.kayit.eklenenMedya, []);
  assert.deepEqual(db.kayit.yuklenen, []);
  assert.deepEqual(db.kayit.guncellemeler, []);
});

test('anahtar türetilmiş: aynı set her zaman aynı satıra denk geliyor', () => {
  /*
    Kopya üretmemenin TEMELİ bu. Anahtar rastgele olsaydı ikinci
    çalıştırma yeni bir satır açar, `(author_id, istemci_anahtari)`
    tekil indeksi hiç devreye girmezdi.
  */
  const setler = setleriOku();
  const birinci = setler.map((s) => aktarilacak(s).istemciAnahtari);
  const ikinci = setler.map((s) => aktarilacak(s).istemciAnahtari);

  assert.deepEqual(birinci, ikinci, 'iki üretim aynı anahtarları vermeli');
  assert.equal(new Set(birinci).size, setler.length, 'her setin anahtarı benzersiz olmalı');
  /* Sürüm değişince anahtar da değişiyor: düzeltilen içerik yeni paylaşım. */
  const ornek = setler[0];
  assert.notEqual(
    aktarilacak(ornek).istemciAnahtari,
    aktarilacak({ ...ornek, surum: `${ornek.surum}-x` }).istemciAnahtari,
  );
});

/* -------------------------------------------------- yarım kalan onarım */

test('yarım kalmış set ATLANMIYOR, üzerine tamamlanıyor', async () => {
  const db = sahteDb({ mevcut: { id: 'post-yarim', durum: 'taslak' } });
  const sonuc = await setiAktar(db, SET, YAZAR);

  assert.equal(sonuc.sonuc, 'onarildi');
  /* AYNI satır: yeni paylaşım açılmadı, anahtar korundu. */
  assert.equal(sonuc.postId, 'post-yarim');
  assert.deepEqual(db.kayit.eklenenPost, []);
  /* Eski görseller temizlendi, dördü yeniden yazıldı. */
  assert.equal(db.kayit.silinenMedya, 1);
  assert.equal(db.kayit.eklenenMedya.length, SET.kartlar.length);
  /* En sonda yayına alındı. */
  assert.deepEqual(db.kayit.guncellemeler.at(-1), { durum: 'hazir' });
});

/* ------------------------------------------------- hata yalıtımı */

test('görsel yüklemesi düşerse satır YAYINA ALINMIYOR', async () => {
  /*
    Yarıda kalan set geriye görünmeyen bir taslak bırakıyor: akış
    `durum='hazir'` istiyor, yani kimse eksik bir paylaşım görmüyor.
    Belirsizlik yok — durum ya "görünmez taslak" ya da "tamamlanmış".
  */
  const db = sahteDb({ yuklemeHatasi: { sira: 3, mesaj: 'ağ koptu' } });
  await assert.rejects(() => setiAktar(db, SET, YAZAR), /ağ koptu/);

  /* Satır açıldı ama 'hazir' YAPILMADI. */
  assert.equal(db.kayit.eklenenPost.length, 1);
  assert.equal(db.kayit.eklenenPost[0].durum, 'taslak');
  assert.ok(!db.kayit.guncellemeler.some((g) => g.durum === 'hazir'));
});

test('hata TEK SETE kalıyor: ötekiler etkilenmiyor', async () => {
  /*
    Toplu döngü her seti kendi `try` bloğunda işliyor. Burada döngünün
    kendisi taklit ediliyor: ortadaki set düşüyor, öncesi ve sonrası
    tamamlanıyor.
  */
  const setler = setleriOku().filter((s) => (s.kartlar ?? []).length > 0).slice(0, 3);
  const sonuclar = [];
  for (const [i, s] of setler.entries()) {
    const db = sahteDb(i === 1 ? { yuklemeHatasi: { sira: 1, mesaj: 'ağ koptu' } } : {});
    try {
      sonuclar.push(await setiAktar(db, s, YAZAR));
    } catch (sorun) {
      sonuclar.push({ kod: s.kod, sonuc: 'hata', mesaj: sorun.message });
    }
  }

  assert.deepEqual(
    sonuclar.map((r) => r.sonuc),
    ['aktarildi', 'hata', 'aktarildi'],
  );
});

test('eksik görsel dosyası aktarımı durduruyor, yarım paylaşım bırakmıyor', async () => {
  const db = sahteDb();
  const bozuk = { ...SET, kartlar: ['/paylasim/olmayan/01.jpg'] };
  await assert.rejects(() => setiAktar(db, bozuk, YAZAR), /görsel yok/);
  assert.ok(!db.kayit.guncellemeler.some((g) => g.durum === 'hazir'));
});
