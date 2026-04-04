ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS media_km_l numeric NOT NULL DEFAULT 0;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS tipo_combustivel text NOT NULL DEFAULT 'diesel';