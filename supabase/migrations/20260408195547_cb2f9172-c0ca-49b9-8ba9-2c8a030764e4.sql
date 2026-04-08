
-- Rename columns in team_members
ALTER TABLE public.team_members RENAME COLUMN specialty TO area;
ALTER TABLE public.team_members RENAME COLUMN hourly_rate TO salary;

-- Promotion history table
CREATE TABLE public.promotion_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  previous_role TEXT,
  new_role TEXT NOT NULL,
  previous_salary NUMERIC,
  new_salary NUMERIC,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.promotion_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access promotion_history"
ON public.promotion_history FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE TRIGGER update_promotion_history_updated_at
BEFORE UPDATE ON public.promotion_history
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bonus history table
CREATE TABLE public.bonus_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  reference_year INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bonus_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access bonus_history"
ON public.bonus_history FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE TRIGGER update_bonus_history_updated_at
BEFORE UPDATE ON public.bonus_history
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
