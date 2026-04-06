import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Clientes from "@/pages/Clientes";
import Propostas from "@/pages/Propostas";
import PropostaForm from "@/pages/PropostaForm";
import Projetos from "@/pages/Projetos";
import ProjetoForm from "@/pages/ProjetoForm";
import Equipe from "@/pages/Equipe";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/propostas" element={<Propostas />} />
              <Route path="/propostas/nova" element={<PropostaForm />} />
              <Route path="/propostas/:id" element={<PropostaForm />} />
              <Route path="/projetos" element={<Projetos />} />
              <Route path="/projetos/novo" element={<ProjetoForm />} />
              <Route path="/projetos/:id" element={<ProjetoForm />} />
              <Route path="/equipe" element={<Equipe />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
