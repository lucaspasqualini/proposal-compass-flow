
CREATE TABLE public.receivables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  parcela_index integer NOT NULL DEFAULT 0,
  description text,
  amount numeric,
  due_date date,
  status text NOT NULL DEFAULT 'pendente',
  paid_at date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access receivables"
ON public.receivables
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_receivables_updated_at
BEFORE UPDATE ON public.receivables
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
