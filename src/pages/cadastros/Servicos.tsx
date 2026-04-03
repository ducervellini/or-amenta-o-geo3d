import { CrudPage } from "@/components/crud/CrudPage";
import { useSupabaseQuery } from "@/hooks/useSupabaseCrud";

export default function Servicos() {
  const { data: mercados } = useSupabaseQuery("mercados");
  const { data: areasEmpresa } = useSupabaseQuery("areas_empresa");

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
        { key: "unidade_medicao", label: "Unidade" },
        {
          key: "tipo_geometria",
          label: "Geometria",
          render: (v) => {
            const labels: Record<string, string> = { area: "Área", ponto: "Ponto", linha: "Linha", hibrido: "Híbrido" };
            return <span className="capitalize">{labels[String(v)] || String(v)}</span>;
          },
        },
        {
          key: "produtividade_padrao",
          label: "Produtividade",
          render: (v, row) => {
            if (!v) return <span className="text-muted-foreground">-</span>;
            const tempo = (row as Record<string, unknown>).unidade_tempo_produtividade || "hora";
            const unidade = (row as Record<string, unknown>).unidade_medicao || "un";
            return <span>{String(v)} {String(unidade)}/{String(tempo)}</span>;
          },
        },
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
          name: "unidade_medicao",
          label: "Unidade de Medição",
          type: "select",
          required: true,
          options: [
            { label: "Hectare (ha)", value: "ha" },
            { label: "Metro (m)", value: "m" },
            { label: "Quilômetro (km)", value: "km" },
            { label: "Quilômetro quadrado (km²)", value: "km²" },
            { label: "Metro quadrado (m²)", value: "m²" },
            { label: "Unidade (un)", value: "un" },
            { label: "Ponto (pt)", value: "pt" },
            { label: "Propriedades", value: "propriedades" },
            { label: "Unidades", value: "unidades" },
            { label: "Pontos", value: "pontos" },
            { label: "Cadastros", value: "cadastros" },
            { label: "Imóveis", value: "imóveis" },
            { label: "Amostras", value: "amostras" },
            { label: "Torres", value: "torres" },
            { label: "Marcos", value: "marcos" },
            { label: "Vértices", value: "vértices" },
            { label: "Bandeiras", value: "bandeiras" },
            { label: "Plantas", value: "plantas" },
            { label: "Travessias", value: "travessias" },
            { label: "Seções", value: "seções" },
            { label: "Piquetes", value: "piquetes" },
            { label: "Relatórios", value: "relatórios" },
            { label: "Laudos", value: "laudos" },
          ],
        },
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
        {
          name: "unidade_tempo_produtividade",
          label: "Unidade de Tempo (Produtividade)",
          type: "select",
          options: [
            { label: "Hora", value: "hora" },
            { label: "Dia", value: "dia" },
            { label: "Mês", value: "mes" },
          ],
          defaultValue: "hora",
        },
      ]}
    />
  );
}
