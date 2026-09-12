/**
 * Kariyer sayfası tarayıcısının iki kritik kararı.
 *
 * Bu iki şey yanlış olduğunda tarayıcı SESSİZCE yanlış cevap veriyor:
 * kök yanlışsa boş sayfa yoklanıyor ve "yeni yok" deniyor; desen yanlışsa
 * staj olmayan ilan listeye giriyor ya da gerçek staj kaçıyor. İkisi de
 * canlıda ölçüldü, ikisi de buraya bağlandı.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { kokTuret, STAJ_DESENI } from '../scripts/kariyer-tara.mjs';

test('ATS adreslerinden ilan listesi kökü doğru kesiliyor', () => {
  const dene = [
    ['https://jobs.lever.co/lalamove/9053e477-835b-40ac-9fd9-52411b63edd4', 'https://jobs.lever.co/lalamove', 'lever'],
    ['https://jobs.ashbyhq.com/codeway/abc-123', 'https://jobs.ashbyhq.com/codeway', 'ashby'],
    ['https://jobs.smartrecruiters.com/BoschGroup/744000148680248-hr', 'https://jobs.smartrecruiters.com/BoschGroup', 'smartrecruiters'],
    ['https://ats.rippling.com/oguz-law/jobs/cc2f19ae', 'https://ats.rippling.com/oguz-law', 'rippling'],
    ['https://app.gethirex.com/o/coderspace/zosuwa4-social-media', 'https://app.gethirex.com/o/coderspace', 'gethirex'],
  ];
  for (const [girdi, beklenenKok, beklenenAdapter] of dene) {
    const t = kokTuret(girdi);
    assert.equal(t.kok, beklenenKok, girdi);
    assert.equal(t.adapter, beklenenAdapter, girdi);
    assert.equal(t.kesin, true, girdi);
  }
});

test('Workday kökü dil kodunu atlayıp site adını buluyor', () => {
  /* İki kalıp da canlıda görüldü: /<site>/job/... ve /<dil>/<site>/job/... */
  const duz = kokTuret('https://medtronic.wd1.myworkdayjobs.com/MedtronicCareers/job/Istanbul/Marketing-Intern_R76700');
  assert.equal(duz.kok, 'https://medtronic.wd1.myworkdayjobs.com/MedtronicCareers');
  assert.equal(duz.adapter, 'workday');

  const dilli = kokTuret('https://gsknch.wd3.myworkdayjobs.com/tr-TR/GSKCareers/job/Turkey/Regulatory-Intern_547774');
  assert.equal(dilli.kok, 'https://gsknch.wd3.myworkdayjobs.com/tr-TR/GSKCareers');
  assert.equal(dilli.adapter, 'workday');
});

test('tanınmayan adres kesin sayılmıyor', () => {
  /*
    Kök TAHMİN edilebilir ama bu sessiz kalmamalı: yanlış kök, yoklamada
    boş sayfa üretip "yeni yok" yalanına dönüşüyor.
  */
  const t = kokTuret('https://farklifikir.com.tr/sayfa/kariyer');
  assert.equal(t.kesin, false);
  assert.equal(t.kok, 'https://farklifikir.com.tr');
});

test('staj deseni "International" tuzağına düşmüyor', () => {
  /*
    ÖLÇÜLEN KUSUR: desen düz `intern` arıyordu ve Magnum'un
    "International Payroll Specialist" ilanı staj sanılıp listeye girdi.
    Aynı tuzak "internal" için de geçerli.
  */
  for (const yanlis of [
    'International Payroll Specialist',
    'Internal Audit Manager',
    'Head of Internal Communications',
    'Senior Data Engineer',
  ]) {
    assert.equal(STAJ_DESENI.test(yanlis), false, yanlis);
  }
});

test('gerçek staj başlıkları yakalanıyor', () => {
  for (const dogru of [
    'Business Analyst Intern',
    'Marketing Internship',
    'Summer Interns',
    'Stajyer Matematik Öğretmeni',
    'Uzun Dönem Staj',
    'Working Student (Sales Finance)',
    'Trainee Program',
    'Yeni Mezun Programı',
    'Graduate Programme 2027',
    'Apprenticeship Mechanic',
  ]) {
    assert.equal(STAJ_DESENI.test(dogru), true, dogru);
  }
});
