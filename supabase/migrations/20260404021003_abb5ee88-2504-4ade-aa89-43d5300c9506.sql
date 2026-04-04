
-- Mobilização e Administração Local
CREATE TABLE public.mobilizacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  -- Local do projeto
  municipio TEXT,
  estado TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  arquivo_geo TEXT, -- nome do arquivo KMZ/SHP se enviado
  -- Ponto inicial (base)
  base_endereco TEXT,
  base_latitude NUMERIC,
  base_longitude NUMERIC,
  -- Parâmetros operacionais
  dias_trabalho INTEGER NOT NULL DEFAULT 30,
  jornada_diaria NUMERIC NOT NULL DEFAULT 8,
  -- Parâmetros climáticos
  dias_chuva_mes NUMERIC NOT NULL DEFAULT 5,
  fator_improdutividade NUMERIC NOT NULL DEFAULT 0.15,
  -- Distâncias calculadas
  distancia_base_projeto NUMERIC NOT NULL DEFAULT 0,
  distancia_media_diaria NUMERIC NOT NULL DEFAULT 0,
  municipios_considerados JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Resultados
  dias_produtivos NUMERIC NOT NULL DEFAULT 0,
  dias_improdutivos NUMERIC NOT NULL DEFAULT 0,
  custo_total NUMERIC NOT NULL DEFAULT 0,
  custo_por_dia NUMERIC NOT NULL DEFAULT 0,
  custo_por_equipe NUMERIC NOT NULL DEFAULT 0,
  -- Vínculo
  orcamento_id UUID,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Itens de custo da mobilização
CREATE TABLE public.mobilizacao_custos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mobilizacao_id UUID NOT NULL REFERENCES public.mobilizacoes(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL DEFAULT 'hospedagem',
  -- hospedagem, alimentacao, combustivel, veiculo, pedagio, viagem_avulsa
  descricao TEXT,
  -- Valores
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  quantidade NUMERIC NOT NULL DEFAULT 1,
  frequencia TEXT NOT NULL DEFAULT 'diario',
  -- diario, viagem, mensal, unico
  -- Combustível específico
  consumo_km NUMERIC,
  preco_litro NUMERIC,
  -- Veículo específico
  tipo_propriedade TEXT, -- proprio, alugado
  valor_aluguel NUMERIC,
  -- Calculados
  custo_total NUMERIC NOT NULL DEFAULT 0,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Equipes na mobilização
CREATE TABLE public.mobilizacao_equipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mobilizacao_id UUID NOT NULL REFERENCES public.mobilizacoes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  quantidade_pessoas INTEGER NOT NULL DEFAULT 1,
  cargo_id UUID REFERENCES public.cargos(id),
  custo_deslocamento NUMERIC NOT NULL DEFAULT 0,
  custo_hospedagem NUMERIC NOT NULL DEFAULT 0,
  custo_alimentacao NUMERIC NOT NULL DEFAULT 0,
  custo_total NUMERIC NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.mobilizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobilizacao_custos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobilizacao_equipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select mobilizacoes" ON public.mobilizacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert mobilizacoes" ON public.mobilizacoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update mobilizacoes" ON public.mobilizacoes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete mobilizacoes" ON public.mobilizacoes FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can select mobilizacao_custos" ON public.mobilizacao_custos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert mobilizacao_custos" ON public.mobilizacao_custos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update mobilizacao_custos" ON public.mobilizacao_custos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete mobilizacao_custos" ON public.mobilizacao_custos FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can select mobilizacao_equipes" ON public.mobilizacao_equipes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert mobilizacao_equipes" ON public.mobilizacao_equipes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update mobilizacao_equipes" ON public.mobilizacao_equipes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete mobilizacao_equipes" ON public.mobilizacao_equipes FOR DELETE TO authenticated USING (true);
