import { CrudPage } from "@/components/crud/CrudPage";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";

const columns = [
  { key: "codigo", label: "Código" },
  { key: "nome", label: "Nome" },
  { key: "contato_nome", label: "Contato" },
  { key: "contato_cargo", label: "Cargo" },
  { key: "contato_email", label: "E-mail" },
  { key: "contato_telefone", label: "Telefone" },
];

const fields = [
  { key: "codigo", label: "Código", type: "text" as const, required: true },
  { key: "nome", label: "Nome", type: "text" as const, required: true },
  { key: "contato_nome", label: "Nome do Contato", type: "text" as const },
  { key: "contato_cargo", label: "Cargo do Contato", type: "text" as const },
  { key: "contato_email", label: "E-mail do Contato", type: "text" as const },
  { key: "contato_telefone", label: "Telefone do Contato", type: "text" as const },
];

export default function Clientes() {
  const crud = useSupabaseCrud("clientes" as any);

  return (
    <CrudPage
      title="Clientes"
      subtitle="Cadastro de clientes"
      columns={columns}
      fields={fields}
      data={crud.data || []}
      isLoading={crud.isLoading}
      onSave={crud.save}
      onDelete={crud.remove}
    />
  );
}
