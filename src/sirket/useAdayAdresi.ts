import React from 'react';
import { adayliAdres, adrestekiAday } from '../lib/aday-derin-baglanti.mjs';

/**
 * Adresteki `?aday=` değeri — açık inceleme ekranının TEK kaynağı.
 *
 * NEDEN ÖZEL BİR OLAY
 * -------------------
 * `pushState` / `replaceState` `popstate` üretmiyor. Adresi bu
 * dosyadaki `adayAdresiniYaz` yazıyor ve ardından bir olay atıyor; geri
 * ve ileri tuşu tarayıcının kendi `popstate`iyle geliyor. İki dinleyici
 * de aynı işi yapıyor: adresi yeniden okumak. Böylece ekranı açan
 * (karta dokunma, bildirim, derin bağlantı, ileri tuşu) ve kapatan
 * (Kapat, Escape, geri tuşu) her yol aynı kaynaktan geçiyor.
 *
 * App ÇAKIŞMIYOR
 * --------------
 * App'in `popstate` dinleyicisi yalnız YOLU (`pathname`) okuyor; arama
 * dizesi rota durumuna girmiyor (App.navigate). `?aday=` değişince yol
 * aynı kaldığı için App yeniden yönlendirme yapmıyor; parametre bu
 * kancanın işi.
 *
 * GERİ TUŞUYLA KAPATMA YALNIZ BU SAYFA YÜKLEMESİNDE İTİLEN KAYITTA
 * ---------------------------------------------------------------
 * Ekran açılırken itilen kayıt `{ stajimvarAday, oturum }` taşıyor.
 * `oturum` sayfa her yüklendiğinde yeniden üretiliyor: sayfa yenilenince
 * tarayıcı eski kaydın durumunu geri yüklüyor ama oturum tutmuyor. O
 * durumda kapatmak `history.back()` DEĞİL, adresi yerinde temizlemek —
 * yoksa kullanıcı önceki siteye atılırdı.
 */

const OLAY = 'stajimvar:aday-adresi';
const OTURUM = Math.random().toString(36).slice(2);

function oku(): string | null {
  return typeof window === 'undefined' ? null : adrestekiAday(window.location.search);
}

export function useAdayAdresi(): string | null {
  const [deger, setDeger] = React.useState<string | null>(oku);
  React.useEffect(() => {
    const yenile = () => setDeger(oku());
    window.addEventListener('popstate', yenile);
    window.addEventListener(OLAY, yenile);
    yenile();
    return () => {
      window.removeEventListener('popstate', yenile);
      window.removeEventListener(OLAY, yenile);
    };
  }, []);
  return deger;
}

/**
 * Adrese açık başvuruyu yazar ya da siler.
 *
 * `it: true` geçmişe yeni bir kayıt ekliyor (ekranı açarken: geri tuşu
 * kapatsın). Aksi hâlde kayıt yerinde değişiyor.
 */
export function adayAdresiniYaz(id: string | null, secenek: { it?: boolean } = {}) {
  const adres = adayliAdres(window.location.pathname, window.location.search, id);
  if (secenek.it && id) {
    window.history.pushState({ stajimvarAday: id, oturum: OTURUM }, '', adres);
  } else {
    const durum = window.history.state;
    window.history.replaceState(
      id && durum?.stajimvarAday ? { ...durum, stajimvarAday: id } : id ? durum : null,
      '',
      adres,
    );
  }
  window.dispatchEvent(new Event(OLAY));
}

/** Açık ekran bu sayfa yüklemesinde itilen bir kayıtta mı (geri tuşu güvenli mi)? */
export function geriIleKapatilabilir(): boolean {
  const durum = window.history.state;
  return Boolean(durum?.stajimvarAday) && durum?.oturum === OTURUM;
}

/** Ekranı kapatır: kendi itilen kaydımızsa geri, değilse adresi yerinde temizler. */
export function adayEkraniniKapat() {
  if (geriIleKapatilabilir()) {
    window.history.back();
    return;
  }
  adayAdresiniYaz(null);
}
