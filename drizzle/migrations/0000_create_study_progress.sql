CREATE TABLE public.study_progress (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  day_id text NOT NULL CHECK (day_id ~ '^\d{4}-\d{2}-\d{2}$'),
  completed boolean NOT NULL DEFAULT false,
  hours numeric NOT NULL DEFAULT 0 CHECK (hours >= 0 AND hours <= 24),
  topic text NOT NULL DEFAULT '' CHECK (length(topic) <= 2000),
  attempted integer NOT NULL DEFAULT 0 CHECK (attempted >= 0),
  correct integer NOT NULL DEFAULT 0 CHECK (correct >= 0 AND correct <= attempted),
  score text NOT NULL DEFAULT '' CHECK (length(score) <= 500),
  notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 5000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_progress TO authenticated;
GRANT ALL ON public.study_progress TO service_role;

ALTER TABLE public.study_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own progress" ON public.study_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own progress" ON public.study_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own progress" ON public.study_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own progress" ON public.study_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_study_progress() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER study_progress_touch BEFORE UPDATE ON public.study_progress FOR EACH ROW EXECUTE FUNCTION public.touch_study_progress();

ALTER TABLE public.study_progress REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_progress;