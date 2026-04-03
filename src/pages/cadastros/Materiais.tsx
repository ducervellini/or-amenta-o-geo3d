import { CrudPage } from "@/components/crud/CrudPage";

export default function Materiais() {
  return (
    <CrudPage
      table="materiais"
      title="Materiais"
      subtitle="Cadastro de materiais e preços unitários"
      searchField="nome"
      columns={[
        { key: "codigo", label: "Código", render: (v) => <span className="font-medium text-accent">{String(v)}</span> },
        { key: "nome", label: "Material", render: (v) => <span className="font-medium">{String(v)}</span> },
        { key: "unidade", label: "Unidade" },
        { key: "preco_unitario", label: "Preço Unitário", render: (v) => `R$ ${Number(v).toFixed(2)}` },
        { key: "fornecedor", label: "Fornecedor" },
      ]}
      formFields={[
        { name: "codigo", label: "Código", type: "text", required: true, placeholder: "MAT-001" },
        { name: "nome", label: "Nome", type: "text", required: true },
        { name: "unidade", label: "Unidade", type: "text", required: true, placeholder: "m³, kg, un" },
        { name: "preco_unitario", label: "Preço Unitário (R$)", type: "number", required: true },
        { name: "fornecedor", label: "Fornecedor", type: "text" },
      ]}
    />
  );
}
