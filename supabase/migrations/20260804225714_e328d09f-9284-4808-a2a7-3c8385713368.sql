ALTER TABLE public.prompts ADD COLUMN IF NOT EXISTS owner_key text;
ALTER TABLE public.prompts ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;
UPDATE public.prompts SET is_public = true WHERE owner_key IS NULL;
CREATE INDEX IF NOT EXISTS prompts_owner_key_idx ON public.prompts(owner_key);

ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS queued_prompt_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

DROP POLICY IF EXISTS "Prompts are public SELECT" ON public.prompts;
CREATE POLICY "Public prompts are readable"
ON public.prompts FOR SELECT TO anon, authenticated
USING (is_public = true AND owner_key IS NULL);