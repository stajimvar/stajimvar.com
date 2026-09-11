/**
 * SOSYAL PORTFOLYO — VERİ ERİŞİMİ
 *
 * Bileşenler `supabase` istemcisini doğrudan çağırmıyor; kalıp
 * `src/lib/queries/index.ts` ile aynı: her fonksiyon hata durumunda
 * throw ediyor, çağıran taraf hatayı EKRANA yazıyor.
 *
 * TABLOLAR CANLI VERİTABANINDA HENÜZ YOK
 * --------------------------------------
 * Sosyal katmanın göçleri yalnız YEREL bir Supabase projesinde
 * çalıştırıldı; hiçbiri üretime uygulanmadı (bilinçli karar). Yani
 * `sectors`, `departments`, `social_profiles`, `posts` sorguları üretimde
 * bugün PostgREST'ten hata dönüyor.
 * Bu dosya o hatayı YUTMUYOR ve "boş liste" gibi göstermiyor: boş bir
 * liste "içerik yok" demek, hata ise "veri alınamadı" demek ve ikisi
 * kullanıcıya farklı cümle kurdurur.
 *
 * TİPLER NEDEN GEVŞEK
 * -------------------
 * `src/lib/database.types.ts` canlı şemadan üretiliyor ve o şemada bu
 * tablolar olmadığı için üretilmiş tiplerde de yoklar. Üretilmiş dosyayı
 * elle düzenlemek, bir dahaki `supabase gen types` çağrısında sessizce
 * geri alınacak bir yalan olurdu. Bunun yerine istemci bu dosyada dar bir
 * arayüzle okunuyor ve dönen satırlar burada, tek yerde, gerçek tiplere
 * çevriliyor. Şema uygulandığında yapılacak tek iş bu daraltmayı silmek.
 */

import { supabase } from '../supabase';
import {
  kullaniciAdiHarfeIndir,
  kullaniciAdiNormalize,
} from '../sosyal-kullanici-adi.mjs';

/* Yalnız burada kullanılan dar erişim; bkz. yukarıdaki gerekçe. */
interface SosyalIstemci {
  from: (tablo: string) => any;
  rpc: (ad: string, argumanlar: Record<string, unknown>) => any;
  /*
    Storage de aynı daraltmanın içinde: `supabase` istemcisi burada
    `SosyalIstemci`ye çevrildiği için `storage` alanı yoksa kova
    çağrıları tip hatası verirdi. Şema uygulandığında bu daraltmanın
    tamamı siliniyor.
  */
  storage: { from: (kova: string) => any };
}
const db = supabase as unknown as SosyalIstemci;

/**
 * Ayırt edilebilir hata.
 *
 * Kullanıcı adı çakışması ile "sunucuya ulaşılamadı" aynı ekranda çok
 * farklı iki cümle: birincisi kullanıcının düzeltebileceği bir şey,
 * ikincisi değil. Kod olmadan çağıran taraf ikisini ayıramazdı.
 */
export class SosyalHata extends Error {
  kod: string;
  constructor(mesaj: string, kod: string) {
    super(mesaj);
    this.name = 'SosyalHata';
    this.kod = kod;
  }
}

function hata(baglam: string, error: { message?: string } | null): never {
  throw new SosyalHata(`${baglam}: ${error?.message ?? 'bilinmeyen hata'}`, 'sunucu');
}

/**
 * PostgREST hata metninde geçen kısıt adını arıyor.
 *
 * PostgREST 23514'te kısıt adını genellikle `message`, bazen `details`
 * içinde veriyor: `... violates check constraint "yayin_icin_kimlik_sart"`.
 * İki alan da taranıyor; ad bulunamazsa `false` dönüyor ve çağıran taraf
 * genel cümleye düşüyor.
 *
 * BU EŞLEME GERÇEK BİR VERİTABANINDA ÇALIŞTIRILMADI
 * -------------------------------------------------
 * Göçlerin hiçbiri bir veritabanına uygulanmadı, dolayısıyla kısıt adının
 * hata metninde HANGİ ALANDA geldiği ölçülmedi. Bu yüzden iki alan da
 * taranıyor ve eşleşme bulunamaması bir hata dalı değil, normal bir sonuç
 * olarak ele alınıyor.
 */
function kisitAdiVarMi(
  error: { message?: string; details?: string } | null,
  ad: string,
): boolean {
  const metin = `${error?.message ?? ''} ${error?.details ?? ''}`;
  return metin.includes(ad);
}

/**
 * 23514 → kullanıcıya cümle.
 *
 * 23514 tek başına "bir CHECK kısıtı ihlal edildi" demek; HANGİ kısıt
 * olduğunu söylemez. Yalnız koda bakıp kesin bir cümle kurmak, kullanıcıya
 * yanlış alanı düzelttirirdi. Bu yüzden ayrım kısıt ADINDAN yapılıyor.
 *
 * TANIDIĞIMIZ TEK AD `yayin_icin_kimlik_sart`: göç dosyasında bu adı biz
 * yazdık, yani metinde çıktığında ne olduğunu biliyoruz. `username` ve
 * `biyografi` CHECK'leri göçte İSİMSİZ; adlarını Postgres üretiyor ve o
 * adlar burada TAHMİN EDİLMİYOR — doğrulanmamış bir tahmine göre kesin
 * cümle kurmak, kullanıcıyı yanlış yere gönderirdi. Zaten ikisini de
 * istemci tarafı doğrulama (`kullaniciAdiHatasi`, `biyografiHatasi`)
 * gönderimden ÖNCE yakalıyor; sunucudan bu iki hatanın dönmesi beklenen
 * bir yol değil.
 */
function kisitHatasi(error: { message?: string; details?: string }): SosyalHata {
  if (kisitAdiVarMi(error, 'yayin_icin_kimlik_sart')) {
    return new SosyalHata(
      'Kullanıcı adı ve alan tamamlanmadan profil yayımlanamıyor.',
      'yayin-kimlik-eksik',
    );
  }
  return new SosyalHata('Bilgilerini kontrol edip tekrar dene.', 'gecersiz');
}

/** Boş metin veritabanına boş dize değil NULL olarak gidiyor. */
function bosNull(deger: string | null | undefined): string | null {
  const metin = (deger ?? '').trim();
  return metin === '' ? null : metin;
}

// ----------------------------------------------------------------- Sektörler

export interface SosyalSektor {
  id: string;
  slug: string;
  ad: string;
}

/**
 * Kapalı sektör listesi.
 *
 * `aktif` süzgeci ve `sira` sıralaması şemadaki kullanımın aynısı:
 * kapatılan sektör listede çıkmıyor ama mevcut profilleri bozmuyor.
 * "Diğer" seçeneği YOK — liste bir öneri değil görünürlük sınırı.
 */
export async function sektorleriGetir(): Promise<SosyalSektor[]> {
  const { data, error } = await db
    .from('sectors')
    .select('id, slug, ad, sira')
    .eq('aktif', true)
    .order('sira', { ascending: true });

  if (error) hata('Alan listesi alınamadı', error);
  return (data ?? []).map((satir: any) => ({
    id: satir.id,
    slug: satir.slug,
    ad: satir.ad,
  }));
}

// ---------------------------------------------------------------- Bölümler

export interface SosyalBolum {
  id: string;
  slug: string;
  ad: string;
  /** `departments.grup`; ekranda başlığa çevriliyor, kendisi basılmıyor. */
  grup: string;
}

/**
 * Kontrollü bölüm kataloğu.
 *
 * Alan bu listeden SUNUCUDA türetiliyor (`department_sectors`). Bu yüzden
 * listede "Diğer" ya da serbest metin yok — katalog bir öneri değil, alan
 * topluluğunun kapısı. Katalogda olmayan bölüm için yol talep kuyruğu.
 *
 * LİSTENİN TEK OKUYUCUSU ARTIK YÖNETİM KUYRUĞU (`BolumTalepleri`):
 * öğrenciye bölüm SEÇTİREN ekran kalktı, bölüm `student_profiles`ten
 * sunucuda çözülüyor.
 *
 * `aktif` süzgeci ve `sira` sıralaması şemadaki kullanımın aynısı:
 * kapatılan bölüm listede çıkmıyor ama mevcut profilleri bozmuyor.
 */
export async function bolumleriGetir(): Promise<SosyalBolum[]> {
  const { data, error } = await db
    .from('departments')
    .select('id, slug, ad, grup, sira')
    .eq('aktif', true)
    .order('sira', { ascending: true });

  if (error) hata('Bölüm listesi alınamadı', error);
  return (data ?? []).map((satir: any) => ({
    id: satir.id,
    slug: satir.slug,
    ad: satir.ad,
    grup: satir.grup,
  }));
}

// -------------------------------------------------------------- Sosyal profil

export interface SosyalProfil {
  profilId: string;
  kullaniciAdi: string | null;
  sektorId: string | null;
  sektorAdi: string | null;
  /**
   * RESMÎ bölüm adı — yalnız `departments` ilişkisinden.
   *
   * `bolumEtiketi` ile karıştırılmamalı: o kullanıcının yazdığı serbest
   * metin ve ekranda "Eğitim notu" olarak, ikincil ağırlıkta çiziliyor.
   * İkisi aynı satırda gösterilseydi kullanıcı oraya başka bir bölüm adı
   * yazarak sistem bölümünü taklit edebilirdi.
   */
  bolumAdi: string | null;
  /**
   * `social_profiles.department_id`.
   *
   * Ekranda BASILMIYOR; yalnız eksik eşleme talebinde hangi katalog
   * satırının kastedildiğini sunucuya söylemek için taşınıyor. Adla
   * göndermek, yönetim tarafında eşleşme aramak demek olurdu.
   */
  bolumId: string | null;
  gorunenAd: string | null;
  biyografi: string | null;
  bolumEtiketi: string | null;
  sinifEtiketi: string | null;
  sehir: string | null;
  yayindaMi: boolean;
  /**
   * Profil fotoğrafının DEPOLAMA YOLU — adresi değil.
   *
   * `sosyal-avatar` kovası `public = false` (20260924020000): bu dizeden
   * çalışan bir adres YOK. Dosya, gösterileceği anda `gorselIndir` ile
   * oturumdan geçerek iniyor. Adresi veri katmanında üretip taşımak,
   * yetki değişse bile elde kalan bir adres taşımak olurdu; ölçüm tam
   * olarak bunu gösterdi (bkz. `gorselIndir`).
   */
  avatarYolu: string | null;
}

/*
  `avatar_path` ARTIK OKUNUYOR

  Daha önce bilerek dışarıda bırakılmıştı: kova ve okuma politikası
  yoktu, yol değerinden çalışan bir adres üretilemiyordu. İkisi de
  20260924020000 ile geldi (`sosyal-avatar`, private, 2 MB, üç MIME
  türü) ve yazma yetkisi 20260924040000 ile açıldı. Kolon SELECT'i
  baştan beri açıktı; eksik olan tarafta kırık bir <img> çizmemek için
  okuma da kapalı tutulmuştu.
*/
const PROFIL_KOLONLARI =
  'profile_id, username, sector_id, department_id, gorunen_ad, biyografi, bolum_etiketi, sinif_etiketi, sehir, yayinda_mi, avatar_path, sectors ( ad ), departments ( ad )';

function profileCevir(satir: any): SosyalProfil {
  return {
    profilId: satir.profile_id,
    kullaniciAdi: satir.username ?? null,
    sektorId: satir.sector_id ?? null,
    sektorAdi: satir.sectors?.ad ?? null,
    bolumAdi: satir.departments?.ad ?? null,
    bolumId: satir.department_id ?? null,
    gorunenAd: satir.gorunen_ad ?? null,
    biyografi: satir.biyografi ?? null,
    bolumEtiketi: satir.bolum_etiketi ?? null,
    sinifEtiketi: satir.sinif_etiketi ?? null,
    sehir: satir.sehir ?? null,
    yayindaMi: Boolean(satir.yayinda_mi),
    avatarYolu: satir.avatar_path ?? null,
  };
}

/**
 * Rotadaki kullanıcı adını KİMLİĞE çeviriyor.
 *
 * ADRESTEKİ AD BİR GİRDİ, YETKİ DEĞİL
 * -----------------------------------
 * Ziyaretçi profili de `profile_id` ile okunuyor; kullanıcı adı yalnız
 * bu çevrim için kullanılıyor. Çevrim de RLS'e tabi: göremediğin bir
 * profil için sıfır satır dönüyor, yani "böyle bir kullanıcı var mı"
 * sorusu cevaplanmıyor. Adın var olması ile profilin sana açık olması
 * arayüzde AYNI sonuca çıkıyor (tek güvenli ekran).
 *
 * Ad normalize ediliyor çünkü `username` küçük harfle saklanıyor; adres
 * çubuğuna büyük harfle yazan kullanıcı da aynı satıra ulaşmalı.
 */
