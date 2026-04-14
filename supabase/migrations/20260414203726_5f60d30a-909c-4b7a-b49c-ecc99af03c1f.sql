
CREATE TABLE public.cnpj_review_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  cnpj_found TEXT NOT NULL,
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_cnpj_review_status ON public.cnpj_review_queue(status);
CREATE UNIQUE INDEX idx_cnpj_review_client ON public.cnpj_review_queue(client_id);

ALTER TABLE public.cnpj_review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access cnpj_review_queue"
ON public.cnpj_review_queue
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_cnpj_review_queue_updated_at
BEFORE UPDATE ON public.cnpj_review_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
