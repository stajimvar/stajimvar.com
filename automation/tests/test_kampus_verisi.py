"""KAMPÜSÜM VERİSİ — resmî kaynak ayrıştırıcıları

Örnek dosya MSGSÜ'nün kendi sitesinde yayımladığı Eylül 2026 menüsü:
https://msgsu.edu.tr/wp-content/uploads/2026/09/2026-Eylul-Ayi-Menu.pdf
(24 Eylül 2026'da indirildi, değiştirilmedi).
"""

import pathlib
from datetime import date

import pytest

from automation import kampus_verisi as kv

FIXTURE = pathlib.Path(__file__).parent / "fixtures" / "kampus" / "msgsu-2026-eylul-menu.pdf"


@pytest.fixture(scope="module")
def eylul():
    return kv.menu_pdf_ayristir(FIXTURE.read_bytes())


def test_ayin_butun_is_gunleri_okunuyor(eylul):
    gunler, uyarilar = eylul
    assert uyarilar == []
    assert len(gunler) == 22
    assert all(g.tarih.month == 9 and g.tarih.weekday() < 5 for g in gunler)
    assert len({g.tarih for g in gunler}) == 22, "aynı gün iki kez yazılmamalı"


def test_gun_icerigi_sutundan_dogru_geliyor(eylul):
    gunler = {g.tarih: g for g in eylul[0]}
    g = gunler[date(2026, 9, 25)]
    assert g.kalori == 1030
    assert g.yemekler == ("TARHANA ÇORBA", "ET DÖNER/PARMAK PATATES", "PİRİNÇ PİLAVI", "MEVSİM SALATA")
    assert gunler[date(2026, 9, 1)].yemekler[1] == "KARNIYARIK"


def test_kaynakta_olmayan_kalori_uydurulmuyor(eylul):
    gunler = {g.tarih: g for g in eylul[0]}
    assert gunler[date(2026, 9, 18)].kalori is None
    assert gunler[date(2026, 9, 18)].yemekler[0] == "EZOGELİN ÇORBA"


@pytest.mark.parametrize(
    "url, beklenen",
    [
        ("https://msgsu.edu.tr/a.pdf", True),
        ("https://sks.msgsu.edu.tr/a", True),
        ("http://msgsu.edu.tr/a.pdf", False),
        ("https://msgsu.edu.tr.kotu.com/a", False),
        ("https://kotumsgsu.edu.tr/a", False),
    ],
)
def test_resmi_alan_denetimi(url, beklenen):
    assert kv.resmi_alanda(url, "msgsu.edu.tr") is beklenen


def test_ay_ileri_yil_donumunu_geciyor():
    assert kv.ay_ileri(date(2026, 12, 1), 1) == date(2027, 1, 1)
    assert kv.ay_ileri(date(2026, 11, 1), 2) == date(2027, 1, 1)


class _Cevap:
    def __init__(self, veri=None, icerik=b""):
        self._veri, self.content = veri, icerik

    def json(self):
        return self._veri


def test_menu_yalniz_bu_ay_ve_gelecek_ay(monkeypatch):
    pdf = FIXTURE.read_bytes()

    def sahte_getir(url, alan, **_):
        if url.endswith("/media"):
            return _Cevap([
                {"source_url": "https://msgsu.edu.tr/eylul.pdf", "mime_type": "application/pdf"},
                {"source_url": "https://baska.site/eylul.pdf", "mime_type": "application/pdf"},
                {"source_url": "https://msgsu.edu.tr/foto.jpg", "mime_type": "image/jpeg"},
            ])
        return _Cevap(icerik=pdf)

    monkeypatch.setattr(kv, "getir", sahte_getir)
    kaynak = {"url": "https://msgsu.edu.tr/wp-json/wp/v2/media", "ayar": {}}

    eylulde = kv.wordpress_aylik_menu_pdf(kaynak, "msgsu.edu.tr", date(2026, 9, 25))
    assert len(eylulde.menuler) == 22
    assert all(m["ogun"] == "gunluk" for m in eylulde.menuler), "kaynak öğün vermiyor; öğle denmemeli"
    assert any("resmî alanda değil" in u for u in eylulde.uyarilar)

    kasimda = kv.wordpress_aylik_menu_pdf(kaynak, "msgsu.edu.tr", date(2026, 11, 2))
    assert kasimda.menuler == [], "geçmiş ayın menüsü yazılmamalı"
    assert "bu ay için menü bulunamadı" in kasimda.uyarilar


