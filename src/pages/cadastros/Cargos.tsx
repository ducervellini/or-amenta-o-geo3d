import { CrudPage } from "@/components/crud/CrudPage";

export default function Cargos() {
  return (
    <CrudPage
      table="cargos"
      title="Cargos e Mão de Obra"
      subtitle="Cadastro de cargos, funções e salários base"
      searchField="nome"
      columns={[
        { key: "nome", label: "Cargo / Função", render: (v) => <span className="font-medium">{String(v)}</span> },
        {
          key: "salario_base",
          label: "Salário Base",
          render: (v) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        },
        {
          key: "unidade_salarial",
          label: "Tipo",
          render: (v) => {
            const labels: Record<string, string> = { mensal: "Mensal", hora: "Hora", diaria: "Diária" };
            return <span className="capitalize">{labels[String(v)] || String(v)}</span>;
          },
        },
        { key: "descricao", label: "Descrição" },
      ]}
      formFields={[
        { name: "nome", label: "Cargo / Função", type: "text", required: true, placeholder: "Engenheiro Civil Sênior" },
        { name: "salario_base", label: "Salário Base (R$)", type: "number", required: true },
        {
          name: "unidade_salarial",
          label: "Tipo Salarial",
          type: "select",
          options: [
            { label: "Mensal", value: "mensal" },
            { label: "Hora", value: "hora" },
            { label: "Diária", value: "diaria" },
          ],
          defaultValue: "mensal",
        },
        { name: "descricao", label: "Descrição", type: "textarea" },
      ]}
    />
  );
}
