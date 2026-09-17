---
version: 1
slug: "src-sirket-genelbakis-tsx"
primary_target: "src/sirket/GenelBakis.tsx"
related_targets: ["src/sirket/SirketKabugu.tsx","src/sirket/SirketPaneli.tsx","src/sirket/renk.ts"]
---

# Surface: İşveren paneli (/sirket/*) — Operate

Audience: küçük şirket sahibi ve kurumsal İK, eşit. Job: ilan aç, yeni başvuranı gör, karar ver; gün içinde kısa girişler. Constraints: 4 sekme korunur (Genel · İlanlar · Başvuranlar · Şirket); panel öğrenci dünyasının mavi-beyaz sistemini devralır (kullanıcı kararı, 17 Eylül 2026); sahte sayı yok; kademe "ne yapabildiği" olarak yazılır.

## Direction contract

THESIS: Genel ekran bir kontrol paneli değil, şirketin ilanlarının kendisidir; her ilan kendi başvuranlarını taşır. Reddedilen düzen: istatistik kartları + tablolar.

OWN-WORLD: öğrenci tarafının mavi-beyaz sistemi — gray-50 zemin, beyaz rounded-2xl kartlar border-gray-200 shadow-xs, blue-600 birincil, blue-50/blue-700 rozet; `renk.ts` bu token'lara çekilir, yeşil biter.

STORY: giren kişi 2 saniyede "hangi ilanımda kim bekliyor" görür, bir dokunuşla adaya gider; ilan yoksa tek büyük "ilk ilanını aç" kartı.

FIRST VIEWPORT: üst çubuk (marka + İŞVEREN rozeti, 4 sekme, kademe pili, mavi Yeni ilan); profil eksikse tek satır uyarı; sonra ilan kartları dikey — sol: başlık + şehir + durum rozeti (açık / 4 gün kaldı / kapalı); orta: yeni başvuran avatar şeridi + "3 yeni"; sağ: Adaylar / Düzenle. Sonda kesikli "+ Yeni ilan" kartı. Mobil: kart tek sütun, avatar şeridi ikinci satır.

FORM: İlan-merkezli, sıralı listede 4/7; seed 15924a30 (lead).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
