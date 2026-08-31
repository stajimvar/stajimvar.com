/**
 * TELEFON NUMARASINI OKUNUR YAZAR
 *
 * İletişim kartında numara ham geliyordu: `+905323311338`. Ekranda
 * okunması zor ve elle karşılaştırması yorucu.
 *
 * KÖRLEMESİNE TÜRKİYE BİÇİMİ UYGULANMIYOR
 * ---------------------------------------
 * Yalnızca gerçekten Türkiye numarası olduğu ANLAŞILAN biçimler
 * gruplanıyor. Başka bir ülke kodu geldiğinde numara olduğu gibi
 * kalıyor — tanımadığı bir numarayı Türkiye kalıbına zorlamak, yanlış
 * bir numarayı doğru gibi göstermek olurdu.
 *
 * Veritabanındaki değer DEĞİŞMİYOR: bu yalnızca gösterim.
 */

/** Arama bağlantısı için: yalnız rakamlar ve baştaki artı. */
export function telefonBaglantisi(ham) {
  const t = String(ham ?? '').trim();
  if (!t) return '';
  const arti = t.startsWith('+') ? '+' : '';
  const rakam = t.replace(/\D/g, '');
  return rakam ? arti + rakam : '';
}

/**
 * Ekranda gösterilecek biçim.
 *
 * Tanınan üç Türkiye yazımı — hepsi 10 haneli ulusal numaraya iniyor:
 *   +90 5XX XXX XX XX
 *   0 5XX XXX XX XX
 *   5XX XXX XX XX
 *
 * Sabit hatlar da aynı kalıba giriyor (10 hane), yani yalnız cep
 * numaralarına özel bir kural yok.
 */
export function telefonYaz(ham) {
  const t = String(ham ?? '').trim();
  if (!t) return '';

  const rakam = t.replace(/\D/g, '');
  let ulusal = null;

  if (t.startsWith('+90') && rakam.length === 12) ulusal = rakam.slice(2);
  else if (!t.startsWith('+') && rakam.length === 12 && rakam.startsWith('90')) ulusal = rakam.slice(2);
  else if (!t.startsWith('+') && rakam.length === 11 && rakam.startsWith('0')) ulusal = rakam.slice(1);
  else if (!t.startsWith('+') && rakam.length === 10) ulusal = rakam;

  /* Tanınmayan biçim: olduğu gibi. */
  if (!ulusal) return t;

  return `+90 ${ulusal.slice(0, 3)} ${ulusal.slice(3, 6)} ${ulusal.slice(6, 8)} ${ulusal.slice(8, 10)}`;
}
