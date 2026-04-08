import { useCallback } from "react";
import { CrudPage } from "@/components/crud/CrudPage";
import { useSupabaseQuery } from "@/hooks/useSupabaseCrud";

export default function Servicos() {
  const { data: mercados } = useSupabaseQuery("mercados");
  const { data: areasEmpresa } = useSupabaseQuery("areas_empresa");
  const { data: modulos } = useSupabaseQuery("modulos");
  const { data: servicos } = useSupabaseQuery("servicos", { orderBy: "ordem_id", ascending: true });

  const generateNextCode = useCallback(
    (mercadoId: string, areaId: string, moduloId: string) => {
      const area = areasEmpresa?.find((a) => a.id === areaId);
      const modulo = modulos?.find((d) => d.id === moduloId);

      const aCode = area ? String(area.nome).substring(0, 4).toUpperCase() : "XXXX";
      const dCode = modulo ? String(modulo.nome).substring(0, 3).toUpperCase() : "XXX";
      const prefix = `SRV-${aCode}-${dCode}-`;

      const matching = (servicos || [])
        .map((s) => String(s.codigo))
        .filter((c) => c.startsWith(prefix))
        .map((c) => parseInt(c.substring(prefix.length), 10))
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b);

      const next = matching.length > 0 ? matching[matching.length - 1] + 1 : 1;
      return `${prefix}${String(next).padStart(3, "0")}`;
    },
    [servicos, areasEmpresa, modulos]
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
        { key: "ordem_id", label: "ID", render: (v) => <span className="font-mono text-xs font-semibold">{v ? String(v) : "-"}</span> },
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
        {
          key: "produtividade_padrao",
          label: "Produtividade",
          render: (v, row) => {
            if (!v || Number(v) === 0) return <span className="text-xs text-amber-600">⚠ Não definida</span>;
            const unTempo = (row as any)?.unidade_tempo_produtividade || "dia";
            const unMed = (row as any)?.unidade_medicao || "un";
            return <span className="text-sm font-medium">{Number(v).toLocaleString("pt-BR")} {unMed}/{unTempo}</span>;
          },
        },
      ]}
      formFields={[
        { name: "ordem_id", label: "ID (ordem de execução)", type: "text", placeholder: "Ex: 01, 01.1, 02, A1" },
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
            { label: "amostras", value: "amostras" },
            { label: "bandeiras", value: "bandeiras" },
            { label: "base", value: "base" },
            { label: "caderno de preços", value: "caderno de preços" },
            { label: "cadastros", value: "cadastros" },
            { label: "contrato", value: "contrato" },
            { label: "dia", value: "dia" },
            { label: "diligência", value: "diligência" },
            { label: "h", value: "h" },
            { label: "ha", value: "ha" },
            { label: "imóveis", value: "imóveis" },
            { label: "km", value: "km" },
            { label: "km²", value: "km²" },
            { label: "laudos", value: "laudos" },
            { label: "m", value: "m" },
            { label: "m²", value: "m²" },
            { label: "marcos", value: "marcos" },
            { label: "modelo", value: "modelo" },
            { label: "mês", value: "mês" },
            { label: "ofertas", value: "ofertas" },
            { label: "piquetes", value: "piquetes" },
            { label: "plantas", value: "plantas" },
            { label: "pontos", value: "pontos" },
            { label: "propriedades", value: "propriedades" },
            { label: "protocolo", value: "protocolo" },
            { label: "pt", value: "pt" },
            { label: "relatórios", value: "relatórios" },
            { label: "seções", value: "seções" },
            { label: "torres", value: "torres" },
            { label: "travessias", value: "travessias" },
            { label: "un", value: "un" },
            { label: "unidades", value: "unidades" },
            { label: "vértices", value: "vértices" },
          ],
          defaultValue: "un",
        },
        {
          name: "produtividade_padrao",
          label: "Produtividade Padrão",
          type: "number",
          placeholder: "Ex: 3.5 (unidades por período)",
        },
        {
          name: "unidade_tempo_produtividade",
          label: "Unidade de Tempo da Produtividade",
          type: "select",
          options: [
            { label: "por hora", value: "hora" },
            { label: "por dia", value: "dia" },
            { label: "por mês", value: "mes" },
          ],
          defaultValue: "dia",
        },
      ]}
    />
  );
}
