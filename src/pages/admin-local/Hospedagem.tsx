import { CrudPage } from "@/components/crud/CrudPage";

const fmtCurrency = (v: unknown) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const fmtName = (v: unknown) => <span className="font-medium">{String(v)}</span>;
const fmtTipo = (v: unknown) => v === "diaria" ? "Diária" : "Mensal";
const fmtSub = (v: unknown) => {
  const map: Record<string, string> = { alojamento: "Alojamento", airbnb: "Airbnb", hotel: "Hotel" };
  return map[String(v)] || String(v);
};

export default function AdminLocalHospedagem() {
  return (
    <CrudPage
      table="custos_admin_local"
      title="Hospedagem"
      subtitle="Custos de hospedagem para administração local"
      searchField="nome"
      defaultFilters={{ categoria: "hospedagem" }}
      columns={[
        { key: "nome", label: "Hospedagem", render: fmtName },
        { key: "subcategoria", label: "Tipo", render: fmtSub },
        { key: "tipo_cobranca", label: "Cobrança", render: fmtTipo },
        { key: "quantidade", label: "Qtd" },
        { key: "valor_diaria", label: "Valor Diária", render: fmtCurrency },
        { key: "valor_mensal", label: "Valor Mensal", render: fmtCurrency },
      ]}
      formFields={[
        { name: "nome", label: "Nome", type: "text", required: true, placeholder: "Ex: Hotel centro SP" },
        {
          name: "subcategoria",
          label: "Tipo de Hospedagem",
          type: "select",
          options: [
            { label: "Alojamento", value: "alojamento" },
            { label: "Airbnb", value: "airbnb" },
            { label: "Hotel", value: "hotel" },
          ],
          defaultValue: "hotel",
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
      hiddenDefaults={{ categoria: "hospedagem" }}
    />
  );
}
