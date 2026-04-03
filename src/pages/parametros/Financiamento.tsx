import { CrudPage } from "@/components/crud/CrudPage";

export default function ParametrosFinanciamento() {
  return (
    <CrudPage
      table="parametros_financiamento"
      title="Financiamento"
      subtitle="Parâmetros de despesas financeiras"
      searchField="nome"
      columns={[
        { key: "nome", label: "Parâmetro", render: (v) => <span className="font-medium">{String(v)}</span> },
        { key: "percentual", label: "Percentual", render: (v) => `${Number(v).toFixed(2)}%` },
        { key: "prazo_meses", label: "Prazo (meses)" },
        { key: "descricao", label: "Descrição" },
      ]}
      formFields={[
        { name: "nome", label: "Nome", type: "text", required: true },
        { name: "percentual", label: "Percentual (%)", type: "number", step: "0.01", required: true },
        { name: "prazo_meses", label: "Prazo (meses)", type: "number", step: "1" },
        { name: "descricao", label: "Descrição", type: "textarea" },
      ]}
    />
  );
}
