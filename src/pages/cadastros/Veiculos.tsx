import { CrudPage } from "@/components/crud/CrudPage";

export default function Veiculos() {
  return (
    <CrudPage
      table="veiculos"
      title="Veículos"
      subtitle="Cadastro de veículos e custos operacionais"
      searchField="nome"
      columns={[
        { key: "codigo", label: "Código", render: (v) => <span className="font-medium text-accent">{String(v)}</span> },
        { key: "nome", label: "Veículo", render: (v) => <span className="font-medium">{String(v)}</span> },
        { key: "custo_km", label: "Custo/Km", render: (v) => `R$ ${Number(v).toFixed(2)}` },
        { key: "custo_hora", label: "Custo/Hora", render: (v) => `R$ ${Number(v).toFixed(2)}` },
        { key: "manutencao_hora", label: "Manut./h", render: (v) => `R$ ${Number(v).toFixed(2)}` },
        { key: "unidade", label: "Un." },
      ]}
      formFields={[
        { name: "codigo", label: "Código", type: "text", required: true, placeholder: "VE-001" },
        { name: "nome", label: "Nome", type: "text", required: true },
        { name: "custo_km", label: "Custo por Km (R$)", type: "number", required: true },
        { name: "custo_hora", label: "Custo por Hora (R$)", type: "number", required: true },
        { name: "manutencao_hora", label: "Manutenção/h (R$)", type: "number" },
        { name: "unidade", label: "Unidade", type: "text", defaultValue: "h" },
      ]}
    />
  );
}
