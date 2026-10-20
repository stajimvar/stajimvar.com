import type { MouseEvent, ReactNode } from "react";
import "./footer.css";

/* ------------------------------------------------------------------
   StajımVar — Site alt bilgisi (footer)

   Adresler 20 Ekim 2026'da uygulamanın rota tanımlarıyla ve canlı
   sitedeki yanıtla karşılaştırıldı:
   - Şehir sayfası yalnız İstanbul'da var (lib/seo/sehir-sayfalari.mjs,
     liste bilerek kapalı). Ankara, İzmir, Kocaeli, Manisa ve Tekirdağ
     404 veriyordu; çıkarıldı. Yeni şehir açılınca buraya eklenir.
   - KVKK metninin adresi /kvkk değil /kvkk-aydinlatma-metni
     (lib/yasal-rotalar.ts).
   - Eski alt bilgideki bağlantılar korunuyor: büyük işverenlerde staj,
     kariyer merkezleri, şirketini sahiplen, ilan kuralları, ilan bildir
     ve çerez tercihleri düğmesi.

   Site React Router kullanmıyor; kendi `navigate` işlevi var. İç
   bağlantılar gerçek <a href> olarak kalıyor (tarayıcı ve arama motoru
   adresi görsün), tıklama uygulama içinde `onNavigate` ile yapılıyor.
------------------------------------------------------------------- */

type FooterLink = { label: string; href: string; highlight?: boolean };
type FooterColumn = { title: string; links: FooterLink[] };

const COLUMNS: FooterColumn[] = [
  {
    title: "Staj Türleri",
    links: [
      { label: "İstanbul staj ilanları", href: "/staj-ilanlari/istanbul" },
      { label: "Zorunlu staj", href: "/rehber/zorunlu-staj-rehberi" },
      { label: "Gönüllü staj", href: "/rehber/gonullu-staj-rehberi" },
      { label: "Uzaktan staj", href: "/rehber/uzaktan-staj-kabul-edilir-mi" },
      { label: "Yurt dışında staj", href: "/rehber/yurtdisinda-staj" },
      { label: "Erasmus+ staj", href: "/rehber/erasmus-staj-hareketliligi" },
      { label: "IAESTE ile staj", href: "/rehber/iaeste-ile-yurtdisinda-staj" },
      { label: "Açık ilanların tamamı", href: "/staj-ilanlari/sayfa/1" },
      { label: "Tüm staj ilanları", href: "/staj-ilanlari", highlight: true },
    ],
  },
  {
    title: "Bölüme Göre Staj",
    links: [
      { label: "Yazılım Mühendisliği", href: "/bolum/yazilim-muhendisligi" },
      { label: "Bilgisayar Mühendisliği", href: "/bolum/bilgisayar-muhendisligi" },
      { label: "Bilgisayar Programcılığı", href: "/bolum/bilgisayar-programciligi" },
      { label: "Elektrik-Elektronik", href: "/bolum/elektrik-elektronik-muhendisligi" },
      { label: "Makine Mühendisliği", href: "/bolum/makine-muhendisligi" },
      { label: "Endüstri Mühendisliği", href: "/bolum/endustri-muhendisligi" },
      { label: "İnşaat Mühendisliği", href: "/bolum/insaat-muhendisligi" },
      { label: "İşletme", href: "/bolum/isletme" },
      { label: "İktisat", href: "/bolum/iktisat" },
      { label: "Grafik Tasarım", href: "/bolum/grafik-tasarim" },
      { label: "Tüm bölümler", href: "/bolumler", highlight: true },
    ],
  },
  {
    title: "Öğrenci Rehberi",
    links: [
      { label: "Staj nasıl bulunur?", href: "/rehber/staj-nasil-bulunur" },
      { label: "ATS uyumlu CV nasıl hazırlanır?", href: "/rehber/ats-uyumlu-cv" },
      { label: "Staj CV'si nasıl yazılır?", href: "/rehber/staj-cv-nasil-yazilir" },
      { label: "Staj mülakatına hazırlık", href: "/rehber/staj-mulakati" },
      { label: "Staj başvuru e-postası", href: "/rehber/staj-basvuru-epostasi" },
      { label: "Staj defteri nasıl doldurulur?", href: "/rehber/staj-defteri-nasil-doldurulur" },
      { label: "Staj sigortasını kim yapar?", href: "/rehber/staj-sigortasi-kim-yapar" },
      { label: "KYK burs ve kredi", href: "/rehber/kyk-burs-ve-kredi" },
      { label: "Staj ücreti nasıl hesaplanır?", href: "/rehber/staj-ucreti-nasil-hesaplanir" },
      { label: "Tüm rehberler", href: "/rehber", highlight: true },
    ],
  },
  {
    title: "Fırsatlar ve Araçlar",
    links: [
      { label: "KYK Öğrenim Bursu", href: "/firsatlar/kyk-ogrenim-bursu" },
      { label: "İBB Öğrenci Bursu", href: "/firsatlar/ibb-ogrenci-bursu" },
      { label: "TEV Yükseköğretim Bursu", href: "/firsatlar/tev-yuksekogretim-bursu" },
      { label: "Erasmus+ Hareketlilik", href: "/firsatlar/erasmus-plus-hareketlilik" },
      { label: "TEKNOFEST Yarışmaları", href: "/firsatlar/teknofest-yarismalari" },
      { label: "Büyük işverenlerde staj", href: "/staj-programlari" },
      { label: "Kariyer merkezleri", href: "/universite-kariyer-merkezleri" },
      { label: "Staj ücreti hesaplama", href: "/araclar/staj-ucreti-hesaplama" },
      { label: "Tüm hesaplama araçları", href: "/araclar" },
      { label: "Tüm fırsatlar", href: "/firsatlar", highlight: true },
    ],
  },
  {
    title: "İşverenler İçin",
    links: [
      { label: "Ücretsiz ilan ver", href: "/isveren" },
      { label: "Şirketini sahiplen", href: "/isveren/ilan-ver" },
      { label: "Stajyer nasıl alınır?", href: "/stajyer-nasil-alinir" },
      { label: "İyi staj ilanı nasıl yazılır?", href: "/rehber/iyi-staj-ilani-nasil-yazilir" },
      { label: "İşverenin yükümlülükleri", href: "/rehber/zorunlu-staj-isverenin-yukumlulukleri" },
      { label: "Başvuruları değerlendirme", href: "/rehber/staj-basvurularini-degerlendirme" },
      { label: "Stajyerin ilk günü", href: "/rehber/stajyerin-ilk-gunu-oryantasyon" },
      { label: "İlan kuralları", href: "/ilan-kurallari" },
    ],
  },
];

