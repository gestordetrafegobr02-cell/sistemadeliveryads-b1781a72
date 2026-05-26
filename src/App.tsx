import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import InstallPWA from "@/components/InstallPWA";
import Index from "./pages/Index";
import Shop from "./pages/Shop";
import Demo from "./pages/Demo";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import SuperAdmin from "./pages/SuperAdmin";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import OrderStatus from "./pages/OrderStatus";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/super-admin" element={<SuperAdmin />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/demo/:slug" element={<Demo />} />
            <Route path="/order-status/:id" element={<OrderStatus />} />
            <Route path="/pedido/:id" element={<OrderStatus />} />
            {/* Public store menu — catch-all root slug. MUST be last before 404 */}
            <Route path="/:slug" element={<Shop />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <InstallPWA />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
