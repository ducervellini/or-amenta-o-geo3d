import { CrudPage } from "@/components/crud/CrudPage";
import { useSupabaseQuery } from "@/hooks/useSupabaseCrud";

export default function Servicos() {
  const { data: mercados } = useSupabaseQuery("mercados");
  const { data: modulos } = useSupabaseQuery("modulos");

  return (
    <CrudPage
      table="servicos"
      title="Serviços"
      subtitle="Cadastro de serviços técnicos de engenharia"
      searchField="nome"
      columns={[
        { key: "codigo", label: "Código", render: (v) => <span className="font-medium text-accent">{String(v)}</span> },
        { key: "nome", label: "Nome", render: (v) => <span className="font-medium">{String(v)}</span> },
        {
          key: "mercado_id",
          label: "Mercado",
          render: (v) => {
            const m = mercados?.find((m) => m.id === v);
            return <span className="text-sm">{m ? String(m.nome) : "-"}</span>;
          },
        },
        {
          key: "modulo_id",
          label: "Módulo",
          render: (v) => {
            const m = modulos?.find((m) => m.id === v);
            return (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                {m ? String(m.nome) : "-"}
              </span>
            );
          },
        },
        { key: "unidade_medicao", label: "Unidade" },
        {
          key: "tipo_geometria",
          label: "Geometria",
          render: (v) => {
            const labels: Record<string, string> = { area: "Área", ponto: "Ponto", linha: "Linha", hibrido: "Híbrido" };
            return <span className="capitalize">{labels[String(v)] || String(v)}</span>;
          },
        },
        { key: "produtividade_padrao", label: "Prod. Padrão" },
      ]}
      formFields={[
        { name: "codigo", label: "Código", type: "text", required: true, placeholder: "SRV-001" },
        { name: "nome", label: "Nome", type: "text", required: true, placeholder: "Nome do serviço" },
        { name: "descricao", label: "Descrição", type: "textarea" },
        {
          name: "mercado_id",
          label: "Mercado",
          type: "select",
          required: true,
          options: (mercados || []).map((m) => ({ label: String(m.nome), value: String(m.id) })),
        },
        {
          name: "modulo_id",
          label: "Módulo",
          type: "select",
          required: true,
          options: (modulos || []).map((m) => ({ label: String(m.nome), value: String(m.id) })),
        },
        { name: "unidade_medicao", label: "Unidade de Medição", type: "text", required: true, placeholder: "ha, m, km, un" },
        {
          name: "tipo_geometria",
          label: "Tipo de Geometria",
          type: "select",
          required: true,
          options: [
            { label: "Área", value: "area" },
            { label: "Ponto", value: "ponto" },
            { label: "Linha", value: "linha" },
            { label: "Híbrido", value: "hibrido" },
          ],
        },
        { name: "produtividade_padrao", label: "Produtividade Padrão", type: "number", step: "0.0001" },
      ]}
    />
  );
}
