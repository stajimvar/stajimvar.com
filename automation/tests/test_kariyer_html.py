"""GENEL HTML KARİYER ADAPTÖRÜ REGRESYONU (§18 A–N)

Ana kural: YAYINLANAN İÇERİK ŞİRKETİN KENDİ SAYFASINDAN GELİR.
LinkedIn yalnız köprü; belirsiz alan uydurulmaz, yayınlanmaz.
"""

import json
import pathlib

import pytest

from automation.kariyer_html import (
    ilan_baglantilari,
    jsonld_ilanlari,
    kapali_mi,
    kariyer_sayfasini_oku,
    metne_cevir,
    mikroveri_var_mi,
)
from automation.radar_cozum import eslesme_guveni
from automation.radar_resmi import turkiye_mi
from automation.staj_kalitesi import VALID_INTERNSHIP, sinifla

KOK = pathlib.Path(__file__).resolve().parents[1]

STAJ_METNI = (
    "Üniversite öğrencilerine yönelik uzun dönem staj programımız için "
    "stajyer arıyoruz. Haftada 3 gün İstanbul ofisimizde çalışacaksın. "
    "Zorunlu staj evrakların desteklenir ve sigortan tarafımızca yapılır. "
    "Başvuru için güncel transkriptini ve özgeçmişini iletmen yeterli. "
    "Program boyunca bir mentor eşliğinde gerçek projelerde yer alacaksın."
)


def jsonld_sayfasi(**alanlar):
    veri = {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": "Yazılım Stajyeri",
        "description": f"<p>{STAJ_METNI}</p>",
        "hiringOrganization": {"@type": "Organization", "name": "Acme"},
        "jobLocation": {"@type": "Place", "address": {
            "@type": "PostalAddress", "addressLocality": "İstanbul",
            "addressCountry": "TR"}},
        "url": "https://acme.com.tr/kariyer/yazilim-stajyeri",
        "employmentType": "INTERN",
    }
    veri.update(alanlar)
    return f'<html><script type="application/ld+json">{json.dumps(veri)}</script></html>'


def sahte_getir(sayfalar):
    sirali = sorted(sayfalar.items(), key=lambda kv: -len(kv[0]))

    def getir(url):
        for anahtar, deger in sirali:
            if anahtar in url:
                return deger
        return 404, ""
    return getir


# ------------------------------------------- A: JSON-LD JobPosting parse

def test_a_jsonld_jobposting_okunuyor():
    ilanlar = jsonld_ilanlari(jsonld_sayfasi(), "https://acme.com.tr/kariyer")
    assert len(ilanlar) == 1
    i = ilanlar[0]
    assert i.baslik == "Yazılım Stajyeri"
    assert i.sirket == "Acme"
    assert "İstanbul" in i.konum and "TR" in i.konum
    assert "stajyer arıyoruz" in i.aciklama
    assert i.kanit == "JobPosting JSON-LD"
    assert "<p>" not in i.aciklama, "HTML etiketleri temizlenmeli"


def test_a_graph_icindeki_jobposting_de_bulunuyor():
    sayfa = ('<script type="application/ld+json">'
             + json.dumps({"@context": "https://schema.org", "@graph": [
                 {"@type": "Organization", "name": "Acme"},
                 {"@type": "JobPosting", "title": "Stajyer",
                  "description": STAJ_METNI}]})
             + "</script>")
    assert len(jsonld_ilanlari(sayfa, "https://acme.com.tr/k")) == 1


def test_a_bozuk_jsonld_cokmeye_yol_acmiyor():
    assert jsonld_ilanlari('<script type="application/ld+json">{bozuk</script>', "u") == []
    assert jsonld_ilanlari("", "u") == []
    assert jsonld_ilanlari(None, "u") == []