/* Hesap adresini yaz; boş bırakılan hesap footer'da görünmez. */
const SOCIALS: { name: string; href: string; icon: ReactNode }[] = [
  { name: "Instagram", href: "https://www.instagram.com/stajimvar/", icon: <IconInstagram /> },
  { name: "LinkedIn", href: "https://www.linkedin.com/company/stajimvar/", icon: <IconLinkedin /> },
  { name: "X", href: "https://x.com/StajimVar", icon: <IconX /> },
  { name: "TikTok", href: "https://www.tiktok.com/@stajimvar", icon: <IconTiktok /> },
  { name: "YouTube", href: "https://www.youtube.com/@stajimvar", icon: <IconYoutube /> },
  { name: "Telegram", href: "", icon: <IconTelegram /> },
];

const BOTTOM_LINKS: FooterLink[] = [
  { label: "Hakkımızda", href: "/hakkimizda" },
  { label: "İletişim", href: "/iletisim" },
  { label: "Öğrenci Rehberi", href: "/rehber" },
  { label: "İşverenler İçin", href: "/isveren" },
  { label: "İlan bildir", href: "/ilan-bildir" },
  { label: "Gizlilik Politikası", href: "/gizlilik" },
  { label: "KVKK Aydınlatma Metni", href: "/kvkk-aydinlatma-metni" },
  { label: "Çerez Politikası", href: "/cerez-politikasi" },
  { label: "Kullanım Koşulları", href: "/kullanim-kosullari" },
];

type FooterProps = {
  /** Uygulamanın kendi yönlendiricisi (App.tsx `navigate`). */
  onNavigate: (to: string) => void;
  /** Çerez tercihleri penceresini açar; verilmezse düğme görünmez. */
  onCookiePreferences?: () => void;
};

