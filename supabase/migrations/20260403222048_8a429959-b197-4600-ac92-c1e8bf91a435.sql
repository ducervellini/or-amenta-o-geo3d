
ALTER TABLE public.composicao_itens ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE public.composicao_itens ADD COLUMN IF NOT EXISTS unidade text DEFAULT 'un';
ALTER TABLE public.composicao_itens ADD COLUMN IF NOT EXISTS grupo_custo text DEFAULT 'direto';
ALTER TABLE public.composicao_itens ADD COLUMN IF NOT EXISTS consumo numeric DEFAULT 0;
ALTER TABLE public.composicao_itens ADD COLUMN IF NOT EXISTS vida_util numeric;
ALTER TABLE public.composicao_itens ADD COLUMN IF NOT EXISTS depreciacao numeric DEFAULT 0;
ALTER TABLE public.composicao_itens ADD COLUMN IF NOT EXISTS manutencao numeric DEFAULT 0;
ALTER TABLE public.composicao_itens ADD COLUMN IF NOT EXISTS fator_utilizacao numeric DEFAULT 1;
ALTER TABLE public.composicao_itens ADD COLUMN IF NOT EXISTS observacoes text;
ALTER TABLE public.composicao_itens ADD COLUMN IF NOT EXISTS parametros jsonb DEFAULT '{}'::jsonb;
