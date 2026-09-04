import assert from 'node:assert/strict';
import test from 'node:test';
import { visitorCountryResponse } from '../src/lib/visitor-context.mjs';

test('ziyaretci baglami yalniz gecerli Cloudflare ulkesini dondurur', async()=>{
  const response=visitorCountryResponse({country:'fr'});
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{countryCode:'FR'});
  assert.match(response.headers.get('content-type'),/application\/json/);
});

test('gecersiz veya eksik Cloudflare degeri null kalir ve IP sizmaz',async()=>{
  for(const cf of [{country:'XX',clientTcpRtt:12},{}]){
    const body=await visitorCountryResponse(cf).json();
    assert.deepEqual(body,{countryCode:null});
    assert.equal(JSON.stringify(body).includes('ip'),false);
  }
});
