
-- 1) Versionamento de metodologia em orcamentos
ALTER TABLE orcamentos
  ADD COLUMN IF NOT EXISTS metodologia_calculo_versao text NOT NULL DEFAULT 'v1_legado';

-- 2) Metodologia BDI
DO $$ BEGIN
  CREATE TYPE bdi_metodologia AS ENUM ('simplificado', 'tcu_2622');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE parametros_bdi
  ADD COLUMN IF NOT EXISTS metodologia bdi_metodologia NOT NULL DEFAULT 'simplificado';

-- 3) Código TCU nos componentes de BDI
ALTER TABLE parametros_bdi_componentes
  ADD COLUMN IF NOT EXISTS codigo_tcu text
    CHECK (codigo_tcu IS NULL OR codigo_tcu IN
      ('AC','S','G','R','DF','L','IT_PIS','IT_COFINS','IT_ISS','IT_IRPJ','IT_CSLL','OUTRO'));

-- 4) Regime tributário em oportunidades
DO $$ BEGIN
  CREATE TYPE regime_tributario_especial AS ENUM
    ('padrao','reidi','simples_nacional','mei','isento_municipio');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE oportunidades
  ADD COLUMN IF NOT EXISTS regime_tributario regime_tributario_especial NOT NULL DEFAULT 'padrao';

-- 5) Flags de aplicabilidade nos tributos
ALTER TABLE parametros_tributos
  ADD COLUMN IF NOT EXISTS aplicavel_reidi boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aplicavel_simples boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aplicavel_mei boolean NOT NULL DEFAULT false;

UPDATE parametros_tributos SET aplicavel_reidi = true
  WHERE upper(coalesce(sigla, nome)) IN ('PIS','COFINS');

-- 6) Tipo de grupo nos encargos sociais + seed padrão CLT
ALTER TABLE encargos_sociais
  ADD COLUMN IF NOT EXISTS tipo_grupo text DEFAULT 'outros'
    CHECK (tipo_grupo IN ('previdenciario','salarial','rescisorio','beneficio','outros'));

INSERT INTO encargos_sociais (nome, percentual, ativo, tipo_grupo, descricao)
SELECT * FROM (VALUES
  ('INSS Empregador', 20.00, true, 'previdenciario', 'Contribuição patronal 20%'),
  ('SAT/RAT', 2.00, true, 'previdenciario', 'Médio 1-3% por CNAE'),
  ('Terceiros (Sistema S)', 5.80, true, 'previdenciario', 'INCRA+SEBRAE+SESI+SENAI+SE'),
  ('FGTS', 8.00, true, 'previdenciario', 'Mensal'),
  ('Multa rescisória FGTS', 4.00, true, 'rescisorio', 'Provisão 4% baseada em turnover'),
  ('13º salário', 8.33, true, 'salarial', '1/12'),
  ('Férias + 1/3', 11.11, true, 'salarial', '1/12 + 1/36'),
  ('INSS sobre 13º', 1.67, true, 'previdenciario', '20% × 8,33%'),
  ('FGTS sobre 13º', 0.67, true, 'previdenciario', '8% × 8,33%'),
  ('INSS sobre Férias', 2.22, true, 'previdenciario', '20% × 11,11%'),
  ('FGTS sobre Férias', 0.89, true, 'previdenciario', '8% × 11,11%'),
  ('Aviso prévio', 0.92, true, 'rescisorio', 'Provisão')
) AS novos(nome, percentual, ativo, tipo_grupo, descricao)
WHERE NOT EXISTS (SELECT 1 FROM encargos_sociais e WHERE e.nome = novos.nome);

-- 7) Parâmetros logísticos regionais
CREATE TABLE IF NOT EXISTS parametros_logistica_regional (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uf char(2) NOT NULL,
  bioma text NOT NULL CHECK (bioma IN
    ('amazonia','cerrado','caatinga','mata_atlantica','pampa','pantanal','urbano')),
  fator_rota_rodovia_federal numeric(4,2) NOT NULL DEFAULT 1.30,
  fator_rota_rodovia_estadual numeric(4,2) NOT NULL DEFAULT 1.45,
  fator_rota_vicinal_pavimentada numeric(4,2) NOT NULL DEFAULT 1.60,
  fator_rota_vicinal_nao_pavimentada numeric(4,2) NOT NULL DEFAULT 1.80,
  velocidade_media_kmh integer NOT NULL DEFAULT 80,
  fator_chuva_produtividade numeric(4,2) NOT NULL DEFAULT 0.50,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (uf, bioma)
);

