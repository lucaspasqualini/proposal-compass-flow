
-- Clients
DROP POLICY IF EXISTS "Clients select all authenticated" ON public.clients;
CREATE POLICY "Clients select" ON public.clients
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'socio'::app_role)
  OR has_role(auth.uid(), 'gerente_projetos'::app_role)
  OR has_role(auth.uid(), 'consultor_projetos'::app_role)
  OR has_role(auth.uid(), 'administrativo'::app_role)
);

-- Proposals
DROP POLICY IF EXISTS "Proposals select all authenticated" ON public.proposals;
CREATE POLICY "Proposals select" ON public.proposals
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'socio'::app_role)
  OR has_role(auth.uid(), 'gerente_projetos'::app_role)
  OR has_role(auth.uid(), 'consultor_projetos'::app_role)
);

-- Receivables
DROP POLICY IF EXISTS "Receivables select all authenticated" ON public.receivables;
CREATE POLICY "Receivables select" ON public.receivables
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'socio'::app_role)
  OR has_role(auth.uid(), 'gerente_projetos'::app_role)
  OR has_role(auth.uid(), 'administrativo'::app_role)
);

-- Team members (salary sensitive)
DROP POLICY IF EXISTS "Team select all authenticated" ON public.team_members;
CREATE POLICY "Team select" ON public.team_members
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'socio'::app_role)
  OR has_role(auth.uid(), 'administrativo'::app_role)
);

-- Projects: also restrict to internal project roles
DROP POLICY IF EXISTS "Projects select all authenticated" ON public.projects;
CREATE POLICY "Projects select" ON public.projects
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'socio'::app_role)
  OR has_role(auth.uid(), 'gerente_projetos'::app_role)
  OR has_role(auth.uid(), 'consultor_projetos'::app_role)
  OR has_role(auth.uid(), 'estagiario'::app_role)
  OR has_role(auth.uid(), 'administrativo'::app_role)
);
