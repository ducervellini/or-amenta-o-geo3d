import { CrudPage } from "@/components/crud/CrudPage";

const fmtCurrency = (v: unknown) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const fmtName = (v: unknown) => <span className="font-medium">{String(v)}</span>;
const fmtTipo = (v: unknown) => v === "diaria" ? "Diária" : "Mensal";

export default function AdminLocalVeiculos() {
  return (
    <CrudPage
      table="custos_admin_local"
      title="Veículos"
      subtitle="Custos de veículos para administração local"
      searchField="nome"
      defaultFilters={{ categoria: "veiculo" }}
      columns={[
        { key: "nome", label: "Veículo", render: fmtName },
        { key: "tipo_cobranca", label: "Tipo", render: fmtTipo },
        { key: "quantidade", label: "Qtd" },
        { key: "valor_diaria", label: "Valor Diária", render: fmtCurrency },
        { key: "valor_mensal", label: "Valor Mensal", render: fmtCurrency },
      ]}
      formFields={[
        { name: "nome", label: "Nome", type: "text", required: true, placeholder: "Ex: Caminhonete 4x4" },
        { name: "quantidade", label: "Quantidade", type: "number", step: "1", defaultValue: "1" },
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
      hiddenDefaults={{ categoria: "veiculo" }}
    />
  );
}
