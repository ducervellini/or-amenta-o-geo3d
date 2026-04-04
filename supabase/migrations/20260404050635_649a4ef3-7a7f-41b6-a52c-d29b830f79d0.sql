
-- Table: clientes
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  contato_nome TEXT,
  contato_cargo TEXT,
  contato_email TEXT,
  contato_telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select clientes" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert clientes" ON public.clientes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update clientes" ON public.clientes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete clientes" ON public.clientes FOR DELETE TO authenticated USING (true);

-- Table: oportunidades
CREATE TABLE public.oportunidades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  cidade TEXT,
  estado TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.oportunidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select oportunidades" ON public.oportunidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert oportunidades" ON public.oportunidades FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update oportunidades" ON public.oportunidades FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete oportunidades" ON public.oportunidades FOR DELETE TO authenticated USING (true);
