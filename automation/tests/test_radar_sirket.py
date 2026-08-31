"""ŞİRKET KİMLİĞİ ÇÖZÜCÜSÜ V2 REGRESYONU

Ana kural: DOMAIN TAHMİNİ KANIT DEĞİLDİR, ARAMA SONUCU DA KANIT
DEĞİLDİR. YANLIŞ ALAN ADI ÇÖZÜLEMEMİŞ OLMAKTAN KÖTÜDÜR.
"""

from automation.radar_sirket import (
    AramaYok,
    alan_adini_normalize_et,
    bilgi_tabani_kur,
    ic_veriden_coz,
    kimligi_dogrula,
    sirket_alani_olamaz,
    sirketi_coz,
    tahmin_adaylari,
)


def sahte_getir(sayfalar: dict[str, str]):
    def getir(url: str):
        alan = url.replace("https://", "").replace("http://", "").strip("/")
        if alan in sayfalar:
            return 200, sayfalar[alan]
        return 404, ""

    return getir


KOTON_ANASAYFA = (
    "<html><head><title>Koton | Kadın, Erkek ve Çocuk Giyim</title>"
    '<meta property="og:site_name" content="Koton">'
    '<script type="application/ld+json">{"@type":"Organization","name":"Koton"}</script>'
    "</head><body>Koton</body></html>"
)


class SahteArama:
    kullanilabilir = True
    ad = "sahte"

    def __init__(self, sonuclar, hata=False):
        self.sonuclar = sonuclar
        self.hata = hata
        self.cagri = 0

    def ara(self, sorgu):
        self.cagri += 1
        if self.hata:
            raise RuntimeError("saglayici dustu")
        return self.sonuclar


# ------------------------------------------------------- A, B: iç veri


def test_a_mevcut_website_url_varsa_arama_yapilmiyor():
    tabani = bilgi_tabani_kur([{"name": "ABC Teknoloji A.Ş.", "website_url": "https://www.abc.com.tr/"}], [])
    arama = SahteArama([{"title": "x", "url": "https://yanlis.com"}])
    sonuc, sorgu = sirketi_coz("ABC Teknoloji Sanayi ve Ticaret A.Ş.", sahte_getir({}), tabani, arama)
    assert sonuc.guven == "HIGH"
    assert sonuc.alan_adi == "abc.com.tr"
    assert sonuc.katman == "ic_veri"
    assert arama.cagri == 0, "iç veri varken arama yapıldı"
    assert sorgu == 0


def test_b_mevcut_ilanin_resmi_adresinden_alan_cikiyor():
    tabani = bilgi_tabani_kur(
        [],
        [{"companies": {"name": "Rapsodo"}, "canonical_url": "https://careers.rapsodo.com/jobs/1"}],
    )
    assert tabani["rapsodo"] == "careers.rapsodo.com"


def test_ats_adresi_sirket_alani_olarak_kabul_edilmiyor():
    """jobs.lever.co bir ŞİRKET alanı değil; toplayıcı listesi engelliyor."""
    tabani = bilgi_tabani_kur([], [{"companies": {"name": "X"}, "canonical_url": "https://www.kariyer.net/x"}])
    assert "x" not in tabani


# ------------------------------------------------- C, D: engelli alanlar


def test_c_rehber_ve_sosyal_alanlar_reddediliyor():
    for u in [
        "https://www.linkedin.com/company/abc",
        "https://www.instagram.com/abc",
        "https://tr.wikipedia.org/wiki/ABC",
        "https://www.firmarehberi.example/abc",
        "https://www.hurriyet.com.tr/abc",
    ]:
        assert sirket_alani_olamaz(u), u


def test_d_toplayici_listesi_paylasiliyor():
    """İkinci bir güven sistemi yok: toplayıcı listesi canonical."""
    assert sirket_alani_olamaz("https://www.kariyer.net/firma/abc")
    assert sirket_alani_olamaz("https://www.youthall.com/x")
    assert not sirket_alani_olamaz("https://abc.com.tr")


# ------------------------------------------------------- E: kimlik kanıtı


def test_e_birden_fazla_kimlik_sinyali_high_veriyor():
    guven, kanitlar = kimligi_dogrula("Koton", "koton.com", sahte_getir({"koton.com": KOTON_ANASAYFA}))
    assert guven == "HIGH"
    assert len(kanitlar) >= 2


def test_tek_sinyal_medium_kaliyor():
    sayfa = "<html><head><title>Koton</title></head><body></body></html>"
    guven, _ = kimligi_dogrula("Koton Mağazacılık", "baskasite.com", sahte_getir({"baskasite.com": sayfa}))
    assert guven in ("MEDIUM", "LOW")


def test_kimlik_yoksa_low():
    sayfa = "<html><head><title>Domain for sale</title></head></html>"
    guven, _ = kimligi_dogrula("Koton", "parked.com", sahte_getir({"parked.com": sayfa}))
    assert guven == "LOW"


