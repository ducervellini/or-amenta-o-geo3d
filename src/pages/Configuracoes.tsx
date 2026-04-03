import { Settings, Users, Database, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Configuracoes() {
  return (
    <div className="page-container animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title">Configurações</h1>
        <p className="page-subtitle">Gerenciamento do sistema e perfis de acesso</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
    </div>
  );
}