def test_a_jobposting_olmayan_jsonld_ilan_uretmiyor():
    sayfa = ('<script type="application/ld+json">'
             + json.dumps({"@type": "Organization", "name": "Acme"}) + "</script>")
    assert jsonld_ilanlari(sayfa, "u") == []


# ------------------------------------- B: düz HTML ilan listesi parse

def test_b_ilan_detay_baglantilari_bulunuyor():
    html = "".join(
        f'<a href="/kariyer/ilan-{i}">Poz {i}</a>' for i in range(3)
    ) + '<a href="/gizlilik">Gizlilik</a><a href="/hakkimizda">Hakkımızda</a>'
    baglar = ilan_baglantilari(html, "https://acme.com.tr/kariyer")
    assert len(baglar) == 3
    assert all("/kariyer/ilan-" in u for u, _ in baglar)


def test_b_dis_site_ve_yardimci_baglar_ilan_sayilmiyor():
    html = ('<a href="https://baskasite.com/jobs/1">Dış</a>'
            '<a href="/login">Giriş</a><a href="mailto:x@y.z">Posta</a>'
            '<a href="#bolum">Bölüm</a>')
    assert ilan_baglantilari(html, "https://acme.com.tr/kariyer") == []


def test_b_kariyer_sayfasinin_kendisi_ilan_sayilmiyor():
    html = '<a href="/kariyer">Kariyer</a>'
    assert ilan_baglantilari(html, "https://acme.com.tr/kariyer") == []


def test_b_mikroveri_isareti_taniniyor():
    assert mikroveri_var_mi('<div itemtype="https://schema.org/JobPosting">')
    assert not mikroveri_var_mi("<div>yok</div>")


# --------------------------------- C: kariyer sayfası → detay → ilan

def test_c_liste_sayfasindan_detaya_inip_ilan_cikariyor():
    sayfalar = {
        "acme.com.tr/kariyer": (200, '<a href="/kariyer/yazilim-stajyeri">Yazılım Stajyeri</a>'),
        "acme.com.tr/kariyer/yazilim-stajyeri": (200, jsonld_sayfasi()),
    }
    sonuc = kariyer_sayfasini_oku("https://acme.com.tr/kariyer", sahte_getir(sayfalar))
    assert sonuc.erisilebilir and sonuc.yapisal_veri
    assert sonuc.ilan_baglantisi == 1 and sonuc.detay_cekilen == 1
    assert len(sonuc.ilanlar) == 1
    assert sonuc.ilanlar[0].baslik == "Yazılım Stajyeri"


def test_c_yapisal_veri_yoksa_sayfa_metninden_okunuyor():
    detay = f"<html><h1>Uzun Dönem Stajyer</h1><p>{STAJ_METNI}</p></html>"
    sayfalar = {
        "acme.com.tr/kariyer": (200, '<a href="/kariyer/stajyer">Stajyer</a>'),
        "acme.com.tr/kariyer/stajyer": (200, detay),
    }
    sonuc = kariyer_sayfasini_oku("https://acme.com.tr/kariyer", sahte_getir(sayfalar))
    assert len(sonuc.ilanlar) == 1
    assert sonuc.ilanlar[0].baslik == "Uzun Dönem Stajyer"
    assert not sonuc.yapisal_veri


def test_c_ilan_cikmazsa_sessiz_bos_donmuyor():
    """§3: bir şirketin parseri tutmuyorsa NEDEN yazılıyor."""
    sonuc = kariyer_sayfasini_oku(
        "https://acme.com.tr/kariyer",
        sahte_getir({"acme.com.tr/kariyer": (200, "<p>Bize yazın</p>")}))
    assert sonuc.ilanlar == []
    assert sonuc.neden, "gerekçesiz boş dönüş yok"


# ------------------------------ D/E: LinkedIn sinyali → resmî eşleşme

def test_d_ayni_ilan_farkli_kelimelerle_high_eslesiyor():
    guven, _ = eslesme_guveni(
        "Acme", "Research Intern", "İzmir",
        "Acme", "Research Internship Program", "İzmir, Türkiye", ats_kimligi=False)
    assert guven == "HIGH"


