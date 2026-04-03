import { CrudPage } from "@/components/crud/CrudPage";

export default function HorariosAlmoco() {
  return (
    <CrudPage
      table="horarios_almoco"
      title="Horários de Almoço"
      subtitle="Cadastro de intervalos de almoço e refeição"
      searchField="nome"
      columns={[
        { key: "nome", label: "Nome", render: (v) => <span className="font-medium">{String(v)}</span> },
        { key: "hora_inicio", label: "Início" },
        { key: "hora_fim", label: "Fim" },
        { key: "duracao_minutos", label: "Duração (min)" },
      ]}
      formFields={[
        { name: "nome", label: "Nome", type: "text", required: true, placeholder: "Almoço padrão 1h" },
        { name: "hora_inicio", label: "Hora Início", type: "text", placeholder: "12:00", defaultValue: "12:00" },
        { name: "hora_fim", label: "Hora Fim", type: "text", placeholder: "13:00", defaultValue: "13:00" },
        { name: "duracao_minutos", label: "Duração (minutos)", type: "number", step: "1", defaultValue: 60 },
      ]}
    />
  );
}