def test_duyurular_basligi_temizleniyor_ve_resmi_alan_disini_atiyor(monkeypatch):
    def sahte_getir(url, alan, **_):
        return _Cevap([
            {"date": "2026-09-24T16:39:09", "link": "https://msgsu.edu.tr/d/1/",
             "title": {"rendered": "Yabanc&#305; Dil <em>&#350;art&#305;</em>"}},
            {"date": "2026-09-23T10:00:00", "link": "https://baska.site/d/2/",
             "title": {"rendered": "Dış bağlantı"}},
        ])

    monkeypatch.setattr(kv, "getir", sahte_getir)
    s = kv.wordpress_kategori(
        {"url": "https://msgsu.edu.tr/wp-json/wp/v2/posts", "ayar": {"kategori": 1}},
        "msgsu.edu.tr",
        date(2026, 9, 25),
    )
    assert [d["baslik"] for d in s.duyurular] == ["Yabancı Dil Şartı"]
    assert s.duyurular[0]["yayin_tarihi"] == "2026-09-24"
    assert len(s.uyarilar) == 1


# ------------------------------------------------------------ HTML satır menüsü


def test_satir_menusu_marmara_kalibi_vegan_bolumu_karismiyor():
    satirlar = [
        "Yemek Listesi", "Normal Menü",
        "25.09.2026 Cuma", "Mercimek Çorbası", "110", "Etli Kuru Fasulye (Alternatif)", "290",
        "Pirinç Pilavı", "320", "Normal Toplam:", "845 Kal", "Alternatif Toplam:", "860 Kal",
        "Vegan Menü", "25.09.2026 Cuma", "Mercimek Çorbası", "Kuru Fasulye",
        "(YEMEKLER TABLDOT TEPSİ GRAMAJINA UYGUN DEĞERLENDİRİLMİŞTİR.)",
    ]
    m = kv.satir_menu_ayristir(satirlar, date(2026, 9, 25), "https://sks.marmara.edu.tr/yemek", "ogle")
    assert len(m) == 1, "vegan bölümü ikinci bir öğle satırı üretmemeli"
    assert m[0]["yemekler"] == ["Mercimek Çorbası", "Etli Kuru Fasulye (Alternatif)", "Pirinç Pilavı"]
    assert m[0]["kalori"] == 845


def test_satir_menusu_bogazici_kalibi_ogle_ve_aksam():
    satirlar = [
        "Öğle Yemeği", "Akşam Yemeği",  # menü bağlantıları: ilk tarihten önce, yok sayılmalı
        "25 Eylül 2026, Cuma", "Öğle Yemeği", "Çorba", "Şefin Çorba", "116 kcal", "Ana Yemek", "İçli Köfte",
        "230 kcal - Pişmiş Porsiyon Gramajı ( 200 gr )", "Akşam Yemeği", "Çorba", "Domates Çorba", "Ana Yemek", "Çin Usulü Tavuk",
    ]
    m = {x["ogun"]: x for x in kv.satir_menu_ayristir(satirlar, date(2026, 9, 25), "https://yemekhane.bogazici.edu.tr/", "ogle")}
    assert m["ogle"]["yemekler"] == ["Şefin Çorba", "İçli Köfte"]
    assert m["aksam"]["yemekler"] == ["Domates Çorba", "Çin Usulü Tavuk"]


def test_gun_adi_tarihle_uyusmazsa_gun_atlaniyor():
    satirlar = ["25.09.2026 Pazartesi", "Mercimek Çorbası"]  # 25 Eylül 2026 Cuma
    assert kv.satir_menu_ayristir(satirlar, date(2026, 9, 25), "https://x.msgsu.edu.tr", "gunluk") == []


def test_yemek_listesi_kalori_ve_etiket_temizleniyor():
    assert kv._yemek_listesi("<p>ÖĞLE</p><p>YAYLA ÇORBA(130kcal)</p><p>AYRAN/MEYVE SUYU(70/60kcal)</p>") == [
        "YAYLA ÇORBA", "AYRAN/MEYVE SUYU"]
    assert kv._yemek_listesi("Düğün Çorbası,\r\nKıymalı Patates Oturtma") == ["Düğün Çorbası", "Kıymalı Patates Oturtma"]


# ------------------------------------------------------------ HTML duyuru listesi

LISTE = """
<ul>
 <li><a href="/tr/duyurular/a">ÇAR 23 Eylül</a><a href="/tr/duyurular/a">Oryantasyon Programı Tarih Değişikliği</a></li>
 <li><div><span>07 Eylül 2026</span><a href="/tr/duyurular/b">Güz yarıyılı kayıt yenileme işlemleri 9 Eylül</a></div></li>
 <li><a href="https://baska.site/tr/duyurular/c">Dış site duyurusu uzun başlık</a> 01.09.2026</li>
 <li><a href="/tr/duyurular/d">Gelecek tarihli etkinlik duyurusu</a> 30.12.2026</li>
</ul>
"""