# --------------------------------------------- F, H: aynı ad / holding


def test_f_ayni_ada_benzer_birden_fazla_kayit_belirsiz():
    tabani = {"nova": "nova-a.com", "nova teknoloji": "nova-b.com"}
    sonuc = ic_veriden_coz("Nova", tabani)
    # Birebir eşleşme var: onu alıyor, tahmine düşmüyor.
    assert sonuc.alan_adi == "nova-a.com"

    belirsiz = ic_veriden_coz("Novaa", {"nova": "a.com", "novab": "b.com"})
    assert not belirsiz.otomatik_kullanilabilir


def test_h_holding_ile_bagli_sirket_birlesmiyor():
    tabani = bilgi_tabani_kur([{"name": "Koç Holding", "website_url": "https://koc.com.tr"}], [])
    sonuc = ic_veriden_coz("Ford Otosan", tabani)
    assert not sonuc.var, "bağlı şirket holdinge eşlendi"


# ----------------------------------------------------------- G: ekler


def test_g_hukuki_ekler_normalize_ediliyor():
    tabani = bilgi_tabani_kur([{"name": "ABC Teknoloji", "website_url": "https://abc.com.tr"}], [])
    for varyant in [
        "ABC Teknoloji A.Ş.",
        "ABC Teknoloji Sanayi ve Ticaret A.Ş.",
        "ABC Teknoloji Ltd. Şti.",
    ]:
        assert ic_veriden_coz(varyant, tabani).alan_adi == "abc.com.tr", varyant


# ------------------------------------------------------- I, J: arama


def test_i_arama_saglayici_hatasi_radari_dusurmuyor():
    arama = SahteArama([], hata=True)
    sonuc, _ = sirketi_coz("Bilinmeyen Şirket", sahte_getir({}), {}, arama)
    assert sonuc.guven == "LOW"
    assert not sonuc.var


def test_arama_yapilandirilmamissa_katman_kapali():
    sonuc, sorgu = sirketi_coz("Bilinmeyen Şirket", sahte_getir({}), {}, AramaYok())
    assert sorgu == 0
    assert not sonuc.var


def test_j_onbellek_ikinci_aramayi_engelliyor():
    arama = SahteArama([{"title": "Koton", "url": "https://koton.com"}])
    onbellek: dict = {}
    getir = sahte_getir({"koton.com": KOTON_ANASAYFA})
    ilk, _ = sirketi_coz("Koton", getir, {}, arama, onbellek)
    ilk_cagri = arama.cagri
    ikinci, sorgu2 = sirketi_coz("Koton", getir, {}, arama, onbellek)
    assert ikinci.alan_adi == ilk.alan_adi
    assert arama.cagri == ilk_cagri, "önbelleğe rağmen yeniden arandı"
    assert sorgu2 == 0
    assert "önbellekten" in ikinci.kanitlar[-1]


# --------------------------------------------------- M: yanlış yönlenme


def test_m_alakasiz_alan_kimlik_dogrulayamiyor():
    """Arama alakasız bir site verirse kimlik doğrulaması eliyor."""
    arama = SahteArama([{"title": "x", "url": "https://alakasiz.com"}])
    getir = sahte_getir({"alakasiz.com": "<html><title>Başka Bir Şirket</title></html>"})
    sonuc, _ = sirketi_coz("Koton Mağazacılık", getir, {}, arama)
    assert sonuc.guven != "HIGH"


# ------------------------------------------------------------ tahmin


def test_tahmin_adaylari_kesme_ve_iki_kelime_kapsiyor():
    a = tahmin_adaylari("COLIN'S")
    assert any(x.startswith("colins.") for x in a)
    b = tahmin_adaylari("Ahlatcı Holding")
    assert any(x.startswith("ahlatciholding.") for x in b)


def test_tahmin_tek_basina_high_vermiyor():
    """Tahmin edilen adres kimlik doğrulamadan HIGH olamaz."""
    getir = sahte_getir({"koton.com.tr": "<html><title>Rastgele</title></html>"})
    sonuc, _ = sirketi_coz("Koton", getir, {}, AramaYok())
    assert sonuc.guven != "HIGH"


# ------------------------------------------------------- alan normalize


def test_alan_adi_normalizasyonu():
    assert alan_adini_normalize_et("https://www.abc.com.tr/kariyer") == "abc.com.tr"
    assert alan_adini_normalize_et("abc.com.tr") == "abc.com.tr"
    assert alan_adini_normalize_et(None) is None


# -------------------------------------------------------- N: eşik korunuyor


def test_n_medium_asagi_akisa_gitmiyor():
    from automation.radar_sirket import SirketCozumu

    assert not SirketCozumu("x.com", "MEDIUM", "arama").otomatik_kullanilabilir
    assert SirketCozumu("x.com", "HIGH", "ic_veri").otomatik_kullanilabilir
