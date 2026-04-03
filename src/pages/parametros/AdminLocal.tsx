import { CrudPage } from "@/components/crud/CrudPage";

const formatPercent = (v: unknown) => `${Number(v).toFixed(2)}%`;
const formatName = (v: unknown) => <span className="font-medium">{String(v)}</span>;

export default function ParametrosAdminLocal() {
  return (
    <CrudPage
      table="parametros_admin_local"
      title="Administração Local"
      subtitle="Parâmetros de custos de administração local"
      searchField="nome"
      columns={[
        { key: "nome", label: "Parâmetro", render: formatName },
        { key: "percentual", label: "Percentual", render: formatPercent },
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
