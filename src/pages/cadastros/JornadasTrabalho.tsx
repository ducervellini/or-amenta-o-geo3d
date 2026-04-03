import { CrudPage } from "@/components/crud/CrudPage";

export default function JornadasTrabalho() {
  return (
    <CrudPage
      table="jornadas_trabalho"
      title="Jornadas de Trabalho"
      subtitle="Cadastro de jornadas e cargas horárias"
      searchField="nome"
      columns={[
        { key: "nome", label: "Jornada", render: (v) => <span className="font-medium">{String(v)}</span> },
        { key: "horas_diarias", label: "Horas/Dia" },
        { key: "dias_por_semana", label: "Dias/Semana" },
        { key: "horas_por_mes", label: "Horas/Mês" },
      ]}
      formFields={[
        { name: "nome", label: "Nome", type: "text", required: true, placeholder: "CLT 44h semanais" },
        { name: "horas_diarias", label: "Horas por Dia", type: "number", defaultValue: 8 },
        { name: "dias_por_semana", label: "Dias por Semana", type: "number", step: "1", defaultValue: 5 },
        { name: "horas_por_mes", label: "Horas por Mês", type: "number", defaultValue: 176 },
      ]}
    />
  );
}