def test_duyuru_listesi_baslik_ve_tarih_kurallari(monkeypatch):
    class _Html:
        text = LISTE
        url = "https://www.medeniyet.edu.tr/tr/duyurular"

    monkeypatch.setattr(kv, "getir", lambda url, alan, **_: _Html())
    monkeypatch.setattr(kv, "_detay_bilgisi", lambda url, alan, gun: (None, None))
    s = kv.html_duyuru_listesi(
        {"url": "https://www.medeniyet.edu.tr/tr/duyurular", "ayar": {"onek": "/tr/duyurular/"}},
        "medeniyet.edu.tr",
        date(2026, 9, 25),
    )
    bulunan = {d["url"].rsplit("/", 1)[1]: d for d in s.duyurular}
    assert bulunan["a"]["baslik"] == "Oryantasyon Programı Tarih Değişikliği", "tarih rozeti başlık olmamalı"
    assert bulunan["a"]["yayin_tarihi"] == "2026-09-23"
    assert bulunan["b"]["yayin_tarihi"] == "2026-09-07", "başlıktaki '9 Eylül' yayın tarihi değil"
    assert "c" not in bulunan, "resmî alan dışı bağlantı alınmamalı"
    assert "d" not in bulunan, "gelecek tarih yayın tarihi olamaz; detay da yoksa yazılmıyor"


def test_duyuru_listesi_baslik_kaptaki_seciciden(monkeypatch):
    """Nişantaşı: bağlantı metni yalnız "Detay →"; başlık ve tarih kapta."""

    class _Html:
        text = """
        <div class="nev-ann-card"><div class="nev-ann-meta"><span class="nev-ann-date">23.09.2026</span></div>
          <div class="nev-ann-title">İngilizce I-II Muafiyet Sınavı</div>
          <div class="nev-ann-desc">Sevgili Öğrenciler, 30.09.2026 tarihinde...</div>
          <a class="nev-ann-link" href="duyuru/muafiyet-318585">Detay →</a></div>
        <div class="nev-ann-card"><div class="nev-ann-meta"><span class="nev-ann-date">20.09.2026</span></div>
          <div class="nev-ann-title">Ders Programı Yayınlandı</div>
          <a class="nev-ann-link" href="duyuru/ders-programi-732844">Detay →</a></div>
        """
        url = "https://www.nisantasi.edu.tr/duyurular"

    monkeypatch.setattr(kv, "getir", lambda url, alan, **_: _Html())
    monkeypatch.setattr(kv, "_detay_bilgisi", lambda url, alan, gun: (None, None))
    s = kv.html_duyuru_listesi(
        {"url": _Html.url, "ayar": {"onek": "/duyuru/", "baslik_secici": ".nev-ann-title"}},
        "nisantasi.edu.tr",
        date(2026, 9, 25),
    )
    assert [(d["baslik"], d["yayin_tarihi"]) for d in s.duyurular] == [
        ("İngilizce I-II Muafiyet Sınavı", "2026-09-23"),
        ("Ders Programı Yayınlandı", "2026-09-20"),
    ]


# ------------------------------------------------------------ keşif


def test_yok_listesi_ayristiriliyor_ve_ad_anahtari_veritabaniyla_ayni():
    from automation import kampus_kesif as kk

    html = (
        '<div class="university-card-uni" data-name="GALATASARAY ÜNİVERSİTESİ" data-city="İSTANBUL">'
        '<div class="detail-label-uni">Web Sitesi:</div><div class="detail-value-uni">'
        '<a href="https://www.gsu.edu.tr" target="_blank">x</a></div></div>'
        '<div class="university-card-uni" data-name="SAHTE ÜNİVERSİTESİ" data-city="X">'
        '<div class="detail-label-uni">Web Sitesi:</div><div class="detail-value-uni">'
        '<a href="http://sahte.com" target="_blank">x</a></div></div>'
    )
    k = kk.yok_listesi_ayristir(html)
    assert k[kk.ad_anahtari("Galatasaray Üniversitesi")] == ("GALATASARAY ÜNİVERSİTESİ", "https://www.gsu.edu.tr")
    assert len(k) == 1, "https ve .edu.tr olmayan site alınmamalı"
    assert kk.kayitli_alan("https://www.gsu.edu.tr") == "gsu.edu.tr"
    assert kk.ad_anahtari("  İSTANBUL  TEKNİK ÜNİVERSİTESİ ") == "istanbul teknik universitesi"
    assert kk.ad_anahtari("İstanbul Üniversitesi") != kk.ad_anahtari("İstanbul Teknik Üniversitesi")