export async function sosyalProfilKimligiGetir(kullaniciAdi: string): Promise<string | null> {
  const { data, error } = await db
    .from('social_profiles')
    .select('profile_id')
    .eq('username', kullaniciAdiNormalize(kullaniciAdi))
    .maybeSingle();

  if (error) hata('Profil aranamadı', error);
  return data?.profile_id ?? null;
}

/**
 * Kimliği bilinen bir profili oku.
 *
 * Sahip yolu ile ziyaretçi yolu AYNI sorguyu kullanıyor; ayrım yetki
 * katmanında (RLS) ve çizimde (`sahibiMi`). İki ayrı sorgu olsaydı biri
 * değiştiğinde öteki sessizce ayrışır ve ziyaretçi yoluna fazladan bir
 * kolon sızabilirdi.
 */
export async function sosyalProfiliGetir(profilId: string): Promise<SosyalProfil | null> {
  const { data, error } = await db
    .from('social_profiles')
    .select(PROFIL_KOLONLARI)
    .eq('profile_id', profilId)
    .maybeSingle();

  if (error) hata('Profil bilgileri alınamadı', error);
  return data ? profileCevir(data) : null;
}

/**
 * Oturum sahibinin kendi sosyal profili.
 *
 * SORGU KİMLİĞİ ROTADAN DEĞİL OTURUMDAN ALIYOR. Adresteki kullanıcı adı
 * bir girdi; sahiplik `profile_id = auth.uid()` ilişkisinden doğuyor.
 * Kullanıcı adıyla sorgulasaydık, adres çubuğuna başkasının adını yazan
 * kişi en azından "böyle bir profil var mı" sorusunun cevabını öğrenirdi.
 *
 * Satır yoksa `null`: bu bir hata değil, "henüz kurulmamış" demek.
 */
export async function kendiSosyalProfiliGetir(kullaniciId: string): Promise<SosyalProfil | null> {
  const { data, error } = await db
    .from('social_profiles')
    .select(PROFIL_KOLONLARI)
    .eq('profile_id', kullaniciId)
    .maybeSingle();

  if (error) hata('Sosyal profil alınamadı', error);
  return data ? profileCevir(data) : null;
}

/**
 * Sosyal profil satırının eksiklerini SUNUCUYA tamamlatıyor.
 *
 * KURULUM DEĞİL, TAMAMLAMA
 * ------------------------
 * Burada bir zamanlar `sosyalProfilKur` vardı: kullanıcıdan ad, bölüm ve
 * görünürlük alıp `sosyal_profil_kur` RPC'sini çağırıyordu. 20260926050000
 * satırı kayıt anında sunucuda açıyor, 20260926090000 da eksik kalanı
 * tamamlamak için bu kapıyı veriyor — kullanıcının gireceği bir bilgi
 * kalmadı, dolayısıyla soracak bir form da yok.
 *
 * ARGÜMAN YOK
 * -----------
 * RPC hedefi `auth.uid()` okuyor. Kimlik parametresi alsaydı bir bileşen
 * prop'undan gelen değerle başkasının satırını açtırma denemesine kapı
 * kalırdı. Fonksiyon bu yüzden oturum kimliği de ALMIYOR.
 *
 * İKİNCİ ÇAĞRI ZARARSIZ: RPC idempotent (satır varsa yeniden açmıyor,
 * yalnız NULL kalan bölüm/alan alanlarını dolduruyor) ve topluluğa
 * katmıyor. Yine de düğme tarafında kilit var: iki isteğin sonucu
 * kullanıcıya iki ayrı cümle olarak dönerdi.
 *
 * DÖNEN SATIR KULLANILMIYOR: çağıran taraf okumayı kendi tazeliyor ve
 * ekrandaki değer her zaman `kendiSosyalProfiliGetir`den geliyor. İki
 * ayrı kaynak olsaydı RPC'nin döndürdüğü satır ile listelerin okuduğu
 * satır birbirinden ayrışabilirdi.
 */
export async function sosyalProfilimiTamamla(): Promise<void> {
  const { error } = await db.rpc('sosyal_profilimi_tamamla', {});
  if (!error) return;
  throw tamamlamaHatasi(error);
}

/**
 * Tamamlama RPC'sinin hatasını cümleye çeviriyor.
 *
 * AYRIM `details` ALANINDAN: göç kodu `using ... detail = '...'` ile
 * gönderiyor, PostgREST bunu `error.details` olarak veriyor. `errcode`
 * ayırt etmeye yetmezdi ('42501' iki ayrı durumda da geliyor).
 *
 * HAM VERİTABANI METNİ EKRANA ÇIKMIYOR: tanınmayan bir hatada sebep
 * UYDURULMUYOR, yalnız ne yapılabileceği yazılıyor. Sunucu tarafındaki
 * gerçek sebep zaten istemciye gönderilmiyor (bkz. 20260926090000).
 *
 * BU EŞLEME GERÇEK BİR VERİTABANINDA ÇALIŞTIRILMADI: arayüz tarafında
 * ölçüm yapılmadı. Bu yüzden tanınmayan bir değer hata dalı değil, genel
 * cümleye düşen normal bir sonuç.
 */
function tamamlamaHatasi(error: { code?: string; message?: string; details?: string }): SosyalHata {
  const detay = (error?.details ?? '').trim();

  if (detay === 'oturum-yok') {
    return new SosyalHata('Oturumun kapanmış görünüyor. Yeniden giriş yap.', 'oturum-yok');
  }
  if (detay === 'ogrenci-degil') {
    return new SosyalHata(
      'Sosyal profil yalnız öğrenci hesaplarında açılıyor.',
      'ogrenci-degil',
    );
  }
  if (detay === 'profil-hazirlanamadi') {
    return new SosyalHata(
      'Sunucu sosyal profilini hazırlayamadı. Sebebini buradan göremiyoruz.',
      'profil-hazirlanamadi',
    );
  }
  return new SosyalHata(
    'Sosyal profilin tamamlanamadı. Bağlantını kontrol edip yeniden dene.',
    'sunucu',
  );
}

/**
 * Profil görünürlüğünü ayarla — çift yönlü.
 *
 * TEK FONKSİYON, İKİ YÖN
 * ----------------------
 * Yayımlama ve yayından kaldırma aynı tek kolonu yazıyor. Ayrı iki
 * fonksiyon olsaydı (yayimla/kaldir) aynı sorgunun iki kopyası olur ve
 * biri değiştiğinde öteki sessizce geride kalırdı.
 *
 * KİMLİK OTURUMDAN, ROTADAN DEĞİL
 * -------------------------------
 * İlk parametre çağıranın elindeki oturum kimliği; hedef satır
 * `profile_id` eşitliğiyle sınırlanıyor. Fonksiyon "şu profili yayımla"
 * diye bir HEDEF almıyor, çünkü alsaydı adres çubuğundan ya da bir
 * bileşen prop'undan gelen bir değerle başkasının satırına yazma denemesi
 * yapılabilirdi. İkinci parametre yalnız yeni değer.
 *
 * Arayüzün eylemi sahibinden başkasına göstermemesi TEK BAŞINA yetmez;
 * ikinci kapı RLS'te: "kendi sosyal profilini yonetir" politikası
 * `for all` + `profile_id = auth.uid()` ile hem okumayı hem yazmayı
 * oturum sahibinin satırına kilitliyor. Buradaki `.eq` o kapıyı
 * tekrarlamıyor, ona uyuyor — uymayan bir sorgu sıfır satır günceller ve
 * sessizce "oldu" gibi görünürdü.
 *
 * Gövdede yalnız tek kolon var. Kalıcı adres ve görünürlük sınırı bu
 * yoldan değişemesin diye başka hiçbir alan gönderilmiyor.
 */
export async function sosyalProfilGorunurluguAyarla(
  kullaniciId: string,
  yayindaMi: boolean,
): Promise<void> {
  const { error } = await db
    .from('social_profiles')
    .update({ yayinda_mi: yayindaMi })
    .eq('profile_id', kullaniciId);

  if (!error) return;
  /*
    `yayin_icin_kimlik_sart` CHECK'i yayınlı satırda kullanıcı adı ve alan
    istiyor; cümleyi kısıt ADI belirliyor, tek başına 23514 değil.
  */
  if (error.code === '23514') throw kisitHatasi(error);
  hata('Profil görünürlüğü değiştirilemedi', error);
}

export interface SosyalDuzenlemeGirdisi {
  gorunenAd?: string | null;
  biyografi?: string | null;
  bolumEtiketi?: string | null;
  sinifEtiketi?: string | null;
  sehir?: string | null;
}

/**
 * Profil düzenleme.
 *
 * `username` ve `sector_id` gövdeye BİLEREK KONMUYOR:
 *   · kullanıcı adı kalıcı adres — değişirse paylaşılmış her bağlantı kırılır
 *   · sektör görünürlük sınırı — veritabanı tetikleyicisi de değişimi reddediyor
 * Alanları gönderip sunucudan hata beklemek yerine hiç göndermiyoruz;
 * böylece "arayüz izin verdi ama sunucu reddetti" durumu hiç oluşmuyor.
 */
export async function sosyalProfilGuncelle(
  kullaniciId: string,
  girdi: SosyalDuzenlemeGirdisi,
): Promise<void> {
  const { error } = await db
    .from('social_profiles')
    .update({
      gorunen_ad: bosNull(girdi.gorunenAd),
      biyografi: bosNull(girdi.biyografi),
      bolum_etiketi: bosNull(girdi.bolumEtiketi),
      sinif_etiketi: bosNull(girdi.sinifEtiketi),
      sehir: bosNull(girdi.sehir),
    })
    .eq('profile_id', kullaniciId);

  if (!error) return;
  /* Cümle kısıt ADINDAN; 23514 tek başına hangi alan olduğunu söylemiyor. */
  if (error.code === '23514') throw kisitHatasi(error);
  hata('Profil güncellenemedi', error);
}

// ------------------------------------------------------------------ Sayaçlar

export interface SosyalSayaclar {
  paylasim: number;
  baglanti: number;
}

/**
 * Profildeki iki sayı: Paylaşım ve Bağlantı.
 *
 * "Bağlantıda" diye üçüncü bir sayaç YOK — bağlantı simetrik ve tek satır
 * olduğu için ikinci bir sayı aynı şeyi tekrar söylerdi (şemadaki gerekçe).
 *
 * RPC `sosyal_gorunur` kapısından geçiyor ve göremediğin profil için SIFIR
 * SATIR dönüyor. Sıfır satır "sayı sıfır" DEĞİL, "sana verilmiyor" demek;
 * bu yüzden burada 0 uydurulmuyor, `null` dönüyor ve arayüz sayı basmıyor.
 */
export async function sosyalSayaclariGetir(profilId: string): Promise<SosyalSayaclar | null> {
  const { data, error } = await db.rpc('sosyal_sayaclar', { hedef: profilId });
  if (error) hata('Sayaçlar alınamadı', error);

  const satir = Array.isArray(data) ? data[0] : data;
  if (!satir) return null;
  return {
    paylasim: Number(satir.paylasim ?? 0),
    baglanti: Number(satir.baglanti ?? 0),
  };
}

// --------------------------------------------------------------- Paylaşımlar

/** Şemadaki `posts.kitle` CHECK'inin iki değeri; üçüncüsü yok. */
export type PaylasimKitlesi = 'baglantilarim' | 'alan-toplulugum';

export interface PaylasimGorseli {
  /** 1..10; kapak `sira = 1`. Şemadaki PK(post_id, sira) bunu garantiliyor. */
  sira: number;
  storageYolu: string;
  /**
   * Kullanıcının yazdığı görsel açıklaması. Boşsa `null` KALIYOR: alt
   * metni uydurmak ("paylaşım görseli" gibi) ekran okuyucuya içerik
   * hakkında yanlış bir şey söylemek olurdu. Boş `alt`, dekoratif
   * olmayan bir görselde en azından dürüst.
   */
  alt: string | null;
  genislik: number | null;
  yukseklik: number | null;
}

