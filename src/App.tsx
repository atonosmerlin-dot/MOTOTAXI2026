import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";

// Client Pages
import ClientHome from "./pages/motopoint/client/ClientHome";
import ClientPointView from "./pages/motopoint/client/ClientPointView";

// Admin Pages
import AdminDashboard from "./pages/motopoint/admin/AdminDashboard";
import AdminLogin from "./pages/motopoint/admin/AdminLogin";

// Driver Pages
import DriverDashboard from "./pages/motopoint/driver/DriverDashboard";
import DriverLogin from "./pages/motopoint/driver/DriverLogin";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      staleTime: 30000, // 30s
      gcTime: 5 * 60 * 1000, // 5m
      retry: 1,
      retryDelay: 1000,
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
            {/* Cliente - Página Principal (sem login) */}
            <Route path="/" element={<ClientHome />} />
            <Route path="/point/:pointId" element={<ClientPointView />} />

            {/* Admin - Área de Administração */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Motorista - Área do Mototaxista */}
            <Route path="/driver" element={<DriverDashboard />} />
            <Route path="/driver/login" element={<DriverLogin />} />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