def test_e_alakasiz_ilan_high_olmuyor():
    guven, _ = eslesme_guveni(
        "Acme", "Marketing Intern", "İstanbul",
        "Acme", "Senior Marketing Manager", "İstanbul", ats_kimligi=False)
    assert guven != "HIGH"


def test_e_baslik_esigi_045_korunuyor():
    """Önceki turun ölçülmüş eşiği bu turda da geçerli."""
    from automation.radar_cozum import BASLIK_HIGH, BASLIK_MEDIUM

    assert BASLIK_HIGH == 0.5 and BASLIK_MEDIUM == 0.45


# ------------------------------------------------ F: Türkiye kanıtı

def test_f_turkiye_kaniti_yoksa_reddediliyor():
    assert not turkiye_mi("Wavre, Walloon Region, Belgium")
    assert not turkiye_mi("Chicago, IL")
    assert turkiye_mi("İzmir, Türkiye")


def test_f_linkedin_konumu_tek_basina_yeterli_degil():
    """Kanıt resmî sayfadan okunuyor; koşucu LinkedIn konumunu kullanmıyor."""
    govde = (KOK / "kariyer_html_kosu.py").read_text(encoding="utf-8")
    assert "turkiye_mi(aday.konum, aday.aciklama)" in govde
    assert "sinyal.konum" not in govde.split("def _degerlendir")[1].split("def ")[0]


# ------------------------------------------------------ G: staj kalitesi

def test_g_staj_olmayan_ilan_eleniyor():
    karar = sinifla("Senior Backend Engineer",
                    "5+ yıl deneyimli mühendis arıyoruz. Tam zamanlı pozisyon.")
    assert karar.sinif != VALID_INTERNSHIP


def test_g_gercek_staj_geciyor():
    assert sinifla("Yazılım Stajyeri", STAJ_METNI).sinif == VALID_INTERNSHIP


def test_g_kalite_resmi_aciklamadan_karar_veriyor():
    govde = (KOK / "kariyer_html_kosu.py").read_text(encoding="utf-8")
    assert "sinifla(aday.baslik, aday.aciklama)" in govde


# ------------------------------------------------- H/L: kapalı ve erişim

@pytest.mark.parametrize("metin", [
    "Bu ilan yayından kaldırılmıştır.",
    "This position is closed.",
    "Applications are closed",
    "Başvurular kapandı.",
])
def test_h_acik_kapali_kaniti_taniniyor(metin):
    assert kapali_mi(f"<p>{metin}</p>")


def test_h_kapali_kaniti_yoksa_kapali_sayilmiyor():
    assert not kapali_mi(f"<p>{STAJ_METNI}</p>")
    assert not kapali_mi(None)


@pytest.mark.parametrize("durum", [403, 429, 500, 503])
def test_l_erisilemeyen_sayfa_kapali_varsayilmiyor(durum):
    """FAIL CLOSED: yayınlamıyoruz ama 'kapandı' da demiyoruz."""
    sonuc = kariyer_sayfasini_oku(
        "https://acme.com.tr/kariyer",
        sahte_getir({"acme.com.tr/kariyer": (durum, "")}))
    assert not sonuc.erisilebilir
    assert sonuc.ilanlar == []
    assert str(durum) in sonuc.neden


def test_l_ag_hatasi_cokmeye_yol_acmiyor():
    def patla(url):
        raise TimeoutError("yavaş")

    sonuc = kariyer_sayfasini_oku("https://acme.com.tr/kariyer", patla)
    assert not sonuc.erisilebilir and "TimeoutError" in sonuc.neden


# --------------------------------------- I/J: duplicate (aktif ve kapalı)

