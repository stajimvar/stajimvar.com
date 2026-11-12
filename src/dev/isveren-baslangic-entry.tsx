import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { IsverenBaslangic } from '../components/IsverenBaslangic';
import '../index.css';

/*
  Geliştirme girişi: oturumsuz istemciyle sayfa çiziliyor; talep/davet
  okumaları boş dönüyor, yani "Şirketini bul" adımı görünür.
  ?eposta=ik@modmere.com ile kurumsal e-posta tahmini denenebilir.
*/
const eposta = new URLSearchParams(window.location.search).get('eposta') ?? 'ogulcan@gmail.com';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="min-h-screen bg-[#f9fafb]">
      <IsverenBaslangic
        onBack={() => undefined}
        onNavigate={() => undefined}
        userId="00000000-0000-0000-0000-000000000000"
        niyetKayitli
        userEmail={eposta}
        adSoyad="Ogulcan Test"
      />
    </div>
  </StrictMode>
);
