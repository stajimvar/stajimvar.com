"""LINKEDIN KEŞİF RADARI — GÖLGE KOŞUSU

    Brave (LinkedIn dizini)  →  sinyal  →  ŞİRKET  →  RESMÎ ATS  →
    kalite  →  duplicate  →  aday

LinkedIn'e tek istek gitmiyor; sinyal Brave'in kamuya açık dizininden
okunuyor. Yayın kararını LinkedIn değil, şirketin resmî kaynağından
okunan ilan veriyor.

CANONICAL TABLOYA HİÇBİR ŞEY YAZMIYOR. `sources.json` de değişmiyor.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections import Counter

from automation.radar_brave import saglayici_kur
from automation.radar_cozucu import baslik_benzerligi, sadelestir
from automation.radar_linkedin import (
    Butce,
    ButceBitti,
    cozum_onceligi,
    erken_durdur,
    kesif_sorgulari,
    sinyal_kur,
    sinyalleri_birlestir,
    sorgu_ailesi,
    turkiye_sinyali_mi,
)
from automation.radar_resmi import (
    DESTEKLENEN,
    ResmiAday,
    ilan_kimligi,
    kayitli_kiracilar,
    sonucu_sinifla,
    turkiye_mi,
)
from automation.radar_resmi_kosu import _kaynaklari_oku, _mevcut_ilanlar, kiracidan_ilanlar
from automation.staj_kalitesi import VALID_INTERNSHIP, sinifla

RAPOR_DOSYASI = "radar-linkedin-rapor.json"

#: Sinyal başına Brave çözüm sorgusu tavanı.
SIRKET_BASINA_SORGU = 2

#: Aynı pozisyonu resmî kaynakta tanımak için gereken başlık örtüşmesi.
BASLIK_ESIGI = 0.5


def _ic_kiraci_haritasi(kaynaklar: list[dict]) -> dict[str, tuple[str, str]]:
    """KATMAN 1 — İÇ KANIT: bilinen şirket adı → (platform, kiracı).

    StajımVar'ın zaten tanıdığı şirket için Brave harcamaya gerek yok.
    """
    harita: dict[str, tuple[str, str]] = {}
    for k in kaynaklar:
        tur = (k.get("type") or "").lower()
        if tur not in DESTEKLENEN:
            continue
        kiraci = k.get(DESTEKLENEN[tur]["anahtar"])
        ad = sadelestir(k.get("name"))
        if kiraci and ad:
            harita[ad] = (tur, str(kiraci).lower())
    return harita


def kesfet(saglayici, butce: Butce, sorgu_siniri: int, olcum: dict) -> dict:
    """LinkedIn sinyallerini toplar. Ham isabet ve tekil sinyal AYRI sayılır."""
    sinyaller = []
    okunamayan: list[str] = []
    aile_verimi: Counter = Counter()
    aile_sinyal: Counter = Counter()
    ham = 0
    ilan_disi = 0

    for sorgu in kesif_sorgulari(sorgu_siniri):
        try:
            butce.kesif_harca()
        except ButceBitti:
            olcum["kesif_kesildi"] = "bütçe"
            break
        sonuclar = saglayici.ara(sorgu)
        ham += len(sonuclar)
        aile = sorgu_ailesi(sorgu)
        aile_verimi[aile] += len(sonuclar)
        for sonuc in sonuclar:
            s = sinyal_kur(sonuc, sorgu)
            if s is None:
                ilan_disi += 1
                continue
            sinyaller.append(s)
            aile_sinyal[aile] += 1
            if not s.sirket and len(okunamayan) < 25:
                # Şirketi okunamayan sonucun HAM BAŞLIĞI — ayrıştırıcıyı
                # tahminle değil gerçek biçimle düzeltmek için. Yalnız
                # kamuya açık ilan meta verisi; kişi bilgisi değil.
                okunamayan.append((sonuc.get("title") or "")[:160])

    tekil = sinyalleri_birlestir(sinyaller)
    olcum.update({
        "sorgu": butce.kesif,
        "ham_isabet": ham,
        "ilan_sinyali": len(sinyaller),
        "ilan_disi_sonuc": ilan_disi,
        "unique_sinyal": len(tekil),
        "turkiye_sinyali": sum(1 for s in tekil.values() if turkiye_sinyali_mi(s)),
        "sirketi_okunan": sum(1 for s in tekil.values() if s.sirket),
        "aile_ham_isabet": dict(aile_verimi.most_common()),
        "aile_sinyal": dict(aile_sinyal.most_common()),
        "sirketi_okunamayan_ornek_basliklar": okunamayan,
    })
    return tekil


def kiraci_ara(sirket: str, baslik: str | None, saglayici, butce: Butce,
               sayac: Counter) -> tuple[str, str] | None:
    """KATMAN 3 — şirketin resmî ATS kiracısını aramada bulur.

    En çok `SIRKET_BASINA_SORGU` sorgu. Brave "buraya bak" der; kiracı
    ancak adaptör gerçek ilanı döndürürse kanıta dönüşür.
    """
    sorgular = [f'"{sirket}" careers jobs apply']
    if baslik:
        sorgular.append(f'"{sirket}" "{baslik}"')
    for sorgu in sorgular[:SIRKET_BASINA_SORGU]:
        try:
            butce.cozum_harca()
        except ButceBitti:
            sayac["butce_bitti"] += 1
            return None
        for sonuc in saglayici.ara(sorgu):
            b = sonucu_sinifla(sonuc.get("url"))
            if b.destekli and b.kiraci:
                sayac["aramadan_cozuldu"] += 1
                return (b.platform, b.kiraci.lower())
            if b.platform and not b.destekli:
                sayac[f"adaptorsuz:{b.platform}"] += 1
    sayac["kiraci_bulunamadi"] += 1
    return None


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="LinkedIn keşif radarı gölge koşusu")
    ap.add_argument("--kesif-siniri", type=int, default=220)
    ap.add_argument("--toplam-tavan", type=int, default=430)
    ap.add_argument("--sadece-kesif", action="store_true",
                    help="Yalnız keşif: çözüm bütçesi harcanmaz (teşhis koşusu)")
    args = ap.parse_args(argv)

    butce = Butce(toplam=args.toplam_tavan, kesif_tavani=args.kesif_siniri,
                  cozum_tavani=min(180, args.toplam_tavan - args.kesif_siniri))

    saglayici = saglayici_kur()
    if not getattr(saglayici, "kullanilabilir", False):
        print("arama katmanı yapılandırılmamış", file=sys.stderr)
        with open(RAPOR_DOSYASI, "w", encoding="utf-8") as f:
            json.dump({"arama": "yapilandirilmamis"}, f)
        return 1

    olcum: dict = {}
    tekil = kesfet(saglayici, butce, args.kesif_siniri, olcum)
    print(f"keşif: {butce.kesif} sorgu → {len(tekil)} tekil sinyal", file=sys.stderr)

    if args.sadece_kesif:
        with open(RAPOR_DOSYASI, "w", encoding="utf-8") as f:
            json.dump({"kesif": olcum, "butce": butce.ozet(),
                       "arama": {"saglayici": saglayici.ad, **saglayici.olcum.ozet()}},
                      f, ensure_ascii=False, indent=2)
        print(json.dumps(olcum, ensure_ascii=False, indent=2))
        return 0

    kaynaklar = _kaynaklari_oku()
    ic_harita = _ic_kiraci_haritasi(kaynaklar)
    kayitli = kayitli_kiracilar(kaynaklar)
    adresler, kimlikler = _mevcut_ilanlar()
    bilinen_sirketler = set(ic_harita)

    kuyruk = sorted(tekil.values(),
                    key=lambda s: (cozum_onceligi(s, bilinen_sirketler), s.job_id))

    cozum_sayac: Counter = Counter()
    adaptor_sayac: Counter = Counter()
    huni: Counter = Counter()
    kiraci_onbellek: dict[str, tuple[str, str] | None] = {}
    kiraci_ilanlari: dict[tuple[str, str], list[dict]] = {}
    kosuda_gorulen: set[tuple[str, str]] = set()
    adaylar: list[ResmiAday] = []
    resmi_eslesme = 0
    erken_kesildi = None

    for sinyal in kuyruk:
        huni["sinyal"] += 1
        if erken_durdur(butce.harcanan, resmi_eslesme):
            erken_kesildi = (f"ilk {butce.harcanan} istekte resmî eşleşme yok — "
                             "kalan bütçe yakılmadı")
            break
        if not sinyal.sirket:
            cozum_sayac["sirket_okunamadi"] += 1
            continue
        ad = sadelestir(sinyal.sirket)
        huni["sirketi_var"] += 1

        if ad not in kiraci_onbellek:
            if ad in ic_harita:
                kiraci_onbellek[ad] = ic_harita[ad]
                cozum_sayac["ic_kanittan_cozuldu"] += 1
            else:
                kiraci_onbellek[ad] = kiraci_ara(
                    sinyal.sirket, sinyal.baslik, saglayici, butce, cozum_sayac)
        kiraci = kiraci_onbellek[ad]
        if kiraci is None:
            continue
        huni["kiraci_cozuldu"] += 1

        if kiraci not in kiraci_ilanlari:
            kiraci_ilanlari[kiraci] = kiracidan_ilanlar(kiraci[0], kiraci[1], adaptor_sayac)
        ilanlar = kiraci_ilanlari[kiraci]
        if not ilanlar:
            cozum_sayac["kiracida_ilan_yok"] += 1
            continue

        # RESMÎ İLAN EŞLEŞMESİ — LinkedIn başlığı YALNIZ eşleştirme için
        # kullanılıyor; yayınlanacak içerik resmî kaynaktan geliyor.
        eslesenler = [i for i in ilanlar
                      if baslik_benzerligi(sinyal.baslik or "", i["title"]) >= BASLIK_ESIGI]
        if not eslesenler:
            cozum_sayac["resmi_ilan_bulunamadi"] += 1
            continue
        resmi_eslesme += 1
        huni["resmi_ilan"] += 1

        for ilan in eslesenler[:3]:
            konum = ilan["location"]
            if konum and not turkiye_mi(konum, ilan["description"]):
                huni["turkiye_disi"] += 1
                continue

            karar = sinifla(ilan["title"], ilan["description"])
            aday = ResmiAday(
                platform=kiraci[0], kiraci=kiraci[1],
                sirket=ilan["company"] or sinyal.sirket,
                baslik=ilan["title"], konum=konum, url=ilan["url"],
                quality_class=karar.sinif, kanitlar=karar.nedenler[:2],
            )
            if karar.sinif != VALID_INTERNSHIP:
                aday.durum, aday.neden = "rejected", f"not_internship: {karar.sinif}"
                adaylar.append(aday)
                continue
            huni["valid_internship"] += 1

            # DUPLICATE: platform + ATS ilan kimliği
            kimlik = ilan_kimligi(ilan["url"])
            anahtar = (kimlik[0], kimlik[2]) if kimlik else None
            eslesme = (kimlikler.get(anahtar) if anahtar else None) or adresler.get(ilan["url"])
            if eslesme:
                aday.durum, aday.neden = "duplicate", "canonical listede zaten var"
                aday.mevcut_listing_id = eslesme
                huni["duplicate"] += 1
                adaylar.append(aday)
                continue
            if anahtar and anahtar in kosuda_gorulen:
                aday.durum, aday.neden = "duplicate", "aynı koşuda tekrar"
                huni["duplicate"] += 1
                adaylar.append(aday)
                continue
            if anahtar:
                kosuda_gorulen.add(anahtar)

            aday.durum, aday.neden = "would_publish", "LinkedIn sinyali + resmî kaynak + kalite"
            huni["would_publish"] += 1
            adaylar.append(aday)

    yayin = [a for a in adaylar if a.would_publish]

    rapor = {
        "kesif": olcum,
        "butce": {**butce.ozet(), "erken_kesildi": erken_kesildi},
        "arama": {"saglayici": saglayici.ad, **saglayici.olcum.ozet()},
        "cozum": dict(cozum_sayac.most_common()),
        "huni": dict(huni),
        "adaptor_sonuclari": dict(adaptor_sayac.most_common()),
        "yeni_kiraci": sorted(
            f"{p}:{k}" for (p, k) in kiraci_ilanlari if (p, k.lower()) not in kayitli
        )[:40],
        "would_publish_ornekleri": [
            {"company": a.sirket, "title": a.baslik, "location": a.konum,
             "platform": a.platform, "tenant": a.kiraci, "url": a.url,
             "quality": a.quality_class, "evidence": a.kanitlar}
            for a in yayin[:25]
        ],
        "red_nedenleri": dict(Counter(
            a.neden for a in adaylar if a.durum == "rejected").most_common(10)),
        "auto_publish": os.getenv("RADAR_AUTO_PUBLISH", "false"),
    }
    with open(RAPOR_DOSYASI, "w", encoding="utf-8") as f:
        json.dump(rapor, f, ensure_ascii=False, indent=2)
    print(json.dumps({k: rapor[k] for k in ("kesif", "butce", "cozum", "huni")},
                     ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
