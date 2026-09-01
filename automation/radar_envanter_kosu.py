"""KAYNAK SAYIMI KOŞUSU — SIFIR ARAMA İSTEĞİ

Depodaki LinkedIn sinyallerinin şirketlerini alıp her birinin işe alım
altyapısını ölçer ve bir sonraki adaptör önceliğini SAYIYLA belirler.

BRAVE KULLANMIYOR. Arama sağlayıcısı hiç kurulmuyor.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import threading
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

from automation.radar_cozucu import sadelestir
from automation.radar_envanter import (
    BILINMIYOR,
    CUSTOM,
    DESTEKLENEN_SINIF,
    KARIYER_YOK,
    SirketKaydi,
    sirketi_olc,
    sirketleri_topla,
)
from automation.radar_kosu import KULLANICI_AJANI
from automation.radar_sinyal_deposu import cozumu_yaz, sinyalleri_oku

RAPOR_DOSYASI = "radar-envanter-rapor.json"
ZAMAN_ASIMI = 8

#: Her şirket için toplam sayfa çekme tavanı — bir siteye yük bindirmemek
#: ve koşuyu bitirebilmek için.
_yerel = threading.local()


def _getir(url: str) -> tuple[int, str]:
    """Tek sayfa çeker. Her iş parçacığı kendi oturumunu kullanıyor."""
    oturum = getattr(_yerel, "oturum", None)
    if oturum is None:
        oturum = requests.Session()
        oturum.headers.update({
            "User-Agent": KULLANICI_AJANI,
            "Accept-Language": "tr,en;q=0.8",
        })
        _yerel.oturum = oturum
    yanit = oturum.get(url, timeout=ZAMAN_ASIMI, allow_redirects=True)
    return yanit.status_code, yanit.text[:400_000]


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Kaynak sayımı (arama yok)")
    ap.add_argument("--kaynak", default="linkedin")
    ap.add_argument("--is-parcacigi", type=int, default=10)
    ap.add_argument("--sirket-siniri", type=int, default=0,
                    help="0 = hepsi")
    args = ap.parse_args(argv)

    sinyaller = sinyalleri_oku(
        args.kaynak,
        durumlar=("new", "company_resolved", "career_source_found",
                  "unresolved", "duplicate", "official_job_found",
                  "rejected", "verified"),
        sinir=5000,
    )
    okunabilir = [s for s in sinyaller if s.sirket and s.sirket_normal]
    sirketler = sirketleri_topla(okunabilir)

    dagilim = Counter(sayi for _, sayi in sirketler.values())
    siralı = sorted(sirketler.items(), key=lambda kv: (-kv[1][1], kv[0]))
    if args.sirket_siniri:
        siralı = siralı[: args.sirket_siniri]

    print(f"{len(okunabilir)} sinyal → {len(sirketler)} tekil şirket", file=sys.stderr)

    kayitlar: list[SirketKaydi] = []
    hata_sayaci: Counter = Counter()

    with ThreadPoolExecutor(max_workers=args.is_parcacigi) as havuz:
        isler = {
            havuz.submit(sirketi_olc, gorunen, sayi, _getir): (norm, gorunen)
            for norm, (gorunen, sayi) in siralı
        }
        for i, is_ in enumerate(as_completed(isler), 1):
            norm, gorunen = isler[is_]
            try:
                kayitlar.append(is_.result())
            except Exception as hata:
                hata_sayaci[type(hata).__name__] += 1
                kayitlar.append(SirketKaydi(gorunen, sirketler[norm][1],
                                            kanitlar=[f"hata: {type(hata).__name__}"]))
            if i % 25 == 0:
                print(f"  {i}/{len(isler)}", file=sys.stderr)

    # ------------------------------------------------------- toplama
    sinif_sirket: Counter = Counter()
    sinif_sinyal: Counter = Counter()
    ats_sirket: Counter = Counter()
    ats_sinyal: Counter = Counter()
    for k in kayitlar:
        sinif_sirket[k.sinif] += 1
        sinif_sinyal[k.sinif] += k.sinyal_sayisi
        if k.ats:
            ats_sirket[k.ats] += 1
            ats_sinyal[k.ats] += k.sinyal_sayisi

    html_ilanli = [k for k in kayitlar if k.sinif == CUSTOM and k.ilan_html_icinde]
    custom_hepsi = [k for k in kayitlar if k.sinif == CUSTOM]

    # ADAPTÖR ÖNCELİĞİ SAYIYLA
    #
    # Bir sonraki adaptörü hangi platform için yazacağımızı tahmin değil
    # bu tablo söylüyor: kaç şirket ve o şirketlerin kaç staj sinyali.
    desteklenmeyen = {
        sinif: {"sirket": sinif_sirket[sinif], "sinyal": sinif_sinyal[sinif]}
        for sinif in sinif_sirket
        if sinif not in set(DESTEKLENEN_SINIF.values())
        and sinif not in {CUSTOM, KARIYER_YOK, BILINMIYOR}
    }
    adaptor_onceligi = sorted(
        [{"platform": s, **v} for s, v in desteklenmeyen.items()]
        + [{"platform": "GENERIC_HTML_CAREER",
            "sirket": len(html_ilanli),
            "sinyal": sum(k.sinyal_sayisi for k in html_ilanli)}],
        key=lambda x: (-x["sinyal"], -x["sirket"]),
    )

    rapor = {
        "arama_istegi": 0,
        "envanter": {
            "sinyal": len(okunabilir),
            "tekil_sirket": len(sirketler),
            "olculen_sirket": len(kayitlar),
            "ilan_basina_sirket_dagilimi": {str(k): v for k, v in sorted(dagilim.items())},
            "en_cok_sinyalli_sirketler": [
                {"sirket": g, "sinyal": s}
                for g, s in sorted(sirketler.values(), key=lambda x: -x[1])[:15]
            ],
        },
        "sinif_sirket": dict(sinif_sirket.most_common()),
        "sinif_sinyal": dict(sinif_sinyal.most_common()),
        "ats_sirket": dict(ats_sirket.most_common()),
        "ats_sinyal": dict(ats_sinyal.most_common()),
        "genel_html_kariyer_firsati": {
            "kendi_kariyer_sayfasi_olan_sirket": len(custom_hepsi),
            "ilanlar_html_icinde": len(html_ilanli),
            "bu_sirketlerin_sinyali": sum(k.sinyal_sayisi for k in html_ilanli),
            "ornekler": [
                {"sirket": k.sirket, "kariyer_url": k.kariyer_url,
                 "sinyal": k.sinyal_sayisi, "kanit": k.kanitlar[-1]}
                for k in sorted(html_ilanli, key=lambda x: -x.sinyal_sayisi)[:20]
            ],
        },
        "sonraki_adaptor_onceligi": adaptor_onceligi,
        "unknown_notu": (
            "Alan adı doğrulanamayan şirketler UNKNOWN sayıldı. Arama katmanı "
            "olmadan 'yalnız toplayıcıda görünüyor' ile 'alan adı tahminim "
            "tutmadı' ayırt edilemiyor; AGGREGATOR_ONLY iddiası bu turda "
            "kanıtlanamaz."
        ),
        "hatalar": dict(hata_sayaci),
        "ornek_kayitlar": [
            {"sirket": k.sirket, "sinif": k.sinif, "alan": k.alan_adi,
             "kariyer": k.kariyer_url, "ats": k.ats, "sinyal": k.sinyal_sayisi,
             "kanitlar": k.kanitlar[:3]}
            for k in sorted(kayitlar, key=lambda x: -x.sinyal_sayisi)[:40]
        ],
        "auto_publish": os.getenv("RADAR_AUTO_PUBLISH", "false"),
    }

    with open(RAPOR_DOSYASI, "w", encoding="utf-8") as f:
        json.dump(rapor, f, ensure_ascii=False, indent=2)
    print(json.dumps({k: rapor[k] for k in
                      ("arama_istegi", "envanter", "sinif_sirket", "sinif_sinyal",
                       "ats_sinyal", "genel_html_kariyer_firsati",
                       "sonraki_adaptor_onceligi")},
                     ensure_ascii=False, indent=2)[:6000])

    # Ölçüm depoya yazılıyor: bir sonraki tur aynı siteleri yeniden
    # çekmesin.
    yazildi = 0
    norm_kayit = {sadelestir(k.sirket): k for k in kayitlar}
    for s in okunabilir:
        k = norm_kayit.get(s.sirket_normal or sadelestir(s.sirket))
        if not k or not k.alan_adi:
            continue
        try:
            cozumu_yaz(s.id, resolved_company_domain=k.alan_adi,
                       resolved_career_url=k.kariyer_url, resolved_ats=k.ats)
            yazildi += 1
        except Exception:
            break
    print(f"depoya yazılan çözüm: {yazildi}", file=sys.stderr)
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