export interface SosyalPaylasim {
  id: string;
  aciklama: string | null;
  olusturmaAni: string;
  arsivAni: string | null;
  /**
   * Paylaşımın kitlesi.
   *
   * Ekranda yalnız SAHİBİNE gösteriliyor: bu, yazarın kendi ayarı.
   * Ziyaretçiye "bu paylaşım yalnız bağlantılarına açık" demek, ona
   * karşı tarafın bağlantı listesi hakkında bir çıkarım yaptırırdı.
   */
  kitle: PaylasimKitlesi;
  /** Seri paylaşımda kaç görsel olduğu; `post_media` satır sayısı. */
  gorselSayisi: number;
  /** Sırasına göre dizilmiş bütün görseller; ayrıntı görünümü bunu geziyor. */
  gorseller: PaylasimGorseli[];
  /** Kapak görselinin depolama yolu; dosyayı `gorselIndir` indiriyor. */
  kapakYolu: string | null;
  kapakAlt: string | null;
}

/**
 * Bir kullanıcının paylaşımları.
 *
 * `arsiv: true` arşivlenmişleri, varsayılan ise yayındakileri getiriyor —
 * ikisi aynı listede karışmıyor çünkü arşiv "silme değil gizleme" ve
 * gizlenen şeyin ana ızgarada durması arşivi anlamsız kılardı.
 *
 * Kapak, `post_media.sira` en küçük olan satır: şema bir paylaşımın
 * sıralı bir seri olabileceğini söylüyor ve ızgarada ilk görsel kapak.
 *
 * TASLAKLAR IZGARAYA GİRMİYOR
 * ---------------------------
 * `durum = 'hazir'` süzgeci sunucu kuralının tekrarı değil, onun
 * tamamlayıcısı: RLS yazarın KENDİ taslağını görmesine izin veriyor
 * (oluşturma ekranı onun üzerinde çalışıyor). Tarayıcı yükleme
 * ortasında kapanırsa geride fotoğrafsız bir taslak satırı kalabilir ve
 * süzgeç olmasaydı ızgarada boş bir kart olarak çizilirdi — kullanıcıya
 * var olmayan bir paylaşım göstermek olurdu. Ziyaretçi için süzgeç
 * zaten etkisiz: ona taslak hiçbir koşulda gelmiyor.
 */
export async function paylasimlariGetir(
  yazarId: string,
  secenek: { arsiv?: boolean } = {},
): Promise<SosyalPaylasim[]> {
  let sorgu = db
    .from('posts')
    .select(PAYLASIM_ALANLARI)
    .eq('author_id', yazarId)
    .eq('durum', 'hazir')
    .order('created_at', { ascending: false });

  sorgu = secenek.arsiv ? sorgu.not('archived_at', 'is', null) : sorgu.is('archived_at', null);

  const { data, error } = await sorgu;
  if (error) hata(secenek.arsiv ? 'Arşiv alınamadı' : 'Paylaşımlar alınamadı', error);

  return (data ?? []).map(paylasimSatiriCevir);
}

/**
 * Paylaşım satırının okunan alanları.
 *
 * Liste iki yerde (profil ızgarası ve beğeni/kayıt listeleri) elle
 * yazılsaydı biri değiştiğinde öteki sessizce eksik alanla dönerdi:
 * örneğin `post_media` unutulduğunda kart "Görsel yok" yazardı — olmayan
 * bir şey iddia etmek.
 */
const PAYLASIM_ALANLARI =
  'id, aciklama, kitle, created_at, archived_at, post_media ( sira, storage_path, alt, genislik, yukseklik )';

/** Ham satır → `SosyalPaylasim`. Çeviri TEK yerde; bkz. `PAYLASIM_ALANLARI`. */
function paylasimSatiriCevir(satir: any): SosyalPaylasim {
  const gorseller: PaylasimGorseli[] = [...(satir.post_media ?? [])]
    .sort((a: any, b: any) => Number(a.sira) - Number(b.sira))
    .map((medya: any) => ({
      sira: Number(medya.sira),
      storageYolu: medya.storage_path,
      alt: medya.alt ?? null,
      genislik: medya.genislik ?? null,
      yukseklik: medya.yukseklik ?? null,
    }));
  const kapak = gorseller[0] ?? null;
  return {
    id: satir.id,
    aciklama: satir.aciklama ?? null,
    olusturmaAni: satir.created_at,
    arsivAni: satir.archived_at ?? null,
    /* Tanınmayan bir değer DAR olana düşüyor; şema varsayılanıyla aynı yön. */
    kitle: satir.kitle === 'alan-toplulugum' ? 'alan-toplulugum' : 'baglantilarim',
    gorselSayisi: gorseller.length,
    gorseller,
    kapakYolu: kapak?.storageYolu ?? null,
    kapakAlt: kapak?.alt ?? null,
  };
}

// ------------------------------------------------- Depolama ve paylaşım akışı

/*
  KOVA ADLARI TEK YERDE

  Ad üç ayrı çağrıda (yükle, sil, imzala) elle yazılsaydı biri
  değiştiğinde öteki sessizce geride kalır ve "yükleniyor ama
  görünmüyor" gibi teşhisi zor bir hata üretirdi. Değerler
  20260924020000 göçündeki `storage.buckets` satırlarıyla birebir aynı;
  farklı bir ad yazmak, olmayan bir kovaya yüklemek demek.
*/
export const SOSYAL_PAYLASIM_KOVASI = 'sosyal-paylasim';
export const SOSYAL_AVATAR_KOVASI = 'sosyal-avatar';

/**
 * Depolama yolundan GÖRSELİN KENDİSİNİ indiriyor.
 *
 * İMZALI ADRES NEDEN KALKTI — ÖLÇÜLDÜ
 * -----------------------------------
 * Yerel Storage'a HTTP ile soruldu: yetkili kullanıcı bir imza aldı,
 * sonra kaydın görünürlüğü değiştirildi ve AYNI imza ömrü dolmadan
 * tekrar istendi.
 *
 *   değişiklik            eski imza   yetkili indirme
 *   arşivlendi                200           400
 *   bağlantı kaldırıldı       200           400
 *   engel eklendi             200           400
 *
 * Yani imza jetonu bir kez verildikten sonra RLS'i YENİDEN SORMUYOR:
 * kendi ömrü (3600 sn) dolana kadar çalışmaya devam ediyor. Arşivlenmiş
 * bir paylaşımın görseli, elinde imza kalan kişiye inmeye devam
 * ediyordu. `download()` ise her çağrıda kullanıcının OTURUMUNDAN ve
 * okuma politikasından geçiyor — tablodaki 400'ler tam olarak bu sütun.
 *
 * KALICI ADRES DE YOK: iki kova da `public = false` (20260924020000),
 * `getPublicUrl` yalnız 400 dönen bir dize üretirdi; kalıcı olsaydı
 * paylaşımın kitle kuralını dolaşan bir kapı olurdu.
 *
 * DÜRÜST SINIR
 * ------------
 * Kullanıcıya DAHA ÖNCE teslim edilmiş bir görüntü onun cihazından geri
 * alınamaz. Buradaki iddia yalnız şu: YENİ istekler reddediliyor.
 * Arayüzde "görsel geri çekilir" gibi bir vaat verilmiyor.
 *
 * HATA DALI throw ETMİYOR, null DÖNÜYOR
 * -------------------------------------
 * Izgarada tek bir dosyanın alınamaması ötekileri de düşürmemeli. Yetki
 * yoksa da sonuç aynı: byte gelmiyor, çağıran taraf o kare için "Görsel
 * açılamadı" yazıyor. Boş bir kutu bırakmak kırık görselden farksız
 * olurdu.
 */
export async function gorselIndir(kova: string, yol: string): Promise<Blob | null> {
  const { data, error } = await db.storage.from(kova).download(yol);
  if (error || !data) return null;
  return data as Blob;
}

/**
 * Paylaşım RPC'lerinin hatası → kullanıcı cümlesi.
 *
 * AYRIM `message` ALANINDAN, `details`TEN DEĞİL
 * ---------------------------------------------
 * Tamamlama RPC'si kodu `using ... detail = '...'` ile gönderiyor ve
 * `tamamlamaHatasi` bu yüzden `details` okuyor. Paylaşım RPC'leri
 * (20260924030000) kodu doğrudan MESAJ olarak atıyor:
 * `raise exception 'toplulukta-degil' using errcode = 'P0001'`. İki alan
 * da taranıyor çünkü hangisinin dolu geldiği bu arayüz tarafında
 * ölçülmedi; eşleşme bulunamaması hata dalı değil, genel cümleye düşen
 * normal bir sonuç.
 */
const PAYLASIM_CUMLELERI: Record<string, string> = {
  /*
    `sosyal_paylasim_baslat` bu kodu `yayinda_mi` VEYA `sector_id`
    eksikken atıyor; adı eski modelden kalma ve üyeliği anlatmıyor.
    Cümle bu yüzden iki önkoşulu da anıyor — "topluluğa katıl" deseydi,
    profili gizli olan kullanıcıyı yapacağı işin olmadığı bir ekrana
    gönderirdi.
  */
  'toplulukta-degil':
    'Paylaşım açmak için profilinin herkese açık olması ve bölümünün bir alana bağlı olması gerekiyor.',
  /*
    Bu KOD AYRI: `paylasim_kitlesi_kilidi` (20260926040000) tetikleyicisi
    yalnız "Alan topluluğum" kitlesi seçildiğinde ve üyelik yokken
    çalışıyor. Yukarıdakiyle tek cümlede birleştirilmedi: biri profilin
    durumunu, öteki seçilen kitleyi anlatıyor ve kullanıcının yapacağı iş
    farklı.
  */
  'topluluk-uyeligi-yok':
    'Alan topluluğuna katılmadan "Alan topluluğum" kitlesiyle paylaşamazsın.',
  'gecersiz-kitle': 'Paylaşımın kimlere görüneceği seçilmeden gönderilemiyor.',
  'anahtar-kullanilmis': 'Bu paylaşım zaten tamamlanmış. Yeni bir paylaşım başlatman gerekiyor.',
  'istemci-anahtari-gerekli': 'Paylaşım başlatılamadı. Sayfayı yenileyip yeniden dene.',
  'fotograf-sayisi-1-10': 'Bir paylaşımda en az 1, en çok 10 fotoğraf olabilir.',
  'fotograf-listesi-gecersiz': 'Fotoğraf listesi okunamadı. Fotoğrafları yeniden seç.',
  'fotograf-sirasi-kopuk': 'Fotoğraf sırası bozuk göründü. Sırayı düzenleyip yeniden dene.',
  'gecersiz-dosya-yolu': 'Yüklenen dosya bu paylaşıma ait değil; paylaşım tamamlanmadı.',
  'taslak-bulunamadi': 'Paylaşım taslağı bulunamadı. Baştan başlaman gerekiyor.',
  'zaten-tamamlanmis': 'Bu paylaşım zaten tamamlanmış.',
  'yayimlanmis-paylasim-iptal-edilemez':
    'Tamamlanmış paylaşım iptal edilemiyor; onun yolu arşivlemek.',
};

function paylasimHatasi(
  baglam: string,
  error: { code?: string; message?: string; details?: string },
): SosyalHata {
  for (const alan of [error?.message, error?.details]) {
    const anahtar = (alan ?? '').trim();
    if (PAYLASIM_CUMLELERI[anahtar]) return new SosyalHata(PAYLASIM_CUMLELERI[anahtar], anahtar);
  }
  /* RPC'ler oturumsuz çağrıyı 42501 ile reddediyor. */
  if (error?.code === '42501') {
    return new SosyalHata('Oturumun kapanmış görünüyor. Yeniden giriş yap.', 'oturum-yok');
  }
  return new SosyalHata(`${baglam}: ${error?.message ?? 'bilinmeyen hata'}`, 'sunucu');
}

export interface YuklenecekGorsel {
  /** Tarayıcıda küçültülmüş ikili veri; MIME türü blob'un kendisinden okunuyor. */
  veri: Blob;
  /**
   * YALNIZ uzantı — dosya adı DEĞİL.
   *
   * Kullanıcının dosya adı yola hiçbir yerde girmiyor: ad hem kişisel
   * bilgi taşıyabiliyor (telefon modeli, tarih, kişi adı) hem de yol
   * ayracı ve nokta içerebiliyor. Ad, imzalı adresle birlikte üçüncü
   * bir kişiye ulaşırdı.
   */
  uzanti: string;
  genislik: number;
  yukseklik: number;
  alt: string | null;
}

