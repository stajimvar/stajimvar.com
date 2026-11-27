/*
  ÜSKÜDAR ÜNİVERSİTESİ KAMPÜS VERİSİ KALDIRILDI (27 Kasım 2026)

  Üniversite (Kariyer merkezi, e-posta 27.11.2026) aralarında protokol
  olmadığı için adının siteden kaldırılmasını istedi. Kullanıcı kararı:
  okulun kendi sitesinden otomatik çekilen kampüs içeriği (duyurular,
  yemek menüleri) ve kaynak kayıtları kaldırılıyor; kataloğa bir daha
  girmesin diye `automation/kampus_kesif.py` DISARIDA listesine eklendi.

  Ölçüm (uygulamadan önce): 19 duyuru, 64 menü, 2 kaynak, 1 katalog satırı.

  DOKUNULMAYAN: öğrencinin profilindeki okul adı (öğrencinin verisi) ve
  okul seçim listesi (YÖK'ün herkese açık listesi). Kariyer merkezleri
  rehberindeki kayıt, kurumun yanıtına göre ayrıca ele alınacak.
*/

delete from public.kampus_menuleri where universite_id = 'uskudar-universitesi';
delete from public.universite_duyurulari where universite_id = 'uskudar-universitesi';
delete from public.universite_kaynaklari where universite_id = 'uskudar-universitesi';
delete from public.universiteler where id = 'uskudar-universitesi';
