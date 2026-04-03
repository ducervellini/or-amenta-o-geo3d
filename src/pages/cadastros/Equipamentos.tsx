import { CrudPage } from "@/components/crud/CrudPage";

export default function Equipamentos() {
  return (
    <CrudPage
      table="equipamentos"
      title="Equipamentos"
      subtitle="Cadastro de equipamentos e custos operacionais"
      searchField="nome"
      columns={[
        { key: "codigo", label: "Código", render: (v) => <span className="font-medium text-accent">{String(v)}</span> },
        { key: "nome", label: "Equipamento", render: (v) => <span className="font-medium">{String(v)}</span> },
        { key: "custo_hora_produtiva", label: "Custo/h Prod.", render: (v) => `R$ ${Number(v).toFixed(2)}` },
        { key: "custo_hora_improdutiva", label: "Custo/h Improd.", render: (v) => `R$ ${Number(v).toFixed(2)}` },
        { key: "depreciacao_hora", label: "Deprec./h", render: (v) => `R$ ${Number(v).toFixed(2)}` },
        { key: "potencia", label: "Potência" },
        { key: "unidade", label: "Un." },
      ]}
      formFields={[
        { name: "codigo", label: "Código", type: "text", required: true, placeholder: "EQ-001" },
        { name: "nome", label: "Nome", type: "text", required: true },
        { name: "custo_hora_produtiva", label: "Custo/h Produtiva (R$)", type: "number", required: true },
        { name: "custo_hora_improdutiva", label: "Custo/h Improdutiva (R$)", type: "number" },
        { name: "depreciacao_hora", label: "Depreciação/h (R$)", type: "number" },
        { name: "potencia", label: "Potência", type: "text", placeholder: "HP, CV, kW" },
        { name: "unidade", label: "Unidade", type: "text", defaultValue: "h" },
      ]}
    />
  );
}
