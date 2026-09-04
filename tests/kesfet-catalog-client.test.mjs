import test from 'node:test';
import assert from 'node:assert/strict';
import { requestDiscoverCatalog } from '../src/lib/kesfet-catalog.mjs';

const response=()=>({events:[],total:0,hasMore:false,nextCursor:null,snapshot:'2026-09-04T10:00:00Z',facets:{cities:[],categories:{},free:0,discount:0}});
test('catalog sends all filters and the stable cursor to server instead of filtering a local slice',async()=>{
  const controller=new AbortController();
  const api={rpc(name,args){
    assert.equal(name,'get_discover_catalog');
    assert.deepEqual(args,{p_query:'İstanbul',p_city:'İstanbul',p_category:'concert',p_period:'month',p_free:true,p_discount:false,p_sort:'upcoming',p_cursor_value:'2026-10-01T10:00:00Z',p_cursor_id:'d962b910-d94c-4e65-a31c-15537e4fccfb',p_snapshot:'2026-09-04T10:00:00Z'});
    return {abortSignal(signal){assert.equal(signal,controller.signal);return Promise.resolve({data:response(),error:null});}};
  }};
  assert.equal((await requestDiscoverCatalog(api,{query:'İstanbul',city:'İstanbul',category:'concert',period:'month',free:true,sort:'upcoming',cursor:{value:'2026-10-01T10:00:00Z',id:'d962b910-d94c-4e65-a31c-15537e4fccfb'},snapshot:'2026-09-04T10:00:00Z',signal:controller.signal})).total,0);
});
test('missing RPC and malformed payloads remain errors, never a fake empty catalog',async()=>{
  await assert.rejects(requestDiscoverCatalog({rpc:()=>Promise.resolve({error:{message:'RPC unavailable'},data:null})}),/RPC unavailable/);
  for(const data of [null,{}, {...response(),total:NaN}, {...response(),hasMore:true}, {...response(),facets:null}]) {
    await assert.rejects(requestDiscoverCatalog({rpc:()=>Promise.resolve({error:null,data})}),/doğrulanamadı/i);
  }
});
test('newest first defaults carry no fixed dataset size or end offset',async()=>{
  let called=false;
  const api={rpc(name,args){called=true;assert.equal(args.p_sort,'newest');assert.equal(args.p_snapshot,null);assert.equal(args.p_cursor_id,null);assert.ok(!('p_limit' in args));return Promise.resolve({error:null,data:response()});}};
  await requestDiscoverCatalog(api);assert.equal(called,true);
});