def test_ij_duplicate_durum_suzgeci_kullanmiyor():
    """Kapalı/arşivli aynı ilan da duplicate — yeniden yayınlanmıyor."""
    govde = (KOK / "kariyer_html_kosu.py").read_text(encoding="utf-8")
    dup = govde.split("def _yayinla")[1].split("payload = {")[0]
    assert 'eq("status"' not in dup, "duplicate kontrolü yayındakilerle sınırlı olmamalı"
    assert "duplicate_kapali" in govde and "duplicate_aktif" in govde


def test_ij_duplicate_iki_katmanli():
    govde = (KOK / "kariyer_html_kosu.py").read_text(encoding="utf-8")
    assert 'eq("canonical_url"' in govde
    assert 'eq("company_id"' in govde


# ------------------------------------------------- K: kaynak resmî

def test_k_kaynak_linkedin_degil_sirketin_kariyer_sayfasi():
    govde = (KOK / "kariyer_html_kosu.py").read_text(encoding="utf-8")
    payload = govde.split("payload = {")[1].split("\n    }")[0]
    # Yorum satırları koddan sayılmıyor: §10'u anlatan yorumda "LinkedIn"
    # geçiyor ve ilk sürümde test kendi yorumunu yakalamıştı.
    kod = "\n".join(x for x in payload.splitlines() if not x.lstrip().startswith("#"))
    assert '"source_url": aday.kariyer_url' in kod
    assert '"canonical_url": aday.basvuru_url' in kod
    assert "linkedin" not in kod.lower()


def test_k_adaptor_resmi_kaynak_olarak_kayitli():
    from automation import repository

    assert "generic_career" in repository.OFFICIAL_ADAPTERS
    # `source_kind` enum'unda "html" yok; birincil kanıt JSON-LD.
    assert repository.KIND_BY_ADAPTER["generic_career"] == "jsonld"


def test_k_arama_istegi_atilmiyor():
    for ad in ("kariyer_html.py", "kariyer_html_kosu.py"):
        govde = (KOK / ad).read_text(encoding="utf-8")
        assert "radar_brave" not in govde and "saglayici_kur" not in govde, ad
        assert "linkedin.com" not in govde.lower(), ad


# ------------------------------------------- M: canonical insert alanları

def test_m_insert_zorunlu_alanlari_tasiyor():
    govde = (KOK / "kariyer_html_kosu.py").read_text(encoding="utf-8")
    payload = govde.split("payload = {")[1].split("\n    }")[0]
    for alan in ("company_id", "title", "status", "origin", "source_id",
                 "apply_url", "application_method"):
        assert f'"{alan}"' in payload, alan
    assert '"status": "published"' in payload


def test_m_belirsiz_alan_uydurulmuyor():
    """§12 FAIL CLOSED: açıklama ya da başvuru adresi yoksa yayın yok."""
    govde = (KOK / "kariyer_html_kosu.py").read_text(encoding="utf-8")
    blok = govde.split("def _degerlendir")[1].split("def ")[0]
    assert "resmî açıklama yok/yetersiz" in blok
    assert "resmî başvuru adresi yok" in blok


# ------------------------------------------ N: public feed doğrulaması

def test_n_public_feed_once_ve_sonra_sayiliyor():
    govde = (KOK / "kariyer_html_kosu.py").read_text(encoding="utf-8")
    assert "_yayindaki_ilan_sayisi()" in govde
    assert '"baslangic": baslangic' in govde and '"bitis": bitis' in govde


def test_n_kapsam_kilidi_14_sirket():
    from automation.kariyer_html_kosu import _kapsam_sirketleri

    assert len(_kapsam_sirketleri()) == 14


# ------------------------------------------------------------ yardımcı

def test_metne_cevir_liste_ve_satirlari_koruyor():
    metin = metne_cevir("<ul><li>Bir</li><li>İki</li></ul><p>Son</p>")
    assert "• Bir" in metin and "• İki" in metin and "Son" in metin
    assert "<" not in metin
