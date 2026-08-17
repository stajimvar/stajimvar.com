"""src/data/skillQuizzes.ts icindeki testleri veritabanina tasir.

NEDEN
-----
Testler uygulamayla birlikte gonderilen duragan bir dosyada duruyordu ve
DOGRU CEVAPLAR o dosyanin icindeydi. Yani tarayici paketini acan herkes tum
cevaplari okuyabiliyordu. Rozet bir sey ifade edecekse cevaplar sunucuda
kalmali.

Bu betik dosyayi ayristirip `quizzes` ve `quiz_questions` tablolarina yaziyor.
Bir kez calistirilmasi yeterli; tekrar calistirilirsa mevcut kayitlari
guncelliyor (skill_name uzerinden eslesme).

Cevaplar tabloda `correct_index` sutununda duruyor ve istemciye ASLA
gonderilmiyor: `quiz_questions` uzerinde anon/authenticated icin SELECT yok,
istemci yalnizca cevapsiz `quiz_questions_public` gorunumunu okuyor.
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

KAYNAK = Path(__file__).parent.parent / "src" / "data" / "skillQuizzes.ts"

# TypeScript kategori adlari -> skill_category enum degerleri.
# Enum arayuzdeki uc grupla birebir ortusmuyor; teknik testler icin
# "General" kullaniliyor, ayrim zaten arayuz tarafinda yapiliyor.
KATEGORI = {
    "hard_skills": "General",
    "soft_skills": "Soft Skills",
    "languages": "Languages",
}


def ts_dizisini_ayristir(metin: str) -> list[dict]:
    """SKILL_QUIZZES dizisini JSON'a cevirip okur.

    TypeScript nesne sozdizimi JSON'a yakin ama birebir degil: anahtarlar
    tirnaksiz ve sonda virgul olabiliyor. Ikisini de duzeltiyoruz.
    """
    bas = metin.index("export const SKILL_QUIZZES")
    # DIKKAT: bildirim "SKILL_QUIZZES: SkillQuiz[] = [" seklinde. Ilk kose
    # parantez TIP ifadesinin icinde; dizi "= [" ile basliyor.
    bas = metin.index("= [", bas) + 2

    derinlik = 0
    for i in range(bas, len(metin)):
        if metin[i] == "[":
            derinlik += 1
        elif metin[i] == "]":
            derinlik -= 1
            if derinlik == 0:
                son = i + 1
                break
    else:
        raise SystemExit("dizi sonu bulunamadi")

    ham = metin[bas:son]

    # Yorumlari at
    ham = re.sub(r"//[^\n]*", "", ham)
    ham = re.sub(r"/\*.*?\*/", "", ham, flags=re.S)
    # Tirnaksiz anahtarlari tirnakla
    ham = re.sub(r"([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:", r'\1"\2":', ham)
    # Tek tirnakli metinleri cift tirnaga cevir (icerideki cift tirnaklari kacir)
    def tek_tirnak(m: re.Match[str]) -> str:
        icerik = m.group(1).replace("\\'", "'").replace('"', '\\"')
        return '"' + icerik + '"'

    ham = re.sub(r"'((?:[^'\\]|\\.)*)'", tek_tirnak, ham)
    # Sondaki virgulleri at
    ham = re.sub(r",(\s*[}\]])", r"\1", ham)

    return json.loads(ham)


def main() -> None:
    load_dotenv(Path(__file__).parent / ".env")
    db = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    testler = ts_dizisini_ayristir(KAYNAK.read_text(encoding="utf-8"))
    print(f"{len(testler)} test okundu")

    for test in testler:
        kategori = KATEGORI.get(test.get("category", ""), "General")
        sorular = test.get("questions", [])

        mevcut = (
            db.table("quizzes").select("id").eq("skill_name", test["skillName"]).limit(1)
            .execute().data
        )

        govde = {
            "skill_name": test["skillName"],
            "badge_name": test["badgeName"],
            "badge_icon": test.get("badgeIcon"),
            "category": kategori,
            # Gecme notu: 5 soruda 3 dogru. Sitede de boyle yaziyor.
            "pass_score": 3,
            "is_active": True,
        }

        if mevcut:
            quiz_id = mevcut[0]["id"]
            db.table("quizzes").update(govde).eq("id", quiz_id).execute()
            db.table("quiz_questions").delete().eq("quiz_id", quiz_id).execute()
        else:
            quiz_id = db.table("quizzes").insert(govde).execute().data[0]["id"]

        satirlar = []
        for sira, soru in enumerate(sorular):
            secenekler = soru.get("options", [])
            dogru = soru.get("correctIndex", soru.get("correctAnswerIndex", 0))
            satirlar.append({
                "quiz_id": quiz_id,
                "question": soru.get("question", ""),
                "code_snippet": soru.get("codeSnippet"),
                "options": secenekler,
                "correct_index": int(dogru),
                "explanation": soru.get("explanation"),
                "sort_order": sira,
            })
        if satirlar:
            db.table("quiz_questions").insert(satirlar).execute()
        print(f"  {test['skillName'][:44]:46s} {len(satirlar)} soru")

    print("bitti")


if __name__ == "__main__":
    main()
