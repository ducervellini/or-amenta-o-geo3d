
ALTER TABLE public.cargos
  ADD COLUMN IF NOT EXISTS jornada_id uuid REFERENCES public.jornadas_trabalho(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS regime_id uuid REFERENCES public.regimes_operacionais(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS horario_almoco_id uuid REFERENCES public.horarios_almoco(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS encargos_selecionados jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS beneficios_selecionados jsonb NOT NULL DEFAULT '[]'::jsonb;
