
ALTER VIEW public.v_propostas_vencendo SET (security_invoker = true);
ALTER VIEW public.v_performance_coordenador SET (security_invoker = true);
ALTER VIEW public.v_pipeline_por_tipo_obra SET (security_invoker = true);
ALTER VIEW public.v_pipeline_resumo SET (security_invoker = true);
ALTER VIEW public.v_mudancas_mestres_recentes SET (security_invoker = true);
ALTER VIEW public.v_benchmark_distribuicao_tipo_obra SET (security_invoker = true);
ALTER VIEW public.v_orcamentos_benchmark SET (security_invoker = true);
ALTER VIEW public.v_atividades_pendentes SET (security_invoker = true);
ALTER VIEW public.v_parametros_bdi_componentes_jsonb SET (security_invoker = true);

ALTER FUNCTION public.calcular_meses_projeto(integer) SET search_path = public;
ALTER FUNCTION public._drop_all_policies(text) SET search_path = public;
