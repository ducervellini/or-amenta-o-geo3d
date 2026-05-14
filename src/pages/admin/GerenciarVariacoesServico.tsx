/**
 * GerenciarVariacoesServico — CRUD de variações para cada serviço.
 *
 * Tela típica: lista serviços → seleciona um → mostra/edita variações.
 */
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Star } from "lucide-react";
import {
  useServicoVariacoes,
  useVariacaoMutations,
  type ServicoVariacaoTipo,
  type ServicoVariacao,
} from "@/hooks/useOrcamentoTemplates";
import { toast } from "sonner";

export default function GerenciarVariacoesServico() {
  const { canEditMestres, loading } = useAuth();
  const [servicoSelId, setServicoSelId] = useState<string | null>(null);

  const { data: servicos } = useQuery({
    queryKey: ["servicos_ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servicos")
        .select("id, codigo, nome")
        .is("deleted_at", null)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  if (loading) {
    return <Loader2 className="w-6 h-6 animate-spin mx-auto m-8" />;
  }
  if (!canEditMestres) return <Navigate to="/" replace />;

  return (
    <div className="page-container animate-fade-in">
      <h1 className="page-title">Variações de Serviço</h1>
      <p className="page-subtitle">
        Cada serviço pode ter múltiplas variações: por escopo (CCU diferente) ou por
        complexidade (multiplicador de custo).
      </p>

      <div className="grid grid-cols-12 gap-4 mt-6">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="text-sm">Serviços</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {(servicos ?? []).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setServicoSelId(s.id)}
                className={`w-full text-left p-2 rounded text-sm transition ${
                  servicoSelId === s.id ? "bg-primary/10 border border-primary" : "hover:bg-muted"
                }`}
              >
                <div className="font-medium">{s.nome}</div>
                <div className="text-xs text-muted-foreground">{s.codigo}</div>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="col-span-8">
          {servicoSelId ? (
            <PainelVariacoes servicoId={servicoSelId} />
          ) : (
            <Card>
              <CardContent className="text-center text-muted-foreground italic py-12 text-sm">
                Selecione um serviço à esquerda
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function PainelVariacoes({ servicoId }: { servicoId: string }) {
  const { data: variacoes, isLoading } = useServicoVariacoes(servicoId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Variações</CardTitle>
          <CardDescription>
            Recomendado: pelo menos 3 variações (ex: simples, intermediária, completa).
          </CardDescription>
        </div>
        <NovaVariacaoDialog servicoId={servicoId} />
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {variacoes && variacoes.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            Nenhuma variação cadastrada. Comece criando a versão "padrão".
          </p>
        )}
        {(variacoes ?? []).map((v) => (
          <ItemVariacao key={v.id} variacao={v} />
        ))}
      </CardContent>
    </Card>
  );
}

function ItemVariacao({ variacao }: { variacao: ServicoVariacao }) {
  const { atualizar, remover } = useVariacaoMutations();

  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{variacao.nome}</span>
            {variacao.is_default && (
              <Badge variant="default" className="text-xs">
                <Star className="w-3 h-3 mr-0.5" />
                Padrão
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {variacao.tipo === "escopo" ? "Escopo (CCU própria)" : "Complexidade (× custo)"}
            </Badge>
            {variacao.tipo === "complexidade" && (
              <Badge variant="secondary" className="text-xs">
                × {variacao.multiplicador_custo}
              </Badge>
            )}
          </div>
          {variacao.descricao_diferenca && (
            <p className="text-xs text-muted-foreground mt-1">
              {variacao.descricao_diferenca}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          {!variacao.is_default && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                atualizar.mutate({
                  id: variacao.id,
                  updates: { is_default: true },
                })
              }
              title="Marcar como padrão"
            >
              <Star className="w-3 h-3" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => {
              if (confirm(`Remover variação "${variacao.nome}"?`)) {
                remover.mutate(variacao.id);
              }
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function NovaVariacaoDialog({ servicoId }: { servicoId: string }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<ServicoVariacaoTipo>("escopo");
  const [descricao, setDescricao] = useState("");
  const [multiplicador, setMultiplicador] = useState("1.0");
  const [composicaoId, setComposicaoId] = useState<string>("");

  const { criar } = useVariacaoMutations();

  const { data: composicoes } = useQuery({
    queryKey: ["composicoes_do_servico", servicoId],
    queryFn: async () => {
      const { data } = await supabase
        .from("composicoes")
        .select("id, codigo, nome")
        .eq("servico_id", servicoId)
        .is("deleted_at", null);
      return data ?? [];
    },
  });

  const submit = () => {
    if (!nome.trim()) {
      toast.error("Nome obrigatório");
      return;
    }
    const mult = parseFloat(multiplicador.replace(",", "."));
    if (tipo === "escopo" && !composicaoId) {
      toast.error("Selecione a composição (CCU) desta variação de escopo");
      return;
    }
    criar.mutate(
      {
        servico_id: servicoId,
        nome: nome.trim(),
        descricao_diferenca: descricao || null,
        tipo,
        composicao_id: tipo === "escopo" ? composicaoId : composicaoId || null,
        multiplicador_custo: tipo === "complexidade" ? mult : 1.0,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setNome("");
          setDescricao("");
          setMultiplicador("1.0");
          setComposicaoId("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Nova variação
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova variação</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Simples, Com avaliação, Em área remota"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label>Tipo</Label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={tipo === "escopo" ? "default" : "outline"}
                onClick={() => setTipo("escopo")}
                className="flex-1"
              >
                Escopo (CCU própria)
              </Button>
              <Button
                size="sm"
                variant={tipo === "complexidade" ? "default" : "outline"}
                onClick={() => setTipo("complexidade")}
                className="flex-1"
              >
                Complexidade (× custo)
              </Button>
            </div>
          </div>
          {tipo === "escopo" && (
            <div className="space-y-1">
              <Label>Composição (CCU) desta variação</Label>
              <select
                className="w-full p-2 rounded border bg-background"
                value={composicaoId}
                onChange={(e) => setComposicaoId(e.target.value)}
              >
                <option value="">— Selecionar —</option>
                {(composicoes ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} — {c.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
          {tipo === "complexidade" && (
            <div className="space-y-1">
              <Label>Multiplicador de custo</Label>
              <Input
                type="number"
                step="0.01"
                min="0.1"
                max="10"
                value={multiplicador}
                onChange={(e) => setMultiplicador(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Ex: 1.3 para 30% mais custoso, 0.8 para 20% mais barato
              </p>
            </div>
          )}
          <div className="space-y-1">
            <Label>Descrição da diferença (opcional)</Label>
            <Textarea
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="O que muda em relação às outras variações"
            />
          </div>
          <Button onClick={submit} disabled={criar.isPending} className="w-full">
            {criar.isPending ? "Salvando..." : "Criar variação"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
