import { CrudPage } from "@/components/crud/CrudPage";

export default function EncargosSociais() {
  return (
    <CrudPage
      table="encargos_sociais"
      title="Encargos Sociais"
      subtitle="Cadastro de encargos sociais e trabalhistas"
      searchField="nome"
      columns={[
        { key: "nome", label: "Encargo", render: (v) => <span className="font-medium">{String(v)}</span> },
        { key: "percentual", label: "Percentual (%)", render: (v) => `${Number(v).toFixed(2)}%` },
        { key: "grupo", label: "Grupo" },
        { key: "obrigatorio", label: "Obrigatório", render: (v) => v ? "Sim" : "Não" },
        { key: "descricao", label: "Descrição" },
      ]}
      formFields={[
        { name: "nome", label: "Nome", type: "text", required: true, placeholder: "INSS" },
        { name: "percentual", label: "Percentual (%)", type: "number", required: true, step: "0.01" },
        { name: "grupo", label: "Grupo", type: "text", placeholder: "Grupo A, B, C, D..." },
        { name: "descricao", label: "Descrição", type: "textarea" },
      ]}
    />
  );
}
