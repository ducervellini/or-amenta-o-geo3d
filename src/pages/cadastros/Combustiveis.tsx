import { CrudPage } from "@/components/crud/CrudPage";

export default function Combustiveis() {
  return (
    <CrudPage
      table="combustiveis"
      title="Combustíveis"
      subtitle="Cadastro de combustíveis e preços por litro"
      searchField="nome"
      columns={[
        { key: "nome", label: "Combustível", render: (v) => <span className="font-medium">{String(v)}</span> },
        { key: "tipo", label: "Tipo", render: (v) => <span className="capitalize">{String(v)}</span> },
        {
          key: "preco_litro",
          label: "Preço/Litro",
          render: (v) => `R$ ${Number(v).toFixed(4)}`,
        },
        { key: "unidade", label: "Unidade" },
      ]}
      formFields={[
        { name: "nome", label: "Nome", type: "text", required: true, placeholder: "Diesel S10" },
        {
          name: "tipo",
          label: "Tipo",
          type: "select",
          options: [
            { label: "Diesel", value: "diesel" },
            { label: "Gasolina", value: "gasolina" },
            { label: "Etanol", value: "etanol" },
            { label: "GNV", value: "gnv" },
            { label: "Elétrico", value: "eletrico" },
            { label: "Outro", value: "outro" },
          ],
          defaultValue: "diesel",
        },
        { name: "preco_litro", label: "Preço por Litro (R$)", type: "number", step: "0.0001", required: true },
      ]}
    />
  );
}
