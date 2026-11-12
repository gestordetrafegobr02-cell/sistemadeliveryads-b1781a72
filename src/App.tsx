import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import InstallPWA from "@/components/InstallPWA";

const Index = lazy(() => import("./pages/Index"));
const Shop = lazy(() => import("./pages/Shop"));
const Demo = lazy(() => import("./pages/Demo"));
const DemoDashboard = lazy(() => import("./pages/DemoDashboard"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const NotFound = lazy(() => import("./pages/NotFound"));
const OrderStatus = lazy(() => import("./pages/OrderStatus"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    <span className="sr-only">Carregando página...</span>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/super-admin" element={<SuperAdmin />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/demo/:slug" element={<Demo />} />
              <Route path="/demo-painel" element={<DemoDashboard />} />
              <Route path="/order-status/:id" element={<OrderStatus />} />
              <Route path="/pedido/:id" element={<OrderStatus />} />
              <Route path="/loja/:storeSlug" element={<Shop />} />
              <Route path="/shop/:storeSlug" element={<Shop />} />
              {/* Public store menu — catch-all root slug. MUST remain last before 404 */}
              <Route path="/:slug" element={<Shop />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <InstallPWA />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
