import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const KOK = path.resolve(import.meta.dirname, '..');
const URETIM = 'C:/Users/ON/.codex/generated_images/01a00d9d-8c05-7861-a906-fc6ce3aca01f';
const HEDEF = path.join(KOK, 'public/rehber-gorselleri');

const yapay = {
  'ats-uyumlu-cv': 'exec-20afa7a8-a3d1-4cf0-9826-81a99e29cd3e.png',
  'ayni-anda-birden-fazla-burs': 'exec-46412959-efd9-42e1-84a4-a974fa0c1b60.png',
  'baska-sehirde-staj-barinma': 'exec-7d88d1b0-6470-4053-a8fa-ca4688805cbd.png',
  'basvuruya-cevap-gelmezse': 'exec-031da2a7-efea-4a08-b128-4f787c9a9936.png',
  'burs-basvuru-takvimi-takibi': 'exec-f0687b1b-77d6-419b-a23d-7e8f7d23c68b.png',
  'burs-basvurusu-gerekli-belgeler': 'exec-7d869fe2-a801-4637-b8cf-e73a0d109165.png',
  'burs-cakisma': 'exec-60d4e2fb-54fd-4e48-bad5-21e33c8f55d0.png',
  'burs-dolandiriciligi': 'exec-088d628a-2c2d-4bd7-9890-8389d6e2790d.png',
  'burs-hangi-durumlarda-kesilir': 'exec-4c198123-a5c8-4625-9f53-519f83bacdaf.png',
  'burs-mulakati': 'exec-0041ef8b-a076-4d2f-8153-ec1bef8fff52.png',
  'burslar-hangi-aylarda-acilir': 'exec-94c660e3-91d5-468d-a945-d8bfed535c67.png',
  'cift-anadal-ve-yan-dal': 'exec-04f20e54-aef5-4a31-b333-6871e6ab95e4.png',
  'cvde-proje-nasil-anlatilir': 'exec-94a2bc0b-a2d2-47da-a4f7-4d1069986d70.png',
  'depozito-ve-kira-sozlesmesi': 'exec-15ad1e69-96f9-4421-97d9-4cc6f4f7675f.png',
  'erasmus-ogrenim-hareketliligi': 'exec-f81bc2f2-3d09-4167-b0d1-3dda9356f22d.png',
  'erasmus-staj-hareketliligi': 'exec-f1ff4d39-673a-4679-b11e-29b932b2d927.png',
  'europass-cv': 'exec-0130a5d7-d2ca-4c68-b9ea-a353858ac02d.png',
  'hibesiz-erasmus': 'exec-ec2b7b4e-f4da-4546-a64f-97552a59d721.png',
  'iaeste-ile-yurtdisinda-staj': 'exec-3c726723-62a2-416a-b7a7-92e91a2dc8b6.png',
  'ilan-acmayan-sirkete-nasil-yazilir': 'exec-09015e1f-6c61-4cad-a05b-a46c3ddf2c5f.png',
  'ilk-is-mulakati': 'exec-8dc0ba34-1a51-45a7-bede-f788fda4a781.png',
  'ingilizce-basvuru-epostasi': 'exec-f67fbfb1-e62c-438d-a71e-b4011b9ea392.png',
  'is-teklifini-degerlendirme': 'exec-28a538ee-b159-4149-b076-427125b2c293.png',
  'karsiliksiz-ve-geri-odemeli-burs-farki': 'exec-454a3ccc-b6a3-4539-b73e-62c6dd38ec6e.png',
  'kotu-gecen-stajda-ne-yapilir': 'exec-29d9558d-b6ae-4e65-b261-15956efe2a6d.png',
  'kyk-kredisi-geri-odeme': 'exec-95131598-355d-4b49-80c6-140c8a8fafe7.png',
  'kyk-yurt-basvurusu': 'exec-ba0680a3-fc54-49fe-8f5d-b662b7461e46.png',
  'kyk-yurt-nakli': 'exec-3f37e6e7-e173-43b0-9528-57b1f562f7aa.png',
  'kyk-yurt-tipleri': 'exec-e2217991-9fc0-40b6-87ca-43f1f4db8e33.png',
  'linkedin-profili-nasil-duzenlenir': 'exec-c53ba5e0-1258-45bf-b3f3-1b7931ecfd97.png',
  'maas-beklentisi-nasil-soylenir': 'exec-f30ff9d8-d895-4d53-a464-b59886791798.png',
  'mezun-olmadan-once-yapilacaklar': 'exec-bad1053c-74e3-445c-bd1e-6d243295621b.png',
  'ogrenci-evi-kiralarken': 'exec-c72469ac-db5e-4027-93ba-060e77a6e01b.png',
  'ogrenci-isleri-hangi-islemler': 'exec-4950b61c-f23c-47fa-a0c0-95404017e0c1.png',
  'ogrenci-kulupleri-cvye-nasil-yazilir': 'exec-69d1048e-32f3-4128-874c-7544b7bc78f6.png',
  'ogrenciyken-yari-zamanli-calisma': 'exec-c74e2b90-a182-4638-8d6d-4111a36dcbf9.png',
  'on-yazi-nasil-yazilir': 'exec-22831809-4f67-47c6-8ee1-e8adc6c6c79b.png',
  'online-mulakat': 'exec-a60460bf-5f86-45e4-8f57-098883dcdcdf.png',
  'ozel-yurt-secerken': 'exec-6934a7d7-47d4-4e06-bff2-6833608bf186.png',
  'portfolyo-nasil-hazirlanir': 'exec-a4f685f1-bc57-439d-a5cd-cfa6b0a7f076.png',
  'referans-nasil-istenir': 'exec-a203081a-08d3-495a-bae9-bf38dacebea6.png',
  'staj-basvurusu-gerekli-belgeler': 'exec-66624030-eaeb-4d49-a4d0-580598bd682e.png',
  'staj-sigortasi-kim-yapar': 'exec-7c7cd75e-b51d-4edb-96fd-75cb76dd651a.png',
  'staj-ucreti-nasil-hesaplanir': 'exec-6405dd3c-9949-4575-b361-47ad8a88b8ce.png',
  'stajda-izin-ve-devamsizlik': 'exec-e94c37d0-267f-4d20-9c7d-641591e6e338.png',
  'stajdan-sonra-is-teklifi': 'exec-1dd49d8e-4d1b-4a64-9dde-15428d61b0c7.png',
  'stajyerin-gorev-ve-sorumluluklari': 'exec-3ca6bd3e-46e0-449a-a2ca-6952bb576395.png',
  'universite-kariyer-merkezi': 'exec-4838c06c-0e5b-4a98-adc1-9ad939591c2f.png',
  'uzaktan-staj-kabul-edilir-mi': 'exec-0140c26c-7d7c-4677-a4a3-7ffc0447eb91.png',
  'yatay-gecis': 'exec-95b55dbf-8672-4caa-95b5-dc57e6ca21d1.png',
  'yaz-okulu-ve-staj': 'exec-f2da5981-a575-4830-a0e7-ede19417b954.png',
  'yeni-mezun-cvsi': 'exec-79d342a1-f3f0-45db-a275-799fe023f5f4.png',
  'yeni-mezun-programlari': 'exec-e7ee6213-4a37-4cf3-8de7-edf74b980d21.png',
  'yurt-izin-ve-giris-cikis': 'exec-ee7021ff-fa40-44af-8d7d-90d8f9d4e7d7.png',
  'yurt-yedek-sirasi': 'exec-31043801-1e53-48c0-a0ce-fc341c6544f0.png',
  'yurtdisi-burslari': 'exec-a91f10a5-e9c2-4240-a5c8-2a837faccacf.png',
  'yurtdisi-staj-vizesi': 'exec-9f44eaa0-1df5-4706-9fe8-d9935da7daf6.png',
  'yurtdisinda-barinma': 'exec-11694563-52ab-4b76-b6a9-3ccb0123c0c6.png',
  'yurtdisinda-staj-sigortasi': 'exec-47e28701-ba64-47f0-989e-967e21f61d8c.png',
  'yurttan-kayit-silme': 'exec-c471b817-17b8-407d-a01b-5717ad6e5fd8.png',
};

