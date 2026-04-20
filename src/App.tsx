import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { RoleHomeRedirect } from "@/components/RoleHomeRedirect";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Clientes from "@/pages/Clientes";
import ClienteDetail from "@/pages/ClienteDetail";
import Propostas from "@/pages/Propostas";
import Projetos from "@/pages/Projetos";
import Equipe from "@/pages/Equipe";
import Alocacao from "@/pages/Alocacao";
import Templates from "@/pages/Templates";
import ContasReceber from "@/pages/ContasReceber";
import Usuarios from "@/pages/Usuarios";
import AguardandoAcesso from "@/pages/AguardandoAcesso";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

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
              path="/aguardando-acesso"
              element={
                <ProtectedRoute>
                  <AguardandoAcesso />
                </ProtectedRoute>
              }
            />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<RoleHomeRedirect><Dashboard /></RoleHomeRedirect>} />
              <Route path="/clientes" element={<RoleProtectedRoute><Clientes /></RoleProtectedRoute>} />
              <Route path="/clientes/:id" element={<RoleProtectedRoute><ClienteDetail /></RoleProtectedRoute>} />
              <Route path="/propostas" element={<RoleProtectedRoute><Propostas /></RoleProtectedRoute>} />
              <Route path="/propostas/nova" element={<Navigate to="/propostas" replace />} />
              <Route path="/propostas/:id" element={<Navigate to="/propostas" replace />} />
              <Route path="/projetos" element={<RoleProtectedRoute><Projetos /></RoleProtectedRoute>} />
              <Route path="/projetos/novo" element={<Navigate to="/projetos" replace />} />
              <Route path="/projetos/:id" element={<Navigate to="/projetos" replace />} />
              <Route path="/equipe" element={<RoleProtectedRoute><Equipe /></RoleProtectedRoute>} />
              <Route path="/alocacao" element={<RoleProtectedRoute><Alocacao /></RoleProtectedRoute>} />
              <Route path="/contas-a-receber" element={<RoleProtectedRoute><ContasReceber /></RoleProtectedRoute>} />
              <Route path="/templates" element={<RoleProtectedRoute><Templates /></RoleProtectedRoute>} />
              <Route path="/usuarios" element={<RoleProtectedRoute allowed={["socio"]}><Usuarios /></RoleProtectedRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
