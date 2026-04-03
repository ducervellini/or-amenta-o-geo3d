import { CrudPage } from "@/components/crud/CrudPage";

export default function ParametrosTributos() {
  return (
    <CrudPage
      table="parametros_tributos"
      title="Tributos"
      subtitle="Cadastro de tributos incidentes"
      searchField="nome"
      columns={[
        { key: "nome", label: "Tributo", render: (v) => <span className="font-medium">{String(v)}</span> },
        { key: "sigla", label: "Sigla", render: (v) => <span className="font-bold text-accent">{String(v)}</span> },
        { key: "percentual", label: "Alíquota", render: (v) => `${Number(v).toFixed(2)}%` },
        { key: "descricao", label: "Descrição" },
      ]}
      formFields={[
        { name: "nome", label: "Nome", type: "text", required: true, placeholder: "PIS" },
        { name: "sigla", label: "Sigla", type: "text", required: true, placeholder: "PIS" },
        { name: "percentual", label: "Alíquota (%)", type: "number", step: "0.01", required: true },
        { name: "descricao", label: "Descrição", type: "textarea" },
      ]}
    />
  );
}