export interface PaylasimGirdisi {
  /**
   * OLUŞTURMA DENEMESİNİN kimliği — her gönderimin değil.
   *
   * Aynı anahtarla ikinci çağrı sunucuda yeni satır AÇMIYOR
   * (`posts_istemci_anahtari_key`). Çağıran taraf bu değeri bileşen ömrü
   * boyunca sabit tutuyor; her denemede yeniden üretilseydi çift
   * tıklama iki paylaşım bırakırdı ve veritabanındaki tekil indeks hiç
   * devreye girmezdi.
   */
  istemciAnahtari: string;
  aciklama: string;
  kitle: PaylasimKitlesi;
  dosyalar: YuklenecekGorsel[];
  /** Yüklenen dosya sayısı; ekrandaki ilerleme satırı bunu yazıyor. */
  ilerleme?: (yuklenen: number, toplam: number) => void;
}

/** Sunucudaki `fotograf-sayisi-1-10` kuralının istemci tarafı. */
export const EN_AZ_FOTOGRAF = 1;
export const EN_FAZLA_FOTOGRAF = 10;

/**
 * Paylaşım oluşturma — üç adım, tek fonksiyon.
 *
 *   1) `sosyal_paylasim_baslat`  taslak satırı açılıyor
 *   2) Storage                   her dosya kendi klasörüne yazılıyor
 *   3) `sosyal_paylasim_tamamla` satır 'hazir' oluyor
 *
 * SIRA BOZULAMAZ. Dosyaların yolu paylaşım kimliğini içeriyor
 * (`<yazar>/<post>/<rastgele>`), yani post kimliği olmadan yükleme
 * yapılamıyor; sunucu da `tamamla` içinde bu öneki doğruluyor. Paylaşım
 * `tamamla` dönene kadar BAŞKASINA GÖRÜNMÜYOR: kitle kapısı taslağı
 * eliyor (20260924010000).
 *
 * YAZAR KİMLİĞİ SUNUCUDAN GELİYOR
 * -------------------------------
 * Yol öneki, `baslat`ın döndürdüğü satırdaki `author_id` ile
 * kuruluyor; çağıran taraftan kimlik ALINMIYOR. Kimliği prop olarak
 * alsaydık, yanlış bir değer Storage politikasında (kendi klasörü
 * kuralı) duracak ama hata ekranda "yükleme başarısız" diye
 * görünecekti — sebebi teşhis edilemeyen bir yol.
 *
 * HATA DALINDA GERİYE İZ BIRAKMIYOR
 * ---------------------------------
 * Herhangi bir adımda hata olursa o ana kadar YÜKLENMİŞ dosyalar kendi
 * klasöründen siliniyor ve taslak `sosyal_paylasim_iptal` ile
 * kapatılıyor. Temizlik kendi try/catch'inde: temizliğin başarısızlığı
 * ASIL hatanın üstünü örtmüyor — kullanıcı neyin yanlış gittiğini
 * görmeli, temizlik onun sorunu değil.
 */
export async function paylasimOlustur(girdi: PaylasimGirdisi): Promise<string> {
  const toplam = girdi.dosyalar.length;
  /*
    SINIR İSTEMCİDE DE VAR. Sunucu zaten reddediyor; ama 11 dosyayı
    yükleyip sonra reddedilmek, kullanıcının verisini boşa harcamak ve
    Storage'da temizlenmesi gereken çöp üretmek olurdu.
  */
  if (toplam < EN_AZ_FOTOGRAF || toplam > EN_FAZLA_FOTOGRAF) {
    throw new SosyalHata(
      `Bir paylaşımda en az ${EN_AZ_FOTOGRAF}, en çok ${EN_FAZLA_FOTOGRAF} fotoğraf olabilir.`,
      'fotograf-sayisi-1-10',
    );
  }

  const { data: taslak, error: baslatHatasi } = await db.rpc('sosyal_paylasim_baslat', {
    p_istemci_anahtari: girdi.istemciAnahtari,
    p_aciklama: bosNull(girdi.aciklama),
    p_kitle: girdi.kitle,
  });
  if (baslatHatasi) throw paylasimHatasi('Paylaşım başlatılamadı', baslatHatasi);

  const satir = Array.isArray(taslak) ? taslak[0] : taslak;
  if (!satir?.id || !satir?.author_id) {
    throw new SosyalHata('Paylaşım başlatılamadı; sunucu taslağı döndürmedi.', 'taslak-yok');
  }

  const postId: string = satir.id;
  const onek = `${satir.author_id}/${postId}/`;
  const yuklenenler: string[] = [];

  try {
    const medya: Array<Record<string, unknown>> = [];

    for (let sira = 0; sira < toplam; sira += 1) {
      const gorsel = girdi.dosyalar[sira];
      /*
        Dosya adı `crypto.randomUUID()`; kullanıcının adı yola hiç
        girmiyor ve aynı fotoğraf iki kez seçilse bile çakışma olmuyor.
      */
      const yol = `${onek}${crypto.randomUUID()}.${gorsel.uzanti}`;

      const { error: yuklemeHatasi } = await db.storage
        .from(SOSYAL_PAYLASIM_KOVASI)
        .upload(yol, gorsel.veri, {
          contentType: gorsel.veri.type,
          /* Üzerine yazma YOK: rastgele ad zaten çakışmıyor, `true` olsaydı
             beklenmedik bir çakışma sessizce veri kaybettirirdi. */
          upsert: false,
        });
      if (yuklemeHatasi) {
        throw new SosyalHata(
          `Fotoğraf yüklenemedi (${sira + 1}/${toplam}): ${yuklemeHatasi.message ?? 'bilinmeyen hata'}`,
          'yukleme',
        );
      }

      yuklenenler.push(yol);
      medya.push({
        sira: sira + 1,
        storage_path: yol,
        genislik: gorsel.genislik,
        yukseklik: gorsel.yukseklik,
        alt: gorsel.alt,
      });
      girdi.ilerleme?.(sira + 1, toplam);
    }

    const { error: tamamlaHatasi } = await db.rpc('sosyal_paylasim_tamamla', {
      p_post_id: postId,
      p_medya: medya,
    });
    if (tamamlaHatasi) throw paylasimHatasi('Paylaşım tamamlanamadı', tamamlaHatasi);

    return postId;
  } catch (sorun) {
    await paylasimTemizle(yuklenenler, postId);
    throw sorun;
  }
}

/**
 * Yarım kalan denemenin izini siliyor.
 *
 * Kendi try/catch'inde ve SESSİZ: buradaki bir hata, kullanıcıya
 * gösterilecek asıl hatayı gölgelerdi. Silme politikası yalnız kendi
 * klasörüne izin veriyor (20260924020000), yani bu çağrı hiçbir koşulda
 * başkasının dosyasına dokunamıyor.
 *
 * `iptal` YALNIZ taslağı siliyor; tamamlanmış bir paylaşım bu yoldan
 * silinemiyor (sunucu 'yayimlanmis-paylasim-iptal-edilemez' diyor).
 */
async function paylasimTemizle(yollar: string[], postId: string): Promise<void> {
  try {
    if (yollar.length > 0) {
      await db.storage.from(SOSYAL_PAYLASIM_KOVASI).remove(yollar);
    }
  } catch {
    /* Temizlik başarısız olabilir; asıl hata yukarıda anlatılıyor. */
  }
  try {
    await db.rpc('sosyal_paylasim_iptal', { p_post_id: postId });
  } catch {
    /* Aynı sebep. */
  }
}

/**
 * Arşivle — silme değil gizleme.
 *
 * `archived_at` istemciye AÇIK olan üç kolondan biri
 * (`grant update (aciklama, kitle, archived_at)`); `durum` değil. Kalıcı
 * silme D'de ne RPC olarak ne düğme olarak var: arşivlenen paylaşım
 * satırı ve dosyaları duruyor, yalnız kitle kapısı onu eliyor.
 *
 * Hedef satır `id` ile sınırlanıyor; sahiplik kapısı RLS'te. Sıfır satır
 * SESSİZ BAŞARI DEĞİL: politika isteği durdurduğunda PostgREST hata
 * değil boş sonuç dönebiliyor ve bunu "oldu" diye göstermek, olmamış bir
 * işi olmuş göstermek olurdu.
 */
export async function paylasimiArsivle(postId: string): Promise<void> {
  const { data, error } = await db
    .from('posts')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', postId)
    .is('archived_at', null)
    .select('id');

  if (error) hata('Paylaşım arşivlenemedi', error);
  if (!data || data.length === 0) {
    throw new SosyalHata('Paylaşım arşivlenemedi; kayıt değişmedi.', 'satir-yok');
  }
}

/**
 * Arşivden geri yükle — `archived_at` yeniden null.
 *
 * YENİ BİR YETKİ GEREKMİYOR: `archived_at` istemciye açık üç kolondan
 * biri (20260924010000) ve UPDATE politikası satırı zaten sahibine
 * bağlıyor. 20260925010000 ise SELECT tarafındaki eksiği kapatıyor;
 * onsuz sahibi kendi arşivini hiç okuyamıyordu, yani geri yüklenecek
 * satırı ekranda göremiyordu.
 *
 * KİTLE VE FOTOĞRAF SIRASI KENDİLİĞİNDEN KORUNUYOR: `kitle` ayrı bir
 * sütun, sıra ise `post_media.sira`; bu güncelleme ikisine de dokunmuyor.
 * Bu yüzden "arşivden çıkardığında kitlesini yeniden seç" gibi bir adım
 * SORULMUYOR — sorulsaydı, değişmeyen bir şeyi değişmiş gibi gösterirdi.
 *
 * `.not('archived_at', 'is', null)` şartı `paylasimiArsivle`'deki
 * `.is(...)` şartının aynadaki karşılığı: zaten yayında olan bir kayda
 * "geri yüklendi" demek, olmamış bir işi olmuş göstermek olurdu. Sıfır
 * satır yine sessiz başarı değil.
 */
export async function paylasimiGeriYukle(postId: string): Promise<void> {
  const { data, error } = await db
    .from('posts')
    .update({ archived_at: null })
    .eq('id', postId)
    .not('archived_at', 'is', null)
    .select('id');

  if (error) hata('Paylaşım geri yüklenemedi', error);
  if (!data || data.length === 0) {
    throw new SosyalHata('Paylaşım geri yüklenemedi; kayıt değişmedi.', 'satir-yok');
  }
}

// ----------------------------------------------------- Beğeni ve kaydetme

/**
 * Oturum kimliği.
 *
 * `post_likes.user_id` ve `post_saves.user_id` İSTEMCİDEN yazılıyor;
 * değerin kimden geldiği bu yüzden önemli. Kaynak yalnız oturum:
 * kullanıcı adından, adresten ya da ekranda duran bir satırdan kimlik
 * TÜRETİLMİYOR. Sunucu da aynı sınırı ikinci kez çiziyor
 * (`with check (user_id = auth.uid())`), yani buradan yanlış bir kimlik
 * geçse bile satır açılmıyor — arayüz gevşek davransa da veri sızmıyor.
 *
 * `getSession` seçildi, `getUser` değil: `getUser` her çağrıda ağa
 * çıkıyor ve beğeni düğmesi bir tıklamada iki tur beklerdi. Kimliğin
 * doğruluğunu zaten sunucu denetliyor; buradaki değer yalnız satıra
 * yazılacak alan.
 */
async function oturumKimligi(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const kimlik = data?.session?.user?.id ?? null;
  if (!kimlik) throw new SosyalHata('Bu işlem için giriş gerekiyor.', 'oturum-yok');
  return kimlik;
}

export interface BegeniDurumu {
  /** Oturum sahibinin bu paylaşımda satırı var mı. */
  begendimMi: boolean;
  /**
   * Paylaşımın GERÇEK beğeni toplamı.
   *
   * Satır sayarak bulunamıyor: `post_likes` politikası herkese YALNIZ
   * kendi satırını veriyor (`using (user_id = auth.uid())`), yani tablodan
   * sayılan toplam her paylaşımda 0 ya da 1 çıkardı. Sayı bu yüzden
   * `paylasim_begeni_sayisi` RPC'sinden geliyor; beğenenlerin kimliği
   * hiç kimseye — paylaşımın sahibine de — açılmıyor.
   *
   * RPC görünürlük kapısından geçiyor: yetkisi olmayan çağırana SIFIR
   * SATIR dönüyor, "0" değil. O durumda buradaki değer 0 kalıyor ve
   * çağıran taraf sayacı `adet > 0` iken çizdiği için ekrana hiçbir sayı
   * basılmıyor. Tahmin edilmiş ya da yuvarlanmış bir sayı hiçbir yolda yok.
   */
  adet: number;
}

