
CREATE TABLE public.custos_admin_local (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'equipe',
  subcategoria TEXT,
  valor_diaria NUMERIC NOT NULL DEFAULT 0,
  valor_mensal NUMERIC NOT NULL DEFAULT 0,
  tipo_cobranca TEXT NOT NULL DEFAULT 'mensal',
  quantidade INTEGER NOT NULL DEFAULT 1,
  unidade TEXT NOT NULL DEFAULT 'un',
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.custos_admin_local ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select custos_admin_local" ON public.custos_admin_local FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert custos_admin_local" ON public.custos_admin_local FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update custos_admin_local" ON public.custos_admin_local FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete custos_admin_local" ON public.custos_admin_local FOR DELETE TO authenticated USING (true);
