ALTER TABLE public.mobilizacoes ADD COLUMN IF NOT EXISTS data_inicio date;
ALTER TABLE public.mobilizacoes ADD COLUMN IF NOT EXISTS pluviometria_dados jsonb;