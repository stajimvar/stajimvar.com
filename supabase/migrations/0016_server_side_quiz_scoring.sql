-- =============================================================================
-- Test puanlaması sunucuya taşındı
-- =============================================================================
--
-- BULGU
-- -----
-- Testler `src/data/skillQuizzes.ts` içinde, uygulamayla birlikte gönderilen
-- durağan bir dosyadaydı ve DOĞRU CEVAPLAR o dosyanın içindeydi. İki sonucu
-- vardı:
--
--   1. Tarayıcı paketini açan herkes 60 sorunun tüm cevaplarını okuyabiliyordu.
--   2. Puan istemcide hesaplanıyor, rozet çağrısı da istemciden yapılıyordu.
--      Rozet kazanmak için testi çözmeye bile gerek yoktu.
--
-- ÇÖZÜM
-- -----
-- Testler veritabanına taşındı (automation/seed_quizzes.py). Sorular cevapsız
-- `quiz_questions_public` görünümünden okunuyor. Puanı ve rozeti aşağıdaki
-- fonksiyon veriyor.
--
-- İki katmanlı koruma:
--   RLS       — yalnızca aktif testlerin soruları okunabilir.
--   Sütun yetkisi — correct_index ve explanation hiçbir API rolüne verilmedi.
--                   Görünümü atlayıp doğrudan tabloyu sorgulayan da alamaz.
--
-- `quiz_attempts` üzerinde INSERT politikası BİLEREK yok: tek yazma yolu bu
-- fonksiyon. Olsaydı öğrenci kendine 5/5 yazıp rozet alabilirdi.

create or replace function public.submit_quiz_attempt(
  p_quiz_id uuid,
  p_answers jsonb          -- {"<soru_id>": <secilen_index>, ...}
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $BODY$
declare
  v_ogrenci uuid := auth.uid();
  v_toplam  int;
  v_dogru   int;
  v_gecme   int;
  v_gecti   boolean;
  v_rozet   text;
  v_yetenek text;
begin
  if v_ogrenci is null then
    raise exception 'oturum gerekli';
  end if;

  select pass_score, badge_name, skill_name
    into v_gecme, v_rozet, v_yetenek
    from public.quizzes
   where id = p_quiz_id and is_active;

  if not found then
    raise exception 'test bulunamadi';
  end if;

  -- Puan tek sorguda, sunucuda. İstemcinin gönderdiği tek şey seçilen şıklar;
  -- doğru cevaplar bu işlemin dışına hiç çıkmıyor.
  select count(*),
         count(*) filter (
           where (p_answers ->> q.id::text) is not null
             and (p_answers ->> q.id::text)::int = q.correct_index
         )
    into v_toplam, v_dogru
    from public.quiz_questions q
   where q.quiz_id = p_quiz_id;

  v_gecti := v_dogru >= v_gecme;

  insert into public.quiz_attempts (quiz_id, student_id, score, passed, answers)
  values (p_quiz_id, v_ogrenci, v_dogru, v_gecti, p_answers);

  if v_gecti then
    update public.student_profiles
       set earned_badges = (
         select array_agg(distinct b)
           from unnest(coalesce(earned_badges, '{}') || array[v_rozet]) as b
       )
     where id = v_ogrenci;
  end if;

  return jsonb_build_object(
    'toplam', v_toplam, 'dogru', v_dogru, 'gecmeNotu', v_gecme,
    'gecti', v_gecti,
    'rozet', case when v_gecti then v_rozet else null end,
    'yetenek', v_yetenek
  );
end;
$BODY$;

revoke all on function public.submit_quiz_attempt(uuid, jsonb) from public, anon;
grant execute on function public.submit_quiz_attempt(uuid, jsonb) to authenticated;

drop policy if exists "ogrenci kendi denemeleri" on public.quiz_attempts;
create policy "ogrenci kendi denemeleri" on public.quiz_attempts
  for select using (student_id = auth.uid());

revoke insert, update, delete on public.quiz_attempts from authenticated, anon;
grant select on public.quiz_attempts to authenticated;

drop policy if exists "aktif testler herkese acik" on public.quizzes;
create policy "aktif testler herkese acik" on public.quizzes
  for select using (is_active);

create policy "aktif test sorulari okunur" on public.quiz_questions
  for select using (
    exists (select 1 from public.quizzes q where q.id = quiz_questions.quiz_id and q.is_active)
  );

revoke select on public.quiz_questions from anon, authenticated;
grant select (id, quiz_id, question, code_snippet, options, sort_order)
  on public.quiz_questions to anon, authenticated;

-- DOĞRULANDI (tarayıcı anahtarıyla, gerçek HTTP):
--   quiz_questions.correct_index iste  -> 42501 permission denied
--   quiz_questions.explanation iste    -> 42501 permission denied
--   quiz_questions.question iste       -> 200, soru metni geliyor
--   quiz_questions_public oku          -> cevap alanı yok
--   quiz_attempts'e elle 5/5 yaz       -> 401 permission denied
-- Ayrıca tarayıcı paketinde artık tek bir soru metni bile yok.
