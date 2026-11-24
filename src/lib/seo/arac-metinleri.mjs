/**
 * ARAÇ SAYFALARININ ÖN RENDER METNİ (24 Kasım 2026)
 *
 * AdSense siteyi "düşük değere sahip içerik" diye reddetti. Ölçüldü: beş
 * araç sayfasının JavaScript'siz ilk HTML'i 14-16 kelimeydi (başlık + tek
 * cümle); hesaplayıcı yalnız tarayıcıda çiziliyor, tarayıcı boş sayfa
 * görüyordu. Araçlar sitenin en özgün parçası, ama bu görünmüyordu.
 *
 * Metin aracın GERÇEKTE yaptığını anlatıyor ve sayıları aracın kendi
 * kaynaklarından alıyor — oran ve asgari ücret lib/asgari-ucret.mjs'ten,
 * örnek staj takvimi lib/staj-gunu.mjs'in kendi hesabından, net kuralı
 * lib/net-hesap.mjs'ten. Elle yazılmış bir sayı yok: kaynak değişince
 * metin de değişiyor.
 */
import { YIL, NET_KURUS, ORAN } from '../asgari-ucret.mjs';
import { stajBitisi } from '../staj-gunu.mjs';
import { satirNeti } from '../net-hesap.mjs';
import { kurusBicim, yuzdeKurus } from '../para.mjs';
import { kacir } from './metin.mjs';

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const tarih = (d) => `${d.getDate()} ${AYLAR[d.getMonth()]} ${d.getFullYear()} ${GUNLER[d.getDay()]}`;

const p = (m) => `<p>${m}</p>`;
const h2 = (m) => `<h2>${kacir(m)}</h2>`;
const liste = (maddeler) => `<ul>${maddeler.map((m) => `<li>${m}</li>`).join('')}</ul>`;
const bag = (yol, metin) => `<a href="${kacir(yol)}">${kacir(metin)}</a>`;

function stajUcreti() {
  const kucuk = yuzdeKurus(NET_KURUS, ORAN.kucukIsyeri);
  const buyuk = yuzdeKurus(NET_KURUS, ORAN.buyukIsyeri);
  return (
    h2('Bu araç ne hesaplıyor?') +
    p(
      'Staj yapan öğrenciye ödenmesi gereken <strong>en düşük</strong> tutarı. ' +
        `${kacir(ORAN.kaynak.etiket)}, işletmede mesleki eğitim gören ve staj yapan öğrenciye ödenecek ücret için ` +
        'bir alt sınır koyuyor: net asgari ücretin belirli bir yüzdesi. Şirket daha fazlasını ödeyebilir; araç yalnız tabanı gösterir.'
    ) +
    h2('Kural') +
    liste([
      `Yirmiden az personel çalıştıran işyerinde net asgari ücretin en az <strong>%${ORAN.kucukIsyeri}</strong>'i.`,
      `Yirmi ve üzerinde personel çalıştıran işyerinde net asgari ücretin en az <strong>%${ORAN.buyukIsyeri}</strong>'u.`,
      `Hesap, ${YIL} yılı net asgari ücreti (${kurusBicim(NET_KURUS)} TL) üzerinden yapılıyor; başka bir yıl için tutarı araçta değiştirebilirsin.`,
    ]) +
    h2(`Örnek: ${YIL} için`) +
    liste([
      `12 kişilik bir yazılım şirketinde staj: ${kurusBicim(NET_KURUS)} TL × %${ORAN.kucukIsyeri} = <strong>${kurusBicim(kucuk)} TL</strong>.`,
      `250 kişilik bir fabrikada staj: ${kurusBicim(NET_KURUS)} TL × %${ORAN.buyukIsyeri} = <strong>${kurusBicim(buyuk)} TL</strong>.`,
    ]) +
    h2('Bilmen gerekenler') +
    liste([
      'Alt sınır, okulunun zorunlu tuttuğu ve 3308 sayılı Kanun kapsamında yapılan staj için geçerli. Gönüllü stajın koşullarını şirketle yaptığın anlaşma belirler.',
      'Personel sayısını şirketin insan kaynakları biriminden öğrenebilirsin; emin değilsen iki oranı da araçta görebilirsin.',
      `Staj sigortası ve evrak işleri için: ${bag('/rehber/zorunlu-staj-rehberi', 'Zorunlu staj rehberi')}.`,
    ]) +
    p(`Kaynak: <a href="${kacir(ORAN.kaynak.adres)}" rel="noopener" target="_blank">${kacir(ORAN.kaynak.etiket)}</a>.`)
  );
}

