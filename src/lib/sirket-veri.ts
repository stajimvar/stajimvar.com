/**
 * Şirket panelinin veri işleri.
 *
 * SUPABASE TEMBEL YÜKLENİYOR
 * --------------------------
 * `import { supabase }` dosyanın başında duramıyor: bu ağaç ön render
 * tarafından da taranabiliyor ve orada `import.meta.env` yok. Aynı tuzağa
 * rehber tarafında düşüldü (src/lib/rehber-veri.ts başındaki nota bakın).
 *
 * ASIL KAPI BURASI DEĞİL
 * ----------------------
 * Yetki kontrolü veritabanında: `applications` SELECT politikası şirketin
 * doğrulanmış olmasını da soruyor. Buradaki kademe hesabı yalnızca doğru
 * ekranı göstermek için — arayüz kandırılabilir, RLS kandırılamaz.
 */

import { kademeHesapla } from './sirket-kademe.mjs';

/* --------------------------------------------------------- ekip rolü */

export type EkipRolu = 'Owner' | 'Recruiter' | 'Viewer';

const TANINAN_ROLLER: EkipRolu[] = ['Owner', 'Recruiter', 'Viewer'];

/**
 * `company_members.recruiter_role` → tanınan rol.
 *
 * Tanınmayan ya da boş değer en DAR role düşüyor ('Viewer'):
 * varsayılanı geniş tutmak, veri bozulduğunda yetkiyi genişletirdi.
 * Sunucudaki `sirket_rolum` ile aynı kural (20261122010000).
 */
function ekipRolu(uyelik: { recruiter_role?: string | null } | undefined): EkipRolu | null {
  if (!uyelik) return null;
  const ham = (uyelik.recruiter_role ?? '').trim() as EkipRolu;
  return TANINAN_ROLLER.includes(ham) ? ham : 'Viewer';
}

/**
 * Başvuruya yazabilir mi — `sirket_basvuru_yazabilir` politikasının
 * istemci kopyası. `is_owner` bayrağı da kabul ediliyor: sahipleri
 * işaretleyen göçler (0011, 20260902010000) o bayrağı kuruyor ve rol
 * metni ileride boş kalırsa sahip kilitlenmemeli.
 */
function basvuruYazabilirMi(
  uyelik: { recruiter_role?: string | null; is_owner?: boolean | null } | undefined,
): boolean {
  if (!uyelik) return false;
  if (uyelik.is_owner) return true;
  const rol = ekipRolu(uyelik);
  return rol === 'Owner' || rol === 'Recruiter';
}

