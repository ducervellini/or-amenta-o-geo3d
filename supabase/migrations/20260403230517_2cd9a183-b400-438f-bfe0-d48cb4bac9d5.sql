
-- Equipamentos: novos campos
ALTER TABLE public.equipamentos
  ADD COLUMN IF NOT EXISTS valor_aquisicao numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_residual numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vida_util_horas numeric NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS tipo_propriedade text NOT NULL DEFAULT 'proprio',
  ADD COLUMN IF NOT EXISTS valor_aluguel_hora numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS manutencao_hora numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS combustivel_consumo_hora numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS combustivel_preco_litro numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS horas_produtivas_mes numeric NOT NULL DEFAULT 176,
  ADD COLUMN IF NOT EXISTS horas_improdutivas_mes numeric NOT NULL DEFAULT 0;

-- Veículos: novos campos
ALTER TABLE public.veiculos
  ADD COLUMN IF NOT EXISTS valor_aquisicao numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_residual numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vida_util_km numeric NOT NULL DEFAULT 300000,
  ADD COLUMN IF NOT EXISTS tipo_propriedade text NOT NULL DEFAULT 'proprio',
  ADD COLUMN IF NOT EXISTS valor_aluguel_mensal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS km_mensal_estimado numeric NOT NULL DEFAULT 3000,
  ADD COLUMN IF NOT EXISTS combustivel_consumo_km numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS combustivel_preco_litro numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seguro_mensal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pneus_valor numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pneus_vida_util_km numeric NOT NULL DEFAULT 50000,
  ADD COLUMN IF NOT EXISTS oleo_valor numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS oleo_troca_km numeric NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS manutencao_preventiva_mensal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lavagem_mensal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS horas_produtivas_mes numeric NOT NULL DEFAULT 176,
  ADD COLUMN IF NOT EXISTS horas_improdutivas_mes numeric NOT NULL DEFAULT 0;
