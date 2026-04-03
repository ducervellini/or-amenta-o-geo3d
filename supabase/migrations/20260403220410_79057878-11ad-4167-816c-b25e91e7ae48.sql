
CREATE TABLE public.modulos_areas_empresa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modulo_id UUID NOT NULL REFERENCES public.modulos(id) ON DELETE CASCADE,
  area_empresa_id UUID NOT NULL REFERENCES public.areas_empresa(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(modulo_id, area_empresa_id)
);

ALTER TABLE public.modulos_areas_empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select modulos_areas_empresa" ON public.modulos_areas_empresa FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert modulos_areas_empresa" ON public.modulos_areas_empresa FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete modulos_areas_empresa" ON public.modulos_areas_empresa FOR DELETE TO authenticated USING (true);