def test_kesif_dogrulamasi():
    from automation import kampus_kesif as kk

    gun = date(2026, 9, 25)
    duyuru = lambda *t: kv.Sonuc([], [
        {"yayin_tarihi": x, "url": f"https://x.edu.tr/tr/duyurular/{i}", "baslik": f"Öğrenci işleri duyurusu numara {i}"}
        for i, x in enumerate(t)
    ], [])
    assert kk.gecerli_duyuru(duyuru("2026-09-20", "2026-09-10", "2026-08-01"), gun)
    assert not kk.gecerli_duyuru(duyuru("2026-09-20", "2026-09-10", "2026-06-01"), gun), "en az 3 yakın tarihli"
    assert not kk.gecerli_duyuru(duyuru("2026-09-20", "2026-09-10"), gun), "en az 3 duyuru"
    assert not kk.gecerli_duyuru(duyuru("2026-06-01", "2026-05-01", "2026-04-01"), gun), "bayat liste"
    menu = lambda *t: kv.Sonuc([{"tarih": x, "yemekler": ["MERCİMEK ÇORBA", "PİLAV"]} for x in t], [], [])
    assert kk.gecerli_menu(menu("2026-09-24", "2026-09-25", "2026-09-26"), gun)
    assert not kk.gecerli_menu(menu("2026-09-01", "2026-09-02", "2026-09-03"), gun), "bugüne yakın gün yok"


def test_kesif_arsiv_ve_kategori_sayfalarini_duyuru_saymiyor():
    from automation import kampus_kesif as kk

    gun = date(2026, 9, 25)
    d = lambda url, baslik, t="2026-09-20": {"url": url, "baslik": baslik, "yayin_tarihi": t}
    akdeniz = kv.Sonuc([], [d(f"https://www.akdeniz.edu.tr/tr/duyurular/date/2026/{a}", "Duyurular") for a in (9, 8, 7)], [])
    hacettepe = kv.Sonuc([], [
        d("https://hacettepe.edu.tr/duyurular/senato", "Personel / Senato Kararları"),
        d("https://hacettepe.edu.tr/duyurular/yk", "Personel / Yönetim Kurulu Kararları"),
        d("https://hacettepe.edu.tr/duyurular/guncel", "Personel / Güncel Duyurular"),
    ], [])
    gercek = kv.Sonuc([], [
        d("https://x.edu.tr/tr/duyurular/a", "Güz yarıyılı ders kayıt takvimi açıklandı"),
        d("https://x.edu.tr/tr/duyurular/b", "Yabancı dil muafiyet sınavı sonuçları"),
        d("https://x.edu.tr/tr/duyurular/c", "Yurt başvuru süresi uzatıldı duyurusu"),
    ], [])
    assert not kk.gecerli_duyuru(akdeniz, gun), "AYLIK ARŞİV SAYFALARI DUYURU DEĞİL"
    assert not kk.gecerli_duyuru(hacettepe, gun), "KATEGORİ SAYFALARI DUYURU DEĞİL"
    assert kk.gecerli_duyuru(gercek, gun)


def test_kalori_yer_tutucusu_yemek_sayilmiyor():
    satirlar = ["25.09.2026 Cuma", "SEBZE ÇORBA", "-", "cal.", "İZMİR KÖFTE", "- cal.", "250 gr", "PİLAV", "130 kcal"]
    m = kv.satir_menu_ayristir(satirlar, date(2026, 9, 25), "https://sks.uskudar.edu.tr/yemek-menusu", "gunluk")
    assert m[0]["yemekler"] == ["SEBZE ÇORBA", "İZMİR KÖFTE", "PİLAV"]


def test_kesif_gurultulu_menuyu_reddediyor():
    from automation import kampus_kesif as kk

    gun = date(2026, 9, 25)
    gun_ = lambda t, y: {"tarih": t, "yemekler": y}
    temiz = kv.Sonuc([gun_(t, ["SEBZE ÇORBA", "İZMİR KÖFTE"]) for t in ("2026-09-24", "2026-09-25", "2026-09-26")], [], [])
    kirli = kv.Sonuc([gun_(t, ["SEBZE ÇORBA", "-", "cal.", "KÖFTE"]) for t in ("2026-09-24", "2026-09-25", "2026-09-26")], [], [])
    assert kk.gecerli_menu(temiz, gun)
    assert not kk.gecerli_menu(kirli, gun), "YARISI GÜRÜLTÜ OLAN MENÜ DOĞRULANMAMALI"