function stajGunu() {
  /* Örnek: aracın kendi hesabıyla, sabit bir yaz stajı başlangıcı. */
  const baslangic = `${YIL + 1}-07-01`;
  const ornek20 = stajBitisi({ baslangic, gunSayisi: 20 });
  const ornek30 = stajBitisi({ baslangic, gunSayisi: 30 });
  const ornekler = [
    ornek20 && `${tarih(new Date(`${baslangic}T12:00:00`))} başlayan 20 iş günlük staj <strong>${tarih(ornek20.bitis)}</strong> günü biter (toplam ${ornek20.toplamTakvim} takvim günü).`,
    ornek30 && `Aynı gün başlayan 30 iş günlük staj <strong>${tarih(ornek30.bitis)}</strong> günü biter (toplam ${ornek30.toplamTakvim} takvim günü).`,
  ].filter(Boolean);
  return (
    h2('Bu araç ne hesaplıyor?') +
    p(
      'Okulların istediği staj süresi takvim günü değil <strong>iş günü</strong>. Başlangıç tarihini ve gün sayısını girdiğinde araç, ' +
        'hangi günlerin sayılmadığını tek tek düşerek stajının hangi gün bittiğini ve gün gün takvimini gösterir.'
    ) +
    h2('Hangi günler sayılmaz?') +
    liste([
      'Pazar günleri.',
      'Cumartesi — işyerin cumartesi çalışmıyorsa. Çalışıyorsa araçta işaretleyebilirsin.',
      'Resmî tatiller; Ramazan ve Kurban bayramları dahil. Bayramların hangi güne düştüğünü bilmen gerekmiyor, araç takvimden alıyor.',
      'Arife günleri yarım gün (0,5 iş günü) sayılıyor.',
      'Kurumun ayrıca verdiği izin günleri — bunları araca ek olarak girebilirsin.',
    ]) +
    (ornekler.length ? h2('Örnek') + liste(ornekler) : '') +
    h2('Bilmen gerekenler') +
    liste([
      'Okulunun cumartesiyi sayıp saymadığını staj yönergesinden kontrol et; kural okuldan okula değişebiliyor.',
      'Staj sigortası başlangıç ve bitiş tarihine göre yapılıyor; bitiş tarihini okuluna bu hesapla bildirebilirsin.',
      `Stajın her günü için ne yazacağını ${bag('/rehber/staj-defteri-nasil-doldurulur', 'staj defteri rehberinde')} bulabilirsin.`,
    ])
  );
}

function netHesaplama() {
  const ornek = satirNeti(40, '30', '8');
  return (
    h2('Bu araç ne hesaplıyor?') +
    p('TYT, AYT ve KPSS testlerinde doğru ve yanlış sayından netini. Her test ayrı satırda girilir, toplam net en altta görünür.') +
    h2('Kural') +
    liste([
      'Dört yanlış bir doğruyu götürür: net = doğru − yanlış ÷ 4.',
      'Boş bırakılan soru neti etkilemez.',
      'Doğru ve yanlış toplamı testin soru sayısını aşarsa araç hata verir.',
      'Net sıfırın altına düşmez.',
    ]) +
    (ornek && ornek.net !== undefined
      ? h2('Örnek') + p(`40 soruluk bir testte 30 doğru ve 8 yanlış: 30 − 8 ÷ 4 = <strong>${String(ornek.net).replace('.', ',')} net</strong>.`)
      : '') +
    h2('Bilmen gerekenler') +
    p(
      'Araç netten puan hesaplamaz: ÖSYM puanı her yıl o yılın sınavına göre ayrıca hesaplanıyor. ' +
        `Puanın varsa yaklaşık sıranı ${bag('/araclar/siralama-tahmini', 'sıralama tahmini aracında')} görebilirsin.`
    )
  );
}

function siralamaTahmini() {
  return (
    h2('Bu araç ne hesaplıyor?') +
    p('YKS puanının, ÖSYM\'nin 2025 yılı için yayınladığı puan dağılımına göre yaklaşık hangi sıraya denk geldiğini.') +
    h2('Nasıl çalışıyor?') +
    liste([
      'Puan türünü (TYT, SAY, EA, SÖZ, DİL) ve puanını girersin.',
      'Araç, ÖSYM\'nin yayınladığı resmî yığınsal dağılım tablosunda puanının düştüğü aralığı bulur ve sıranı bu aralık içinde tahmin eder.',
      'Sonuç bir tahmindir; kesin sıralama yalnız ÖSYM sonuç belgesinde yazar.',
    ]) +
    h2('Bilmen gerekenler') +
    liste([
      'Sıralamalar yıldan yıla değişir: aynı puan farklı yılda farklı sıraya denk gelebilir.',
      `Netinden başlamak istersen önce ${bag('/araclar/net-hesaplama', 'net hesaplama aracını')} kullanabilirsin.`,
    ])
  );
}

function araclarMerkezi() {
  return (
    h2('Staj araçları') +
    liste([
      `${bag('/araclar/staj-ucreti-hesaplama', 'Staj ücreti hesaplama')} — ${kacir(ORAN.kaynak.etiket)}'na göre stajyere ödenmesi gereken en düşük tutar; işyerinin personel sayısına göre %${ORAN.kucukIsyeri} ya da %${ORAN.buyukIsyeri}.`,
      `${bag('/araclar/staj-gunu-hesaplama', 'Staj günü hesaplama')} — 20 ya da 30 iş günlük stajın hangi gün bittiği; pazar, resmî tatiller ve bayramlar düşülerek, arife yarım gün sayılarak.`,
    ]) +
    h2('Sınav araçları') +
    liste([
      `${bag('/araclar/net-hesaplama', 'Net hesaplama')} — TYT, AYT ve KPSS'de doğru ve yanlıştan net; dört yanlış bir doğruyu götürür.`,
      `${bag('/araclar/siralama-tahmini', 'Sıralama tahmini')} — YKS puanının ÖSYM 2025 dağılımına göre yaklaşık sırası.`,
    ]) +
    p('Araçların hepsi ücretsiz ve üyelik istemez. Hesaplar tarayıcında yapılır; girdiğin bilgiler hiçbir yere gönderilmez.')
  );
}

export const ARAC_METINLERI = {
  '/araclar': araclarMerkezi,
  '/araclar/staj-ucreti-hesaplama': stajUcreti,
  '/araclar/staj-gunu-hesaplama': stajGunu,
  '/araclar/net-hesaplama': netHesaplama,
  '/araclar/siralama-tahmini': siralamaTahmini,
};

/** Araç sayfasının ön render gövdesine eklenen HTML; araç değilse ''. */
export function aracMetni(yol) {
  const uret = ARAC_METINLERI[yol];
  return uret ? uret() : '';
}
