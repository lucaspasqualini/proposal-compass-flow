
-- 1. PROPOSALS: split policies — SELECT for all authenticated, write for current roles
DROP POLICY IF EXISTS "Proposals access" ON public.proposals;

CREATE POLICY "Proposals select all authenticated"
  ON public.proposals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Proposals insert"
  ON public.proposals FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'socio'::app_role)
    OR has_role(auth.uid(), 'gerente_projetos'::app_role)
    OR has_role(auth.uid(), 'consultor_projetos'::app_role)
  );

CREATE POLICY "Proposals update"
  ON public.proposals FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'socio'::app_role)
    OR has_role(auth.uid(), 'gerente_projetos'::app_role)
    OR has_role(auth.uid(), 'consultor_projetos'::app_role)
  );

CREATE POLICY "Proposals delete"
  ON public.proposals FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'socio'::app_role)
    OR has_role(auth.uid(), 'gerente_projetos'::app_role)
    OR has_role(auth.uid(), 'consultor_projetos'::app_role)
  );

-- 2. PROJECTS: same split
DROP POLICY IF EXISTS "Projects access" ON public.projects;

CREATE POLICY "Projects select all authenticated"
  ON public.projects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Projects insert"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'socio'::app_role)
    OR has_role(auth.uid(), 'gerente_projetos'::app_role)
    OR has_role(auth.uid(), 'consultor_projetos'::app_role)
  );

CREATE POLICY "Projects update"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'socio'::app_role)
    OR has_role(auth.uid(), 'gerente_projetos'::app_role)
    OR has_role(auth.uid(), 'consultor_projetos'::app_role)
  );

CREATE POLICY "Projects delete"
  ON public.projects FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'socio'::app_role)
    OR has_role(auth.uid(), 'gerente_projetos'::app_role)
    OR has_role(auth.uid(), 'consultor_projetos'::app_role)
  );

-- 3. CLIENTS: open SELECT to all authenticated
DROP POLICY IF EXISTS "Clients select" ON public.clients;

CREATE POLICY "Clients select all authenticated"
  ON public.clients FOR SELECT
  TO authenticated
  USING (true);

-- 4. RECEIVABLES: split — SELECT for all authenticated, write restricted
DROP POLICY IF EXISTS "Receivables access" ON public.receivables;

CREATE POLICY "Receivables select all authenticated"
  ON public.receivables FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Receivables insert"
  ON public.receivables FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'socio'::app_role)
    OR has_role(auth.uid(), 'gerente_projetos'::app_role)
    OR has_role(auth.uid(), 'administrativo'::app_role)
  );

CREATE POLICY "Receivables update"
  ON public.receivables FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'socio'::app_role)
    OR has_role(auth.uid(), 'gerente_projetos'::app_role)
    OR has_role(auth.uid(), 'administrativo'::app_role)
  );

CREATE POLICY "Receivables delete"
  ON public.receivables FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'socio'::app_role)
    OR has_role(auth.uid(), 'gerente_projetos'::app_role)
    OR has_role(auth.uid(), 'administrativo'::app_role)
  );

-- 5. TEAM_MEMBERS: keep base table restricted (preserves salary), expose public view
CREATE OR REPLACE VIEW public.team_members_public
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

-- The view uses security_invoker, so we need an additional SELECT policy on the
-- base table that allows reading non-sensitive columns for all authenticated.
-- Strategy: add a permissive SELECT policy for all authenticated; the salary
-- column stays accessible at SQL level but the frontend always queries the view.
-- For stronger protection we keep the existing restrictive policy AS-IS and
-- instead grant the view to authenticated through a SECURITY DEFINER wrapper.
-- Simpler: re-create the view as SECURITY DEFINER (default) so it bypasses RLS
-- on the base table and only exposes the safe columns.

DROP VIEW IF EXISTS public.team_members_public;

CREATE VIEW public.team_members_public AS
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

-- Grant select on the view to authenticated users
GRANT SELECT ON public.team_members_public TO authenticated;
