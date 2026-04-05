
CREATE TABLE public.grupos_servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.grupos_servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select grupos_servicos" ON public.grupos_servicos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert grupos_servicos" ON public.grupos_servicos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update grupos_servicos" ON public.grupos_servicos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete grupos_servicos" ON public.grupos_servicos FOR DELETE TO authenticated USING (true);

CREATE TABLE public.grupos_servicos_servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grupo_id UUID NOT NULL REFERENCES public.grupos_servicos(id) ON DELETE CASCADE,
  servico_id UUID NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(grupo_id, servico_id)
);

ALTER TABLE public.grupos_servicos_servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select grupos_servicos_servicos" ON public.grupos_servicos_servicos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert grupos_servicos_servicos" ON public.grupos_servicos_servicos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete grupos_servicos_servicos" ON public.grupos_servicos_servicos FOR DELETE TO authenticated USING (true);
