import { lazy, Suspense } from "react";
import { useGlobalColumnResize } from "@/hooks/useGlobalColumnResize";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

// Auth e Dashboard são eager (entrada do app); o resto é lazy.
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";

const Mercados = lazy(() => import("./pages/cadastros/Mercados"));
const Clientes = lazy(() => import("./pages/cadastros/Clientes"));
const AreasEmpresa = lazy(() => import("./pages/cadastros/AreasEmpresa"));
const Modulos = lazy(() => import("./pages/cadastros/Modulos"));
const Servicos = lazy(() => import("./pages/cadastros/Servicos"));
const GruposServicos = lazy(() => import("./pages/cadastros/GruposServicos"));
const Cargos = lazy(() => import("./pages/cadastros/Cargos"));
const EncargosSociais = lazy(() => import("./pages/cadastros/EncargosSociais"));
const Beneficios = lazy(() => import("./pages/cadastros/Beneficios"));
const JornadasTrabalho = lazy(() => import("./pages/cadastros/JornadasTrabalho"));
const RegimesOperacionais = lazy(() => import("./pages/cadastros/RegimesOperacionais"));
const HorariosAlmoco = lazy(() => import("./pages/cadastros/HorariosAlmoco"));
const Equipamentos = lazy(() => import("./pages/cadastros/Equipamentos"));
const Veiculos = lazy(() => import("./pages/cadastros/Veiculos"));
const Materiais = lazy(() => import("./pages/cadastros/Materiais"));
const Combustiveis = lazy(() => import("./pages/cadastros/Combustiveis"));
const AdminLocalEquipes = lazy(() => import("./pages/admin-local/Equipes"));
const AdminLocalVeiculos = lazy(() => import("./pages/admin-local/Veiculos"));
const AdminLocalCombustivel = lazy(() => import("./pages/admin-local/Combustivel"));
const AdminLocalPedagios = lazy(() => import("./pages/admin-local/Pedagios"));
const AdminLocalPassagens = lazy(() => import("./pages/admin-local/Passagens"));
const AdminLocalHospedagem = lazy(() => import("./pages/admin-local/Hospedagem"));
const Composicoes = lazy(() => import("./pages/Composicoes"));
const Mobilizacao = lazy(() => import("./pages/Mobilizacao"));
const ComposicaoDetalhe = lazy(() => import("./pages/ComposicaoDetalhe"));
const Orcamentos = lazy(() => import("./pages/Orcamentos"));
const OrcamentoDetalhe = lazy(() => import("./pages/OrcamentoDetalhe"));
const Oportunidades = lazy(() => import("./pages/Oportunidades"));
const CustosServicos = lazy(() => import("./pages/CustosServicos"));
const ParametrosAdminLocal = lazy(() => import("./pages/parametros/AdminLocal"));
const ParametrosAdminCentral = lazy(() => import("./pages/parametros/AdminCentral"));
const ParametrosFinanciamento = lazy(() => import("./pages/parametros/Financiamento"));
const ParametrosTributos = lazy(() => import("./pages/parametros/Tributos"));
const ParametrosMargem = lazy(() => import("./pages/parametros/Margem"));
const BdiDre = lazy(() => import("./pages/BdiDre"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const App = () => {
  useGlobalColumnResize();
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Dashboard />} />
                <Route path="/cadastros/mercados" element={<Mercados />} />
                <Route path="/cadastros/clientes" element={<Clientes />} />
                <Route path="/cadastros/areas-empresa" element={<AreasEmpresa />} />
                <Route path="/cadastros/departamentos" element={<Modulos />} />
                <Route path="/cadastros/servicos" element={<Servicos />} />
                <Route path="/cadastros/grupos-servicos" element={<GruposServicos />} />
                <Route path="/cadastros/mao-de-obra" element={<Cargos />} />
                <Route path="/cadastros/cargos" element={<Cargos />} />
                <Route path="/cadastros/encargos-sociais" element={<EncargosSociais />} />
                <Route path="/cadastros/beneficios" element={<Beneficios />} />
                <Route path="/cadastros/jornadas" element={<JornadasTrabalho />} />
                <Route path="/cadastros/regimes" element={<RegimesOperacionais />} />
                <Route path="/cadastros/horarios-almoco" element={<HorariosAlmoco />} />
                <Route path="/cadastros/equipamentos" element={<Equipamentos />} />
                <Route path="/cadastros/veiculos" element={<Veiculos />} />
                <Route path="/cadastros/materiais" element={<Materiais />} />
                <Route path="/cadastros/combustiveis" element={<Combustiveis />} />
                <Route path="/composicoes" element={<Composicoes />} />
                <Route path="/composicoes/:id" element={<ComposicaoDetalhe />} />
                <Route path="/mobilizacao" element={<Mobilizacao />} />
                <Route path="/orcamentos" element={<Orcamentos />} />
                <Route path="/orcamentos/:id" element={<OrcamentoDetalhe />} />
                <Route path="/oportunidades" element={<Oportunidades />} />
                <Route path="/custos-servicos" element={<CustosServicos />} />
                <Route path="/admin-local/equipes" element={<AdminLocalEquipes />} />
                <Route path="/admin-local/veiculos" element={<AdminLocalVeiculos />} />
                <Route path="/admin-local/combustivel" element={<AdminLocalCombustivel />} />
                <Route path="/admin-local/pedagios" element={<AdminLocalPedagios />} />
                <Route path="/admin-local/passagens" element={<AdminLocalPassagens />} />
                <Route path="/admin-local/hospedagem" element={<AdminLocalHospedagem />} />
                <Route path="/parametros/admin-local" element={<ParametrosAdminLocal />} />
                <Route path="/parametros/admin-central" element={<ParametrosAdminCentral />} />
                <Route path="/parametros/financiamento" element={<ParametrosFinanciamento />} />
                <Route path="/parametros/tributos" element={<ParametrosTributos />} />
                <Route path="/parametros/margem" element={<ParametrosMargem />} />
                <Route path="/bdi" element={<BdiDre />} />
                <Route path="/dre" element={<BdiDre />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  );
};
export default App;
