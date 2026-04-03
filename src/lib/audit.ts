import { supabase } from "@/integrations/supabase/client";

export async function registrarAuditoria(
  tabela: string,
  registroId: string,
  acao: "criar" | "editar" | "excluir" | "aprovar" | "travar" | "duplicar" | "cenario",
  dadosAnteriores?: Record<string, unknown> | null,
  dadosNovos?: Record<string, unknown> | null
) {
  const { data: { user } } = await supabase.auth.getUser();
  await (supabase.from as any)("audit_log").insert({
    tabela,
    registro_id: registroId,
    acao,
    dados_anteriores: dadosAnteriores || null,
    dados_novos: dadosNovos || null,
    user_id: user?.id || null,
  });
}

export async function salvarRevisao(
  composicaoId: string,
  dados: Record<string, unknown>,
  observacao?: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  
  // Get next version number
  const { data: lastRev } = await (supabase.from as any)("orcamento_revisoes")
    .select("versao")
    .eq("composicao_id", composicaoId)
    .order("versao", { ascending: false })
    .limit(1)
    .single();

  const versao = (lastRev?.versao || 0) + 1;

  return (supabase.from as any)("orcamento_revisoes").insert({
    composicao_id: composicaoId,
    versao,
    dados,
    observacao,
    user_id: user?.id || null,
  }).select().single();
}

export async function salvarCenario(
  composicaoId: string,
  nome: string,
  dados: Record<string, unknown>,
  descricao?: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  return (supabase.from as any)("orcamento_cenarios").insert({
    composicao_id: composicaoId,
    nome,
    descricao,
    dados,
    user_id: user?.id || null,
  }).select().single();
}
