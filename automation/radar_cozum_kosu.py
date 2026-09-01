"""SİNYAL → RESMÎ İLAN ÇÖZÜM KOŞUSU (GÖLGE)

Keşif yapmıyor. Depodaki LinkedIn sinyallerini alıp şirketin resmî
kaynağına bağlıyor, kalite kapısından geçiriyor ve yayın adaylarını
raporluyor.

CANONICAL TABLOYA HİÇBİR ŞEY YAZMIYOR. Yazdığı tek yer sinyalin kendi
çözüm durumu — bir sonraki koşu aynı sinyale ikinci kez para
harcamasın diye.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections import Counter

import requests

from automation.radar_brave import saglayici_kur
from automation.radar_cozucu import kariyer_kaynagi_bul, sadelestir, ats_tani
from automation.radar_cozum import (
    AILE_ATS,
    alan_sirkete_ait_mi,
    cozum_sorgulari,
    eslesme_guveni,
    oncelik_ver,
    sonuc_kabul_edilir_mi,
)
from automation.radar_kosu import _oturum, getir_fabrikasi
from automation.radar_sirket import alan_adini_normalize_et, sirket_alani_olamaz
from automation.radar_linkedin import Butce, ButceBitti
from automation.radar_resmi import (
    DESTEKLENEN,
    ResmiAday,
    ilan_kimligi,
    kayitli_kiracilar,
    sonucu_sinifla,
    turkiye_mi,
    yeni_kiraci_mi,
)
from automation.radar_resmi_kosu import _kaynaklari_oku, _mevcut_ilanlar, kiracidan_ilanlar
from automation.radar_sinyal_deposu import cozumu_yaz, durum_dagilimi, sinyalleri_oku
from automation.staj_kalitesi import VALID_INTERNSHIP, sinifla

RAPOR_DOSYASI = "radar-cozum-rapor.json"
ZAMAN_ASIMI = 15

#: Ekonomik kontrol noktası: bu kadar sinyalden sonra dönüşüm ölçülüyor.
EKONOMIK_KONTROL = 50

#: İlk kontrol noktasında en az bu kadar resmî eşleşme çıkmazsa koşu
#: kalan bütçeyi körlemesine harcamıyor.
ASGARI_DONUSUM = 3

ATS_ALANLARI = {p: b["alan"] for p, b in DESTEKLENEN.items()}


def _sirket_kayitlari() -> dict[str, str]:
    """Mevcut şirketler: normalize ad → site adresi (BEDAVA KATMAN)."""
    url = os.getenv("SUPABASE_URL")
    anahtar = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not anahtar:
        return {}
    try:
        y = requests.get(
            f"{url}/rest/v1/companies",
            params={"select": "name,name_normalized,website_url", "limit": "2000"},
            headers={"apikey": anahtar, "Authorization": f"Bearer {anahtar}"},
            timeout=ZAMAN_ASIMI,
        )
        y.raise_for_status()
    except requests.RequestException:
        return {}
    harita: dict[str, str] = {}
    for s in y.json():
        ad = sadelestir(s.get("name_normalized") or s.get("name"))
        if ad and s.get("website_url"):
            harita[ad] = s["website_url"]
    return harita


def _kaynak_kiracilari(kaynaklar: list[dict]) -> dict[str, tuple[str, str]]:
    """sources.json: şirket adı → (platform, kiracı) (BEDAVA KATMAN)."""
    harita: dict[str, tuple[str, str]] = {}
    for k in kaynaklar:
        tur = (k.get("type") or "").lower()
        if tur not in DESTEKLENEN:
            continue
        kiraci = k.get(DESTEKLENEN[tur]["anahtar"])
        if not kiraci:
            continue
        for alan in ("name", "company_name", "organization_name"):
            ad = sadelestir(k.get(alan))
            if ad:
                harita[ad] = (tur, str(kiraci).lower())
    return harita


def kiraci_coz(sinyal, saglayici, butce: Butce, getir, sayac: Counter,
               aile_sayac: Counter, kaynak_kiraci: dict, sirketler: dict,
               onbellek: dict) -> tuple[tuple[str, str] | None, str, str | None]:
    """Sinyalin şirketini resmî ATS kiracısına çözer.

    Döndürür: (kiracı, yöntem, arama_hatasi). `arama_hatasi` doluysa
    sonuç "şirket çözülemedi" DEĞİL, "arama yapılamadı" demek.
    """
    ad = sinyal.sirket_normal or sadelestir(sinyal.sirket)

    # --- BEDAVA KATMANLAR ---------------------------------------------
    if ad in onbellek:
        sayac["onbellekten"] += 1
        return onbellek[ad], "onbellek", None
    if ad in kaynak_kiraci:
        sayac["kaynak_kaydindan"] += 1
        onbellek[ad] = kaynak_kiraci[ad]
        return kaynak_kiraci[ad], "sources.json", None

    alanlar: list[str] = []
    if ad in sirketler and not sirket_alani_bos(sirketler[ad]):
        alanlar.append(sirketler[ad])
        sayac["mevcut_sirket_alani"] += 1
    if sinyal.resolved_company_domain:
        alanlar.append(sinyal.resolved_company_domain)
        sayac["depodan_alan"] += 1

    # Bilinen alan adından ATS'e — HTTP, arama bütçesi harcamıyor.
    kiraci = _alandan_kiraci(alanlar, getir, sayac)
    if kiraci:
        onbellek[ad] = kiraci
        return kiraci, "kariyer_sayfasi_bedava", None

    # --- ARAMA KATMANI -------------------------------------------------
    for aile, sorgu in cozum_sorgulari(sinyal.sirket, sinyal.baslik,
                                       sinyal.resolved_ats, ATS_ALANLARI):
        try:
            butce.cozum_harca()
        except ButceBitti:
            return None, "butce_bitti", "butce_bitti"
        sonuclar = saglayici.ara(sorgu)
        aile_sayac[f"{aile}:sorgu"] += 1
        if saglayici.olcum.kota_bitti:
            # 402: ŞİRKET ÇÖZÜLEMEDİ DEĞİL, ARAMA YAPILAMADI.
            return None, "arama_yok", "quota_exhausted"
        for sonuc in sonuclar:
            adres = sonuc.get("url")
            if not sonuc_kabul_edilir_mi(adres):
                continue
            b = sonucu_sinifla(adres)
            if b.destekli and b.kiraci:
                sayac["aramadan_ats"] += 1
                aile_sayac[f"{aile}:ats"] += 1
                onbellek[ad] = (b.platform, b.kiraci.lower())
                return onbellek[ad], aile, None
            # ŞİRKET SİTESİ ATLANMIYOR — TOPLANIYOR
            #
            # İlk sürüm desteklenmeyen her sonucu `continue` ile
            # geçiyordu. Ama `sonucu_sinifla` sade bir şirket sitesine
            # de platform veriyor ("sirket_sitesi"), dolayısıyla 104
            # aday alan adı toplanmadan düştü ve bedava kariyer sayfası
            # zinciri hiç çalışmadı (sayaçlarda tek bir
            # `kariyer_sayfasi_*` kaydı yok). Oysa aranan şey tam da bu:
            # şirketin kendi sayfasından ATS'ine inmek.
            #
            # Yalnız ADAPTÖRÜ OLMAYAN ATS'ler atlanıyor; onlarda zincir
            # zaten bitiyor.
            if b.platform and b.platform != "sirket_sitesi" and not b.destekli:
                sayac[f"adaptorsuz:{b.platform}"] += 1
                continue
            if b.platform == "sirket_sitesi":
                sayac["sirket_sitesi_adayi"] += 1
            alan = alan_adini_normalize_et(adres)
            if alan and alan not in alanlar and alan_sirkete_ait_mi(sinyal.sirket, alan):
                alanlar.append(alan)
        # İlk sorgu ATS verdiyse ikinciyi kullanmıyoruz; vermediyse
        # şirketin kendi alanından kariyer zinciri deneniyor (bedava).
        kiraci = _alandan_kiraci(alanlar, getir, sayac)
        if kiraci:
            aile_sayac[f"{aile}:kariyer_sayfasi"] += 1
            onbellek[ad] = kiraci
            return kiraci, f"{aile}+kariyer_sayfasi", None

    sayac["kiraci_bulunamadi"] += 1
    onbellek[ad] = None
    return None, "cozulemedi", None


def _alandan_kiraci(alanlar: list[str], getir, sayac: Counter) -> tuple[str, str] | None:
    """Şirketin kendi kariyer sayfasından ATS kiracısına iner (HTTP)."""
    for alan in alanlar[:2]:
        kanit = kariyer_kaynagi_bul(alan, getir)
        if not kanit.var:
            continue
        b = sonucu_sinifla(kanit.deger)
        if b.destekli and b.kiraci:
            sayac["kariyer_sayfasindan_ats"] += 1
            return (b.platform, b.kiraci.lower())
        if ats_tani(kanit.deger):
            sayac["kariyer_sayfasi_adaptorsuz_ats"] += 1
        else:
            sayac["kariyer_sayfasi_ats_vermedi"] += 1
    return None


def sirket_alani_bos(deger) -> bool:
    """Kayıtlı site adresi kullanılabilir mi?"""
    return not deger or sirket_alani_olamaz(deger)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Sinyal → resmî ilan çözüm koşusu")
    ap.add_argument("--kaynak", default="linkedin")
    ap.add_argument("--batch", type=int, default=50)
    ap.add_argument("--toplam-tavan", type=int, default=430)
    args = ap.parse_args(argv)

    # Bu turda keşif yok: bütçenin tamamı çözüme ayrılıyor.
    butce = Butce(toplam=args.toplam_tavan, kesif_tavani=0,
                  cozum_tavani=args.toplam_tavan)

    saglayici = saglayici_kur()
    if not getattr(saglayici, "kullanilabilir", False):
        print("arama katmanı yapılandırılmamış", file=sys.stderr)
        with open(RAPOR_DOSYASI, "w", encoding="utf-8") as f:
            json.dump({"arama": "yapilandirilmamis"}, f)
        return 1

    depo_basi = durum_dagilimi(args.kaynak)
    sinyaller = sinyalleri_oku(args.kaynak)
    okunabilir = [s for s in sinyaller if s.sirket and s.sirket_normal]

    kaynaklar = _kaynaklari_oku()
    kaynak_kiraci = _kaynak_kiracilari(kaynaklar)
    kayitli = kayitli_kiracilar(kaynaklar)
    sirketler = _sirket_kayitlari()
    adresler, kimlikler = _mevcut_ilanlar()
    getir = getir_fabrikasi(_oturum(), {})
    bilinen = set(kaynak_kiraci) | set(sirketler)

    kuyruk = sorted(
        okunabilir,
        key=lambda s: (oncelik_ver(s.sirket, s.baslik, s.konum, bilinen).puan, s.source_url),
    )[: args.batch]

    sayac: Counter = Counter()
    aile_sayac: Counter = Counter()
    adaptor_sayac: Counter = Counter()
    huni: Counter = Counter()
    onbellek: dict[str, tuple[str, str] | None] = {}
    kiraci_ilanlari: dict[tuple[str, str], list[dict]] = {}
    kosuda_gorulen: set[tuple[str, str]] = set()
    adaylar: list[ResmiAday] = []
    yontem_uretimi: Counter = Counter()
    kesildi = None

    for sira, sinyal in enumerate(kuyruk, 1):
        huni["islenen_sinyal"] += 1

        # EKONOMİK KONTROL: ilk durakta dönüşüm yoksa kalan bütçe yanmıyor.
        if sira > EKONOMIK_KONTROL and huni["resmi_ilan"] < ASGARI_DONUSUM:
            kesildi = (f"ilk {EKONOMIK_KONTROL} sinyalde yalnız {huni['resmi_ilan']} "
                       "resmî eşleşme çıktı — kalan bütçe harcanmadı")
            break

        kiraci, yontem, arama_hatasi = kiraci_coz(
            sinyal, saglayici, butce, getir, sayac, aile_sayac,
            kaynak_kiraci, sirketler, onbellek)

        if arama_hatasi:
            # SİNYAL BOZULMUYOR: durumu 'new' kalıyor, sonraki koşu
            # aynı yerden devam ediyor.
            sayac[arama_hatasi] += 1
            kesildi = ("arama katmanı kapandı (kota) — kalan sinyaller dokunulmadan bırakıldı"
                       if arama_hatasi == "quota_exhausted" else "bütçe bitti")
            break

        if kiraci is None:
            huni["kiraci_cozulemedi"] += 1
            cozumu_yaz(sinyal.id, resolution_status="unresolved",
                       resolution_reason="resmî kaynak bulunamadı", resolution_confidence="LOW")
            continue

        huni["kiraci_cozuldu"] += 1
        if kiraci not in kiraci_ilanlari:
            kiraci_ilanlari[kiraci] = kiracidan_ilanlar(kiraci[0], kiraci[1], adaptor_sayac)
        ilanlar = kiraci_ilanlari[kiraci]
        if not ilanlar:
            huni["kiracida_canli_ilan_yok"] += 1
            cozumu_yaz(sinyal.id, resolution_status="career_source_found",
                       resolution_reason="kiracı bulundu, canlı ilan yok",
                       resolved_ats=kiraci[0], resolution_confidence="MEDIUM")
            continue
        huni["canli_kiraci"] += 1

        en_iyi = None
        for ilan in ilanlar:
            guven, kanitlar = eslesme_guveni(
                sinyal.sirket, sinyal.baslik, sinyal.konum,
                ilan["company"], ilan["title"], ilan["location"],
                ats_kimligi=ilan_kimligi(ilan["url"]) is not None)
            if guven == "HIGH":
                en_iyi = (ilan, guven, kanitlar)
                break
            if guven == "MEDIUM" and en_iyi is None:
                en_iyi = (ilan, guven, kanitlar)

        if en_iyi is None:
            huni["resmi_ilan_eslesmedi"] += 1
            cozumu_yaz(sinyal.id, resolution_status="career_source_found",
                       resolution_reason="kiracıda eşleşen ilan yok",
                       resolved_ats=kiraci[0], resolution_confidence="LOW")
            continue

        ilan, guven, kanitlar = en_iyi
        huni["resmi_ilan"] += 1
        if guven != "HIGH":
            huni["eslesme_medium"] += 1
            cozumu_yaz(sinyal.id, resolution_status="official_job_found",
                       resolution_reason="eşleşme HIGH değil: " + "; ".join(kanitlar[:2]),
                       resolved_ats=kiraci[0], resolved_official_job_url=ilan["url"],
                       resolution_confidence=guven)
            continue

        # TÜRKİYE KANITI RESMÎ KAYNAKTAN
        konum = ilan["location"]
        if konum and not turkiye_mi(konum, ilan["description"]):
            huni["turkiye_disi"] += 1
            cozumu_yaz(sinyal.id, resolution_status="rejected",
                       resolution_reason="resmî kaynakta Türkiye kanıtı yok",
                       resolved_official_job_url=ilan["url"], resolution_confidence="HIGH")
            continue
        huni["turkiye_dogrulandi"] += 1

        karar = sinifla(ilan["title"], ilan["description"])
        aday = ResmiAday(
            platform=kiraci[0], kiraci=kiraci[1],
            sirket=ilan["company"] or sinyal.sirket, baslik=ilan["title"],
            konum=konum, url=ilan["url"], quality_class=karar.sinif,
            kanitlar=(karar.nedenler[:2] + kanitlar[:2]))

        if karar.sinif != VALID_INTERNSHIP:
            aday.durum, aday.neden = "rejected", f"not_internship: {karar.sinif}"
            adaylar.append(aday)
            huni["kalite_eledi"] += 1
            cozumu_yaz(sinyal.id, resolution_status="rejected",
                       resolution_reason=f"kalite: {karar.sinif}",
                       resolved_official_job_url=ilan["url"],
                       quality_class=karar.sinif, resolution_confidence="HIGH")
            continue
        huni["valid_internship"] += 1

        kimlik = ilan_kimligi(ilan["url"])
        anahtar = (kimlik[0], kimlik[2]) if kimlik else None
        mevcut = (kimlikler.get(anahtar) if anahtar else None) or adresler.get(ilan["url"])
        kayitli_kiraci_mi = not yeni_kiraci_mi(kiraci[0], kiraci[1], kayitli)

        if mevcut or kayitli_kiraci_mi or (anahtar and anahtar in kosuda_gorulen):
            neden = ("canonical listede zaten var" if mevcut else
                     "kiracı zaten kayıtlı kaynak" if kayitli_kiraci_mi else
                     "aynı koşuda tekrar")
            aday.durum, aday.neden = "duplicate", neden
            aday.mevcut_listing_id = mevcut
            adaylar.append(aday)
            # Kapalı/arşivli kayıt da duplicate: aynı ilan yeniden
            # public yapılmıyor.
            huni["duplicate_kapali" if (mevcut and ":published" not in (mevcut or ""))
                 else "duplicate_aktif"] += 1
            cozumu_yaz(sinyal.id, resolution_status="duplicate", resolution_reason=neden,
                       resolved_official_job_url=ilan["url"], quality_class=karar.sinif,
                       resolution_confidence="HIGH")
            continue

        if anahtar:
            kosuda_gorulen.add(anahtar)
        aday.durum, aday.neden = "would_publish", "LinkedIn sinyali → resmî kaynak → kalite"
        adaylar.append(aday)
        huni["would_publish"] += 1
        yontem_uretimi[yontem] += 1
        cozumu_yaz(sinyal.id, resolution_status="verified",
                   resolution_reason="resmî kaynakta doğrulandı, kalite geçti",
                   resolved_ats=kiraci[0], resolved_official_job_url=ilan["url"],
                   quality_class=karar.sinif, resolution_confidence="HIGH")

    yayin = [a for a in adaylar if a.would_publish]
    arama_sorgusu = butce.cozum

    rapor = {
        "depo": {
            "kaynak": args.kaynak,
            "kosu_oncesi": depo_basi,
            "cozulmemis_okunan": len(sinyaller),
            "sirketi_okunabilen": len(okunabilir),
            "bu_turda_islenen": huni["islenen_sinyal"],
            "kalan_bekleyen": max(0, len(okunabilir) - huni["islenen_sinyal"]),
        },
        "butce": {**butce.ozet(), "kesildi": kesildi},
        "arama": {"saglayici": saglayici.ad, **saglayici.olcum.ozet()},
        "cozum_yontemleri": dict(sayac.most_common()),
        "sorgu_ailesi_verimi": dict(aile_sayac.most_common()),
        "yayin_ureten_yontem": dict(yontem_uretimi.most_common()),
        "huni": dict(huni),
        "adaptor_sonuclari": dict(adaptor_sayac.most_common()),
        "ekonomi": {
            "arama_sorgusu": arama_sorgusu,
            "gercek_yeni": len(yayin),
            "sorgu_basina_yeni_ilan": (round(arama_sorgusu / len(yayin), 1)
                                       if yayin else None),
        },
        "would_publish": [
            {"company": a.sirket, "title": a.baslik, "location": a.konum,
             "platform": a.platform, "tenant": a.kiraci, "url": a.url,
             "quality": a.quality_class, "evidence": a.kanitlar}
            for a in yayin[:30]
        ],
        "auto_publish": os.getenv("RADAR_AUTO_PUBLISH", "false"),
    }
    with open(RAPOR_DOSYASI, "w", encoding="utf-8") as f:
        json.dump(rapor, f, ensure_ascii=False, indent=2)
    print(json.dumps({k: rapor[k] for k in
                      ("depo", "butce", "arama", "huni", "ekonomi")},
                     ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
