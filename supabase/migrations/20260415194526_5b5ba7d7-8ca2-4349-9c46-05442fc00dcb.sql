
CREATE TABLE public.proposal_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_projeto TEXT NOT NULL UNIQUE,
  scope_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access proposal_templates"
ON public.proposal_templates
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_proposal_templates_updated_at
BEFORE UPDATE ON public.proposal_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
