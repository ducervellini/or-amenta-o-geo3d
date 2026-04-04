import { CrudPage } from "@/components/crud/CrudPage";
import { Badge } from "@/components/ui/badge";

export default function Beneficios() {
  return (
    <CrudPage
      table="beneficios"
      title="Benefícios"
      subtitle="Cadastro de benefícios trabalhistas"
      searchField="nome"
      columns={[
        { key: "nome", label: "Benefício", render: (v) => <span className="font-medium">{String(v)}</span> },
        {
          key: "valor",
          label: "Valor",
          render: (v, row) =>
            row.tipo === "percentual" ? `${Number(v).toFixed(2)}%` : `R$ ${Number(v).toFixed(2)}`,
        },
        {
          key: "tipo",
          label: "Tipo",
          render: (v) => <span className="capitalize">{String(v)}</span>,
        },
        {
          key: "local_trabalho",
          label: "Local",
          render: (v) => {
            const labels: Record<string, string> = { campo: "Campo", escritorio: "Escritório", todos: "Todos" };
            return (
              <Badge variant="outline" className="text-xs">
                {labels[String(v)] || "Todos"}
              </Badge>
            );
          },
        },
        { key: "descricao", label: "Descrição" },
      ]}
      formFields={[
        { name: "nome", label: "Nome", type: "text", required: true, placeholder: "Vale Transporte" },
        { name: "valor", label: "Valor", type: "number", required: true },
        {
          name: "tipo",
          label: "Tipo",
          type: "select",
          options: [
            { label: "Valor Fixo (R$)", value: "fixo" },
            { label: "Percentual (%)", value: "percentual" },
          ],
          defaultValue: "fixo",
        },
        {
          name: "local_trabalho",
          label: "Local de Trabalho",
          type: "select",
          options: [
            { label: "Todos", value: "todos" },
            { label: "Campo", value: "campo" },
            { label: "Escritório", value: "escritorio" },
          ],
          defaultValue: "todos",
        },
        { name: "descricao", label: "Descrição", type: "textarea" },
      ]}
    />
  );
}