/**
 * Verilen paylaşımların beğeni durumu.
 *
 * İKİ KAYNAK, İKİ SEBEP: "ben beğendim mi" tablodan geliyor, çünkü
 * politika kullanıcıya kendi satırını veriyor; toplam ise RPC'den geliyor,
 * çünkü başka hiç kimsenin satırı okunamıyor.
 *
 * KİMLER BEĞENDİ LİSTESİ ÜRETİLEMİYOR: sorgu `user_id` kolonunu artık
 * hiç istemiyor, sunucu da başkasının satırını vermiyor. Bir ad listesi
 * çizmek beğenenleri birbirine ifşa ederdi; ürün bunu vaat etmiyor.
 *
 * Haritada YALNIZ sorulan kimlikler var; sorulmayan bir kimlik için
 * çağıran taraf hiçbir sayı çizmiyor.
 */
export async function begeniDurumuGetir(
  postIdler: string[],
): Promise<Map<string, BegeniDurumu>> {
  const harita = new Map<string, BegeniDurumu>();
  if (postIdler.length === 0) return harita;

  const kimlik = await oturumKimligi();
  for (const id of postIdler) harita.set(id, { begendimMi: false, adet: 0 });

  /*
    Sorgu niyetini açıkça yazıyor: yalnız KENDİ satırım, ve `user_id`
    kolonu hiç istenmiyor. Politika aynı sınırı sunucuda da çiziyor;
    filtrenin burada da durması, dönen satırın kime ait olduğunu istemcide
    karşılaştırma ihtiyacını tamamen kaldırıyor — satırın gelmiş olması
    zaten "benim" demek.
  */
  const { data, error } = await db
    .from('post_likes')
    .select('post_id')
    .in('post_id', postIdler)
    .eq('user_id', kimlik);
  if (error) hata('Beğeniler alınamadı', error);

  for (const satir of data ?? []) {
    const mevcut = harita.get(satir.post_id);
    if (mevcut) mevcut.begendimMi = true;
  }

  /*
    RPC tek paylaşım alıyor, bu yüzden id başına bir çağrı gidiyor ve
    çağrılar paralel. Tek çağıran (`PaylasimDetayi`) bugün tek id
    gönderiyor, yani pratikte tek istek oluyor.
  */
  const sayimlar = await Promise.all(
    postIdler.map((id) => db.rpc('paylasim_begeni_sayisi', { hedef_post: id })),
  );
  sayimlar.forEach((cevap: { data: any; error: { message?: string } | null }, sira: number) => {
    if (cevap.error) hata('Beğeniler alınamadı', cevap.error);
    const satir = Array.isArray(cevap.data) ? cevap.data[0] : cevap.data;
    /* Sıfır satır "sayı sıfır" değil, "sana verilmiyor" demek; 0 zaten
       yazılı ve üstüne bir şey uydurulmuyor. */
    if (!satir) return;
    const mevcut = harita.get(postIdler[sira]);
    if (mevcut) mevcut.adet = Number(satir.adet ?? 0);
  });

  return harita;
}

/**
 * Beğen.
 *
 * Tekillik VERİTABANINDA: `primary key (post_id, user_id)`. İstemci
 * "zaten beğenmiş miyim" diye ikinci bir tur atmıyor; ikinci satır
 * denemesi sunucuda duruyor.
 */
export async function begen(postId: string): Promise<void> {
  const kimlik = await oturumKimligi();
  const { error } = await db.from('post_likes').insert({ post_id: postId, user_id: kimlik });
  if (error) hata('Beğeni kaydedilemedi', error);
}

/** Beğeniyi kaldır — yalnız KENDİ satırı; sunucuda da `user_id = auth.uid()`. */
export async function begeniyiKaldir(postId: string): Promise<void> {
  const kimlik = await oturumKimligi();
  const { error } = await db
    .from('post_likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', kimlik);
  if (error) hata('Beğeni kaldırılamadı', error);
}

/**
 * Verilen paylaşımlardan hangileri KAYDEDİLMİŞ.
 *
 * SAYI YOK ve olamaz: `post_saves` politikası `using (user_id =
 * auth.uid())`, yani paylaşımın sahibi bile kimin kaydettiğini
 * göremiyor. Buradan bir "kaç kişi kaydetti" sayısı dönseydi her zaman
 * 0 ya da 1 olurdu — uydurma bir metrik.
 */
export async function kaydetmeDurumuGetir(postIdler: string[]): Promise<Set<string>> {
  const kaydedilenler = new Set<string>();
  if (postIdler.length === 0) return kaydedilenler;

  const kimlik = await oturumKimligi();
  const { data, error } = await db
    .from('post_saves')
    .select('post_id')
    .eq('user_id', kimlik)
    .in('post_id', postIdler);
  if (error) hata('Kayıtlar alınamadı', error);

  for (const satir of data ?? []) kaydedilenler.add(satir.post_id);
  return kaydedilenler;
}

/** Kaydet — kayıt tamamen özel; kimseye görünmüyor. */
export async function kaydet(postId: string): Promise<void> {
  const kimlik = await oturumKimligi();
  const { error } = await db.from('post_saves').insert({ post_id: postId, user_id: kimlik });
  if (error) hata('Paylaşım kaydedilemedi', error);
}

/** Kaydı kaldır. */
export async function kaydiKaldir(postId: string): Promise<void> {
  const kimlik = await oturumKimligi();
  const { error } = await db
    .from('post_saves')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', kimlik);
  if (error) hata('Kayıt kaldırılamadı', error);
}

/**
 * Beğeni/kayıt satırından paylaşıma geçen listelerin ortak gövdesi.
 *
 * PAYLAŞIMI DÖNMEYEN SATIR LİSTEDE YOK
 * ------------------------------------
 * Beğeni ve kayıt satırı kullanıcının KENDİ satırı; paylaşım ise ayrı
 * bir politikadan geçiyor. Paylaşım arşivlendiğinde, kitlesi
 * daraldığında, bağlantı kaldırıldığında ya da engel eklendiğinde satır
 * duruyor ama paylaşım artık okunmuyor. `!inner` gömme o satırları
 * sunucuda eliyor; aşağıdaki `if (!satir.posts) continue` ikinci kapı —
 * gömmenin biçimi değişse bile listeye kapaksız, açıklamasız bir hayalet
 * kart girmiyor.
 *
 * KENDİ ARŞİVİ DE ELENİYOR: 20260925010000'den beri sahibi kendi
 * arşivlediği kaydı okuyabiliyor. "Beğendiklerim"de görünseydi profilden
 * kaldırılmış bir paylaşım başka bir listeden geri gelirdi; arşivin
 * kendi ekranı var.
 *
 * SIRA `created_at desc`: en son beğenilen/kaydedilen üstte. Şemadaki
 * dizin de tam bu sırayı taşıyor (`post_likes_user_idx`).
 */
async function etkilesimListesi(
  tablo: 'post_likes' | 'post_saves',
  baglam: string,
): Promise<SosyalPaylasim[]> {
  const kimlik = await oturumKimligi();
  const { data, error } = await db
    .from(tablo)
    .select(`post_id, created_at, posts!inner ( ${PAYLASIM_ALANLARI} )`)
    .eq('user_id', kimlik)
    .eq('posts.durum', 'hazir')
    .is('posts.archived_at', null)
    .order('created_at', { ascending: false });
  if (error) hata(baglam, error);

  const liste: SosyalPaylasim[] = [];
  for (const satir of data ?? []) {
    /* Gömme tek satır dönüyor; dizi geldiği durumda da ilki alınıyor. */
    const paylasim = Array.isArray(satir.posts) ? satir.posts[0] : satir.posts;
    if (!paylasim) continue;
    liste.push(paylasimSatiriCevir(paylasim));
  }
  return liste;
}

/** Oturum sahibinin BEĞENDİĞİ paylaşımlar. Başkasının listesi diye bir şey yok. */
export async function begendiklerimiGetir(): Promise<SosyalPaylasim[]> {
  return etkilesimListesi('post_likes', 'Beğendiklerin alınamadı');
}

/** Oturum sahibinin KAYDETTİĞİ paylaşımlar; liste tamamen özel. */
export async function kaydedilenleriGetir(): Promise<SosyalPaylasim[]> {
  return etkilesimListesi('post_saves', 'Kaydedilenler alınamadı');
}

/**
 * Profil fotoğrafı — önce yükle, sonra yolu yaz, EN SON eskisini sil.
 *
 * SIRA BİR TERCİH DEĞİL, VERİ KAYBININ ÖNLENMESİ
 * ----------------------------------------------
 * Eski dosya önce silinseydi ve `social_profiles` güncellemesi
 * başarısız olsaydı, kullanıcı hem yeni fotoğrafa hem eskisine sahip
 * olmazdı: satırda hâlâ silinmiş dosyanın yolu yazardı. Bu sırayla en
 * kötü sonuç, kovada sahipsiz kalan tek bir eski dosya.
 *
 * KOLON YETKİSİ ARTIK VAR
 * -----------------------
 * 20260923030000 bütün UPDATE yetkisini geri alıp yalnız altı kolona
 * veriyordu ve `avatar_path` o listede yoktu; güncelleme 42501
 * dönüyordu, bu yüzden ekran çizilmemişti. 20260924040000 hem
 * `grant update (avatar_path)` veriyor hem `avatar_yolu_kilidi`
 * tetikleyicisini kuruyor: yolun BİRİNCİ parçası satırın sahibinin
 * uuid'si olmak zorunda, başkasının klasörünü gösteren yol
 * 'avatar-yolu-kendi-klasorunde-olmali' ile reddediliyor. Aşağıdaki yol
 * şeması (`${kullaniciId}/…`) o kuralın istemci tarafındaki karşılığı:
 * uymayan bir kimlik önce Storage politikasında, sonra tetikleyicide
 * duruyor — arayüz gevşek davransa da veri sızmıyor.
 */
export async function profilFotografiYukle(kullaniciId: string, gorsel: YuklenecekGorsel): Promise<string> {
  /* Eski yol ÖNCE okunuyor: yenisi yazıldıktan sonra silinecek olan bu. */
  const { data: mevcut, error: okumaHatasi } = await db
    .from('social_profiles')
    .select('avatar_path')
    .eq('profile_id', kullaniciId)
    .maybeSingle();
  if (okumaHatasi) hata('Profil fotoğrafı okunamadı', okumaHatasi);
  const eskiYol: string | null = mevcut?.avatar_path ?? null;

  const yeniYol = `${kullaniciId}/${crypto.randomUUID()}.${gorsel.uzanti}`;
  const { error: yuklemeHatasi } = await db.storage
    .from(SOSYAL_AVATAR_KOVASI)
    .upload(yeniYol, gorsel.veri, { contentType: gorsel.veri.type, upsert: false });
  if (yuklemeHatasi) hata('Profil fotoğrafı yüklenemedi', yuklemeHatasi);

  const { data: yazilan, error: yazmaHatasi } = await db
    .from('social_profiles')
    .update({ avatar_path: yeniYol })
    .eq('profile_id', kullaniciId)
    .select('profile_id');

  if (yazmaHatasi || !yazilan || yazilan.length === 0) {
    /*
      Yol yazılamadı: yeni dosya sahipsiz kaldı, onu temizliyoruz. ESKİ
      dosyaya DOKUNMUYORUZ — profilde hâlâ onun yolu yazıyor.
    */
    try {
      await db.storage.from(SOSYAL_AVATAR_KOVASI).remove([yeniYol]);
    } catch {
      /* Temizlik başarısız olabilir; asıl hata aşağıda anlatılıyor. */
    }
    if (yazmaHatasi) hata('Profil fotoğrafı kaydedilemedi', yazmaHatasi);
    throw new SosyalHata(
      'Profil fotoğrafı kaydedilemedi; mevcut fotoğrafın değişmedi.',
      'satir-yok',
    );
  }

  if (eskiYol && eskiYol !== yeniYol) {
    try {
      await db.storage.from(SOSYAL_AVATAR_KOVASI).remove([eskiYol]);
    } catch {
      /* Eski dosya kalırsa kimseye görünmüyor; yeni yol zaten yazıldı. */
    }
  }
  return yeniYol;
}

