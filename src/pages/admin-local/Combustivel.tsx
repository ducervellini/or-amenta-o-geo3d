import { CrudPage } from "@/components/crud/CrudPage";

const fmtCurrency = (v: unknown) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const fmtName = (v: unknown) => <span className="font-medium">{String(v)}</span>;
const fmtTipo = (v: unknown) => v === "diaria" ? "Diária" : "Mensal";

export default function AdminLocalCombustivel() {
  return (
    <CrudPage
      table="custos_admin_local"
      title="Combustível"
      subtitle="Custos de combustível para administração local"
      searchField="nome"
      defaultFilters={{ categoria: "combustivel" }}
      columns={[
        { key: "nome", label: "Combustível", render: fmtName },
        { key: "tipo_cobranca", label: "Tipo", render: fmtTipo },
        { key: "quantidade", label: "Qtd" },
        { key: "valor_diaria", label: "Valor Diária", render: fmtCurrency },
        { key: "valor_mensal", label: "Valor Mensal", render: fmtCurrency },
      ]}
      formFields={[
        { name: "nome", label: "Nome", type: "text", required: true, placeholder: "Ex: Diesel S10" },
        { name: "quantidade", label: "Quantidade (litros)", type: "number", step: "1", defaultValue: "1" },
        {
          name: "tipo_cobranca",
          label: "Tipo de Cobrança",
          type: "select",
          options: [
            { label: "Diária", value: "diaria" },
            { label: "Mensal", value: "mensal" },
          ],
          defaultValue: "mensal",
        },
        { name: "valor_diaria", label: "Valor Diária (R$)", type: "number", step: "0.01" },
        { name: "valor_mensal", label: "Valor Mensal (R$)", type: "number", step: "0.01" },
        { name: "descricao", label: "Descrição", type: "textarea" },
      ]}
      hiddenDefaults={{ categoria: "combustivel" }}
    />
  );
}
