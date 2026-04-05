import { useCallback } from "react";
import { CrudPage } from "@/components/crud/CrudPage";
import { useSupabaseQuery } from "@/hooks/useSupabaseCrud";

export default function Servicos() {
  const { data: mercados } = useSupabaseQuery("mercados");
  const { data: areasEmpresa } = useSupabaseQuery("areas_empresa");
  const { data: modulos } = useSupabaseQuery("modulos");
  const { data: servicos } = useSupabaseQuery("servicos");

  const generateNextCode = useCallback(
    (mercadoId: string, areaId: string, moduloId: string) => {
      if (!servicos) return "";
      const matching = servicos
        .filter(
          (s) =>
            s.mercado_id === mercadoId &&
            s.area_empresa_id === areaId &&
            s.modulo_id === moduloId
        )
        .map((s) => String(s.codigo))
        .sort();

      if (matching.length === 0) {
        // Build prefix from abbreviations
        const mercado = mercados?.find((m) => m.id === mercadoId);
        const area = areasEmpresa?.find((a) => a.id === areaId);
        const prefix = [
          mercado ? String(mercado.nome).substring(0, 3).toUpperCase() : "SRV",
          area ? String(area.nome).substring(0, 3).toUpperCase() : "",
        ]
          .filter(Boolean)
          .join("-");
        return `${prefix}-001`;
      }

      const lastCode = matching[matching.length - 1];
      const numMatch = lastCode.match(/(\d+)$/);
      if (numMatch) {
        const num = parseInt(numMatch[1], 10) + 1;
        const prefix = lastCode.substring(0, lastCode.length - numMatch[1].length);
        return `${prefix}${String(num).padStart(numMatch[1].length, "0")}`;
      }
      return `${lastCode}-2`;
    },
    [servicos, mercados, areasEmpresa]
  );

  const handleFieldChange = useCallback(
    (fieldName: string, value: unknown, allValues: Record<string, unknown>) => {
      if (["mercado_id", "area_empresa_id", "modulo_id"].includes(fieldName)) {
        const mercadoId = fieldName === "mercado_id" ? String(value) : String(allValues.mercado_id || "");
        const areaId = fieldName === "area_empresa_id" ? String(value) : String(allValues.area_empresa_id || "");
        const moduloId = fieldName === "modulo_id" ? String(value) : String(allValues.modulo_id || "");

        if (mercadoId && areaId) {
          const nextCode = generateNextCode(mercadoId, areaId, moduloId);
          return { codigo: nextCode };
        }
      }
      return undefined;
    },
    [generateNextCode]
  );

  return (
    <CrudPage
      table="servicos"
      title="Serviços"
      subtitle="Cadastro de serviços técnicos de engenharia"
      searchField="nome"
      onFieldChange={handleFieldChange}
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
        { name: "codigo", label: "Código", type: "text", required: true, placeholder: "Gerado automaticamente" },
        { name: "nome", label: "Nome", type: "text", required: true, placeholder: "Nome do serviço" },
        { name: "descricao", label: "Descrição", type: "textarea" },
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