async function istemci() {
  const { supabase } = await import('./supabase');
  return supabase as unknown as {
    from: (t: string) => any;
    rpc: (ad: string, arg?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
    storage: {
      from: (kova: string) => {
        upload: (
          yol: string,
          dosya: File,
          secenek?: { upsert?: boolean; contentType?: string }
        ) => Promise<{ error: { message: string } | null }>;
        getPublicUrl: (yol: string) => { data: { publicUrl: string } };
      };
    };
  };
}

export interface SirketBaglami {
  companyId: string | null;
  ad: string;
  slug: string;
  /**
   * `companies.logo_url` — üst çubuktaki hesap çipinde şirketin kendi
   * logosu (27 Eylül 2026). Herkese açık sütun; aynı okumadan geliyor,
   * ikinci sorgu yok. Yoksa çip genel bina simgesine düşüyor.
   */
  logoUrl?: string | null;
  siteUrl: string | null;
  hrEmail: string | null;
  vkn: string | null;
  dogrulandi: boolean;
  /**
   * Doğrulama reddedildiyse sebebi ve tarihi.
   *
   * VKN girili ama `dogrulandi` false olan şirketin iki hâli var:
   * sırada bekliyor ya da reddedilmiş. İkisini ayırt edemeyince ekran
   * herkese "inceleniyor" diyordu ve reddedilen şirket neyi
   * düzelteceğini bilmiyordu.
   */
  dogrulamaNotu: string | null;
  dogrulamaReddiAt: string | null;
  kademe: number;
  /** Ekip rolü: 'Owner' | 'Recruiter' | 'Viewer'. Üye değilse null. */
  rol: EkipRolu | null;
  /** Başvuruya yazabilir mi — sunucudaki kuralın istemci kopyası. */
  basvuruYazabilir: boolean;
}

/**
 * Kullanıcının şirket bağlamı.
 *
 * Bir kişi birden çok şirkete üye olabiliyor; ilk üyelik alınıyor.
 * Çoklu şirket seçimi ileride gerekirse buraya bir seçici gelecek —
 * bugün hiç kimsede yok ve olmayan bir durum için ekran açmak, olmayan
 * bir sorunu çözmek olur.
 */
export async function sirketBaglami(
  userId: string | null,
  yoneticiMi: boolean
): Promise<SirketBaglami> {
  const bos: SirketBaglami = {
    companyId: null,
    ad: '',
    slug: '',
    siteUrl: null,
    hrEmail: null,
    vkn: null,
    dogrulandi: false,
    dogrulamaNotu: null,
    dogrulamaReddiAt: null,
    kademe: kademeHesapla({ yoneticiMi }),
    /* Üye değil: rol yok, yazamaz. Panel zaten açılmıyor. */
    rol: null,
    basvuruYazabilir: false,
  };
  if (!userId) return bos;

  try {
    const db = await istemci();
    const { data: uyelik } = await db
      .from('company_members')
      .select('company_id, recruiter_role, is_owner')
      .eq('user_id', userId)
      .limit(1);

    const companyId = uyelik?.[0]?.company_id ?? null;
    if (!companyId) return bos;

    const { data: sirket } = await db
      .from('companies')
      .select('id, name, slug, website_url, verified, logo_url')
      .eq('id', companyId)
      .maybeSingle();

    if (!sirket) return bos;

    /*
      İK e-postası ve VKN artık tablo sütunundan okunamıyor (20261016010000
      sütun yetkisini geri aldı); yalnız üyeye açık RPC veriyor. Satır
      gelmezse (üye değil, RPC yok) değerler null — uydurulmuyor.
    */
    const ozel = await sirketOzelBilgileri(companyId);

    return {
      companyId: sirket.id,
      ad: sirket.name ?? '',
      slug: sirket.slug ?? '',
      logoUrl: (sirket as { logo_url?: string | null }).logo_url?.trim() || null,
      siteUrl: sirket.website_url ?? null,
      hrEmail: ozel?.hrEmail ?? null,
      vkn: ozel?.vkn ?? null,
      dogrulandi: Boolean(sirket.verified),
      dogrulamaNotu: ozel?.dogrulamaNotu ?? null,
      dogrulamaReddiAt: ozel?.dogrulamaReddiAt ?? null,
      kademe: kademeHesapla({ uyeMi: true, dogrulanmisMi: Boolean(sirket.verified), yoneticiMi }),
      /*
        EKİP ROLÜ (5 Ekim 2026). `recruiter_role` 0001'den beri vardı ama
        hiçbir yerde okunmuyordu. Boş/tanınmayan değer en DAR role
        düşüyor — varsayılanı geniş tutmak, veri bozulduğunda yetkiyi
        genişletirdi. Sunucudaki `sirket_rolum` ile AYNI kural.
      */
      rol: ekipRolu(uyelik?.[0]),
      /*
        Arayüz bu bayrakla yazma eylemlerini çiziyor. YETKİ DEĞİL, yetkinin
        ÖNCEDEN GÖSTERİLMESİ: asıl kapı `sirket_basvuru_yazabilir`
        politikasında (20261122010000). Burada true dönse bile sunucu
        reddediyor.
      */
      basvuruYazabilir: basvuruYazabilirMi(uyelik?.[0]),
    };
  } catch {
    /* Bağlam okunamazsa kullanıcı kapıda kalıyor; panel açılmıyor. */
    return bos;
  }
}

/**
 * Şirketin özel bilgileri — `sirket_ozel_bilgilerim` RPC (20261016010000).
 *
 * `hr_email`, `vkn`, `mersis`, `vkn_dogrulandi_at` sütunları anon ve
 * authenticated'dan geri alındı; tablo sorgusuna bu adları yazmak
 * "permission denied" demek. RPC `security definer`, üye ya da yönetici
 * değilse SIFIR satır: "yok" ile "göremezsin" ayrılmıyor, var-yok
 * sızdırılmıyor. Sıfır satır burada `null`; hata da `null` — çağıran
 * boş alan çiziyor, uydurma değer üretmiyor.
 */
export async function sirketOzelBilgileri(companyId: string): Promise<{
  hrEmail: string | null;
  vkn: string | null;
  mersis: string | null;
  vknDogrulandiAt: string | null;
  /* Ret notu ve tarihi (20261104010000): bunlar olmadan reddedilen şirket
     ekranda süresiz "inceleniyor" görüyordu. */
  dogrulamaNotu: string | null;
  dogrulamaReddiAt: string | null;
} | null> {
  try {
    const db = await istemci();
    const { data, error } = await db.rpc('sirket_ozel_bilgilerim', { p_company: companyId });
    if (error) return null;
    const satir = (Array.isArray(data) ? data[0] : data) as
      | {
          hr_email?: string | null;
          vkn?: string | null;
          mersis?: string | null;
          vkn_dogrulandi_at?: string | null;
          dogrulama_notu?: string | null;
          dogrulama_reddi_at?: string | null;
        }
      | undefined;
    if (!satir) return null;
    return {
      hrEmail: satir.hr_email ?? null,
      vkn: satir.vkn ?? null,
      mersis: satir.mersis ?? null,
      vknDogrulandiAt: satir.vkn_dogrulandi_at ?? null,
      dogrulamaNotu: satir.dogrulama_notu ?? null,
      dogrulamaReddiAt: satir.dogrulama_reddi_at ?? null,
    };
  } catch {
    return null;
  }
}

/** Şirketin ilanları — taslaklar dahil (RLS zaten üyeye açıyor). */
export async function sirketIlanlari(companyId: string) {
  const db = await istemci();
  const { data, error } = await db
    .from('listings')
    .select(
      /*
        `review_note` OKUNUYOR: reddedilen ilan taslağa düşüyor ve
        nedeni şirketin bu listede görmesi gerekiyor. Şirket bu kolona
        YAZAMIYOR — insert/update yetki listesine girmedi, yalnız
        select verildi.
      */
      'id, title, city, status, origin, application_method, applicants_count, ' +
        /* `work_type` ilan kartındaki konum satırı için: "İstanbul · Hibrit".
           Okunmadığı sürece kart çalışma biçimini yazamıyordu ve uydurmak
           yerine hiç yazmıyordu. Salt okuma, tek kolon. */
        'posted_at, created_at, apply_url, application_deadline, review_note, reviewed_at, work_type, ' +
        /* Otomatik kontrolün son sonucu (20261120010000). Salt okuma. */
        'kontrol_durumu, kontrol_gerekceleri, kontrol_at, yonetici_incelemesi_gerekli, ' +
        /*
          Yayındaki ilanın BEKLEYEN değişikliği (20261120010000): canlı
          sürüm yayında kalıyor, değişiklik kendi durumuyla bekliyor.
          Tablo yalnız şirket üyesine açık.
        */
        'bekleyen:ilan_bekleyen_degisiklikleri(durum, gerekceler, kontrol_at)'
    )
    .eq('company_id', companyId)
    /* Arşivlenen ilan listeden kalkıyor ama veri duruyor: başvurular ve
       öğrencinin geçmişi olduğu gibi kalsın diye silinmiyor. */
    .neq('status', 'archived')
    .order('created_at', { ascending: false });
  if (error) throw new Error('İlanlar yüklenemedi.');
  return data ?? [];
}

/**
 * Yeni ilanı TASLAK olarak kaydeder.
 *
 * `gonderimAnahtari` formun tek gönderim kimliği: çift tıklama ya da ağ
 * tekrarında ikinci istek tekillik kuralına (company_id,
 * gonderim_anahtari) takılıyor ve ilk kayıt geri okunuyor — aynı ilan
 * ikinci kez oluşmuyor.
 */
export async function ilanKaydet(
  satir: Record<string, unknown>,
  companyId: string,
  gonderimAnahtari?: string,
) {
  const db = await istemci();
  const { data, error } = await db
    .from('listings')
    .insert({
      ...satir,
      company_id: companyId,
      ...(gonderimAnahtari ? { gonderim_anahtari: gonderimAnahtari } : {}),
    } as never)
    .select('id')
    .single();
  if (error) {
    const kod = (error as { code?: string }).code ?? '';
    if (kod === '23505' && gonderimAnahtari) {
      const { data: mevcut } = await db
        .from('listings')
        .select('id')
        .eq('company_id', companyId)
        .eq('gonderim_anahtari' as never, gonderimAnahtari as never)
        .maybeSingle();
      if (mevcut) return mevcut as { id: string };
    }
    const mesaj = (error as { message?: string }).message ?? '';
    throw new Error(
      /row-level security/i.test(mesaj)
        ? 'Bu şirket için ilan açma yetkin görünmüyor.'
        : 'İlan kaydedilemedi.'
    );
  }
  return data as { id: string };
}

/** Şirketin gördüğü dört durum (+ hiç gönderilmemiş taslak). */
export type IlanKontrolDurumu =
  | 'yayinda'
  | 'kontrol_ediliyor'
  | 'duzeltme_gerekiyor'
  | 'inceleme_gerekiyor'
  | 'taslak';

export type IlanKontrolGerekcesi = { alan: string | null; mesaj: string; kural: string };

export type IlanKontrolSonucu = {
  id: string;
  durum: IlanKontrolDurumu;
  gerekceler: IlanKontrolGerekcesi[];
  kontrolZamani: string | null;
  kuralSurumu: string | null;
  /*
    Yayındaki ilanın bekleyen değişikliği. Varsa canlı sürüm (son onaylı)
    yayında; değişiklik kendi durumuyla bekliyor. Yoksa null.
  */
  degisiklik: {
    durum: Exclude<IlanKontrolDurumu, 'yayinda' | 'taslak'>;
    gerekceler: IlanKontrolGerekcesi[];
    kontrolZamani: string | null;
  } | null;
};

/**
 * Bekleyen değişikliğin içeriği (sunucu kolon adlarıyla). Düzenleme
 * formu açılırken canlı satır yerine BU değerler gösterilmeli: şirket
 * kaydettiği ama henüz yayına girmemiş metni düzeltiyor.
 */
export type IlanBekleyenDegisikligi = {
  icerik: Record<string, unknown>;
  durum: 'bekliyor' | 'duzeltme' | 'inceleme';
  gerekceler: IlanKontrolGerekcesi[];
  kontrol_at: string | null;
};

/**
 * İlanı YAYINA GÖNDERİR (20261120010000).
 *
 * Kontrol sunucuda, aynı istekte çalışıyor: sorunsuzsa ilan yayında;
 * eksikse "düzeltme gerekiyor" ve alan alan ne yapılacağı; şüpheliyse
 * "inceleme gerekiyor". Kontrol tamamlanamadıysa "kontrol ediliyor" —
 * sunucu sınırlı sayıda yeniden deniyor. Tarayıcının yayın yetkisi yok;
 * yayına alan sunucudaki kontrol.
 *
 * Aynı ilan iki kez gönderilirse sunucu yeni kontrol yazmıyor, var olan
 * sonucu döndürüyor.
 */
export async function ilanYayinaGonder(id: string): Promise<IlanKontrolSonucu> {
  const db = await istemci();
  const { data, error } = await db.rpc('ilan_yayina_gonder' as never, { p_ilan: id } as never);
  if (error) {
    const mesaj = (error as { message?: string }).message ?? '';
    throw new Error(
      /yetkin yok/i.test(mesaj)
        ? 'Bu şirkette ilan yayımlama yetkin yok.'
        : /Arsivlenmis/i.test(mesaj)
          ? 'Arşivlenmiş ilan yayına gönderilemez.'
          : 'İlan gönderilemedi. Bağlantını kontrol edip yeniden dene.'
    );
  }
  return data as unknown as IlanKontrolSonucu;
}

/** Satırdaki alanlardan şirketin gördüğü durum (liste ve kartlar için). */
export function ilanKontrolDurumu(satir: {
  status?: string | null;
  kontrol_durumu?: string | null;
}): IlanKontrolDurumu {
  if (satir.status === 'published') return 'yayinda';
  if (satir.kontrol_durumu === 'bekliyor') return 'kontrol_ediliyor';
  if (satir.kontrol_durumu === 'duzeltme') return 'duzeltme_gerekiyor';
  if (satir.kontrol_durumu === 'inceleme') return 'inceleme_gerekiyor';
  return 'taslak';
}

export async function ilanDurumuDegistir(
  id: string,
  durum: 'published' | 'closed' | 'draft' | 'archived'
) {
  /*
    YAYINA ALMA DOĞRUDAN YAZIM DEĞİL: sunucudaki kontrolden geçiyor.
    Kapalı ilanı yeniden açmak da aynı kapıdan.
  */
  if (durum === 'published') {
    await ilanYayinaGonder(id);
    return;
  }
  const db = await istemci();
  const { error } = await db
    .from('listings')
    .update({ status: durum })
    .eq('id', id);
  if (error) throw new Error('İlan güncellenemedi.');
}

/** Düzenleme için tek ilanı okur. RLS zaten yalnızca kendi ilanını veriyor. */
export async function ilanOku(id: string) {
  const db = await istemci();
  const { data, error } = await db
    .from('listings')
    .select(
      'id, company_id, title, city, work_type, term, duration, is_paid, stipend_text, ' +
        'description, application_deadline, status, origin, ' +
        'mandatory_staj_accepted, voluntary_staj_accepted, kontrol_durumu, kontrol_gerekceleri, kontrol_at, ' +
        'yonetici_incelemesi_gerekli, bekleyen:ilan_bekleyen_degisiklikleri(icerik, durum, gerekceler, kontrol_at)'
    )
    .eq('id', id)
    .maybeSingle();
  if (error || !data) throw new Error('İlan okunamadı.');
  return data as Record<string, unknown>;
}

/**
 * İlanı günceller.
 *
 * Gövde `ilanSatiri()` üretiyor; yani düzenleme ile oluşturma AYNI alan
 * kümesini yazıyor. `company_id`, `origin` ve `status` burada
 * gönderilmiyor: ilkinin ikisi zaten yalnızca INSERT'te yazılabiliyor,
 * durum ise ayrı bir eylem (yayınla/kapat) ve düzenleme sırasında sessizce
 * değişmemeli.
 */
export async function ilanGuncelle(id: string, satir: Record<string, unknown>) {
  const db = await istemci();
  const { company_id: _c, origin: _o, status: _s, posted_at: _p, ...alanlar } = satir;
  const { error } = await db.from('listings').update(alanlar).eq('id', id);
  if (error) {
    const mesaj = (error as { message?: string }).message ?? '';
    throw new Error(
      /row-level security|permission denied/i.test(mesaj)
        ? 'Bu ilanı düzenleme yetkin görünmüyor.'
        : 'İlan güncellenemedi.'
    );
  }
}

/**
 * İlanı KALICI siler.
 *
 * ÖLÇÜLDÜ: `applications_listing_id_fkey` ON DELETE CASCADE. Yani ilanı
 * silmek, o ilana yapılmış HER BAŞVURUYU da siliyor — şirketin kaydını
 * da, öğrencinin kendi başvuru geçmişini de. Bu yüzden bu fonksiyon
 * yalnızca başvurusu OLMAYAN ilan için çağrılıyor; başvurusu olanda
 * arşivleme kullanılıyor.
 *
 * Sayım burada da yapılıyor: çağıran tarafın kontrolüne güvenmek, araya
 * giren bir başvuruyu kaçırmak demek.
 */
export async function ilanSil(id: string) {
  const db = await istemci();
  const { count, error: sayimHatasi } = await db
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('listing_id', id);
  if (sayimHatasi) throw new Error('Başvurular okunamadı; ilan silinmedi.');
  if ((count ?? 0) > 0) {
    throw new Error('Bu ilana başvuru gelmiş; silmek yerine arşivleyin.');
  }

  const { error } = await db.from('listings').delete().eq('id', id);
  if (error) throw new Error('İlan silinemedi.');
}

/**
 * VKN kaydı — Kademe 2 başvurusu.
 *
 * VKN'yi kaydetmek şirketi DOĞRULAMIYOR: `companies.verified` yalnızca
 * yönetici tarafından açılıyor. VKN herkese açık bir bilgi ve tek başına
 * o şirketi temsil ettiğini kanıtlamıyor.
 */
export async function vknKaydet(companyId: string, vkn: string, mersis?: string) {
  const db = await istemci();
  const { error } = await db
    .from('companies')
    .update({ vkn: vkn.trim(), mersis: mersis?.trim() || null })
    .eq('id', companyId);
  if (error) {
    const mesaj = (error as { message?: string }).message ?? '';
    throw new Error(
      /companies_vkn_check/i.test(mesaj)
        ? 'VKN doğrulamayı geçmedi. 10 haneli numarayı kontrol et.'
        : /duplicate|unique/i.test(mesaj)
          ? 'Bu VKN başka bir şirkette kayıtlı. Yanlışsa bize yaz.'
          : 'VKN kaydedilemedi.'
    );
  }
}

/**
 * Başvuranlar — yalnızca Kademe 2'de veri döner; kapı RLS'te.
 *
 * `applied_at` ile sıralanıyor: bu tabloda `created_at` YOK. Önceki
 * hâlinde olmayan bir sütun isteniyordu ve sorgu sessizce hata verip
 * boş liste dönüyordu — yani doğrulanmış şirket de kart göremiyordu.
 */
export async function sirketBasvurulari(companyId: string) {
  const db = await istemci();
  const { data, error } = await db
    .from('applications')
    .select(
      'id, status, applied_at, match_score, listing_id, student_id, cover_letter, cv_path, ' +
        'cv_snapshot_path, profile_snapshot, contact_share_consent_at, application_method, paylasim_izni_at, ' +
        'interview_date, interview_time, interview_type, interview_location, ' +
        'interview_note, interview_response, interview_responded_at, ' +
        'status_changed_at, offer_note, offer_start_date, offer_compensation, ' +
        /* Sorumlu atama (20261123010000). Salt okuma; yazma RPC'den. */
        /*
          `aday_ilerleme_at`: bekleme süresi BUNDAN hesaplanıyor
          (20261127010000). `updated_at` de okunuyor ama yalnız
          gösterim için — iç işlemler onu tazeliyor.
        */
        'atanan_uye, atanan_at, updated_at, aday_ilerleme_at, ' +
        /*
          Teklif özeti çalışma biçimini, süreyi ve ücreti İLANDAN
          okuyor: şirket teklif gönderirken bunları tekrar yazmıyor.
        */
        'listings!inner(id, title, company_id, work_type, duration, stipend_text)'
    )
    .eq('listings.company_id', companyId)
    .order('applied_at', { ascending: false });

  /*
    Kademe 1'de RLS satır döndürmüyor; bu bir hata değil, kuralın
    kendisi. Boş liste dönüyor ve ekran "doğrulama gerekiyor" diyor.
  */
  if (error) return [];

  return (data ?? []).map((s: Record<string, unknown>) => ({
    ...s,
    ilanBasligi: (s.listings as { title?: string } | null)?.title ?? null,
    ilanCalismaBicimi: (s.listings as { work_type?: string } | null)?.work_type ?? null,
    ilanSuresi: (s.listings as { duration?: string } | null)?.duration ?? null,
    ilanUcreti: (s.listings as { stipend_text?: string } | null)?.stipend_text ?? null,
  }));
}

/**
 * BAŞVURU ANI ↔ GÜNCEL PROFİL (20261121010000)
 *
 * Başvuru rızasının kapsadığı alanların (başvuru kopyasıyla aynı küme)
 * GÜNCEL hâli. Sunucu yalnız o başvurunun ilanının sahibi doğrulanmış
 * şirketin üyesine ve yalnız rıza varsa döndürüyor; telefon, e-posta,
 * not ortalaması, tercihler bu yoldan gelmiyor.
 */
export type AdayGuncelProfili = {
  ad: string | null;
  fotoUrl: string | null;
  universite: string | null;
  bolum: string | null;
  sinif: string | null;
  sehir: string | null;
  github: string | null;
  portfolyo: string | null;
  linkedin: string | null;
  rozetler: string[];
  yetenekler: string[];
  diller: string[];
  projeler: { baslik: string; aciklama: string | null; adres: string | null }[];
  guncellendi: string | null;
  /** Adaya yönelik son gerçek ilerleme; bekleme bundan hesaplanıyor. */
  adayIlerlemesi: string | null;
};

export async function basvuruAdayGuncelProfili(
  basvuruId: string,
): Promise<{ riza: boolean; guncel: AdayGuncelProfili | null }> {
  const db = await istemci();
  const { data, error } = await db.rpc('basvuru_aday_guncel_profili' as never, { p_basvuru: basvuruId } as never);
  if (error) throw new Error('Adayın güncel profili alınamadı.');
  const d = (data ?? {}) as { riza?: boolean; guncel?: AdayGuncelProfili | null };
  return { riza: Boolean(d.riza), guncel: d.guncel ?? null };
}

/**
 * ADAYIN PAYLAŞIMLARI — yalnız öğrencinin izin verdiği başvuruda
 *
 * `izin: false` → öğrenci bu başvuruda paylaşım izni vermedi (eski
 * başvurular dahil). `profilGorunur: false` → izin var ama sosyal profil
 * yayında değil; gizli profil açılmıyor. Görseller `sosyal-paylasim`
 * kovasından şirket üyesinin oturumuyla iniyor (dar depolama izni).
 */
export type AdayPaylasimi = {
  id: string;
  aciklama: string | null;
  tarih: string;
  medya: { yol: string; genislik: number | null; yukseklik: number | null; alt: string | null }[];
};

export async function basvuruAdayPaylasimlari(basvuruId: string): Promise<{
  izin: boolean;
  izinTarihi: string | null;
  profilGorunur: boolean;
  kullaniciAdi: string | null;
  paylasimlar: AdayPaylasimi[];
}> {
  const db = await istemci();
  const { data, error } = await db.rpc('basvuru_aday_paylasimlari' as never, { p_basvuru: basvuruId } as never);
  if (error) throw new Error('Adayın paylaşımları alınamadı.');
  const d = (data ?? {}) as Record<string, unknown>;
  return {
    izin: Boolean(d.izin),
    izinTarihi: (d.izinTarihi as string | null) ?? null,
    profilGorunur: Boolean(d.profilGorunur),
    kullaniciAdi: (d.kullaniciAdi as string | null) ?? null,
    paylasimlar: Array.isArray(d.paylasimlar) ? (d.paylasimlar as AdayPaylasimi[]) : [],
  };
}

/**
 * Kopyası yetenek taşımayan (eski) başvurunun yetenekleri.
 *
 * Şirket öğrenci tablolarını artık DOĞRUDAN okuyamıyor (20261121010000:
 * geniş okuma politikaları kaldırıldı). Liste sunucudan, başvuru
 * kimliğiyle geliyor: yalnız ilanın sahibi doğrulanmış şirkete ve yalnız
 * başvuruda bilgi paylaşımına rıza varsa; rıza yoksa boş.
 */
export async function basvuruAdayYetenekleri(basvuruId: string) {
  const db = await istemci();
  const { data, error } = await db.rpc('basvuru_aday_yetenekleri' as never, { p_basvuru: basvuruId } as never);
  if (error) return [];
  return ((data ?? []) as unknown as string[]).map((name) => ({ name }));
}

/** Başvuru durumunu değiştirir. RLS doğrulanmış şirket dışına kapalı. */
export async function basvuruDurumuDegistir(id: string, durum: string) {
  const db = await istemci();
  const { error } = await db.from('applications').update({ status: durum }).eq('id', id);
  if (error) throw new Error('Başvuru durumu güncellenemedi.');
}

/**
 * GÖRÜŞMEYE DAVET ET
 *
 * Durum ve davetin içeriği TEK yazımda gidiyor: önce durumu değiştirip
 * sonra tarihi yazmak, arada kalan anda öğrenciye içi boş bir "Görüşme
 * daveti aldın" göstermek olurdu.
 *
 * `interview_response` boşaltılıyor: yeni davet, eski yanıtı geçersiz
 * kılıyor. Şirketin yazabildiği tek yanıt değeri budur — öğrencinin
 * yerine "katılacak" diyemiyor (applications_guard_interview_response).
 *
 * Ücret, sözleşme ve nihai şartlar burada SORULMUYOR: onlar görüşmede
 * netleşiyor ve tekliften önce sorulursa görüşmenin anlamı kalmaz.
 */
export async function gorusmeyeDavetEt(
  id: string,
  davet: { tarih: string; saat: string; tur: string; yer: string; not: string },
) {
  const db = await istemci();
  const { error } = await db
    .from('applications')
    .update({
      status: 'interview_scheduled',
      interview_date: davet.tarih ? davet.tarih : null,
      interview_time: davet.saat ? davet.saat : null,
      interview_type: davet.tur ? davet.tur : null,
      interview_location: davet.yer.trim() ? davet.yer.trim() : null,
      interview_note: davet.not.trim() ? davet.not.trim() : null,
      interview_response: null,
      interview_responded_at: null,
    })
    .eq('id', id);
  if (error) throw new Error('Görüşme daveti gönderilemedi.');
}

/**
 * TEKLİF GÖNDER
 *
 * Durum ve teklifin içeriği TEK yazımda gidiyor: önce durumu değiştirip
 * sonra notu yazmak, arada kalan anda öğrenciye içi boş bir "Teklif
 * aldın" göstermek olurdu.
 *
 * ÜCRET ARTIK SORULUYOR: gerçek teklif görüşmeden sonra geliyor ve
 * ücret çoğu zaman orada netleşiyor. Boş bırakılırsa ilandaki ücret
 * bilgisi geçerli kalıyor — aynı şey iki kez yazılmıyor.
 *
 * Çalışma biçimi ve süre burada SORULMUYOR: ikisi de ilanda duruyor ve
 * öğrenci teklif ekranında ilandan okuyor.
 */
export async function teklifGonder(
  id: string,
  teklif: { not: string; baslangic: string; ucret: string },
) {
  const db = await istemci();
  const { error } = await db
    .from('applications')
    .update({
      status: 'offer_extended',
      offer_note: teklif.not.trim() ? teklif.not.trim() : null,
      offer_start_date: teklif.baslangic ? teklif.baslangic : null,
      offer_compensation: teklif.ucret.trim() ? teklif.ucret.trim() : null,
    })
    .eq('id', id);
  if (error) throw new Error('Teklif gönderilemedi.');
}

/**
 * KABUL EDİLMİŞ TEKLİFTE KARŞI TARAFIN İLETİŞİMİ
 *
 * Kapı veritabanında: `basvuru_iletisimi` yalnızca teklif kabul
 * edilmişse ve çağıran taraf o başvurunun öğrencisi ya da ilanın
 * DOĞRULANMIŞ şirketinin üyesiyse satır döndürüyor. Burada ek bir
 * kontrol yok; olsaydı asıl kuralın nerede olduğu belirsizleşirdi.
 *
 * Satır yoksa `null`: bu bir hata değil, kapının kapalı olması.
 */
export async function basvuruIletisimi(id: string) {
  const db = await istemci();
  const { data, error } = await db.rpc('basvuru_iletisimi', { p_basvuru: id });
  if (error) throw new Error('İletişim bilgileri şu anda yüklenemedi.');
  const satir = (data ?? [])[0];
  return satir ? { ad: satir.ad, eposta: satir.eposta, telefon: satir.telefon, unvan: satir.unvan } : null;
}

/**
 * Mülakat tarihi.
 *
 * DURUMDAN BAĞIMSIZ: tarih girmek adayı mülakata almanın şartı değil ve
 * durum değişimini engellemiyor. Boş dize null yazıyor — "tarih
 * kaldırıldı" ile "boş dize" aynı şey olmalı.
 */
export async function mulakatTarihiYaz(id: string, tarih: string) {
  const db = await istemci();
  const { error } = await db
    .from('applications')
    .update({ interview_date: tarih ? tarih : null })
    .eq('id', id);
  if (error) throw new Error('Mülakat tarihi kaydedilemedi.');
}

/**
 * Adaya not.
 *
 * DURUMA DOKUNMUYOR: not yazmak bir karar değil. Önce durumu da
 * 'under_review' yapıyordu; reddedilmiş bir başvuruya not eklemek onu
 * sessizce yeniden incelemeye alırdı.
 *
 * `company_feedback` ÖĞRENCİYE GÖRÜNÜR — dahili not değil. Arayüzde de
 * böyle yazıyor.
 */
export async function basvuruNotuKaydet(id: string, metin: string) {
  const db = await istemci();
  const { error } = await db
    .from('applications')
    .update({ company_feedback: metin })
    .eq('id', id);
  if (error) throw new Error('Not kaydedilemedi.');
}

/* ------------------------------------------------------- şirket profili */

/**
 * Şirket profilinde düzenlenebilir alanlar.
 *
 * YALNIZCA VAR OLAN SÜTUNLAR
 * --------------------------
 * "Çalışma kültürü", "yan haklar", "departmanlar", "sosyal medya" gibi
 * alanlar `companies` tablosunda YOK. Onları eklemek bir göç ve bir
 * yönetim ekranı demek; buradaki form yalnızca bugün gerçekten
 * kaydedilebilen yedi alanı soruyor. Boş bir alanı formda göstermek,
 * doldurulunca kaybolan bir alan üretirdi.
 */
export interface SirketProfilDegeri {
  logoUrl: string;
  industry: string;
  size: string;
  location: string;
  websiteUrl: string;
  description: string;
  hrEmail: string;
}

export const PROFIL_ALANLARI: (keyof SirketProfilDegeri)[] = [
  'logoUrl',
  'industry',
  'size',
  'location',
  'websiteUrl',
  'description',
  'hrEmail',
];

/** Doldurulmuş alan oranı. Uydurma değil: yedi gerçek sütunu sayıyor. */
export function profilTamamlanmaOrani(deger: Partial<SirketProfilDegeri>): number {
  const dolu = PROFIL_ALANLARI.filter((alan) => String(deger[alan] ?? '').trim() !== '').length;
  return Math.round((dolu / PROFIL_ALANLARI.length) * 100);
}

export async function sirketProfiliOku(companyId: string): Promise<SirketProfilDegeri> {
  const db = await istemci();
  /* İK e-postası açık sütun değil; RPC'den, tabloyla aynı anda (bkz. sirketOzelBilgileri). */
  const [{ data }, ozel] = await Promise.all([
    db
      .from('companies')
      .select('logo_url, industry, size, location, website_url, description')
      .eq('id', companyId)
      .maybeSingle(),
    sirketOzelBilgileri(companyId),
  ]);

  return {
    logoUrl: data?.logo_url ?? '',
    industry: data?.industry ?? '',
    size: data?.size ?? '',
    location: data?.location ?? '',
    websiteUrl: data?.website_url ?? '',
    description: data?.description ?? '',
    hrEmail: ozel?.hrEmail ?? '',
  };
}

/**
 * Şirket logosunu yükler ve herkese açık adresini döndürür.
 *
 * GERÇEK ALTYAPI, YENİ ALTYAPI DEĞİL
 * ----------------------------------
 * `logos` kovası ve yükleme politikası zaten var; öğrenci avatarı da
 * aynı yoldan yükleniyor. Burada yeni bir sistem kurulmuyor, var olanı
 * şirket tarafına bağlıyoruz.
 *
 * KLASÖR ADI KULLANICI KİMLİĞİ OLMAK ZORUNDA
 * ------------------------------------------
 * Depolama politikası `(storage.foldername(name))[1] = auth.uid()` şartı
 * koyuyor. Dosya adına şirket kimliği yazılıyor ki aynı kişi birden çok
 * şirkete üyeyse logolar birbirini ezmesin.
 *
 * Sınırlar kovanın kendi sınırları: 2 MB ve PNG/JPEG/WEBP. Burada da
 * kontrol ediliyor çünkü kovadan dönen hata kullanıcıya bir şey
 * anlatmıyor.
 */
export async function sirketLogosuYukle(
  companyId: string,
  userId: string,
  file: File
): Promise<string> {
  const izinli = ['image/png', 'image/jpeg', 'image/webp'];
  if (!izinli.includes(file.type)) {
    throw new Error('Yalnızca PNG, JPEG veya WEBP yükleyebilirsiniz.');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Logo en fazla 2 MB olabilir.');
  }

  const db = await istemci();
  const uzanti = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const yol = `${userId}/${companyId}.${uzanti}`;

  const { error } = await db.storage
    .from('logos')
    .upload(yol, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(`Logo yüklenemedi: ${error.message}`);

  const { data } = db.storage.from('logos').getPublicUrl(yol);
  /* Tarayıcı eski logoyu önbellekten göstermesin. */
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function sirketProfiliKaydet(companyId: string, deger: SirketProfilDegeri) {
  const db = await istemci();
  const temiz = (x: string) => x.trim() || null;
  const { error } = await db
    .from('companies')
    .update({
      logo_url: temiz(deger.logoUrl),
      industry: temiz(deger.industry),
      size: temiz(deger.size),
      location: temiz(deger.location),
      website_url: temiz(deger.websiteUrl),
      description: temiz(deger.description),
      hr_email: temiz(deger.hrEmail),
    })
    .eq('id', companyId);
  if (error) throw new Error('Şirket profili kaydedilemedi.');
}

/* -------------------------------------------- herkese açık şirket kimliği */

/**
 * Şirket sayfasının HERKESE AÇIK alanları — İK e-postası yok.
 *
 * Aynı şekil iki yerden doluyor: sahip kendi panelinden (`SirketBaglami`
 * + `SirketProfilDegeri`, `sirketAcikKimligi`), öğrenci ise
 * `sirketAcikKimliginiOku` ile doğrudan tablodan. Tek şekil olması
 * bilerek: sahip görünümü ile öğrenci görünümü aynı bileşeni çiziyor ve
 * bileşen `hrEmail` diye bir alan hiç tanımıyor — sahibe özel bir bilgi
 * ziyaretçi dalına ancak bu tipe eklenerek sızabilir, o da göze çarpar.
 */
export interface SirketAcikKimlik {
  id: string;
  ad: string;
  slug: string;
  logoUrl: string | null;
  sektor: string | null;
  calisanSayisi: string | null;
  konum: string | null;
  siteUrl: string | null;
  aciklama: string | null;
  /**
   * `companies.verified` — herkese açık sütun (oturumsuz şirket sayfası
   * da "Doğrulanmış" rozetini buradan çiziyor). Öğrencinin gördüğü şirket
   * sayfası ile oturumsuz sayfa aynı gerçeği söylesin diye eklendi
   * (26 Eylül 2026). Uydurulmuyor: yalnız sunucu true derse rozet var.
   */
  dogrulandi: boolean;
}

const bosNull = (x: string | null | undefined): string | null => {
  const t = (x ?? '').trim();
  return t ? t : null;
};

/** Sahibin panel verisinden açık kimlik; `hrEmail` BİLEREK dışarıda. */
export function sirketAcikKimligi(
  baglam: Pick<SirketBaglami, 'companyId' | 'ad' | 'slug' | 'siteUrl' | 'dogrulandi'>,
  profil: SirketProfilDegeri | null,
): SirketAcikKimlik {
  return {
    id: baglam.companyId ?? '',
    ad: baglam.ad,
    slug: baglam.slug,
    logoUrl: bosNull(profil?.logoUrl),
    sektor: bosNull(profil?.industry),
    calisanSayisi: bosNull(profil?.size),
    konum: bosNull(profil?.location),
    siteUrl: bosNull(profil?.websiteUrl) ?? bosNull(baglam.siteUrl),
    aciklama: bosNull(profil?.description),
    dogrulandi: baglam.dogrulandi === true,
  };
}

/**
 * Öğrencinin gördüğü şirket kimliği — yalnız açık sütunlar seçiliyor.
 *
 * `hr_email`, `vkn`, `mersis` sorguya HİÇ girmiyor. Sütunu isteyip
 * sonra atmak değil, hiç istememek: dönen satırda olmayan bir alan
 * yanlışlıkla ekrana taşınamaz. Satır yoksa `null` (silinmiş şirket);
 * okuma hatası fırlatıyor, çağıran "alınamadı" çiziyor.
 */
export async function sirketAcikKimliginiOku(companyId: string): Promise<SirketAcikKimlik | null> {
  const db = await istemci();
  const { data, error } = await db
    .from('companies')
    .select('id, name, slug, logo_url, industry, size, location, website_url, description, verified')
    .eq('id', companyId)
    .maybeSingle();
  if (error) throw new Error('Şirket bilgileri alınamadı.');
  if (!data) return null;
  return {
    id: data.id,
    ad: data.name ?? '',
    slug: data.slug ?? '',
    logoUrl: bosNull(data.logo_url),
    sektor: bosNull(data.industry),
    calisanSayisi: bosNull(data.size),
    konum: bosNull(data.location),
    siteUrl: bosNull(data.website_url),
    aciklama: bosNull(data.description),
    dogrulandi: data.verified === true,
  };
}

/* ------------------------------------------------- sorumlu atama */

export interface EkipUyesi {
  uyeId: string;
  ad: string;
  rol: EkipRolu;
  /** Başvuruya yazabilen üye; yalnız bunlara iş atanabiliyor. */
  yazabilir: boolean;
}

/**
 * Şirketin ekibi — atama kutusu ve iş yükü için.
 *
 * `profiles` satırı yalnız kendine açık ("kendi profilini okur"), yani
 * istemci takım arkadaşının ADINI doğrudan okuyamıyor. RPC o boşluğu
 * yalnız üyeye ve yalnız kendi şirketi için dolduruyor; e-posta
 * dönmüyor.
 */
export async function sirketEkibi(companyId: string): Promise<EkipUyesi[]> {
  const db = await istemci();
  const { data, error } = await db.rpc('sirket_ekibi' as never, { p_sirket: companyId } as never);
  if (error) return [];
  return ((data ?? []) as Record<string, unknown>[]).map((s) => ({
    uyeId: String(s.uye_id),
    ad: String(s.ad ?? 'Ekip üyesi'),
    rol: (String(s.rol ?? 'Viewer') as EkipRolu),
    yazabilir: Boolean(s.yazabilir),
  }));
}

/**
 * Başvuruya sorumlu atar ya da atamayı kaldırır (`uyeId = null`).
 *
 * EŞZAMANLI YAZMA: `beklenen` çağıranın EKRANDA GÖRDÜĞÜ sorumlu. Satır
 * o değerde değilse sunucu yazmıyor ve `sorumlu-degisti` atıyor —
 * ikinci kişi birincinin atamasını sessizce ezmiyor. Arayüz bu hatayı
 * "başkası değiştirdi" diye gösteriyor.
 */
export async function sorumluAta(
  basvuruId: string,
  uyeId: string | null,
  beklenen: string | null,
): Promise<void> {
  const db = await istemci();
  const { error } = await db.rpc('basvuru_sorumlusu_ata' as never, {
    p_basvuru: basvuruId,
    p_uye: uyeId,
    p_beklenen: beklenen,
  } as never);
  if (!error) return;

  /*
    Hata kodları cümleye burada çevriliyor; ekran ham Postgres metni
    göstermiyor. Tanınmayan kod genel cümleye düşüyor — uydurma bir
    açıklama yazmaktansa "olmadı" demek dürüst.
  */
  const kod = String((error as { message?: string }).message ?? '');
  if (kod.includes('sorumlu-degisti')) {
    throw new Error('Bu başvurunun sorumlusunu başka biri değiştirdi. Listeyi tazeleyip yeniden deneyin.');
  }
  if (kod.includes('uye-uygun-degil')) {
    throw new Error('Yalnızca başvuruya yazabilen ekip üyelerine iş atanabilir.');
  }
  if (kod.includes('yetki-yok')) {
    throw new Error('Sorumlu atama yetkiniz yok.');
  }
  throw new Error('Sorumlu atanamadı.');
}

export interface IsYukuSatiri {
  uyeId: string | null;
  ad: string;
  acik: number;
}

/**
 * Üye başına AÇIK başvuru sayısı.
 *
 * Sonuçlanmış başvurular (teklif kabul/ret, red, geri çekme) yükten
 * düşüyor: yapılacak iş kalmıyor. Sorumlusu olmayanlar ayrı satırda
 * (`uyeId = null`) — toplamın içinde eritmek, dağıtılmayı bekleyen işi
 * görünmez kılardı.
 */
export async function sirketIsYuku(companyId: string): Promise<IsYukuSatiri[]> {
  const db = await istemci();
  const { data, error } = await db.rpc('sirket_is_yuku' as never, { p_sirket: companyId } as never);
  if (error) return [];
  return ((data ?? []) as Record<string, unknown>[]).map((s) => ({
    uyeId: s.uye_id ? String(s.uye_id) : null,
    ad: String(s.ad ?? ''),
    acik: Number(s.acik ?? 0),
  }));
}

/* --------------------------------------------- değerlendirme formu */

export interface DegerlendirmeOlcutu {
  id: string;
  ad: string;
  sira: number;
}

export interface DegerlendirmeKaydi {
  id: string;
  degerlendiren: string;
  ad: string;
  puanlar: Record<string, number>;
  not: string | null;
  an: string;
}

/** Şirketin AKTİF ölçütleri, sırasıyla. */
export async function degerlendirmeOlcutleri(companyId: string): Promise<DegerlendirmeOlcutu[]> {
  const db = await istemci();
  const { data, error } = await db
    .from('sirket_degerlendirme_olcutleri')
    .select('id, ad, sira')
    .eq('company_id', companyId)
    .eq('aktif', true)
    .order('sira', { ascending: true });
  if (error) return [];
  return (data ?? []).map((o: Record<string, unknown>) => ({
    id: String(o.id),
    ad: String(o.ad ?? ''),
    sira: Number(o.sira ?? 0),
  }));
}

/**
 * Bir başvurunun değerlendirme GEÇMİŞİ — en yeni başta.
 *
 * Üzerine yazılmıyor; aynı kişi yeniden değerlendirirse eskisi de
 * listede kalıyor. Fikir değiştirmek de bilgi.
 */
export async function degerlendirmeGecmisi(basvuruId: string): Promise<DegerlendirmeKaydi[]> {
  const db = await istemci();
  const { data, error } = await db.rpc('basvuru_degerlendirme_gecmisi' as never, {
    p_basvuru: basvuruId,
  } as never);
  if (error) return [];
  return ((data ?? []) as Record<string, unknown>[]).map((d) => ({
    id: String(d.id),
    degerlendiren: String(d.degerlendiren ?? ''),
    ad: String(d.ad ?? 'Ekip üyesi'),
    puanlar: (d.puanlar ?? {}) as Record<string, number>,
    not: (d.not_metni as string | null) ?? null,
    an: String(d.created_at ?? ''),
  }));
}

/**
 * Değerlendirme yaz.
 *
 * Puanlar 1–5 tam sayı; sunucu da aynı aralığı doğruluyor. Otomatik ya
 * da türetilmiş puan YOK — her değer bir insanın girdiği değer.
 */
export async function degerlendirmeYaz(
  basvuruId: string,
  puanlar: Record<string, number>,
  not: string | null,
): Promise<void> {
  const db = await istemci();
  const { error } = await db.rpc('degerlendirme_yaz' as never, {
    p_basvuru: basvuruId,
    p_puanlar: puanlar,
    p_not: not,
  } as never);
  if (!error) return;
  const kod = String((error as { message?: string }).message ?? '');
  if (kod.includes('puan-gecersiz')) throw new Error('Puanlar 1 ile 5 arasında tam sayı olmalı.');
  if (kod.includes('olcut-gecersiz')) throw new Error('Ölçüt bulunamadı; listeyi tazeleyin.');
  if (kod.includes('yetki-yok')) throw new Error('Değerlendirme yazma yetkiniz yok.');
  throw new Error('Değerlendirme kaydedilemedi.');
}

/* ------------------------------------- ilan kapanışı ve dağıtım */

export interface BekleyenAday {
  basvuruId: string;
  durum: string;
  beklemeGun: number;
  atananUye: string | null;
}

/**
 * İlan kapatılmadan önce sonucu bekleyen adaylar.
 *
 * Liste yalnız GÖSTERMEK için; bu çağrı hiçbir başvuruyu
 * sonuçlandırmıyor. Kapanışta otomatik red YOK.
 */
export async function ilanBekleyenAdaylar(ilanId: string): Promise<BekleyenAday[]> {
  const db = await istemci();
  const { data, error } = await db.rpc('ilan_bekleyen_adaylar' as never, { p_ilan: ilanId } as never);
  /*
    HATA YUTULMUYOR (5 Ekim 2026 düzeltmesi)

    Önce `return []` vardı ve bu İKİ AYRI DURUMU tek cevaba indiriyordu:
    "bekleyen aday yok" ile "adaylar okunamadı". Sonuç, tam kaçınmak
    istediğimiz şeydi — okuma başarısız olduğunda ilan sessizce, kimseyi
    sormadan kapanıyordu. Tarayıcıda görüldü: RPC 404 verdiğinde onay
    diyaloğu hiç açılmadan ilan kapandı.

    Artık hata yukarı çıkıyor; kapatma akışı onu yakalayıp DURUYOR.
  */
  if (error) throw new Error('Bekleyen adaylar okunamadı.');
  return ((data ?? []) as Record<string, unknown>[]).map((s) => ({
    basvuruId: String(s.basvuru_id),
    durum: String(s.durum ?? ''),
    beklemeGun: Number(s.bekleme_gun ?? 0),
    atananUye: s.atanan_uye ? String(s.atanan_uye) : null,
  }));
}

/**
 * Sorumsuz başvuruları yazabilen üyelere dengeli dağıtır.
 *
 * ŞİRKET İSTERSE: otomatik çalışmıyor, düğmeye basınca koşuyor. Var
 * olan atamalara dokunmuyor. Dönen sayı gerçekten atanan başvuru adedi.
 */
export async function basvurulariDagit(companyId: string, ilanId?: string | null): Promise<number> {
  const db = await istemci();
  const { data, error } = await db.rpc('basvurulari_dagit' as never, {
    p_sirket: companyId,
    p_ilan: ilanId ?? null,
  } as never);
  if (error) throw new Error('Dağıtım yapılamadı.');
  return Number(data ?? 0);
}
