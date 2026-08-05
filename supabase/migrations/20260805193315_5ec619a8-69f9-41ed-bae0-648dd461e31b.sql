-- prompts: remove the over-permissive policy and deny all direct client reads
DROP POLICY IF EXISTS "Prompts are public" ON public.prompts;
DROP POLICY IF EXISTS "Public prompts are readable" ON public.prompts;
CREATE POLICY "No direct client access to prompts"
  ON public.prompts FOR SELECT TO anon, authenticated USING (false);

-- rooms: stop full-state enumeration by anonymous clients
DROP POLICY IF EXISTS "Room status is public" ON public.rooms;
CREATE POLICY "No direct client access to rooms"
  ON public.rooms FOR SELECT TO anon, authenticated USING (false);

-- players / submissions / votes: explicit deny so tokens and votes are never exposed
CREATE POLICY "No direct client access to players"
  ON public.players FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "No direct client access to submissions"
  ON public.submissions FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "No direct client access to votes"
  ON public.votes FOR SELECT TO anon, authenticated USING (false);

-- Remove Data API privileges from browser roles; all access goes through server functions
REVOKE ALL ON public.prompts FROM anon, authenticated;
REVOKE ALL ON public.rooms FROM anon, authenticated;
REVOKE ALL ON public.players FROM anon, authenticated;
REVOKE ALL ON public.submissions FROM anon, authenticated;
REVOKE ALL ON public.votes FROM anon, authenticated;

GRANT ALL ON public.prompts TO service_role;
GRANT ALL ON public.rooms TO service_role;
GRANT ALL ON public.players TO service_role;
GRANT ALL ON public.submissions TO service_role;
GRANT ALL ON public.votes TO service_role;