
-- 1. Enum de papéis
CREATE TYPE public.app_role AS ENUM (
  'socio',
  'gerente_projetos',
  'consultor_projetos',
  'estagiario',
  'administrativo'
);

-- 2. Tabela user_roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Função has_role (SECURITY DEFINER para evitar recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Função is_socio (atalho)
CREATE OR REPLACE FUNCTION public.is_socio(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'socio'
  )
$$;

-- 5. Atribui papel sócio ao primeiro usuário cadastrado
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'socio'::public.app_role
FROM auth.users
ORDER BY created_at ASC
LIMIT 1
ON CONFLICT (user_id, role) DO NOTHING;

-- 6. Políticas RLS de user_roles (só sócio gerencia)
CREATE POLICY "Socios manage user_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_socio(auth.uid()))
WITH CHECK (public.is_socio(auth.uid()));

CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 7. Reescrita das RLS — DROP das policies antigas e criação das novas

-- proposals
DROP POLICY IF EXISTS "Authenticated users full access proposals" ON public.proposals;
CREATE POLICY "Proposals access" ON public.proposals
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'socio') OR
    public.has_role(auth.uid(), 'gerente_projetos') OR
    public.has_role(auth.uid(), 'consultor_projetos')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'socio') OR
    public.has_role(auth.uid(), 'gerente_projetos') OR
    public.has_role(auth.uid(), 'consultor_projetos')
  );

-- projects
DROP POLICY IF EXISTS "Authenticated users full access projects" ON public.projects;
CREATE POLICY "Projects access" ON public.projects
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'socio') OR
    public.has_role(auth.uid(), 'gerente_projetos') OR
    public.has_role(auth.uid(), 'consultor_projetos')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'socio') OR
    public.has_role(auth.uid(), 'gerente_projetos') OR
    public.has_role(auth.uid(), 'consultor_projetos')
  );

-- proposal_templates
DROP POLICY IF EXISTS "Authenticated users full access proposal_templates" ON public.proposal_templates;
CREATE POLICY "Templates access" ON public.proposal_templates
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'socio') OR
    public.has_role(auth.uid(), 'gerente_projetos') OR
    public.has_role(auth.uid(), 'consultor_projetos')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'socio') OR
    public.has_role(auth.uid(), 'gerente_projetos') OR
    public.has_role(auth.uid(), 'consultor_projetos')
  );

-- project_allocations: todos veem; só socio/gerente/consultor editam
DROP POLICY IF EXISTS "Authenticated users full access project_allocations" ON public.project_allocations;
CREATE POLICY "Allocations select" ON public.project_allocations
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'socio') OR
    public.has_role(auth.uid(), 'gerente_projetos') OR
    public.has_role(auth.uid(), 'consultor_projetos') OR
    public.has_role(auth.uid(), 'estagiario') OR
    public.has_role(auth.uid(), 'administrativo')
  );
CREATE POLICY "Allocations write" ON public.project_allocations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'socio') OR
    public.has_role(auth.uid(), 'gerente_projetos') OR
    public.has_role(auth.uid(), 'consultor_projetos')
  );
CREATE POLICY "Allocations update" ON public.project_allocations
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'socio') OR
    public.has_role(auth.uid(), 'gerente_projetos') OR
    public.has_role(auth.uid(), 'consultor_projetos')
  );
CREATE POLICY "Allocations delete" ON public.project_allocations
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'socio') OR
    public.has_role(auth.uid(), 'gerente_projetos') OR
    public.has_role(auth.uid(), 'consultor_projetos')
  );

-- clients
DROP POLICY IF EXISTS "Authenticated users full access clients" ON public.clients;
CREATE POLICY "Clients select" ON public.clients
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'socio') OR
    public.has_role(auth.uid(), 'gerente_projetos') OR
    public.has_role(auth.uid(), 'consultor_projetos') OR
    public.has_role(auth.uid(), 'administrativo')
  );
CREATE POLICY "Clients insert" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'socio') OR
    public.has_role(auth.uid(), 'gerente_projetos') OR
    public.has_role(auth.uid(), 'administrativo')
  );
CREATE POLICY "Clients update" ON public.clients
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'socio') OR
    public.has_role(auth.uid(), 'gerente_projetos') OR
    public.has_role(auth.uid(), 'administrativo')
  );
CREATE POLICY "Clients delete" ON public.clients
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'socio') OR
    public.has_role(auth.uid(), 'gerente_projetos') OR
    public.has_role(auth.uid(), 'administrativo')
  );

-- team_members: socio + administrativo veem; só socio edita
DROP POLICY IF EXISTS "Authenticated users full access team_members" ON public.team_members;
CREATE POLICY "Team select" ON public.team_members
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'socio') OR
    public.has_role(auth.uid(), 'administrativo')
  );
CREATE POLICY "Team write" ON public.team_members
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'socio'))
  WITH CHECK (public.has_role(auth.uid(), 'socio'));

-- bonus_history
DROP POLICY IF EXISTS "Authenticated users full access bonus_history" ON public.bonus_history;
CREATE POLICY "Bonus select" ON public.bonus_history
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'socio') OR
    public.has_role(auth.uid(), 'administrativo')
  );
CREATE POLICY "Bonus write" ON public.bonus_history
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'socio'))
  WITH CHECK (public.has_role(auth.uid(), 'socio'));

-- promotion_history
DROP POLICY IF EXISTS "Authenticated users full access promotion_history" ON public.promotion_history;
CREATE POLICY "Promotion select" ON public.promotion_history
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'socio') OR
    public.has_role(auth.uid(), 'administrativo')
  );
CREATE POLICY "Promotion write" ON public.promotion_history
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'socio'))
  WITH CHECK (public.has_role(auth.uid(), 'socio'));

-- receivables: socio + gerente + administrativo
DROP POLICY IF EXISTS "Authenticated users full access receivables" ON public.receivables;
CREATE POLICY "Receivables access" ON public.receivables
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'socio') OR
    public.has_role(auth.uid(), 'gerente_projetos') OR
    public.has_role(auth.uid(), 'administrativo')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'socio') OR
    public.has_role(auth.uid(), 'gerente_projetos') OR
    public.has_role(auth.uid(), 'administrativo')
  );

-- cnpj_review_queue
DROP POLICY IF EXISTS "Authenticated users full access cnpj_review_queue" ON public.cnpj_review_queue;
CREATE POLICY "Cnpj queue access" ON public.cnpj_review_queue
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'socio') OR
    public.has_role(auth.uid(), 'gerente_projetos') OR
    public.has_role(auth.uid(), 'administrativo')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'socio') OR
    public.has_role(auth.uid(), 'gerente_projetos') OR
    public.has_role(auth.uid(), 'administrativo')
  );
