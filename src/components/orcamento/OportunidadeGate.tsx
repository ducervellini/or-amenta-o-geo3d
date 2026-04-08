import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, ArrowRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface OportunidadeGateProps {
  children: (oportunidadeId: string, oportunidade: any) => React.ReactNode;
}

export function OportunidadeGate({ children }: OportunidadeGateProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const oportunidadeId = searchParams.get("oportunidade") || "";

  const { data: oportunidades } = useQuery({
    queryKey: ["gate-oportunidades"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("oportunidades")
        .select("id, codigo, descricao, cidade, estado, cliente_id, grupo_servicos_id, clientes(nome), grupos_servicos(nome)")
        .eq("ativo", true)
        .order("codigo");
      if (error) throw error;
      return data as any[];
    },
  });

  const oportunidade = oportunidades?.find((o: any) => o.id === oportunidadeId);

  // If we have a valid oportunidade, render children
  if (oportunidadeId && oportunidade) {
    return <>{children(oportunidadeId, oportunidade)}</>;
  }

  // Otherwise show opportunity selector
  const filtered = (oportunidades || []).filter(
    (o: any) =>
      o.codigo?.toLowerCase().includes(search.toLowerCase()) ||
      o.descricao?.toLowerCase().includes(search.toLowerCase()) ||
      o.clientes?.nome?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-3xl mx-auto">
      <div className="text-center space-y-2 pt-8">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Briefcase className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-lg font-bold">Selecione uma Oportunidade</h2>
        <p className="text-sm text-muted-foreground">
          Escolha a oportunidade para continuar com a orçamentação.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por código, descrição ou cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              {oportunidades?.length === 0
                ? "Nenhuma oportunidade cadastrada. Crie uma oportunidade primeiro."
                : "Nenhuma oportunidade encontrada com o filtro aplicado."}
            </CardContent>
          </Card>
        )}

        {filtered.map((op: any) => (
          <Card
            key={op.id}
            className="cursor-pointer hover:border-primary/50 transition-colors group"
            onClick={() => setSearchParams({ oportunidade: op.id })}
          >
            <CardContent className="py-3 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-primary">{op.codigo}</span>
                  <span className="text-sm font-medium truncate">{op.descricao}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {op.clientes?.nome && <span>{op.clientes.nome}</span>}
                  {op.cidade && <span>{op.cidade}/{op.estado}</span>}
                  {op.grupos_servicos?.nome && (
                    <Badge variant="outline" className="text-[10px]">{op.grupos_servicos.nome}</Badge>
                  )}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Button variant="outline" size="sm" onClick={() => navigate("/oportunidades")}>
          Gerenciar Oportunidades
        </Button>
      </div>
    </div>
  );
}
