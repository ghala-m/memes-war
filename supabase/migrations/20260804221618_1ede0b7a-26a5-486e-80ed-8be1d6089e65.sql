CREATE TABLE public.prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text_en text NOT NULL,
  text_ar text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.prompts TO anon, authenticated;
GRANT ALL ON public.prompts TO service_role;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Prompts are public" ON public.prompts FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'lobby',
  phase text NOT NULL DEFAULT 'lobby',
  current_round int NOT NULL DEFAULT 0,
  total_rounds int NOT NULL DEFAULT 5,
  prompt_id uuid REFERENCES public.prompts(id),
  used_prompt_ids uuid[] NOT NULL DEFAULT '{}',
  phase_ends_at timestamptz,
  paused boolean NOT NULL DEFAULT false,
  paused_remaining_ms int,
  language text NOT NULL DEFAULT 'en',
  version bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rooms TO anon, authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Room status is public" ON public.rooms FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  token text NOT NULL,
  score int NOT NULL DEFAULT 0,
  is_host boolean NOT NULL DEFAULT false,
  kicked boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX players_room_token_idx ON public.players (room_id, token);
CREATE INDEX players_room_idx ON public.players (room_id);
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  round int NOT NULL,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  vote_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX submissions_round_player_idx ON public.submissions (room_id, round, player_id);
GRANT ALL ON public.submissions TO service_role;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  round int NOT NULL,
  voter_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX votes_round_voter_idx ON public.votes (room_id, round, voter_id);
GRANT ALL ON public.votes TO service_role;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;

INSERT INTO public.prompts (text_en, text_ar) VALUES
('Best emoji for love?', 'أفضل إيموجي للحب؟'),
('Best emoji for success?', 'أفضل إيموجي للنجاح؟'),
('Best emoji for sadness?', 'أفضل إيموجي للحزن؟'),
('Best emoji for laughter?', 'أفضل إيموجي للضحك؟'),
('Best emoji for anger?', 'أفضل إيموجي للغضب؟'),
('Best emoji for fear?', 'أفضل إيموجي للخوف؟'),
('Best emoji for surprise?', 'أفضل إيموجي للمفاجأة؟'),
('Best emoji for boredom?', 'أفضل إيموجي للملل؟'),
('Monday morning in one emoji', 'صباح الاثنين في إيموجي واحد'),
('Your face when the wifi dies', 'وجهك لما ينقطع الواي فاي'),
('The group chat at 3am', 'المجموعة الساعة ٣ الفجر'),
('Best emoji for your boss', 'أفضل إيموجي لمديرك'),
('How payday feels', 'شعور يوم الراتب'),
('Last slice of pizza energy', 'طاقة آخر قطعة بيتزا'),
('Best emoji for awkward silence', 'أفضل إيموجي للصمت المحرج'),
('When someone reads and does not reply', 'لما أحد يقرأ ولا يرد'),
('Your energy before coffee', 'طاقتك قبل القهوة'),
('Your energy after coffee', 'طاقتك بعد القهوة'),
('Best emoji for chaos', 'أفضل إيموجي للفوضى'),
('Best emoji for true friendship', 'أفضل إيموجي للصداقة الحقيقية'),
('When the teacher says pop quiz', 'لما المعلم يقول اختبار مفاجئ'),
('Best emoji for petty revenge', 'أفضل إيموجي للانتقام الصغير'),
('The vibe of a family gathering', 'أجواء اجتماع العائلة'),
('When you spend your whole salary in a day', 'لما تصرف راتبك في يوم'),
('Best emoji for a bad haircut', 'أفضل إيموجي لقصة شعر سيئة'),
('Waiting for food delivery', 'انتظار توصيل الطعام'),
('Best emoji for a plot twist', 'أفضل إيموجي لمنعطف مفاجئ'),
('When your alarm does not go off', 'لما المنبه ما يرن'),
('Best emoji for pure confidence', 'أفضل إيموجي للثقة المطلقة'),
('The feeling of finishing an exam', 'شعور إنهاء الامتحان'),
('Best emoji for gossip', 'أفضل إيموجي للنميمة'),
('Your reaction to a terrible joke', 'ردة فعلك على نكتة سيئة'),
('Best emoji for being late', 'أفضل إيموجي للتأخير'),
('The mood of a rainy day', 'مزاج يوم ممطر'),
('Best emoji for saying goodbye', 'أفضل إيموجي للوداع'),
('When you see your ex in public', 'لما تشوف حبيبك السابق'),
('Best emoji for a big lie', 'أفضل إيموجي لكذبة كبيرة'),
('The last day of vacation', 'آخر يوم في الإجازة'),
('Best emoji for hunger', 'أفضل إيموجي للجوع'),
('When you win an argument', 'لما تكسب النقاش'),
('Best emoji for regret', 'أفضل إيموجي للندم'),
('Your face in a boring meeting', 'وجهك في اجتماع ممل'),
('Best emoji for a genius idea', 'أفضل إيموجي لفكرة عبقرية'),
('When the bill arrives', 'لما تجي الفاتورة'),
('Best emoji for showing off', 'أفضل إيموجي للتباهي'),
('The sound of your phone at 1% battery', 'إحساس بطارية الجوال ١٪'),
('Best emoji for a first date', 'أفضل إيموجي لأول موعد'),
('When you finally clean your room', 'لما تنظف غرفتك أخيرا'),
('Best emoji for drama', 'أفضل إيموجي للدراما'),
('How you feel right now', 'كيف تشعر الآن');