ALTER TABLE parametros_logistica_regional ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plr_sel ON parametros_logistica_regional;
CREATE POLICY plr_sel ON parametros_logistica_regional FOR SELECT TO authenticated
  USING (can_view_app_data());
DROP POLICY IF EXISTS plr_ins ON parametros_logistica_regional;
CREATE POLICY plr_ins ON parametros_logistica_regional FOR INSERT TO authenticated
  WITH CHECK (can_edit_parametros());
DROP POLICY IF EXISTS plr_upd ON parametros_logistica_regional;
CREATE POLICY plr_upd ON parametros_logistica_regional FOR UPDATE TO authenticated
  USING (can_edit_parametros()) WITH CHECK (can_edit_parametros());
DROP POLICY IF EXISTS plr_del ON parametros_logistica_regional;
CREATE POLICY plr_del ON parametros_logistica_regional FOR DELETE TO authenticated
  USING (is_admin());

INSERT INTO parametros_logistica_regional (uf, bioma, fator_rota_rodovia_federal,
  fator_rota_rodovia_estadual, fator_rota_vicinal_pavimentada,
  fator_rota_vicinal_nao_pavimentada, velocidade_media_kmh, fator_chuva_produtividade)
VALUES
  ('AM','amazonia',1.30,1.50,1.80,2.20,60,0.30),
  ('AC','amazonia',1.30,1.50,1.80,2.20,60,0.30),
  ('RR','amazonia',1.30,1.50,1.80,2.20,60,0.30),
  ('RO','amazonia',1.30,1.50,1.80,2.20,65,0.35),
  ('PA','amazonia',1.30,1.50,1.80,2.20,65,0.35),
  ('AP','amazonia',1.30,1.50,1.80,2.20,60,0.35),
  ('TO','amazonia',1.30,1.45,1.65,1.95,75,0.35),
  ('GO','cerrado',1.25,1.40,1.55,1.75,85,0.50),
  ('MT','cerrado',1.30,1.45,1.65,1.85,80,0.50),
  ('MS','cerrado',1.30,1.45,1.60,1.80,80,0.50),
  ('DF','cerrado',1.25,1.35,1.45,1.60,90,0.50),
  ('MG','cerrado',1.30,1.45,1.60,1.80,80,0.55),
  ('BA','cerrado',1.30,1.45,1.60,1.85,75,0.50),
  ('PE','caatinga',1.30,1.45,1.55,1.70,80,0.30),
  ('CE','caatinga',1.30,1.45,1.55,1.70,80,0.30),
  ('PB','caatinga',1.30,1.45,1.55,1.70,80,0.30),
  ('RN','caatinga',1.30,1.45,1.55,1.70,80,0.30),
  ('AL','caatinga',1.30,1.45,1.55,1.70,80,0.35),
  ('SE','caatinga',1.30,1.45,1.55,1.70,80,0.35),
  ('PI','caatinga',1.30,1.45,1.60,1.80,75,0.30),
  ('MA','caatinga',1.30,1.45,1.65,1.85,75,0.40),
  ('SP','mata_atlantica',1.25,1.35,1.50,1.70,90,0.60),
  ('RJ','mata_atlantica',1.25,1.35,1.50,1.70,85,0.65),
  ('ES','mata_atlantica',1.30,1.40,1.55,1.75,80,0.60),
  ('PR','mata_atlantica',1.30,1.40,1.55,1.75,85,0.65),
  ('SC','mata_atlantica',1.30,1.40,1.55,1.75,80,0.70),
  ('RS','mata_atlantica',1.30,1.40,1.55,1.70,85,0.70)
ON CONFLICT (uf, bioma) DO NOTHING;
