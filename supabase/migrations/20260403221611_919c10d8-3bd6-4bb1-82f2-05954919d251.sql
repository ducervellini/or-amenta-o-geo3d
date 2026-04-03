
ALTER TABLE public.servicos ADD COLUMN area_empresa_id uuid REFERENCES public.areas_empresa(id);
ALTER TABLE public.servicos ALTER COLUMN modulo_id DROP NOT NULL;
ALTER TABLE public.servicos ADD COLUMN unidade_tempo_produtividade text NOT NULL DEFAULT 'hora';
