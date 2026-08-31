import { supabase } from './supabase';
import {
  CV_IMZA_OMRU,
  CV_TURU,
  cvBasvuruYolu,
  cvProfilYolu,
  cvSorunu,
} from './cv-kurallari.mjs';

/* Saf kurallar ./cv-kurallari.mjs içinde; buradan yeniden dışa açılıyor
   ki çağıranlar tek yerden alsın. */
export {
  CV_EN_FAZLA_BAYT,
  CV_IMZA_OMRU,
  CV_TURU,
  baytMetni,
  cvBasvuruYolu,
  cvDosyaAdi,
  cvProfilYolu,
  cvSorunu,
  cvYoluOgrenciyemi,
} from './cv-kurallari.mjs';

/**
 * CV dosyası: profil belgesi ve başvuru anının kopyası.
 *
 * İKİ BELGE, İKİ ANLAM
 * --------------------
 *   student_profiles.cv_path      → öğrencinin GÜNCEL CV'si
 *   applications.cv_snapshot_path → o başvuru anındaki KOPYA
 *
 * Öğrenci CV'sini eylülde değiştirdiğinde ağustostaki başvurunun belgesi
 * değişmemeli: şirket neyi değerlendirdiyse onu görmeye devam etmeli.
 * Bu yüzden başvuru anında dosyanın gerçek bir kopyası çıkarılıyor —
 * yalnızca yolu kopyalamak, aynı dosyayı iki yerden göstermek olurdu ve
 * öğrenci o dosyayı değiştirdiğinde geçmiş başvuru da sessizce değişirdi.
 *
 * KOVA GİZLİ
 * ----------
 * `cvs` kovası public değil. Hiçbir yerde public URL üretilmiyor;
 * görüntüleme kısa ömürlü imzalı adresle yapılıyor. Kovayı public yapmak
 * bütün CV'leri adresi bilen herkese açardı.
 *
 * YETKİ NEREDE
 * ------------
 * Kopyalamayı öğrenci KENDİ yetkisiyle yapıyor: kendi dosyasını indirip
 * yine kendi klasörüne yazıyor. Bu yüzden ne servis anahtarına, ne yeni
 * bir SECURITY DEFINER fonksiyona, ne de Edge Function'a gerek var —
 * istemcinin istediği yere dosya kopyalayabildiği bir uç hiç açılmıyor.
 */

/**
 * CV'yi yükler ve DEPOLAMA YOLUNU döndürür.
 *
 * `upsert` KULLANILMIYOR: kovada UPDATE politikası yok ve olmamalı.
 * Üzerine yazılamayan bir dosya, çıkarılmış bir başvuru kopyasının
 * hiçbir zaman değişmeyeceği anlamına geliyor — değişmezlik uygulama
 * kuralı değil, veritabanı kuralı.
 */
export async function cvYukle(userId: string, dosya: File): Promise<string> {
  const sorun = cvSorunu(dosya);
  if (sorun) throw new Error(sorun);

  const yol = cvProfilYolu(userId);
  const { error } = await supabase.storage
    .from('cvs')
    .upload(yol, dosya, { contentType: CV_TURU });
  if (error) throw new Error('CV yüklenemedi. Bağlantını kontrol edip tekrar dene.');
  return yol;
}

/** Depolamadan dosyayı siler. Bulunamayan dosya hata sayılmıyor. */
export async function cvDosyasiniSil(yol: string | null | undefined): Promise<void> {
  if (!yol) return;
  await supabase.storage.from('cvs').remove([yol]);
}

/**
 * Kısa ömürlü imzalı görüntüleme adresi.
 *
 * Hem öğrencinin kendi CV'si hem şirketin başvuru kopyası bu yoldan
 * açılıyor. Adresi imzalayabilmek dosyayı OKUYABİLMEYİ gerektiriyor;
 * yani asıl kapı depolama politikası, bu fonksiyon değil. Yetkisiz biri
 * çağırırsa imza üretilmiyor.
 */
export async function cvGoruntulemeAdresi(yol: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('cvs')
    .createSignedUrl(yol, CV_IMZA_OMRU);
  if (error || !data?.signedUrl) throw new Error('CV açılamadı. Yetkin olmayabilir.');
  return data.signedUrl;
}

/**
 * Başvuru için DEĞİŞMEZ kopya çıkarır ve yeni yolu döndürür.
 *
 * Öğrenci kendi dosyasını indirip yine kendi klasörüne yazıyor; iki adım
 * da kendi yetkisiyle. Depolama maliyeti başvuru başına bir PDF (en fazla
 * 5 MB) — veri bütünlüğünün karşılığı bu ve kabul edilebilir.
 */
export async function cvBasvuruKopyasiCikar(userId: string, profilCvYolu: string): Promise<string> {
  const { data, error } = await supabase.storage.from('cvs').download(profilCvYolu);
  if (error || !data) throw new Error('CV okunamadı.');

  const hedef = cvBasvuruYolu(userId);
  const { error: yazmaHatasi } = await supabase.storage
    .from('cvs')
    .upload(hedef, data, { contentType: CV_TURU });
  if (yazmaHatasi) throw new Error('CV başvuruya eklenemedi.');
  return hedef;
}

/**
 * Dosyanın depolamadaki gerçek bilgileri: boyut ve yüklenme zamanı.
 *
 * NEDEN LİSTEDEN OKUNUYOR
 * -----------------------
 * Arayüzde "CV · 240 KB · 31 Ağustos" yazabilmek için bu iki bilgi
 * gerekiyor ve ikisi de zaten depolamada duruyor. Yeni bir sütun
 * açmıyoruz: `student_profiles.updated_at` profildeki HER değişiklikte
 * tazeleniyor, onu "CV güncellendi" diye göstermek yanlış olurdu.
 *
 * Okunamazsa null dönüyor ve arayüz yalnızca "PDF" yazıyor — uydurma
 * tarih göstermektense hiç göstermemek doğru.
 */
export async function cvBilgisi(
  yol: string,
): Promise<{ bayt: number | null; yuklenme: string | null } | null> {
  const egikCizgi = yol.lastIndexOf('/');
  if (egikCizgi < 0) return null;
  const klasor = yol.slice(0, egikCizgi);
  const ad = yol.slice(egikCizgi + 1);

  const { data, error } = await supabase.storage.from('cvs').list(klasor, { search: ad });
  if (error || !data) return null;
  const kayit = data.find((d: { name: string }) => d.name === ad) as
    | { created_at?: string; updated_at?: string; metadata?: { size?: number } }
    | undefined;
  if (!kayit) return null;

  return {
    bayt: typeof kayit.metadata?.size === 'number' ? kayit.metadata.size : null,
    yuklenme: kayit.created_at ?? kayit.updated_at ?? null,
  };
}

