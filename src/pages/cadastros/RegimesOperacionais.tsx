import { CrudPage } from "@/components/crud/CrudPage";

export default function RegimesOperacionais() {
  return (
    <CrudPage
      table="regimes_operacionais"
      title="Regimes Operacionais"
      subtitle="Cadastro de regimes de trabalho (ex: 60/10, 14/7)"
      searchField="nome"
      columns={[
        { key: "nome", label: "Regime", render: (v) => <span className="font-medium">{String(v)}</span> },
        { key: "dias_trabalho", label: "Dias Trabalho" },
        { key: "dias_folga", label: "Dias Folga" },
        {
          key: "dias_trabalho",
          label: "Formato",
          render: (_v, row) => (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
              {String(row.dias_trabalho)}/{String(row.dias_folga)}
            </span>
          ),
        },
        { key: "descricao", label: "Descrição" },
      ]}
      formFields={[
        { name: "nome", label: "Nome", type: "text", required: true, placeholder: "Regime 60/10" },
        { name: "dias_trabalho", label: "Dias de Trabalho", type: "number", step: "1", required: true },
        { name: "dias_folga", label: "Dias de Folga", type: "number", step: "1", required: true },
        { name: "descricao", label: "Descrição", type: "textarea" },
      ]}
    />
  );
}
