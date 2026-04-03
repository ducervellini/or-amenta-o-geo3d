
-- Timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- HIERARQUIA: Mercado > Módulo > Serviço > Composição
-- =============================================

CREATE TABLE public.mercados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.modulos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mercado_id UUID REFERENCES public.mercados(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mercado_id UUID REFERENCES public.mercados(id) ON DELETE CASCADE NOT NULL,
  modulo_id UUID REFERENCES public.modulos(id) ON DELETE CASCADE NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  unidade_medicao TEXT NOT NULL DEFAULT 'un',
  tipo_geometria TEXT NOT NULL DEFAULT 'ponto' CHECK (tipo_geometria IN ('area', 'ponto', 'linha', 'hibrido')),
  produtividade_padrao NUMERIC(12,4),
  fatores_dificuldade JSONB DEFAULT '{}',
  premissas_padrao JSONB DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.composicoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servico_id UUID REFERENCES public.servicos(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  unidade TEXT NOT NULL DEFAULT 'un',
  custo_unitario_total NUMERIC(14,4) DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- CADASTROS DE MÃO DE OBRA
-- =============================================

CREATE TABLE public.cargos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  salario_base NUMERIC(12,2) NOT NULL DEFAULT 0,
  unidade_salarial TEXT NOT NULL DEFAULT 'mensal' CHECK (unidade_salarial IN ('mensal', 'hora', 'diaria')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.encargos_sociais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  percentual NUMERIC(8,4) NOT NULL DEFAULT 0,
  grupo TEXT NOT NULL DEFAULT 'geral',
  descricao TEXT,
  obrigatorio BOOLEAN NOT NULL DEFAULT true,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.beneficios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL DEFAULT 'fixo' CHECK (tipo IN ('fixo', 'percentual')),
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.jornadas_trabalho (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  horas_diarias NUMERIC(4,2) NOT NULL DEFAULT 8,
  dias_por_semana INTEGER NOT NULL DEFAULT 5,
  horas_por_mes NUMERIC(6,2) NOT NULL DEFAULT 176,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.regimes_operacionais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  dias_trabalho INTEGER NOT NULL,
  dias_folga INTEGER NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.horarios_almoco (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  hora_inicio TIME NOT NULL DEFAULT '12:00',
  hora_fim TIME NOT NULL DEFAULT '13:00',
  duracao_minutos INTEGER NOT NULL DEFAULT 60,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- CADASTROS DE INSUMOS
-- =============================================

CREATE TABLE public.equipamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  custo_hora_produtiva NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_hora_improdutiva NUMERIC(12,2) NOT NULL DEFAULT 0,
  depreciacao_hora NUMERIC(12,2) NOT NULL DEFAULT 0,
  potencia TEXT,
  unidade TEXT NOT NULL DEFAULT 'h',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.veiculos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  custo_km NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_hora NUMERIC(12,2) NOT NULL DEFAULT 0,
  manutencao_hora NUMERIC(12,2) NOT NULL DEFAULT 0,
  unidade TEXT NOT NULL DEFAULT 'h',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.materiais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'un',
  preco_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  fornecedor TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.combustiveis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'diesel' CHECK (tipo IN ('diesel', 'gasolina', 'etanol', 'gnv', 'eletrico', 'outro')),
  preco_litro NUMERIC(8,4) NOT NULL DEFAULT 0,
  unidade TEXT NOT NULL DEFAULT 'L',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- PARÂMETROS DE FORMAÇÃO DE PREÇO
-- =============================================

CREATE TABLE public.parametros_admin_local (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  percentual NUMERIC(8,4) NOT NULL DEFAULT 0,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.parametros_admin_central (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  percentual NUMERIC(8,4) NOT NULL DEFAULT 0,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.parametros_financiamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  percentual NUMERIC(8,4) NOT NULL DEFAULT 0,
  prazo_meses INTEGER DEFAULT 0,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.parametros_tributos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  sigla TEXT NOT NULL,
  percentual NUMERIC(8,4) NOT NULL DEFAULT 0,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.parametros_margem (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  percentual_minimo NUMERIC(8,4) NOT NULL DEFAULT 0,
  percentual_maximo NUMERIC(8,4) NOT NULL DEFAULT 0,
  percentual_padrao NUMERIC(8,4) NOT NULL DEFAULT 0,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.parametros_bdi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  componentes JSONB NOT NULL DEFAULT '{}',
  bdi_calculado NUMERIC(8,4) NOT NULL DEFAULT 0,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.parametros_dre (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  estrutura JSONB NOT NULL DEFAULT '{}',
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- ITENS DA COMPOSIÇÃO (insumos vinculados)
-- =============================================

CREATE TYPE public.tipo_insumo AS ENUM ('mao_de_obra', 'equipamento', 'veiculo', 'material', 'combustivel');

CREATE TABLE public.composicao_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  composicao_id UUID REFERENCES public.composicoes(id) ON DELETE CASCADE NOT NULL,
  tipo_insumo tipo_insumo NOT NULL,
  insumo_id UUID NOT NULL,
  quantidade NUMERIC(12,4) NOT NULL DEFAULT 1,
  coeficiente NUMERIC(12,6) NOT NULL DEFAULT 1,
  custo_unitario NUMERIC(14,4) NOT NULL DEFAULT 0,
  custo_total NUMERIC(14,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- RLS POLICIES (all tables, authenticated users)
-- =============================================

ALTER TABLE public.mercados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.composicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encargos_sociais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jornadas_trabalho ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regimes_operacionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios_almoco ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combustiveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parametros_admin_local ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parametros_admin_central ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parametros_financiamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parametros_tributos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parametros_margem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parametros_bdi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parametros_dre ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.composicao_itens ENABLE ROW LEVEL SECURITY;

-- Generic policies for all tables: authenticated users can do everything
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'mercados','modulos','servicos','composicoes','cargos','encargos_sociais',
    'beneficios','jornadas_trabalho','regimes_operacionais','horarios_almoco',
    'equipamentos','veiculos','materiais','combustiveis',
    'parametros_admin_local','parametros_admin_central','parametros_financiamento',
    'parametros_tributos','parametros_margem','parametros_bdi','parametros_dre',
    'composicao_itens'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "Authenticated users can select %1$s" ON public.%1$s FOR SELECT TO authenticated USING (true)', tbl);
    EXECUTE format('CREATE POLICY "Authenticated users can insert %1$s" ON public.%1$s FOR INSERT TO authenticated WITH CHECK (true)', tbl);
    EXECUTE format('CREATE POLICY "Authenticated users can update %1$s" ON public.%1$s FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', tbl);
    EXECUTE format('CREATE POLICY "Authenticated users can delete %1$s" ON public.%1$s FOR DELETE TO authenticated USING (true)', tbl);
  END LOOP;
END;
$$;

-- =============================================
-- TRIGGERS for updated_at
-- =============================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'mercados','modulos','servicos','composicoes','cargos','encargos_sociais',
    'beneficios','jornadas_trabalho','regimes_operacionais','horarios_almoco',
    'equipamentos','veiculos','materiais','combustiveis',
    'parametros_admin_local','parametros_admin_central','parametros_financiamento',
    'parametros_tributos','parametros_margem','parametros_bdi','parametros_dre',
    'composicao_itens'
  ])
  LOOP
    EXECUTE format('CREATE TRIGGER update_%1$s_updated_at BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', tbl);
  END LOOP;
END;
$$;

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_modulos_mercado ON public.modulos(mercado_id);
CREATE INDEX idx_servicos_mercado ON public.servicos(mercado_id);
CREATE INDEX idx_servicos_modulo ON public.servicos(modulo_id);
CREATE INDEX idx_composicoes_servico ON public.composicoes(servico_id);
CREATE INDEX idx_composicao_itens_composicao ON public.composicao_itens(composicao_id);
CREATE INDEX idx_composicao_itens_tipo ON public.composicao_itens(tipo_insumo);