/**
 * Profil fotoğrafını kaldırıyor: `avatar_path` → null.
 *
 * SIRA YÜKLEMENİN TERSİ AMA MANTIĞI AYNI: ÖNCE SATIR
 * --------------------------------------------------
 * Dosya önce silinseydi ve satır güncellemesi başarısız olsaydı,
 * profilde var olmayan bir dosyanın yolu kalırdı: ekranda fotoğraf
 * "duruyor" ama her indirme 400 dönüyor — kullanıcının düzeltemeyeceği
 * bir durum. Bu yüzden dosyaya YALNIZ satır güncellendikten sonra
 * dokunuluyor; başarısız kaldırmada mevcut fotoğraf yerinde kalıyor.
 *
 * Tetikleyici (`avatar_yolu_kilidi`, 20260924040000) null'ı açıkça
 * geçiriyor, yani kaldırma sunucu tarafında da meşru bir işlem.
 *
 * Dosya silme hatası YUTULUYOR: satır zaten null, dosya artık hiçbir
 * profile bağlı değil ve okuma politikası yol üzerinden çalıştığı için
 * kimseye görünmüyor. Kullanıcıya "kaldırılamadı" demek yanlış olurdu.
 */
export async function profilFotografiKaldir(kullaniciId: string): Promise<void> {
  const { data: mevcut, error: okumaHatasi } = await db
    .from('social_profiles')
    .select('avatar_path')
    .eq('profile_id', kullaniciId)
    .maybeSingle();
  if (okumaHatasi) hata('Profil fotoğrafı okunamadı', okumaHatasi);

  const eskiYol: string | null = mevcut?.avatar_path ?? null;
  /* Zaten yoksa istek atılmıyor: olmayan bir şeyi kaldırmak bir işlem değil. */
  if (!eskiYol) return;

  const { data: yazilan, error: yazmaHatasi } = await db
    .from('social_profiles')
    .update({ avatar_path: null })
    .eq('profile_id', kullaniciId)
    .select('profile_id');

  if (yazmaHatasi) hata('Profil fotoğrafı kaldırılamadı', yazmaHatasi);
  if (!yazilan || yazilan.length === 0) {
    throw new SosyalHata('Profil fotoğrafın kaldırılamadı; fotoğrafın duruyor.', 'satir-yok');
  }

  try {
    await db.storage.from(SOSYAL_AVATAR_KOVASI).remove([eskiYol]);
  } catch {
    /* Yukarıdaki gerekçe: satır null, dosya sahipsiz ve görünmez. */
  }
}

// ------------------------------------------------------------ Bölüm talebi

export type BolumTalepDurumu = 'bekliyor' | 'incelendi' | 'reddedildi' | 'eklendi';

export interface BolumTalebi {
  id: string;
  durum: BolumTalepDurumu;
  /** Katalogdaki bölüm; "bölümüm var ama alanı yok" durumunda dolu. */
  bolumAdi: string | null;
  /** Kullanıcının yazdığı ad; "bölümüm listede yok" durumunda dolu. */
  yazilanBolum: string | null;
  universite: string | null;
  aciklama: string | null;
  olusturmaAni: string;
  /**
   * Yöneticinin KULLANICIYA yazdığı karar cümlesi.
   *
   * Yönetimin iç notu (`gerekce`) BU ALANDA DEĞİL: o yalnız
   * `bolum_talep_denetim` tablosunda ve o tablo kullanıcıya kapalı.
   * Kararlanmamış ve göçten önce kararlanmış satırlarda `null`.
   */
  kararAciklamasi: string | null;
}

export interface BolumTalepGirdisi {
  /** Katalogdaki bölümün kimliği; yalnız eşleme eksikse dolu. */
  bolumId?: string | null;
  /** Kullanıcının yazdığı bölüm adı; yalnız bölüm katalogda yoksa dolu. */
  yazilanBolum?: string | null;
  universite?: string | null;
  aciklama?: string | null;
}

/**
 * Eksik bölüm ya da eksik eşleme talebi.
 *
 * TALEP AÇMAK ERİŞİM VERMİYOR. Satır yalnız yönetim kuyruğuna düşüyor;
 * `sosyal_gorunur` hâlâ yayımlanmış ve alanı olan profillere bakıyor.
 * Arayüz de bu yüzden talepten sonra hiçbir erişim vaadi yazmıyor.
 *
 * `user_id` gövdede AÇIKÇA yazılıyor çünkü RLS `with check (user_id =
 * auth.uid())` diyor: eksik bırakılsaydı istek politikada dururdu.
 * Başkası adına talep açmak da bu politikada kapalı.
 */
export async function bolumTalebiAc(
  kullaniciId: string,
  girdi: BolumTalepGirdisi,
): Promise<void> {
  const { error } = await db.from('department_requests').insert({
    user_id: kullaniciId,
    department_id: girdi.bolumId ?? null,
    requested_department: bosNull(girdi.yazilanBolum),
    universite: bosNull(girdi.universite),
    aciklama: bosNull(girdi.aciklama),
  });

  if (!error) return;
  /* Kısmi tekil indeks: aynı anda tek açık talep (status = 'bekliyor'). */
  if (error.code === '23505') {
    throw new SosyalHata('Zaten bekleyen bir talebin var.', 'acik-talep-var');
  }
  /*
    CHECK kısıtı: cümleyi kısıt ADI belirliyor, tek başına kod değil.
    `department_requests` üzerindeki uzunluk kısıtları göçte İSİMSİZ;
    adlarını Postgres üretiyor ve burada tahmin edilmiyorlar — bu yüzden
    genel cümleye düşülüyor.
  */
  if (error.code === '23514') throw kisitHatasi(error);
  hata('Talep gönderilemedi', error);
}

/**
 * Kullanıcının son talebi.
 *
 * En YENİ satır okunuyor, "bekliyor" olanı değil: reddedilmiş bir talebi
 * gizlemek, kullanıcıya talebinin hâlâ sırada olduğunu düşündürürdü.
 * Satır yoksa `null` — bu bir hata değil, "hiç talep açmamış" demek.
 *
 * `karar_aciklamasi` KULLANICININ KENDİ SATIRINDAN geliyor: sorgu
 * `user_id` ile sınırlı ve RLS de aynı şeyi söylüyor. Yönetimin iç notu
 * için `bolum_talep_denetim` tablosuna HİÇ sorgu atılmıyor — o tablo
 * kullanıcıya kapalı ve buradan okunmaya çalışılsaydı ekranda
 * açıklanamayan bir hata belirirdi.
 */
export async function bolumTalebimiGetir(kullaniciId: string): Promise<BolumTalebi | null> {
  const { data, error } = await db
    .from('department_requests')
    .select(
      'id, status, requested_department, universite, aciklama, karar_aciklamasi, created_at, departments ( ad )',
    )
    .eq('user_id', kullaniciId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) hata('Talep durumu alınamadı', error);
  if (!data) return null;
  return {
    id: data.id,
    durum: data.status,
    bolumAdi: data.departments?.ad ?? null,
    yazilanBolum: data.requested_department ?? null,
    universite: data.universite ?? null,
    aciklama: data.aciklama ?? null,
    olusturmaAni: data.created_at,
    kararAciklamasi: data.karar_aciklamasi ?? null,
  };
}

// ---------------------------------------------------------------- Bağlantı

export type BaglantiDurumAdi = 'yok' | 'bekliyor' | 'kabul' | 'red';

export interface BaglantiBilgisi {
  durum: BaglantiDurumAdi;
  /** Satır yoksa null; yön "kim başlattı" bilgisinden başka bir şey değil. */
  benMiGonderdim: boolean | null;
  /** Reddedilen isteğin yeniden gönderilebileceği an; yoksa null. */
  yenidenDenemeAni: string | null;
}

/**
 * Bakan kişinin hedefle ilişkisi — tek sorguda.
 *
 * SIFIR SATIR SIFIR DEĞİL
 * -----------------------
 * RPC `sosyal_gorunur` kapısından geçiyor: göremediğin bir profil için
 * HİÇ SATIR dönmüyor. "Bağlantı yok" ile "bu profili göremiyorsun"
 * farklı cevaplar; ikincisini 'yok' diye çevirmek, arayüze var olmayan
 * bir "Bağlantı kur" düğmesi çizdirirdi ve düğmenin varlığı profilin
 * varlığını sızdırırdı. `sosyal_sayaclar` ile aynı kalıp.
 */
export async function baglantiDurumu(hedefId: string): Promise<BaglantiBilgisi | null> {
  const { data, error } = await db.rpc('baglanti_durumu', { hedef: hedefId });
  if (error) hata('Bağlantı durumu alınamadı', error);

  const satir = Array.isArray(data) ? data[0] : data;
  if (!satir) return null;
  return {
    durum: satir.durum ?? 'yok',
    benMiGonderdim: satir.ben_mi_gonderdim ?? null,
    yenidenDenemeAni: satir.yeniden_deneme_ani ?? null,
  };
}

/**
 * Kimlik biçimi kontrolü.
 *
 * Aşağıdaki iki sorgu PostgREST'in `or=` süzgecini kullanıyor ve o süzgeç
 * bir METİN olarak kuruluyor. Değerler oturumdan ve veritabanından
 * geliyor, kullanıcının yazdığı bir yerden değil; yine de biçim burada
 * doğrulanıyor ki bir gün başka bir kaynaktan gelen değer süzgecin
 * sözdizimini bozmasın.
 */
const UUID_DESENI = /^[0-9a-fA-F-]{36}$/;
function kimlikSuzgeci(ben: string, hedef: string): string {
  if (!UUID_DESENI.test(ben) || !UUID_DESENI.test(hedef)) {
    throw new SosyalHata('Geçersiz kimlik.', 'gecersiz-kimlik');
  }
  return `and(requester_id.eq.${ben},addressee_id.eq.${hedef}),and(requester_id.eq.${hedef},addressee_id.eq.${ben})`;
}

/** Yeni istek. `durum` şemada 'bekliyor' varsayılanı; istemci yazmıyor. */
export async function baglantiKur(kullaniciId: string, hedefId: string): Promise<void> {
  const { error } = await db
    .from('connections')
    .insert({ requester_id: kullaniciId, addressee_id: hedefId });

  if (!error) return;
  if (error.code === '23505') {
    throw new SosyalHata('Bu kişiyle zaten bir bağlantı kaydın var.', 'kayit-var');
  }
  if (error.code === '42501') {
    throw new SosyalHata('Bu kullanıcıya istek gönderilemiyor.', 'izin-yok');
  }
  hata('İstek gönderilemedi', error);
}

/**
 * Reddedilmiş kendi isteğini yeniden gönder (red → bekliyor).
 *
 * Bekleme süresini SUNUCU ölçüyor (`baglanti_red_bekleme()` +
 * `responded_at`). Arayüz süreyi yalnız GÖSTERİYOR; süre dolmadan
 * gönderilen istek sunucuda 42501 ile duruyor ve cümle bunu söylüyor.
 */
export async function baglantiYenidenGonder(
  kullaniciId: string,
  hedefId: string,
): Promise<void> {
  const { data, error } = await db
    .from('connections')
    .update({ durum: 'bekliyor' })
    .eq('requester_id', kullaniciId)
    .eq('addressee_id', hedefId)
    .eq('durum', 'red')
    .select('durum');

  if (error) {
    if (error.code === '42501') {
      throw new SosyalHata('Yeniden göndermek için bekleme süresi dolmamış.', 'sure-dolmadi');
    }
    hata('İstek yeniden gönderilemedi', error);
  }
  if (!data || data.length === 0) {
    throw new SosyalHata('İstek yeniden gönderilemedi; kayıt değişmedi.', 'satir-yok');
  }
}

/**
 * Reddeden tarafın fikrini değiştirmesi.
 *
 * Eski `red` satırını "kabul"e çevirmek yasak (kabul, gönderenin hâlâ
 * istediği anlamına gelir). RPC eski satırı silip TERS yönde yeni bir
 * istek açıyor; ikisi tek işlemde.
 */
export async function baglantiYenidenBaslat(hedefId: string): Promise<void> {
  const { error } = await db.rpc('baglanti_yeniden_baslat', { hedef: hedefId });
  if (!error) return;
  if (error.code === '42501') {
    throw new SosyalHata('Bu kullanıcıya istek gönderilemiyor.', 'izin-yok');
  }
  hata('İstek gönderilemedi', error);
}

/**
 * Gelen isteği yanıtla.
 *
 * Hedef satır YÖNÜYLE birlikte sınırlanıyor: `requester_id = karşı taraf`
 * ve `addressee_id = ben`. Kendi gönderdiğim isteği kabul edemem; kural
 * tetikleyicide de var, sorgu ona uyuyor. `durum = 'bekliyor'` süzgeci de
 * aynı sebeple: yanıtlanmış bir istek ikinci kez yanıtlanmıyor.
 *
 * SIFIR SATIR SESSİZ BAŞARI DEĞİL: RLS ya da tetikleyici isteği
 * durdurduğunda PostgREST hata değil boş sonuç dönebiliyor. Bunu "oldu"
 * diye göstermek, kullanıcıya olmamış bir işi olmuş gösterirdi.
 */
