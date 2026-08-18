import React from 'react';

/**
 * /isveren/ilan-ver sayfasının METNİ — kabuğu ve arama kutusu değil.
 *
 * NEDEN AYRI DOSYA
 * ----------------
 * Bu ağaç iki yerde çiziliyor: tarayıcıda IsverenGirisi içinde, derleme
 * sırasında scripts/onrender.mjs içinde React'in sunucu çizicisiyle.
 *
 * Önce ikisi tek dosyadaydı ve ön render "VITE_SUPABASE_URL okunamıyor"
 * diyerek durdu: aynı dosyadaki arama kutusu supabase istemcisini içeri
 * alıyordu ve o istemci Node tarafında var olmayan bir ortam değişkenine
 * bakıyor. Metnin veri katmanına hiç ihtiyacı yok; ayrılınca ikisi de
 * kendi tarafında çalışıyor.
 *
 * Burada hiçbir şey etkileşimli değil: durum yok, olay yok, sorgu yok.
 */

const Adim: React.FC<{ sira: number; baslik: string; children: React.ReactNode }> = ({
  sira,
  baslik,
  children,
}) => (
  <li className="flex gap-4">
    <span className="shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm inline-flex items-center justify-center">
      {sira}
    </span>
    <div className="space-y-1 pt-0.5">
      <p className="font-bold text-gray-900">{baslik}</p>
      <p className="text-sm text-gray-600 leading-relaxed">{children}</p>
    </div>
  </li>
);

/**
 * Sayfanın metni — ön render ile ortak.
 *
 * Burada hiçbir şey etkileşimli değil ve olmamalı: bu ağaç Node tarafında
 * React'in sunucu çizicisiyle de çalışıyor.
 */
export const IsverenGirisiIcerik: React.FC = () => (
  <div className="space-y-8">
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Nasıl işliyor</h2>
      <ol className="space-y-5">
        <Adim sira={1} baslik="Normal bir hesap açın">
          Şirket hesabı diye ayrı bir kayıt yok. Kendi adınıza kayıt olun; şirket
          yetkisi bir sonraki adımda tanımlanıyor.
        </Adim>
        <Adim sira={2} baslik="Şirketinizin sayfasını sahiplenin">
          Şirketinizin StajımVar'da bir sayfası zaten olabilir — ilanları kariyer
          sayfanızdan derliyoruz. Sayfayı bulup "Bu şirketin yetkilisi misiniz?"
          formunu doldurun.
        </Adim>
        <Adim sira={3} baslik="Onaydan sonra ilan girin">
          Talebi elle inceliyoruz. Onaylandığında şirket portalı açılıyor ve
          ilanlarınızı kendiniz yayınlayabiliyorsunuz.
        </Adim>
      </ol>
    </section>

    <section className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Sık sorulanlar</h2>

      <div className="space-y-3">
        <details className="group rounded-2xl border border-gray-200 bg-white p-4">
          <summary className="font-bold text-gray-900 cursor-pointer list-none">
            İlan vermek ücretli mi?
          </summary>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            Hayır. Staj ilanı yayınlamak ücretsiz.
          </p>
        </details>

        <details className="group rounded-2xl border border-gray-200 bg-white p-4">
          <summary className="font-bold text-gray-900 cursor-pointer list-none">
            Neden doğrudan şirket hesabı açamıyorum?
          </summary>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            Şirket hesabı, staj arayan öğrencilerin profillerini görebiliyor. Kayıt
            sırasında "ben şirketim" diyen herkese bu yetkiyi verseydik, formu dolduran
            herkes öğrenci bilgilerine erişirdi. Bu yüzden yetki elle onaylanıyor.
          </p>
        </details>

        <details className="group rounded-2xl border border-gray-200 bg-white p-4">
          <summary className="font-bold text-gray-900 cursor-pointer list-none">
            Şirketimin sayfası neden zaten var?
          </summary>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            İlanlarınızı herkese açık kariyer sayfanızdan veya kullandığınız işe alım
            sisteminden derliyoruz. Sayfa sizin adınıza açılmış değil; sahiplenene kadar
            "henüz sahiplenilmemiş" olarak işaretli duruyor.
          </p>
        </details>

        <details className="group rounded-2xl border border-gray-200 bg-white p-4">
          <summary className="font-bold text-gray-900 cursor-pointer list-none">
            Sayfamdaki bilgiler yanlış, düzeltebilir miyim?
          </summary>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            Sahiplenme onaylandıktan sonra şirket profilini kendiniz düzenleyebiliyorsunuz.
            Onay beklerken bir düzeltme gerekiyorsa iletişim sayfasından yazın.
          </p>
        </details>

        <details className="group rounded-2xl border border-gray-200 bg-white p-4">
          <summary className="font-bold text-gray-900 cursor-pointer list-none">
            Stajyer almanın yasal yükümlülükleri neler?
          </summary>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            Sigorta kimde, ücret zorunlu mu, okulla hangi evrak imzalanır —{' '}
            <a href="/isveren" className="font-semibold text-blue-600 hover:underline">
              işveren rehberinde
            </a>{' '}
            sırayla anlatılıyor.
          </p>
        </details>
      </div>
    </section>

    <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-2">
      <p className="font-bold text-gray-900">Şirketiniz burada yoksa</p>
      <p className="text-sm text-gray-600 leading-relaxed">
        Aramada çıkmıyorsa şirketinizin henüz bir sayfası yok demektir.{' '}
        <a href="/iletisim" className="font-semibold text-blue-600 hover:underline">
          İletişim sayfasından
        </a>{' '}
        şirket adınızı ve kariyer sayfanızın adresini yazın; sayfayı açıp size
        bağlayalım.
      </p>
    </section>
  </div>
);

