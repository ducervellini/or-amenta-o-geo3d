import { CrudPage } from "@/components/crud/CrudPage";
import { useSupabaseQuery } from "@/hooks/useSupabaseCrud";

export default function Servicos() {
  const { data: mercados } = useSupabaseQuery("mercados");
  const { data: areasEmpresa } = useSupabaseQuery("areas_empresa");
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
          key: "area_empresa_id",
          label: "Área da Empresa",
          render: (v) => {
            const a = areasEmpresa?.find((a) => a.id === v);
            return (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                {a ? String(a.nome) : "-"}
              </span>
            );
          },
        },
        {
          key: "modulo_id",
          label: "Departamento",
          render: (v) => {
            const d = modulos?.find((d) => d.id === v);
            return <span className="text-sm">{d ? String(d.nome) : "-"}</span>;
          },
        },
        { key: "descricao", label: "Descrição", render: (v) => <span className="text-sm text-muted-foreground">{v ? String(v) : "-"}</span> },
        { key: "unidade_medicao", label: "Unidade", render: (v) => <span className="text-sm">{v ? String(v) : "-"}</span> },
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
          name: "area_empresa_id",
          label: "Área da Empresa",
          type: "select",
          required: true,
          options: (areasEmpresa || []).map((a) => ({ label: String(a.nome), value: String(a.id) })),
        },
        {
          name: "modulo_id",
          label: "Departamento",
          type: "select",
          options: (modulos || []).map((d) => ({ label: String(d.nome), value: String(d.id) })),
        },
        {
          name: "unidade_medicao",
          label: "Unidade",
          type: "select",
          options: [
            { label: "ha", value: "ha" },
            { label: "m", value: "m" },
            { label: "km", value: "km" },
            { label: "km²", value: "km²" },
            { label: "m²", value: "m²" },
            { label: "un", value: "un" },
            { label: "pt", value: "pt" },
            { label: "h", value: "h" },
            { label: "dia", value: "dia" },
            { label: "mês", value: "mês" },
            { label: "propriedades", value: "propriedades" },
            { label: "unidades", value: "unidades" },
            { label: "pontos", value: "pontos" },
            { label: "cadastros", value: "cadastros" },
            { label: "imóveis", value: "imóveis" },
            { label: "amostras", value: "amostras" },
            { label: "torres", value: "torres" },
            { label: "marcos", value: "marcos" },
            { label: "vértices", value: "vértices" },
            { label: "bandeiras", value: "bandeiras" },
            { label: "plantas", value: "plantas" },
            { label: "travessias", value: "travessias" },
            { label: "seções", value: "seções" },
            { label: "piquetes", value: "piquetes" },
            { label: "relatórios", value: "relatórios" },
            { label: "laudos", value: "laudos" },
          ],
          defaultValue: "un",
        },
      ]}
    />
  );
}
