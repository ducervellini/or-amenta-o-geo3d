-- Cronograma de execução dos serviços do orçamento (Frente D)
-- Cada linha corresponde a um item de serviço do orçamento, guardando apenas
-- os overrides do usuário (número de equipes, data início customizada, ordem
-- explícita). Duração, datas calculadas e split campo/escritório são derivados
-- pelo frontend a partir de produtividade × quantidade × jornada.

CREATE TABLE IF NOT EXISTS public.orcamento_cronograma_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID NOT NULL,
  composicao_id UUID NOT NULL,
  num_equipes INTEGER NOT NULL DEFAULT 1,
  data_inicio_override DATE,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID,
  UNIQUE (orcamento_id, composicao_id)
);

CREATE INDEX IF NOT EXISTS idx_cronograma_orcamento ON public.orcamento_cronograma_itens(orcamento_id) WHERE deleted_at IS NULL;

ALTER TABLE public.orcamento_cronograma_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cronograma_sel" ON public.orcamento_cronograma_itens
  FOR SELECT TO authenticated USING (can_view_app_data());

CREATE POLICY "cronograma_ins" ON public.orcamento_cronograma_itens
  FOR INSERT TO authenticated WITH CHECK (can_edit_orcamentos());

CREATE POLICY "cronograma_upd" ON public.orcamento_cronograma_itens
  FOR UPDATE TO authenticated
  USING (is_app_active_user() AND (has_any_role(ARRAY['gerente'::app_role, 'admin'::app_role]) OR (created_by = auth.uid())))
  WITH CHECK (is_app_active_user() AND (has_any_role(ARRAY['gerente'::app_role, 'admin'::app_role]) OR (created_by = auth.uid())));

CREATE POLICY "cronograma_del" ON public.orcamento_cronograma_itens
  FOR DELETE TO authenticated USING (is_admin());

CREATE TRIGGER set_cronograma_audit
  BEFORE INSERT OR UPDATE ON public.orcamento_cronograma_itens
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_columns();

CREATE TRIGGER update_cronograma_updated_at
  BEFORE UPDATE ON public.orcamento_cronograma_itens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();