const kaynaklar = JSON.parse(await readFile(path.join(HEDEF, 'kaynak.json'), 'utf8'));

async function yaz(slug, girdi) {
  const temel = sharp(girdi).rotate().resize(720, 405, { fit: 'cover', position: 'attention' });
  await Promise.all([
    temel.clone().webp({ quality: 84 }).toFile(path.join(HEDEF, `${slug}.webp`)),
    temel.clone().avif({ quality: 55 }).toFile(path.join(HEDEF, `${slug}.avif`)),
  ]);
}

for (const [slug, dosya] of Object.entries(yapay)) {
  await yaz(slug, path.join(URETIM, dosya));
  kaynaklar[slug] = { kaynak: `openai-imagegen:${dosya}`, lisans: 'generated', tur: 'ai-photorealistic' };
}

for (const [slug, bilgi] of Object.entries(kaynaklar)) {
  if (bilgi.lisans !== 'cc0') continue;
  await yaz(slug, path.join(HEDEF, `${slug}.jpg`));
  bilgi.tur = 'cc0-photo';
}

const sirali = Object.fromEntries(Object.entries(kaynaklar).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(path.join(HEDEF, 'kaynak.json'), `${JSON.stringify(sirali, null, 2)}\n`);
console.log(`${Object.keys(yapay).length} yeni fotoğraf ve ${Object.values(kaynaklar).filter((x) => x.lisans === 'cc0').length} CC0 fotoğraf işlendi.`);
