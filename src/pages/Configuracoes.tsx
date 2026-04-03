import { Settings, Users, Database, Shield, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

const perfilDescricoes: Record<string, string> = {
  admin: "Acesso total ao sistema",
  diretor: "Visão estratégica e aprovação de orçamentos",
  gerente: "Gestão de equipes e orçamentos",
  engenheiro: "Composições técnicas e cálculos",
  orcamentista: "Elaboração e edição de orçamentos",
  consultor_tecnico: "Consultoria e revisão técnica",
  visualizador: "Acesso somente leitura",
};

export default function Configuracoes() {
  const { roles } = useAuth();

  return (
    <div className="page-container animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title">Configurações</h1>
        <p className="page-subtitle">Gerenciamento do sistema e perfis de acesso</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          {
            icon: Users,
            title: "Usuários e Perfis",
            desc: "Gerenciar usuários, perfis de acesso e permissões do sistema",
            action: "Gerenciar",
          },
          {
            icon: Database,
            title: "Bases de Referência",
            desc: "Configurar bases de preço (SINAPI, SICRO, própria) e períodos de referência",
            action: "Configurar",
          },
          {
            icon: Shield,
            title: "Segurança",
            desc: "Políticas de senha, autenticação e logs de auditoria",
            action: "Acessar",
          },
          {
            icon: Settings,
            title: "Parâmetros Gerais",
            desc: "Unidades, moeda, formato de números e configurações regionais",
            action: "Editar",
          },
          {
            icon: History,
            title: "Auditoria",
            desc: "Trilha de auditoria, histórico de revisões e log de alterações do sistema",
            action: "Visualizar",
          },
        ].map((card) => (
          <div
            key={card.title}
            className="bg-card rounded-lg border shadow-sm p-6 flex flex-col"
          >
            <card.icon className="w-8 h-8 text-accent mb-4" />
            <h3 className="font-semibold mb-2">{card.title}</h3>
            <p className="text-sm text-muted-foreground flex-1 mb-4">
              {card.desc}
            </p>
            <Button variant="outline" className="w-full">
              {card.action}
            </Button>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" />
          Perfis do Sistema
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Object.entries(perfilDescricoes).map(([perfil, desc]) => (
            <div key={perfil} className="bg-muted/30 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant={roles.includes(perfil) ? "default" : "secondary"} className="text-xs capitalize">
                  {perfil.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Estrutura preparada para evolução futura com aprendizado baseado em histórico de orçamentos.
        </p>
      </div>
    </div>
  );
}
