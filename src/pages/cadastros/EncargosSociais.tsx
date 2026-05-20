import { useState } from "react";
import { CrudPage } from "@/components/crud/CrudPage";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Pacote padrão CLT — referência consolidada de encargos sociais e trabalhistas
 * usada como semente em Cargos com regime CLT. Alinhado ao seed da migration
 * (Prompt A da Fase 1 BDI/CCU): mesmos nomes/percentuais/tipo_grupo, idempotente
 * via `WHERE nome NOT EXISTS`.
 */
const PACOTE_CLT_PADRAO: Array<{ nome: string; percentual: number; grupo: string; tipo_grupo: string; obrigatorio: boolean; descricao: string }> = [
  { nome: "INSS Patronal", percentual: 20.00, grupo: "A", tipo_grupo: "previdenciario", obrigatorio: true, descricao: "Contribuição previdenciária patronal" },
  { nome: "FGTS", percentual: 8.00, grupo: "A", tipo_grupo: "previdenciario", obrigatorio: true, descricao: "Fundo de Garantia por Tempo de Serviço" },
  { nome: "SAT/RAT", percentual: 3.00, grupo: "A", tipo_grupo: "previdenciario", obrigatorio: true, descricao: "Seguro Acidente de Trabalho (média)" },
  { nome: "Salário Educação", percentual: 2.50, grupo: "A", tipo_grupo: "previdenciario", obrigatorio: true, descricao: "Contribuição compulsória ao FNDE" },
  { nome: "SESI/SENAI/SEBRAE/INCRA", percentual: 3.30, grupo: "A", tipo_grupo: "previdenciario", obrigatorio: true, descricao: "Sistema S" },
  { nome: "13º Salário", percentual: 8.33, grupo: "B", tipo_grupo: "salarial", obrigatorio: true, descricao: "Gratificação natalina (1/12)" },
  { nome: "Férias + 1/3", percentual: 11.11, grupo: "B", tipo_grupo: "salarial", obrigatorio: true, descricao: "Provisão de férias com adicional constitucional" },
  { nome: "Aviso Prévio Trabalhado", percentual: 1.94, grupo: "C", tipo_grupo: "rescisorio", obrigatorio: true, descricao: "Provisão de aviso prévio" },
  { nome: "Multa FGTS 40%", percentual: 3.20, grupo: "C", tipo_grupo: "rescisorio", obrigatorio: true, descricao: "Multa rescisória sobre o FGTS" },
  { nome: "Incidência INSS/FGTS sobre 13º e Férias", percentual: 7.39, grupo: "D", tipo_grupo: "previdenciario", obrigatorio: true, descricao: "Reflexos previdenciários" },
  { nome: "Vale Transporte", percentual: 6.00, grupo: "E", tipo_grupo: "beneficio", obrigatorio: false, descricao: "Provisão referencial de VT (descontado 6% do salário)" },
  { nome: "Vale Alimentação/Refeição", percentual: 10.00, grupo: "E", tipo_grupo: "beneficio", obrigatorio: false, descricao: "Benefício referencial conforme CCT" },
  { nome: "Assistência Médica", percentual: 5.00, grupo: "E", tipo_grupo: "beneficio", obrigatorio: false, descricao: "Plano de saúde referencial" },
];

function AplicarPacoteCLTButton() {
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const handleApply = async () => {
    setLoading(true);
    try {
      const { data: existing, error: selErr } = await (supabase.from as any)("encargos_sociais")
        .select("nome")
        .eq("ativo", true);
      if (selErr) throw selErr;
      const existingNames = new Set((existing || []).map((e: any) => String(e.nome).toLowerCase()));
      const toInsert = PACOTE_CLT_PADRAO.filter((e) => !existingNames.has(e.nome.toLowerCase()));

      if (toInsert.length === 0) {
        toast.info("Pacote CLT já está completo — nenhum encargo novo para inserir.");
      } else {
        const { error: insErr } = await (supabase.from as any)("encargos_sociais").insert(
          toInsert.map((e) => ({ ...e, ativo: true }))
        );
        if (insErr) throw insErr;
        toast.success(`${toInsert.length} encargo(s) padrão CLT adicionado(s).`);
        qc.invalidateQueries({ queryKey: ["encargos_sociais"] });
      }
    } catch (e: any) {
      toast.error(e.message || "Falha ao aplicar pacote CLT");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-end px-6 pt-4 -mb-2">
      <Button variant="outline" size="sm" className="gap-2" onClick={handleApply} disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        Aplicar pacote padrão CLT
      </Button>
    </div>
  );
}

export default function EncargosSociais() {
  return (
    <>
      <AplicarPacoteCLTButton />
      <CrudPage
        table="encargos_sociais"
        title="Encargos Sociais"
        subtitle="Cadastro de encargos sociais e trabalhistas"
        searchField="nome"
        columns={[
          { key: "nome", label: "Encargo", render: (v) => <span className="font-medium">{String(v)}</span> },
          { key: "percentual", label: "Percentual (%)", render: (v) => `${Number(v).toFixed(2)}%` },
          { key: "grupo", label: "Grupo" },
          { key: "tipo_grupo", label: "Tipo", render: (v) => v ? String(v) : "—" },
          { key: "obrigatorio", label: "Obrigatório", render: (v) => v ? "Sim" : "Não" },
          { key: "descricao", label: "Descrição" },
        ]}
        formFields={[
          { name: "nome", label: "Nome", type: "text", required: true, placeholder: "INSS" },
          { name: "percentual", label: "Percentual (%)", type: "number", required: true, step: "0.01" },
          { name: "grupo", label: "Grupo", type: "text", placeholder: "Grupo A, B, C, D..." },
          {
            name: "tipo_grupo",
            label: "Tipo de Grupo",
            type: "select",
            options: [
              { value: "previdenciario", label: "Previdenciário (Grupo A)" },
              { value: "salarial", label: "Salarial (Grupo B)" },
              { value: "rescisorio", label: "Rescisório (Grupo C)" },
              { value: "beneficio", label: "Benefício (Grupo E)" },
              { value: "outros", label: "Outros / Reflexos (Grupo D)" },
            ],
          },
          { name: "obrigatorio", label: "Obrigatório", type: "checkbox" },
          { name: "descricao", label: "Descrição", type: "textarea" },
        ]}
      />
    </>
  );
}
