import React from 'react';
import { SayfaKabugu } from './SayfaKabugu';
import { StajIlanlariIcerik, type StajIlanlariVerisi } from './StajIlanlariIcerik';

/**
 * /staj-ilanlari — canlı rota.
 *
 * Gövde `StajIlanlariIcerik`: ön render de AYNI bileşeni çiziyor. İkinci
 * bir işaretleme yazılsaydı arama motorunun gördüğü sayfa ile
 * kullanıcının gördüğü sayfa zamanla ayrışırdı.
 *
 * Kabuk öteki içerik sayfalarıyla aynı (`SayfaKabugu`): başlık çubuğu
 * aynı genişlikte, logo aynı yerde. Tasarım sistemine hiçbir şey
 * eklenmedi.
 */
export const StajIlanlariSayfasi: React.FC<{
  onBack: () => void;
  onNavigate: (yol: string) => void;
  veri: StajIlanlariVerisi;
}> = ({ onBack, onNavigate, veri }) => (
  <SayfaKabugu onBack={onBack}>
    <StajIlanlariIcerik {...veri} onNavigate={onNavigate} />
  </SayfaKabugu>
);
