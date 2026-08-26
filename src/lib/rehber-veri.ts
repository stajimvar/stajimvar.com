/**
 * Rehber tarafının veritabanı işleri: kaydetme ve okunma sayacı.
 *
 * NEDEN AYRI DOSYA
 * ----------------
 * Rehber içeriğinin kendisi kodda (src/data/rehberler.tsx) — veritabanına
 * girmesi gerekmiyor, yazıyı biz yazıyoruz. Ama iki şey kullanıcıya ait ve
 * kodda duramaz: hangi rehberi kaydettiği ve hangisinin kaç kez okunduğu.
 *
 * Desen fırsat tarafıyla aynı (src/lib/opportunities.ts): ayrı tablo, ayrı
 * dosya, aynı imza.
 *
 * SUPABASE TEMBEL YÜKLENİYOR
 * --------------------------
 * `import { supabase }` dosyanın başında duramıyor. Rehber merkezi ön
 * render ediliyor ve o çizim Node'da yapılıyor; orada `import.meta.env`
 * yok, istemci kurulurken "Cannot read properties of undefined" ile
 * düşüyor ve 217 sayfanın hiçbiri yazılamıyor (ölçüldü).
 *
 * Fonksiyonların içinde `await import()` ile alınınca modül gövdesi
 * Supabase'e hiç dokunmuyor: tarayıcıda çağrıldığında yükleniyor, ön
 * render'da hiç çağrılmıyor.
 */

async function istemci() {
  const { supabase } = await import('./supabase');
  return supabase as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (k: string, v: string) => Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>;
      } & Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>;
      delete: () => {
        eq: (k: string, v: string) => {
          eq: (k: string, v: string) => Promise<{ error: { code?: string; message: string } | null }>;
        };
      };
      insert: (satir: Record<string, string>) => Promise<{ error: { code?: string; message: string } | null }>;
    };
    rpc: (ad: string, arg: Record<string, string>) => Promise<unknown>;
  };
}

/** Kullanıcının kaydettiği rehberlerin slug listesi. */
export async function kaydedilenRehberler(userId: string): Promise<string[]> {
  const db = await istemci();
  const { data, error } = await db.from('saved_guides').select('guide_slug').eq('user_id', userId);
  if (error) throw new Error(`Kaydedilen rehberler yüklenemedi: ${error.message}`);
  return (data ?? []).map((satir) => String(satir.guide_slug));
}

/**
 * Kaydı ekler ya da kaldırır.
 *
 * @param kayitliydi çağrı anındaki durum; true ise kayıt SİLİNİYOR.
 */
export async function rehberKaydiDegistir(
  userId: string,
  slug: string,
  kayitliydi: boolean
): Promise<void> {
  const db = await istemci();
  const tablo = db.from('saved_guides');

  const { error } = kayitliydi
    ? await tablo.delete().eq('user_id', userId).eq('guide_slug', slug)
    : await tablo.insert({ user_id: userId, guide_slug: slug });

  /* 23505 = aynı kayıt zaten var; kullanıcı için sonuç aynı, hata değil. */
  if (error && error.code !== '23505') {
    throw new Error(`Rehber kaydı güncellenemedi: ${error.message}`);
  }
}

/**
 * Rehberlerin okunma sayıları.
 *
 * "En çok okunanlar" bölümünün tek kaynağı bu. Uydurulmuş bir popülerlik
 * sıralaması göstermektense bölümü hiç göstermemek doğru; bu yüzden sayım
 * gerçekten tutuluyor ve veri yetersizse bölüm çizilmiyor.
 */
export async function okunmaSayilari(): Promise<Record<string, number>> {
  try {
    const db = await istemci();
    const { data, error } = await db.from('guide_views').select('guide_slug, views');
    /* Sayaç okunamazsa sayfa çalışmaya devam etsin: bu bir süs verisi. */
    if (error || !data) return {};
    return Object.fromEntries(
      data.map((satir) => [String(satir.guide_slug), Number(satir.views) || 0])
    );
  } catch {
    return {};
  }
}

/**
 * Bir rehberin okunduğunu kaydeder.
 *
 * Sessiz: sayaç yazılamazsa okuyucunun bilmesi gereken bir şey yok.
 * Doğrudan UPDATE yerine fonksiyon çağrılıyor — tabloya yazma yetkisi
 * verilseydi herhangi bir ziyaretçi sayıyı istediği değere getirebilirdi.
 */
export async function rehberOkunduBildir(slug: string): Promise<void> {
  try {
    const db = await istemci();
    await db.rpc('rehber_okundu', { slug });
  } catch {
    /* sayaç kritik değil */
  }
}

/* ------------------------------------------------------------- işverenler */

/**
 * Kullanıcının kaydettiği işverenlerin slug listesi.
 *
 * Rehber kaydetmeyle aynı kalıp, ayrı tablo: "bu yazıyı sonra okurum" ile
 * "bu şirkete başvuracağım" farklı niyetler ve aynı listede durmaları
 * ikisini de kullanışsız yapardı.
 */
export async function kaydedilenIsverenler(userId: string): Promise<string[]> {
  const db = await istemci();
  const { data, error } = await db.from('saved_employers').select('employer_slug').eq('user_id', userId);
  if (error) throw new Error(`Kaydedilen işverenler yüklenemedi: ${error.message}`);
  return (data ?? []).map((satir) => String(satir.employer_slug));
}

/** @param kayitliydi çağrı anındaki durum; true ise kayıt SİLİNİYOR. */
export async function isverenKaydiDegistir(
  userId: string,
  slug: string,
  kayitliydi: boolean
): Promise<void> {
  const db = await istemci();
  const tablo = db.from('saved_employers');
  const { error } = kayitliydi
    ? await tablo.delete().eq('user_id', userId).eq('employer_slug', slug)
    : await tablo.insert({ user_id: userId, employer_slug: slug });
  if (error && error.code !== '23505') {
    throw new Error(`İşveren kaydı güncellenemedi: ${error.message}`);
  }
}

/* ---------------------------------------------------------------- bölümler */

/** Kullanıcının takip ettiği bölümlerin slug listesi. */
export async function takipEdilenBolumler(userId: string): Promise<string[]> {
  const db = await istemci();
  const { data, error } = await db
    .from('saved_departments')
    .select('department_slug')
    .eq('user_id', userId);
  if (error) throw new Error(`Takip edilen bölümler yüklenemedi: ${error.message}`);
  return (data ?? []).map((satir) => String(satir.department_slug));
}

/** @param takiptenMiydi çağrı anındaki durum; true ise takip BIRAKILIYOR. */
export async function bolumTakibiDegistir(
  userId: string,
  slug: string,
  takiptenMiydi: boolean
): Promise<void> {
  const db = await istemci();
  const tablo = db.from('saved_departments');
  const { error } = takiptenMiydi
    ? await tablo.delete().eq('user_id', userId).eq('department_slug', slug)
    : await tablo.insert({ user_id: userId, department_slug: slug });
  if (error && error.code !== '23505') {
    throw new Error(`Bölüm takibi güncellenemedi: ${error.message}`);
  }
}
