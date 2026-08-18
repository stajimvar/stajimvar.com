import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
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
