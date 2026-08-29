import React from 'react';
import { SirketKabugu } from '../sirket/SirketKabugu';
import { IlanFormu } from '../sirket/IlanFormu';
import { KADEME } from '../lib/sirket-kademe.mjs';

/**
 * Şirket panelinin görsel testi.
 *
 * NEDEN VAR
 * ---------
 * Panel şirket üyeliği gerektiriyor ve tarayıcıdan uçtan uca
 * denenemiyor. Bu projede bir kez "tsc temiz, testler yeşil" deyip
 * yerleşimi bozuk bir şey canlıya çıktı; tip denetimi bir yerleşim
 * hatasını yakalamıyor.
 *
 * Burada kabuk ve ilan formu gerçek verilerle değil ama gerçek
 * bileşenlerle çiziliyor: ölçüler, tema sızıntısı ve form davranışı
 * ölçülebiliyor.
 *
 * Yalnızca development sunucusunda servis ediliyor; üretim paketine
 * girmiyor.
 */
export const SirketPanelDevFixture: React.FC = () => {
  const [kademe, setKademe] = React.useState<number>(KADEME.ILAN_VEREN);
  const [ekran, setEkran] = React.useState<'ilanlar' | 'form'>('form');

  return (
    <>
      {/* Test kolları — gerçek panelde yok. */}
      <div className="fixed left-2 top-2 z-[300] flex gap-2 rounded-xl bg-white p-2 text-xs shadow">
        <button
          type="button"
          id="dev-kademe-1"
          onClick={() => setKademe(KADEME.ILAN_VEREN)}
          className="rounded-lg border px-2 py-1 font-bold"
        >
          Kademe 1
        </button>
        <button
          type="button"
          id="dev-kademe-2"
          onClick={() => setKademe(KADEME.DOGRULANMIS)}
          className="rounded-lg border px-2 py-1 font-bold"
        >
          Kademe 2
        </button>
        <button
          type="button"
          id="dev-ekran"
          onClick={() => setEkran((e) => (e === 'form' ? 'ilanlar' : 'form'))}
          className="rounded-lg border px-2 py-1 font-bold"
        >
          Ekran
        </button>
      </div>

      <SirketKabugu
        secili={ekran === 'form' ? 'ilanlar' : 'ilanlar'}
        onNavigate={() => undefined}
        onCikis={() => undefined}
        durumRozeti={
          <span className="rounded-lg px-2 py-1 font-mono text-[11px] font-bold" style={{ background: '#161B22', color: '#F5A524' }}>
            {kademe === KADEME.DOGRULANMIS ? 'DOĞRULANMIŞ' : 'KADEME 1'}
          </span>
        }
      >
        {ekran === 'form' ? (
          <IlanFormu
            kademe={kademe}
            sirketAdi="Örnek Teknoloji A.Ş."
            siteUrl="https://ornek.com"
            eposta={kademe === KADEME.DOGRULANMIS ? 'ik@gmail.com' : 'ik@ornek.com'}
            onKaydet={async () => ({ id: '00000000-0000-0000-0000-000000000000' })}
            onIptal={() => setEkran('ilanlar')}
          />
        ) : (
          <p className="text-gray-300">İlan listesi ekranı</p>
        )}
      </SirketKabugu>
    </>
  );
};
