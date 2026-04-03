import { CrudPage } from "@/components/crud/CrudPage";

const columns = [
  { key: "nome", label: "Nome" },
  { key: "descricao", label: "Descrição" },
  {
    key: "ativo",
    label: "Status",
    render: (value: unknown) =>
      value ? "Ativo" : "Inativo",
  },
];

const formFields = [
  { name: "nome", label: "Nome", type: "text" as const, required: true },
  { name: "descricao", label: "Descrição", type: "text" as const },
  {
    name: "ativo",
    label: "Ativo",
    type: "select" as const,
    options: [
      { label: "Sim", value: "true" },
      { label: "Não", value: "false" },
    ],
    defaultValue: "true",
  },
];

export default function AreasEmpresa() {
  return (
    <CrudPage
      table="areas_empresa"
      title="Áreas da Empresa"
      subtitle="Cadastro de áreas como Topografia, Aerolevantamento, Fundiário, Sondagem, etc."
      columns={columns}
      formFields={formFields}
      searchField="nome"
    />
  );
}
