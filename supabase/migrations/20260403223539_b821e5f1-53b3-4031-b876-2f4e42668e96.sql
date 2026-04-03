
-- Audit log table
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela text NOT NULL,
  registro_id text,
  acao text NOT NULL,
  dados_anteriores jsonb,
  dados_novos jsonb,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view audit_log" ON public.audit_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert audit_log" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_audit_log_tabela ON public.audit_log (tabela);
CREATE INDEX idx_audit_log_registro ON public.audit_log (registro_id);
CREATE INDEX idx_audit_log_created ON public.audit_log (created_at DESC);
CREATE INDEX idx_audit_log_user ON public.audit_log (user_id);

-- Orcamento revisoes (version history)
CREATE TABLE public.orcamento_revisoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  composicao_id uuid NOT NULL REFERENCES public.composicoes(id) ON DELETE CASCADE,
  versao integer NOT NULL DEFAULT 1,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  observacao text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orcamento_revisoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view revisoes" ON public.orcamento_revisoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert revisoes" ON public.orcamento_revisoes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_revisoes_composicao ON public.orcamento_revisoes (composicao_id, versao DESC);

-- Cenarios for comparison
CREATE TABLE public.orcamento_cenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  composicao_id uuid NOT NULL REFERENCES public.composicoes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orcamento_cenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view cenarios" ON public.orcamento_cenarios
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert cenarios" ON public.orcamento_cenarios
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update cenarios" ON public.orcamento_cenarios
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete cenarios" ON public.orcamento_cenarios
  FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_cenarios_composicao ON public.orcamento_cenarios (composicao_id);

-- Add status/lock fields to composicoes
ALTER TABLE public.composicoes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'rascunho',
  ADD COLUMN IF NOT EXISTS travado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS aprovado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS aprovado_em timestamptz;

-- Future AI learning table (structure only, no logic yet)
CREATE TABLE public.historico_aprendizado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  referencia_id uuid,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  metricas jsonb DEFAULT '{}'::jsonb,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.historico_aprendizado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view historico" ON public.historico_aprendizado
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert historico" ON public.historico_aprendizado
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_historico_tipo ON public.historico_aprendizado (tipo);
CREATE INDEX idx_historico_tags ON public.historico_aprendizado USING GIN (tags);
