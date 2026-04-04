import { CrudPage } from "@/components/crud/CrudPage";

const fmtCurrency = (v: unknown) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const fmtName = (v: unknown) => <span className="font-medium">{String(v)}</span>;
const fmtTipo = (v: unknown) => v === "diaria" ? "Diária" : "Mensal";
const fmtSub = (v: unknown) => {
  const map: Record<string, string> = { aviao: "Avião", onibus: "Ônibus", trem: "Trem", metro: "Metrô", uber: "Uber/App" };
  return map[String(v)] || String(v);
};

export default function AdminLocalPassagens() {
  return (
    <CrudPage
      table="custos_admin_local"
      title="Passagens"
      subtitle="Custos de passagens e deslocamentos"
      searchField="nome"
      defaultFilters={{ categoria: "passagem" }}
      columns={[
        { key: "nome", label: "Passagem", render: fmtName },
        { key: "subcategoria", label: "Tipo", render: fmtSub },
        { key: "tipo_cobranca", label: "Cobrança", render: fmtTipo },
        { key: "quantidade", label: "Qtd" },
        { key: "valor_diaria", label: "Valor Diária", render: fmtCurrency },
        { key: "valor_mensal", label: "Valor Mensal", render: fmtCurrency },
      ]}
      formFields={[
        { name: "nome", label: "Descrição", type: "text", required: true, placeholder: "Ex: SP → RJ ida e volta" },
        {
          name: "subcategoria",
          label: "Tipo de Transporte",
          type: "select",
          options: [
            { label: "Avião", value: "aviao" },
            { label: "Ônibus", value: "onibus" },
            { label: "Trem", value: "trem" },
            { label: "Metrô", value: "metro" },
            { label: "Uber/App", value: "uber" },
          ],
          defaultValue: "aviao",
        },
        { name: "quantidade", label: "Quantidade", type: "number", step: "1", defaultValue: "1" },
        {
          name: "tipo_cobranca",
          label: "Tipo de Cobrança",
          type: "select",
          options: [
            { label: "Diária", value: "diaria" },
            { label: "Mensal", value: "mensal" },
          ],
          defaultValue: "diaria",
        },
        { name: "valor_diaria", label: "Valor Diária (R$)", type: "number", step: "0.01" },
        { name: "valor_mensal", label: "Valor Mensal (R$)", type: "number", step: "0.01" },
        { name: "descricao", label: "Observações", type: "textarea" },
      ]}
      hiddenDefaults={{ categoria: "passagem" }}
    />
  );
}
