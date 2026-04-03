import { CrudPage } from "@/components/crud/CrudPage";
import { useSupabaseQuery } from "@/hooks/useSupabaseCrud";

export default function Modulos() {
  const { data: mercados } = useSupabaseQuery("mercados");

  return (
    <CrudPage
      table="modulos"
      title="Módulos"
      subtitle="Cadastro de módulos de serviço (Topografia, Sondagem, etc.)"
      searchField="nome"
      columns={[
        { key: "nome", label: "Nome", render: (v) => <span className="font-medium">{String(v)}</span> },
        {
          key: "mercado_id",
          label: "Mercado",
          render: (v) => {
            const m = mercados?.find((m) => m.id === v);
            return (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                {m ? String(m.nome) : "-"}
              </span>
            );
          },
        },
        { key: "descricao", label: "Descrição" },
        {
          key: "ativo",
          label: "Status",
          render: (v) => (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${v ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
              {v ? "Ativo" : "Inativo"}
            </span>
          ),
        },
      ]}
      formFields={[
        { name: "nome", label: "Nome", type: "text", required: true, placeholder: "Ex: Topografia" },
        {
          name: "mercado_id",
          label: "Mercado",
          type: "select",
          required: true,
          options: (mercados || []).map((m) => ({ label: String(m.nome), value: String(m.id) })),
        },
        { name: "descricao", label: "Descrição", type: "textarea" },
      ]}
    />
  );
}
