
CREATE TABLE public.areas_empresa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.areas_empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select areas_empresa" ON public.areas_empresa FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert areas_empresa" ON public.areas_empresa FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update areas_empresa" ON public.areas_empresa FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete areas_empresa" ON public.areas_empresa FOR DELETE TO authenticated USING (true);