export async function baglantiYanitla(
  kullaniciId: string,
  hedefId: string,
  karar: 'kabul' | 'red',
): Promise<void> {
  const { data, error } = await db
    .from('connections')
    .update({ durum: karar })
    .eq('requester_id', hedefId)
    .eq('addressee_id', kullaniciId)
    .eq('durum', 'bekliyor')
    .select('durum');

  if (error) hata('İstek yanıtlanamadı', error);
  if (!data || data.length === 0) {
    throw new SosyalHata('İstek yanıtlanamadı; kayıt değişmedi.', 'satir-yok');
  }
}

/**
 * Satırı sil — hem "isteği geri çek" hem "bağlantıyı kaldır".
 *
 * TEK FONKSİYON, İKİ ETİKET: ikisi de aynı satırı siliyor. Ayrı iki
 * fonksiyon olsaydı aynı sorgunun iki kopyası olur ve biri değiştiğinde
 * öteki sessizce geride kalırdı. Hangi silmenin kime açık olduğunu RLS
 * söylüyor ("bekliyor + gönderen" ya da "kabul + iki taraf"); arayüz o
 * kuralı tekrarlamıyor, ona uyuyor.
 */
export async function baglantiKaldir(kullaniciId: string, hedefId: string): Promise<void> {
  const { data, error } = await db
    .from('connections')
    .delete()
    .or(kimlikSuzgeci(kullaniciId, hedefId))
    .select('durum');

  if (error) hata('Bağlantı kaldırılamadı', error);
  if (!data || data.length === 0) {
    throw new SosyalHata('Bağlantı kaldırılamadı; kayıt değişmedi.', 'satir-yok');
  }
}

export interface BaglantiKisisi {
  kisiId: string;
  durum: 'bekliyor' | 'kabul';
  benMiGonderdim: boolean;
  olusturmaAni: string;
  /**
   * Karşı tarafın profili. RLS vermediyse `null` — ad UYDURULMUYOR;
   * arayüz "profil şu anda görüntülenemiyor" yazıyor.
   *
   * `avatarYolu` da bu satırdan geliyor ve bir ADRES değil, depolama
   * yolu: dosya listedeki satır çizilirken oturumdan geçerek iniyor
   * (bkz. `gorselIndir`). Yolu görmek dosyayı görmek DEĞİL; okuma
   * politikası her indirmede ayrıca çalışıyor.
   */
  profil: {
    kullaniciAdi: string | null;
    gorunenAd: string | null;
    sektorAdi: string | null;
    avatarYolu: string | null;
  } | null;
}

export interface Baglantilarim {
  kabul: BaglantiKisisi[];
  gelen: BaglantiKisisi[];
  giden: BaglantiKisisi[];
}

/**
 * `/baglantilar` sayfasının üç bölümü — tek okumadan.
 *
 * NEDEN İKİ SORGU
 * ---------------
 * `connections` ile `social_profiles` arasında doğrudan bir yabancı
 * anahtar yok (ikisi de `profiles`e bakıyor), yani PostgREST gömmesi
 * kurulamıyor. Daha önemlisi: iki sorgu ayrıldığında karşı tarafın
 * profili RLS'e AYRI olarak takılıyor. Bağlantı satırı görünüp profili
 * görünmeyen durum (araya engel ya da topluluktan ayrılma girmişse)
 * böylece gerçek bir sonuç oluyor ve arayüzde dürüst bir satır olarak
 * çiziliyor.
 */
export async function baglantilarimiGetir(kullaniciId: string): Promise<Baglantilarim> {
  if (!UUID_DESENI.test(kullaniciId)) {
    throw new SosyalHata('Geçersiz kimlik.', 'gecersiz-kimlik');
  }

  const { data, error } = await db
    .from('connections')
    .select('requester_id, addressee_id, durum, created_at')
    .or(`requester_id.eq.${kullaniciId},addressee_id.eq.${kullaniciId}`)
    .in('durum', ['bekliyor', 'kabul'])
    .order('created_at', { ascending: false });

  if (error) hata('Bağlantılar alınamadı', error);

  const satirlar = (data ?? []).map((satir: any) => ({
    kisiId: satir.requester_id === kullaniciId ? satir.addressee_id : satir.requester_id,
    durum: satir.durum as 'bekliyor' | 'kabul',
    benMiGonderdim: satir.requester_id === kullaniciId,
    olusturmaAni: satir.created_at,
  }));

  const kimlikler = Array.from(new Set(satirlar.map((satir: any) => satir.kisiId)));
  const profiller = new Map<
    string,
    {
      kullaniciAdi: string | null;
      gorunenAd: string | null;
      sektorAdi: string | null;
      avatarYolu: string | null;
    }
  >();

  if (kimlikler.length > 0) {
    const { data: profilVeri, error: profilHatasi } = await db
      .from('social_profiles')
      /* `avatar_path` listede gerçek fotoğrafı çizebilmek için; yol
         gelmezse satır baş harflere düşüyor, sahte görsel üretilmiyor. */
      .select('profile_id, username, gorunen_ad, avatar_path, sectors ( ad )')
      .in('profile_id', kimlikler);

    if (profilHatasi) hata('Bağlantı profilleri alınamadı', profilHatasi);
    for (const satir of profilVeri ?? []) {
      profiller.set(satir.profile_id, {
        kullaniciAdi: satir.username ?? null,
        gorunenAd: satir.gorunen_ad ?? null,
        sektorAdi: satir.sectors?.ad ?? null,
        avatarYolu: satir.avatar_path ?? null,
      });
    }
  }

  const zenginlestir = (satir: any): BaglantiKisisi => {
    const kisiId = satir.kisiId;
    return { ...satir, profil: profiller.get(kisiId) ?? null };
  };

  return {
    kabul: satirlar.filter((s: any) => s.durum === 'kabul').map(zenginlestir),
    gelen: satirlar
      .filter((s: any) => s.durum === 'bekliyor' && !s.benMiGonderdim)
      .map(zenginlestir),
    giden: satirlar
      .filter((s: any) => s.durum === 'bekliyor' && s.benMiGonderdim)
      .map(zenginlestir),
  };
}

// ------------------------------------------------------- Yönetim: talep kuyruğu

export interface BolumTalepSatiri {
  id: string;
  /** Kullanıcının yazdığı metin. YALNIZ OKUNUR; forma kopyalanmıyor. */
  yazilanBolum: string | null;
  bolumAdi: string | null;
  universite: string | null;
  aciklama: string | null;
  olusturmaAni: string;
}

/**
 * Bekleyen talepler.
 *
 * Kuyruk `status = 'bekliyor'` ile sınırlı ve EN ESKİ önce: sırada
 * bekleyen ilk talebe önce bakılsın. Satırları yalnız yönetici görüyor;
 * kapı RLS'te, bu sorguda değil — ekranı açmak yetki vermiyor.
 *
 * Talebi açan kullanıcının kimliği ÇEKİLMİYOR: karar kullanıcıya değil
 * bölüme veriliyor ve kimlik bilgisi bu ekranda hiçbir kararı
 * değiştirmiyor.
 */
export async function bekleyenBolumTalepleri(): Promise<BolumTalepSatiri[]> {
  const { data, error } = await db
    .from('department_requests')
    .select(
      'id, requested_department, universite, aciklama, created_at, departments ( ad )',
    )
    .eq('status', 'bekliyor')
    .order('created_at', { ascending: true });

  if (error) hata('Talepler alınamadı', error);
  return (data ?? []).map((satir: any) => ({
    id: satir.id,
    yazilanBolum: satir.requested_department ?? null,
    bolumAdi: satir.departments?.ad ?? null,
    universite: satir.universite ?? null,
    aciklama: satir.aciklama ?? null,
    olusturmaAni: satir.created_at,
  }));
}

export interface BolumKarariGirdisi {
  talepId: string;
  karar: 'eklendi' | 'reddedildi';
  /** Kabulde zorunlu, katalogdan seçiliyor. */
  bolumId: string | null;
  /** Kabulde zorunlu, kapalı alan listesinden seçiliyor. */
  alanId: string | null;
  /**
   * YÖNETİMİN İÇ NOTU. Her iki kararda da zorunlu; yalnız denetim
   * kaydına gidiyor ve kullanıcıya hiçbir yerde gösterilmiyor.
   */
  gerekce: string;
  /**
   * KULLANICIYA GÖSTERİLECEK cümle. Her iki kararda da zorunlu; talebi
   * açan kişinin kendi satırına yazılıyor.
   *
   * İç nottan AYRI bir alan olması bir kolaylık değil sınırın kendisi:
   * tek alan olsaydı yönetici iç notu yazarken onu kullanıcının
   * okuyacağını unutabilirdi. İki alan, iki ayrı yazma anı demek.
   */
  kararAciklamasi: string;
}

/**
 * Kuyruk kararı.
 *
 * İMZADA SERBEST METİN YOK. Kullanıcının yazdığı `requested_department`
 * hiçbir parametreye girmiyor: bölüm ve alan her zaman yöneticinin
 * KAPALI LİSTEDEN yaptığı seçim. Serbest metni geçirebilseydik, kuyruğu
 * hızlı kapatmanın en kolay yolu kullanıcının yazdığını olduğu gibi
 * kataloga eklemek olurdu.
 *
 * İMZA ALTI PARAMETRELİ; ESKİ BEŞ PARAMETRELİ SÜRÜM SUNUCUDA DÜŞÜRÜLDÜ.
 * `p_gerekce` yönetimin iç notu, `p_karar_aciklamasi` kullanıcıya
 * gösterilen cümle. İkisi de zorunlu ve sunucu eksik olanı ayrı kodlarla
 * ('gerekce-zorunlu' / 'aciklama-zorunlu') reddediyor.
 */
export async function bolumTalebiniKararaBagla(girdi: BolumKarariGirdisi): Promise<void> {
  const { error } = await db.rpc('bolum_talebini_karara_bagla', {
    p_talep_id: girdi.talepId,
    p_karar: girdi.karar,
    p_department_id: girdi.bolumId,
    p_sector_id: girdi.alanId,
    p_gerekce: girdi.gerekce,
    p_karar_aciklamasi: girdi.kararAciklamasi,
  });

  if (!error) return;
  throw kararHatasi(error);
}

/**
 * Karar RPC'sinin hatası → cümle.
 *
 * Ayrım yine `details` alanından: `secim-zorunlu` ile `esleme-catismasi`
 * aynı `errcode` ile gelebiliyor ama yöneticinin yapacağı iş farklı —
 * biri eksik seçim, öteki bilinçli bir çakışma ve talep kuyruğundan
 * çözülmüyor.
 */
function kararHatasi(error: { code?: string; message?: string; details?: string }): SosyalHata {
  const detay = (error?.details ?? '').trim();
  const cumleler: Record<string, string> = {
    'yonetici-degil': 'Bu işlem için yönetici yetkisi gerekiyor.',
    'gerekce-zorunlu': 'Yönetim notu zorunlu; karar denetim kaydı olmadan yazılmıyor.',
    /*
      AYRI CÜMLE: iki alanın eksikliği aynı işi gerektirmiyor. Tek cümle
      olsaydı yönetici hangi kutuyu doldurması gerektiğini bilemezdi.
    */
    'aciklama-zorunlu':
      'Kullanıcıya gösterilecek açıklama zorunlu; karar sebebi söylenmeden kaydedilmiyor.',
    'gecersiz-karar': 'Geçersiz karar.',
    'talep-bulunamadi': 'Talep bulunamadı ya da başka biri tarafından karara bağlanmış.',
    'secim-zorunlu': 'Kabul için bölüm ve alan seçilmesi gerekiyor.',
    'bolum-bulunamadi': 'Seçilen bölüm katalogda bulunamadı.',
    'alan-bulunamadi': 'Seçilen alan bulunamadı.',
    'esleme-catismasi':
      'Bu bölüm zaten başka bir alana bağlı. Alan değiştirmek bu kuyruktan yapılmıyor.',
  };
  if (cumleler[detay]) return new SosyalHata(cumleler[detay], detay);
  return new SosyalHata(
    `Karar kaydedilemedi: ${error?.message ?? 'bilinmeyen hata'}`,
    'sunucu',
  );
}

