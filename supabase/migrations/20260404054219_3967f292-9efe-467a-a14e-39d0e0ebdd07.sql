
CREATE TABLE public.orcamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  oportunidade_id UUID NOT NULL REFERENCES public.oportunidades(id) ON DELETE CASCADE,
  mobilizacao_id UUID REFERENCES public.mobilizacoes(id),
  bdi_id UUID REFERENCES public.parametros_bdi(id),
  custo_servicos NUMERIC NOT NULL DEFAULT 0,
  custo_adm_local NUMERIC NOT NULL DEFAULT 0,
  custo_total NUMERIC NOT NULL DEFAULT 0,
  bdi_percentual NUMERIC NOT NULL DEFAULT 0,
  preco_total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'rascunho',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.orcamento_itens_servico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  composicao_id UUID NOT NULL REFERENCES public.composicoes(id),
  quantidade NUMERIC NOT NULL DEFAULT 1,
  custo_unitario NUMERIC NOT NULL DEFAULT 0,
  custo_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento_itens_servico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select orcamentos" ON public.orcamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert orcamentos" ON public.orcamentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update orcamentos" ON public.orcamentos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete orcamentos" ON public.orcamentos FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can select orcamento_itens_servico" ON public.orcamento_itens_servico FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert orcamento_itens_servico" ON public.orcamento_itens_servico FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update orcamento_itens_servico" ON public.orcamento_itens_servico FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete orcamento_itens_servico" ON public.orcamento_itens_servico FOR DELETE TO authenticated USING (true);
