import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import MaoDeObra from "./pages/cadastros/MaoDeObra";
import Equipamentos from "./pages/cadastros/Equipamentos";
import Veiculos from "./pages/cadastros/Veiculos";
import Materiais from "./pages/cadastros/Materiais";
import Composicoes from "./pages/Composicoes";
import Orcamentos from "./pages/Orcamentos";
import BDI from "./pages/BDI";
import DRE from "./pages/DRE";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cadastros/mao-de-obra" element={<MaoDeObra />} />
            <Route path="/cadastros/equipamentos" element={<Equipamentos />} />
            <Route path="/cadastros/veiculos" element={<Veiculos />} />
            <Route path="/cadastros/materiais" element={<Materiais />} />
            <Route path="/composicoes" element={<Composicoes />} />
            <Route path="/orcamentos" element={<Orcamentos />} />
            <Route path="/bdi" element={<BDI />} />
            <Route path="/dre" element={<DRE />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
