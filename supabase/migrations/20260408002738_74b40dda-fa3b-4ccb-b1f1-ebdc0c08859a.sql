
CREATE TABLE public.row_ordering (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela text NOT NULL,
  registro_id uuid,
  posicao integer NOT NULL DEFAULT 0,
  subtitulo text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_row_ordering_lookup ON public.row_ordering (user_id, tabela);

ALTER TABLE public.row_ordering ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own row_ordering"
  ON public.row_ordering FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own row_ordering"
  ON public.row_ordering FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own row_ordering"
  ON public.row_ordering FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own row_ordering"
  ON public.row_ordering FOR DELETE TO authenticated
  USING (user_id = auth.uid());
