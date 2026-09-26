-- 2026-09-26 tarihinde yayınlanmış ilan kataloğunda logosu boş olan sekiz şirketten yedisi.
-- Statik dosyalar canlıya çıktıktan sonra çalıştır. Dolu logo alanlarını korur.
begin;

update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/hellmann-worldwide-logistics.svg'
where id = '04ce24e3-be1c-473d-83d0-40d7d5d4f851' and name = 'Hellmann Worldwide Logistics' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/vylor-icon.png'
where id = '7e954cc6-7af8-40cc-862f-e84d18b4faf2' and name = 'Vylor' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/bigger-games.svg'
where id = '748f0749-5429-4f3c-9125-251d7a71a540' and name = 'Bigger Games' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/wongdoody.jpg'
where id = '50c248f3-629e-4bbb-b26e-2eabbce167da' and name = 'WongDoody' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/neckar-hub.png'
where id = '518551ba-a558-4389-bfea-df20f8f662fe' and name = 'Neckar Hub' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/yami-studios-og.jpg'
where id = '48d832f6-a28b-4520-a26e-d0d4b71e0cfc' and name = 'Yami Studios UG' and nullif(btrim(logo_url), '') is null;
update public.companies set logo_url = 'https://stajimvar.com/isveren-logolari/qubbe-medya.png'
where id = 'f8f49c75-cbab-4021-b8f9-77baa64ee6b5' and name = 'Qubbe Medya' and nullif(btrim(logo_url), '') is null;

commit;
