import { CrudPage } from "@/components/crud/CrudPage";

export default function Mercados() {
  return (
    <CrudPage
      table="mercados"
      title="Mercados"
      subtitle="Cadastro de mercados de atuação (Energia, Rodovias, etc.)"
      searchField="nome"
      columns={[
        { key: "nome", label: "Nome", render: (v) => <span className="font-medium">{String(v)}</span> },
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
        { name: "nome", label: "Nome", type: "text", required: true, placeholder: "Ex: Energia" },
        { name: "descricao", label: "Descrição", type: "textarea", placeholder: "Descrição do mercado" },
      ]}
    />
  );
}
