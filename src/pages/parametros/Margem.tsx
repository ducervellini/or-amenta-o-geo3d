import { CrudPage } from "@/components/crud/CrudPage";

export default function ParametrosMargem() {
  return (
    <CrudPage
      table="parametros_margem"
      title="Margens de Lucro"
      subtitle="Parâmetros de margem de lucro por tipo de serviço"
      searchField="nome"
      columns={[
        { key: "nome", label: "Parâmetro", render: (v) => <span className="font-medium">{String(v)}</span> },
        { key: "percentual_minimo", label: "Mín (%)", render: (v) => `${Number(v).toFixed(2)}%` },
        { key: "percentual_maximo", label: "Máx (%)", render: (v) => `${Number(v).toFixed(2)}%` },
        { key: "percentual_padrao", label: "Padrão (%)", render: (v) => <span className="font-semibold text-accent">{`${Number(v).toFixed(2)}%`}</span> },
        { key: "descricao", label: "Descrição" },
      ]}
      formFields={[
        { name: "nome", label: "Nome", type: "text", required: true },
        { name: "percentual_minimo", label: "Mínimo (%)", type: "number", step: "0.01", required: true },
        { name: "percentual_maximo", label: "Máximo (%)", type: "number", step: "0.01", required: true },
        { name: "percentual_padrao", label: "Padrão (%)", type: "number", step: "0.01", required: true },
        { name: "descricao", label: "Descrição", type: "textarea" },
      ]}
    />
  );
}