export default function Footer({ onNavigate, onCookiePreferences }: FooterProps) {
  const activeSocials = SOCIALS.filter((s) => s.href);
  const year = new Date().getFullYear();

  /*
    Ctrl/⌘/orta tık yeni sekme açsın diye tarayıcıya bırakılıyor; düz
    tıklama sayfayı yeniden yüklemeden uygulama içinde gidiyor.
  */
  const go = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onNavigate(href);
  };

  return (
    <footer className="sv-footer">
      <div className="sv-footer__inner">
        <div className="sv-footer__grid">
          {COLUMNS.map((col) => (
            <nav key={col.title} className="sv-footer__col" aria-label={col.title}>
              <h2 className="sv-footer__title">{col.title}</h2>
              <ul>
                {col.links.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      onClick={(e) => go(e, l.href)}
                      className={l.highlight ? "is-highlight" : undefined}
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="sv-footer__col">
            {/* Hesap adresi girilmeden başlık tek başına kalmasın. */}
            {activeSocials.length > 0 && (
              <>
                <h2 className="sv-footer__title">Bizi Takip Edin</h2>
                <ul className="sv-footer__socials">
                  {activeSocials.map((s) => (
                    <li key={s.name}>
                      <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.name}>
                        {s.icon}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <h2 className={activeSocials.length > 0 ? "sv-footer__title sv-footer__title--spaced" : "sv-footer__title"}>
              Bize Ulaşın
            </h2>
            <a className="sv-footer__mail" href="mailto:iletisim@stajimvar.com">
              <IconMail />
              {/* Dar sütunda adres "@" işaretinden kırılsın, ".co m" diye değil. */}
              <span>iletisim@<wbr />stajimvar.com</span>
            </a>
            <p className="sv-footer__note">Yanıt süremiz genellikle 2 iş günü.</p>
          </div>
        </div>
      </div>

      <div className="sv-footer__bar">
        <ul className="sv-footer__inner sv-footer__barlinks">
          {BOTTOM_LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={(e) => go(e, l.href)}>{l.label}</a>
            </li>
          ))}
          {onCookiePreferences && (
            <li>
              <button type="button" className="sv-footer__linkbtn" onClick={onCookiePreferences}>
                Çerez tercihleri
              </button>
            </li>
          )}
        </ul>
      </div>

      <div className="sv-footer__inner sv-footer__legal">
        <a href="/" onClick={(e) => go(e, "/")} className="sv-footer__brand" aria-label="StajımVar ana sayfa">
          Stajım<span>Var</span>
        </a>
        <p>
          {/*
            21 Ekim 2026 verisiyle örtüşüyor: yayındaki 175 ilanın 76'sı yurt
            dışında, 172'si resmî kariyer sayfalarından, 3'ü işverenin kendi
            ilanı. Ödeme/üyelik ücreti yok (Hakkımızda › Ücret).
          */}
          StajımVar, Türkiye'den ve yurt dışından staj ilanlarını tek listede toplar. İlanların
          çoğu şirketlerin kendi kariyer sayfalarından derlenir, bir kısmını işverenler doğrudan
          StajımVar'da yayımlar. Öğrencilerden hiçbir ad altında ücret alınmaz.
          <br />© {year} StajımVar. Tüm hakları saklıdır.
        </p>
      </div>
    </footer>
  );
}

/* ---------------- İkonlar (dış bağımlılık yok) ---------------- */
function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}
function IconInstagram() {
  return (<Svg><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></Svg>);
}
function IconLinkedin() {
  return (<Svg><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></Svg>);
}
function IconX() {
  return (<Svg><path d="M4 4l11.7 16H20L8.3 4z" /><path d="M4 20l6.8-7.4M20 4l-6.8 7.4" /></Svg>);
}
function IconTiktok() {
  return (<Svg><path d="M9 12a4 4 0 1 0 4 4V3a5 5 0 0 0 5 5" /></Svg>);
}
function IconYoutube() {
  return (<Svg><rect x="2" y="5" width="20" height="14" rx="4" /><path d="m10 9 5 3-5 3z" /></Svg>);
}
function IconTelegram() {
  return (<Svg><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></Svg>);
}
function IconMail() {
  return (<Svg><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-9 5.7a2 2 0 0 1-2 0L2 7" /></Svg>);
}
