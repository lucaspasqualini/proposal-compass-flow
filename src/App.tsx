import { lazy, Suspense } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Clientes = lazy(() => import("@/pages/Clientes"));
const ClienteDetail = lazy(() => import("@/pages/ClienteDetail"));
const Contatos = lazy(() => import("@/pages/Contatos"));
const ContatoDetail = lazy(() => import("@/pages/ContatoDetail"));
const Propostas = lazy(() => import("@/pages/Propostas"));
const Projetos = lazy(() => import("@/pages/Projetos"));
const Equipe = lazy(() => import("@/pages/Equipe"));
const Alocacao = lazy(() => import("@/pages/Alocacao"));
const Templates = lazy(() => import("@/pages/Templates"));
const ContasReceber = lazy(() => import("@/pages/ContasReceber"));
const Usuarios = lazy(() => import("@/pages/Usuarios"));
const Enriquecimento = lazy(() => import("@/pages/Enriquecimento"));
const AguardandoAcesso = lazy(() => import("@/pages/AguardandoAcesso"));
const Instalar = lazy(() => import("@/pages/Instalar"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PageFallback() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
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
                <Route path="/clientes/:clientId/contatos/:contactId" element={<RoleProtectedRoute><ContatoDetail /></RoleProtectedRoute>} />
                <Route path="/contatos" element={<RoleProtectedRoute><Contatos /></RoleProtectedRoute>} />
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
                <Route path="/instalar" element={<Instalar />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
