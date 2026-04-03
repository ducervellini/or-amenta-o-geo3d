import { CrudPage } from "@/components/crud/CrudPage";

export default function ParametrosAdminCentral() {
  return (
    <CrudPage
      table="parametros_admin_central"
      title="Administração Central"
      subtitle="Parâmetros de custos de administração central"
      searchField="nome"
      columns={[
        { key: "nome", label: "Parâmetro", render: (v) => <span className="font-medium">{String(v)}</span> },
        { key: "percentual", label: "Percentual", render: (v) => `${Number(v).toFixed(2)}%` },
        { key: "descricao", label: "Descrição" },
      ]}
      formFields={[
        { name: "nome", label: "Nome", type: "text", required: true },
        { name: "percentual", label: "Percentual (%)", type: "number", step: "0.01", required: true },
        { name: "descricao", label: "Descrição", type: "textarea" },
      ]}
    />
  );
}
