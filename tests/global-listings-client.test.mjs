import assert from 'node:assert/strict';
import test from 'node:test';

import { requestPublishedListingsCatalog } from '../src/lib/global-listings-api.mjs';

test('global katalog siniri exact RPC parametrelerini ve cursor hassasiyetini korur', async () => {
  const calls=[];
  const client={rpc:async(name,args)=>{calls.push({name,args});return {data:{listings:[],total:67,facets:{countries:[]},hasMore:false,nextCursor:null,snapshot:'2026-09-05T10:00:00.123456+00:00'},error:null}}};
  const result=await requestPublishedListingsCatalog(client,{country:'FR',cursor:{value:'2026-09-01T10:00:00.654321+00:00',id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'},snapshot:'2026-09-05T10:00:00.123456+00:00'});
  assert.deepEqual(calls,[{name:'get_published_listings_catalog_v2',args:{p_country:'FR',p_cursor_posted_at:'2026-09-01T10:00:00.654321+00:00',p_cursor_id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',p_snapshot:'2026-09-05T10:00:00.123456+00:00'}}]);
  assert.equal(result.snapshot,'2026-09-05T10:00:00.123456+00:00');
  assert.equal(result.total,67);
});

test('global katalog hatali cevabi bos liste gibi sunmaz', async()=>{
  await assert.rejects(requestPublishedListingsCatalog({rpc:async()=>({data:{listings:[],facets:{countries:[]},hasMore:false,nextCursor:null,snapshot:'2026-09-05T10:00:00Z'},error:null})},{country:'all'}),/geçersiz/i);
  await assert.rejects(requestPublishedListingsCatalog({rpc:async()=>({data:{listings:[]},error:null})},{country:'all'}),/geçersiz/i);
  await assert.rejects(requestPublishedListingsCatalog({rpc:async()=>({data:null,error:{message:'kapali'}})},{country:'TR'}),/kapali/);
});