/* ============================================================ G aşaması */
/*  KULLANICI ADI — DEĞİŞTİRME VE ESKİ ADRESİN ÇÖZÜMÜ                     */
/* ====================================================================== */

/**
 * Kullanıcı adı RPC'sinin hatasını cümleye çeviriyor.
 *
 * AYRIM YİNE `details` ALANINDAN
 * ------------------------------
 * `sosyal_kullanici_adi_degistir` (20260926020000) dört kodu birden
 * gönderiyor ve ikisi aynı `errcode` ile gelebiliyor: 'profil-yok'
 * P0001, 'gecersiz-kullanici-adi' 23514, 'kullanici-adi-alinmis' 23505,
 * 'oturum-yok' 42501. Yalnız koda bakan bir eşleme kullanıcıyı yanlış
 * eyleme gönderirdi — "alınmış" başka bir ad yazdırır, "kurala uymuyor"
 * yazımı düzelttirir.
 *
 * HAM HATA HİÇ GÖSTERİLMİYOR: tanınmayan bir değer bile veritabanı
 * metnini değil, kullanıcının yapabileceği bir şeyi söyleyen genel bir
 * cümleye düşüyor.
 *
 * BU EŞLEME GERÇEK BİR VERİTABANINDA ÇALIŞTIRILMADI; ölçüm ana oturumda.
 */
function kullaniciAdiRpcHatasi(error: {
  code?: string;
  message?: string;
  details?: string;
}): SosyalHata {
  const detay = (error?.details ?? '').trim();
  const cumleler: Record<string, string> = {
    'kullanici-adi-alinmis': 'Bu kullanıcı adı alınmış. Başka bir ad dene.',
    'gecersiz-kullanici-adi':
      'Kullanıcı adı kurala uymuyor: 3-30 harf, yalnız İngilizce küçük harf.',
    'profil-yok': 'Sosyal profilin bulunamadı; kullanıcı adı değiştirilemedi.',
    'oturum-yok': 'Oturumun kapanmış görünüyor. Yeniden giriş yap.',
  };
  if (cumleler[detay]) return new SosyalHata(cumleler[detay], detay);
  return new SosyalHata('Kullanıcı adı değiştirilemedi. Yeniden deneyebilirsin.', 'sunucu');
}

/**
 * Kullanıcı adını değiştir.
 *
 * KOLON DOĞRUDAN YAZILMIYOR: `username` istemcinin `grant update`
 * listesinde yok ve `kimlik_kilidi` tetikleyicisi doğrudan UPDATE'i
 * reddediyor (20260926020000). Tek yol bu RPC.
 *
 * DÖNEN DEĞER SUNUCUNUN KABUL ETTİĞİ AD: fonksiyon `social_profiles`
 * satırını döndürüyor ve buradan yalnız `username` okunuyor. Çağıran
 * tarafın formdaki metni "kaydedildi" diye göstermesi, sunucunun başka
 * bir değer yazdığı durumda yalan olurdu.
 */
export async function sosyalKullaniciAdiDegistir(yeni: string): Promise<string> {
  const { data, error } = await db.rpc('sosyal_kullanici_adi_degistir', { p_yeni: yeni });
  if (error) throw kullaniciAdiRpcHatasi(error);

  const satir = Array.isArray(data) ? data[0] : data;
  const ad = satir?.username;
  /*
    Satır dönmediyse ad UYDURULMUYOR. "Herhâlde yazdığı ad kaydedildi"
    demek, kaydedilmemiş bir adresi kullanıcıya vermek olurdu.
  */
  if (!ad) throw new SosyalHata('Kullanıcı adı değiştirilemedi. Yeniden deneyebilirsin.', 'sunucu');
  return String(ad);
}

/**
 * Eski kullanıcı adını GÜNCEL adına çözer.
 *
 * SIFIR SATIR "YOK" DEĞİL, "ÇÖZÜM YOK" DEMEK. Fonksiyon yalnız çağıranın
 * zaten görebileceği bir profile çözüm veriyor (`sosyal_gorunur`
 * kapısı); bulamadığında `null` dönüyor ve çağıran taraf MEVCUT güvenli
 * ekranı çiziyor — "böyle bir ad hiç olmadı" diye ayrı bir cevap
 * üretilmiyor, yoksa adres çubuğu bir ad sözlüğüne dönerdi.
 *
 * Hata YUTULMUYOR: sunucuya ulaşılamaması ile çözüm bulunamaması aynı
 * şey değil ve ikisi çağıran tarafta ayrı ele alınıyor.
 */
export async function sosyalKullaniciAdiCoz(ad: string): Promise<string | null> {
  const { data, error } = await db.rpc('sosyal_kullanici_adi_coz', { p_ad: ad });
  if (error) hata('Kullanıcı adı çözülemedi', error);

  const satir = Array.isArray(data) ? data[0] : data;
  return satir?.guncel_username ? String(satir.guncel_username) : null;
}

/* ====================================================================== */
/*  KULLANICI ARAMASI                                                     */
/* ====================================================================== */

/**
 * Arama sonucu satırı — RPC'nin döndürdüğü beş alanın aynısı.
 *
 * `profilId` YOK ve olmayacak: `sosyal_kullanici_ara` (20260926060000)
 * `profile_id` döndürmüyor. Gezinme için gereken tek şey kullanıcı adı
 * (`/profil/<ad>`); kimlik listesi, ileride yazılacak her sorguya hazır
 * bir hedef listesi olurdu.
 */
export interface SosyalAramaSonucu {
  kullaniciAdi: string;
  gorunenAd: string | null;
  avatarYolu: string | null;
  bolumEtiketi: string | null;
  sehir: string | null;
}

/**
 * Sunucudaki `length(sorgu.ad) >= 3` kuralının istemci tarafı.
 *
 * Sayı iki yerde yazılı olsaydı biri değiştiğinde arayüz ya boşuna
 * istek atar ya da sunucunun bulacağı sonucu hiç sormazdı.
 */
export const ARAMA_EN_AZ_HARF = 3;

/**
 * Kullanıcı adı öneki ile arama.
 *
 * ÜÇ HARF ALTINDA İSTEK ATILMIYOR: sunucu zaten sıfır satır dönüyor ve
 * o sıfır "sonuç yok" DEĞİL, "henüz arama yok" demek. İstek atıp boş
 * liste almak, arayüzün ikisini karıştırmasına kapı bırakırdı; bu yüzden
 * ayrım burada, tek yerde.
 *
 * UZUNLUK HAM METİNDE DEĞİL, HARFE İNDİRİLMİŞ METİNDE ölçülüyor:
 * sunucu da `sosyal_gizli.kullanici_adi_normalize`den geçmiş dizenin
 * uzunluğuna bakıyor. "a b" üç karakter ama sıfır harf; ham uzunluğa
 * baksaydık sunucunun kesin olarak boş döneceği bir istek atardık.
 * Gönderilen metin yine HAM: normalleştirme sunucuda tek yerde kalıyor,
 * yoksa iki tanım ayrışır ve kullanıcı kendi adını arayıp bulamazdı.
 */
export async function sosyalKullaniciAra(sorgu: string): Promise<SosyalAramaSonucu[]> {
  if (kullaniciAdiHarfeIndir(sorgu).length < ARAMA_EN_AZ_HARF) return [];

  const { data, error } = await db.rpc('sosyal_kullanici_ara', { p_sorgu: sorgu });
  if (error) hata('Arama yapılamadı', error);

  return (data ?? []).map((satir: any) => ({
    kullaniciAdi: String(satir.username),
    gorunenAd: satir.gorunen_ad ?? null,
    avatarYolu: satir.avatar_path ?? null,
    bolumEtiketi: satir.bolum_etiketi ?? null,
    sehir: satir.sehir ?? null,
  }));
}

/* ====================================================================== */
/*  ALAN TOPLULUKLARI                                                     */
/* ====================================================================== */

/**
 * Bir alan topluluğu ve ÇAĞIRANIN o topluluktaki durumu.
 *
 * Liste ile durum tek çağrıda geliyor (`sosyal_topluluklar`,
 * 20260926030000). İki ayrı çağrı olsaydı arayüz, katılma yetkisi
 * olmayan bir toplulukta da "Katıl" düğmesi çizebilirdi.
 */
export interface AlanToplulugu {
  sektorId: string;
  slug: string;
  ad: string;
  /** Çağıranın bölümü bu topluluğa eşleniyor mu. */
  uygunMu: boolean;
  uyeMiyim: boolean;
  /**
   * Üye sayısı — YALNIZ üye olunan toplulukta dolu, ötekilerde `null`.
   *
   * `null` "sıfır" DEĞİL, "sana verilmiyor" demek; sunucu üye olmayana
   * topluluk büyüklüğünü söylemiyor. Arayüz bu yüzden `null` iken sayıyı
   * hiç çizmiyor — 0 basmak, ölçülmemiş bir sayı uydurmak olurdu.
   */
  uyeSayisi: number | null;
}

/**
 * Alan toplulukları listesi.
 *
 * Boş dizi dönmesi normal bir sonuç: `sectors` boşsa ya da oturum
 * yoksa fonksiyon sıfır satır veriyor. Hata dalı ayrı ve yutulmuyor —
 * "topluluk yok" ile "liste alınamadı" kullanıcıya farklı cümle
 * kurdurur.
 */
export async function sosyalTopluluklariGetir(): Promise<AlanToplulugu[]> {
  const { data, error } = await db.rpc('sosyal_topluluklar', {});
  if (error) hata('Topluluklar alınamadı', error);

  return (data ?? []).map((satir: any) => ({
    sektorId: String(satir.sector_id),
    slug: String(satir.slug),
    ad: String(satir.ad),
    uygunMu: Boolean(satir.uygun_mu),
    uyeMiyim: Boolean(satir.uye_miyim),
    /*
      `null` ile `0` burada ayrılıyor: `Number(null)` sıfır üretirdi ve
      o sıfır ekranda gerçek bir sayı gibi görünürdü.
    */
    uyeSayisi:
      satir.uye_sayisi === null || satir.uye_sayisi === undefined
        ? null
        : Number(satir.uye_sayisi),
  }));
}

/**
 * Topluluk katıl/ayrıl hatasını cümleye çeviriyor.
 *
 * 'bolum-alani-tanimsiz' ile 'topluluk-uygun-degil' aynı ekranda çok
 * farklı iki durum: birincisinde kullanıcının bölümü katalogla
 * eşleşmemiş, ikincisinde başka bir alanın topluluğuna katılmaya
 * çalışılmış. Tek cümle olsaydı ilk durumdaki kullanıcı sorunun kendinde
 * olduğunu sanırdı.
 */
function toplulukHatasi(error: { code?: string; message?: string; details?: string }): SosyalHata {
  const detay = (error?.details ?? '').trim();
  const cumleler: Record<string, string> = {
    'bolum-alani-tanimsiz': 'Bölümün için topluluk henüz tanımlı değil.',
    'topluluk-uygun-degil': 'Bu topluluk senin bölümüne açık değil.',
    'oturum-yok': 'Oturumun kapanmış görünüyor. Yeniden giriş yap.',
  };
  if (cumleler[detay]) return new SosyalHata(cumleler[detay], detay);
  return new SosyalHata('İşlem tamamlanamadı. Yeniden deneyebilirsin.', 'sunucu');
}

/**
 * Topluluğa katıl.
 *
 * `sektorId` bir İSTEK, yetki değil: sunucu çağıranın bölümünden uygun
 * alanı kendisi okuyup karşılaştırıyor. Arayüzün "Katıl" düğmesini
 * yalnız `uygunMu` satırında çizmesi ikinci kapı, tek kapı değil.
 */
export async function sosyalToplulugaKatil(sektorId: string): Promise<void> {
  const { error } = await db.rpc('sosyal_topluluga_katil', { p_sector_id: sektorId });
  if (error) throw toplulukHatasi(error);
}

/**
 * Topluluktan ayrıl.
 *
 * PROFİLE DOKUNMUYOR: görünürlük, kullanıcı adı, bağlantılar ve
 * "Bağlantılarım" kitlesindeki paylaşımlar aynen kalıyor. Tek etki, o
 * topluluğun içeriğine erişimin kapanması.
 */
export async function sosyalTopluluktanAyril(sektorId: string): Promise<void> {
  const { error } = await db.rpc('sosyal_topluluktan_ayril', { p_sector_id: sektorId });
  if (error) throw toplulukHatasi(error);
}
