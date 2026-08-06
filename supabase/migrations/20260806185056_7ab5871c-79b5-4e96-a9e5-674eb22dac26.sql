CREATE TABLE public.memes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT ALL ON public.memes TO service_role;
ALTER TABLE public.memes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct client access to memes" ON public.memes FOR SELECT TO anon, authenticated USING (false);

ALTER TABLE public.submissions ADD COLUMN meme_id uuid REFERENCES public.memes(id);
ALTER TABLE public.submissions ALTER COLUMN emoji SET DEFAULT '';