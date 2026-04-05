import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Mercados from "./pages/cadastros/Mercados";
import Clientes from "./pages/cadastros/Clientes";
import AreasEmpresa from "./pages/cadastros/AreasEmpresa";
import Modulos from "./pages/cadastros/Modulos";
import Servicos from "./pages/cadastros/Servicos";
import GruposServicos from "./pages/cadastros/GruposServicos";
import Cargos from "./pages/cadastros/Cargos";
import EncargosSociais from "./pages/cadastros/EncargosSociais";
import Beneficios from "./pages/cadastros/Beneficios";
import JornadasTrabalho from "./pages/cadastros/JornadasTrabalho";
import RegimesOperacionais from "./pages/cadastros/RegimesOperacionais";
import HorariosAlmoco from "./pages/cadastros/HorariosAlmoco";
import Equipamentos from "./pages/cadastros/Equipamentos";
import Veiculos from "./pages/cadastros/Veiculos";
import Materiais from "./pages/cadastros/Materiais";
import Combustiveis from "./pages/cadastros/Combustiveis";
import AdminLocalEquipes from "./pages/admin-local/Equipes";
import AdminLocalVeiculos from "./pages/admin-local/Veiculos";
import AdminLocalCombustivel from "./pages/admin-local/Combustivel";
import AdminLocalPedagios from "./pages/admin-local/Pedagios";
import AdminLocalPassagens from "./pages/admin-local/Passagens";
import AdminLocalHospedagem from "./pages/admin-local/Hospedagem";
import Composicoes from "./pages/Composicoes";
import Mobilizacao from "./pages/Mobilizacao";
import ComposicaoDetalhe from "./pages/ComposicaoDetalhe";
import Orcamentos from "./pages/Orcamentos";
import OrcamentoDetalhe from "./pages/OrcamentoDetalhe";
import Oportunidades from "./pages/Oportunidades";
import ParametrosAdminLocal from "./pages/parametros/AdminLocal";
import ParametrosAdminCentral from "./pages/parametros/AdminCentral";
import ParametrosFinanciamento from "./pages/parametros/Financiamento";
import ParametrosTributos from "./pages/parametros/Tributos";
import ParametrosMargem from "./pages/parametros/Margem";
import BdiDre from "./pages/BdiDre";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
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
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
