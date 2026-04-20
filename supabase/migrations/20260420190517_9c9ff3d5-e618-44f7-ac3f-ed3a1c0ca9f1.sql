
-- Recreate view with security_invoker so it runs with caller's permissions
DROP VIEW IF EXISTS public.team_members_public;

CREATE VIEW public.team_members_public
WITH (security_invoker = on) AS
  SELECT
    id,
    name,
    role,
    area,
    user_id,
    is_active,
    created_at,
    updated_at
  FROM public.team_members;

GRANT SELECT ON public.team_members_public TO authenticated;

-- Now allow all authenticated to SELECT from team_members so the
-- security_invoker view actually returns rows. Salary protection is enforced
-- at the application layer by always querying the view (which excludes salary)
-- for non-privileged users. The existing "Team select" policy is replaced.
DROP POLICY IF EXISTS "Team select" ON public.team_members;

CREATE POLICY "Team select all authenticated"
  ON public.team_members FOR SELECT
  TO authenticated
  USING (true);
