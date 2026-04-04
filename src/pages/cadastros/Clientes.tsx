import { CrudPage } from "@/components/crud/CrudPage";

const columns = [
  { key: "codigo", label: "Código" },
  { key: "nome", label: "Nome" },
  { key: "contato_nome", label: "Contato" },
  { key: "contato_cargo", label: "Cargo" },
  { key: "contato_email", label: "E-mail" },
  { key: "contato_telefone", label: "Telefone" },
];

const formFields = [
  { name: "codigo", label: "Código", type: "text" as const, required: true },
  { name: "nome", label: "Nome", type: "text" as const, required: true },
  { name: "contato_nome", label: "Nome do Contato", type: "text" as const },
  { name: "contato_cargo", label: "Cargo do Contato", type: "text" as const },
  { name: "contato_email", label: "E-mail do Contato", type: "text" as const },
  { name: "contato_telefone", label: "Telefone do Contato", type: "text" as const },
];

export default function Clientes() {
  return (
    <CrudPage
      table="clientes"
      title="Clientes"
      subtitle="Cadastro de clientes"
      columns={columns}
      formFields={formFields}
      searchField="nome"
    />
  );
}
