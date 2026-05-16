import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

/**
 * Mostrado nas páginas standalone (Custos, Mobilização, BDI) quando o
 * usuário chega via OrcamentoDetalhe (`?from=orcamento`). Permite voltar
 * mantendo o `?step=` correspondente.
 */
export function VoltarAoOrcamento({ step }: { step?: "servicos" | "adm-local" | "bdi-preco" }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const params = useParams();

  const from = searchParams.get("from");
  if (from !== "orcamento") return null;

  const opId = searchParams.get("oportunidade") || params.id;
  if (!opId) return null;

  const stepParam = step ? `?step=${step}` : "";
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-2 mb-4 flex items-center justify-between print:hidden">
      <div className="text-sm text-muted-foreground">
        Editando dados do orçamento. Suas alterações são salvas neste módulo e refletem no orçamento.
      </div>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 shrink-0"
        onClick={() => navigate(`/orcamentos/${opId}${stepParam}`)}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar ao orçamento
      </Button>
    </div>
  );
}
