-- LİSTE TEK BAŞINA YETMİYOR
--
-- Ölçüldü: listede OLMAYAN bir çok parçalı son ekte (örneğin `com.ng`)
-- `acme.com.ng` ile `baska.com.ng` aynı kayıtlı alan adına (`com.ng`)
-- düşüyor ve BİRBİRİNİ ONAYLIYORDU. Yani eksik liste otomatik onay
-- yönünde hata veriyordu — tam istemediğimiz yön.
--
-- Kural: son etiket iki harfli bir ülke kodu VE ondan önceki etiket genel
-- bir ikinci düzey ad ise (com, net, org, co, ac…), o son ek çok parçalı
-- sayılıyor. Kural listede olmayan ülkeleri de kapsıyor ve yanılırsa
-- kayıtlı alan adını UZUN hesaplıyor — daha katı eşleşme, elle inceleme
-- yönünde.
--
-- Aynı kural src/lib/sirket-dogrulama.mjs içinde de var; 39 vakada ikisinin
-- aynı kararı verdiği doğrulandı.
create or replace function public.cok_parcali_son_ek_mi(son_ek text)
returns boolean language sql immutable
as $$
  select son_ek in (
    'com.tr','org.tr','net.tr','gov.tr','edu.tr','k12.tr','bel.tr','pol.tr',
    'tsk.tr','av.tr','dr.tr','name.tr','gen.tr','web.tr','biz.tr','info.tr',
    'tv.tr','bbs.tr',
    'co.uk','org.uk','ac.uk','gov.uk','me.uk','net.uk',
    'com.au','net.au','org.au','edu.au','gov.au',
    'co.nz','net.nz','org.nz',
    'com.br','net.br','org.br',
    'co.jp','ne.jp','or.jp','ac.jp','go.jp',
    'co.kr','or.kr',
    'com.cn','net.cn','org.cn','gov.cn',
    'co.in','net.in','org.in',
    'com.mx','com.ar','com.co','com.sg','com.hk','com.tw',
    'co.za','com.ua','com.pl','com.gr','com.cy',
    'co.il','com.sa','com.eg','com.qa','com.kw'
  )
  or (
    split_part(son_ek, '.', 2) ~ '^[a-z]{2}$'
    and split_part(son_ek, '.', 1) in (
      'com','net','org','edu','gov','mil','co','ac','ne','or','go',
      'biz','info','name','web','gen','k12','bel','pol','tv','sch',
      'nom','ind','firm','gob','gouv','jus','int'
    )
  );
$$;
