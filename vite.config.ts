import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

/*
  ANAHTARSIZ DERLEMEYİ ENGELLE

  Instagram içerik otomasyonu bir git worktree'sinde çalıştı. `.env`
  gitignore'da olduğu için worktree'de yoktu; derleme sessizce boş
  VITE_SUPABASE_* değerleriyle tamamlandı ve o paket canlıya basıldı.
  Sonuç: uygulama açılışta hata fırlattı, sayfa hiç çizilmedi ve site
  saatlerce açılmadı. Sunucu 200 döndüğü için dışarıdan sağlıklı
  görünüyordu.

  Derleme artık bu durumda BAŞARISIZ oluyor. Çalışmayacağı derleme anında
  belli olan bir paketin üretilmesi, üretilip dağıtılmasından çok daha ucuz
  bir hata.

  Yalnızca üretim derlemesinde: `vite dev` ile uğraşırken anahtar olmadan
  arayüze bakmak meşru.
*/
function anahtarlariDogrula(mod: string) {
  const env = loadEnv(mod, process.cwd(), 'VITE_');
  const eksik = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].filter(
    (ad) => !env[ad] && !process.env[ad]
  );
  if (!eksik.length) return;

  throw new Error(
    [
      `Derleme durdu: ${eksik.join(' ve ')} tanımlı değil.`,
      `Çalışma dizini: ${process.cwd()}`,
      "Bu değerler olmadan derlenen paket Supabase'e bağlanamıyor ve uygulama açılışta",
      'çöküyor. Bir git worktree içindeysen .env orada yoktur (gitignore\'da): ana',
      'çalışma dizininden derle ya da değişkenleri ortama ver.',
    ].join('\n')
  );
}

export default defineConfig(({ command, mode }) => {
  if (command === 'build') anahtarlariDogrula(mode);

  return {
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          /*
            PAKETİ PARÇALARA BÖL.

            Ölçüldü: tek bir dosyada 1015 KB (sıkıştırılmış 272 KB). Ön render
            sayesinde metin hemen görünüyor ama sayfa bu dosya inip
            çalışmadan etkileşimli olmuyor — mobil bağlantıda bu fark
            hissediliyor.

            Buradaki bölme kütüphaneleri ayırıyor. Asıl kazanç şurada: bu
            dosyalar sürüm değişmedikçe aynı kalıyor, yani ikinci ziyarette
            yeniden indirilmiyorlar. Uygulama kodu her yayında değişiyor ama
            artık yalnızca o parça yeniden iniyor.
          */
          manualChunks: {
            react: ['react', 'react-dom'],
            supabase: ['@supabase/supabase-js'],
            ikonlar: ['lucide-react'],
            konfeti: ['canvas-confetti'],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
