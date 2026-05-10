import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { NotificationsListener } from "@/components/NotificationsListener";
import { PendingApprovalBanner } from "@/components/PendingApprovalBanner";
import { CookieConsent } from "@/components/site/CookieConsent";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import RequestRide from "./pages/RequestRide.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import EscortSettings from "./pages/EscortSettings.tsx";
import Invoices from "./pages/Invoices.tsx";
import BillingDetails from "./pages/BillingDetails.tsx";
import History from "./pages/History.tsx";

import EscortRideDetail from "./pages/EscortRideDetail.tsx";
import ClientRideDetail from "./pages/ClientRideDetail.tsx";
import EditRide from "./pages/EditRide.tsx";
import NotFound from "./pages/NotFound.tsx";
import Terms from "./pages/Terms.tsx";
import Pricing from "./pages/Pricing.tsx";
import Privacy from "./pages/Privacy.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import AdminLayout from "./pages/admin/AdminLayout.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminRides from "./pages/admin/AdminRides.tsx";
import AdminInvoices from "./pages/admin/AdminInvoices.tsx";
import AdminEscorts from "./pages/admin/AdminEscorts.tsx";
import AdminFuel from "./pages/admin/AdminFuel.tsx";
import FuelPrices from "./pages/FuelPrices.tsx";
import { Navigate } from "react-router-dom";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NotificationsListener />
          <PendingApprovalBanner />
          <CookieConsent />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/aanvragen" element={<RequestRide />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profiel" element={<EscortSettings />} />
            <Route path="/facturen" element={<Invoices />} />
            <Route path="/facturatiegegevens" element={<BillingDetails />} />
            <Route path="/geschiedenis" element={<History />} />
            
            <Route path="/brandstofprijzen" element={<FuelPrices />} />
            <Route path="/opdracht/:id" element={<EscortRideDetail />} />
            <Route path="/rit/:id" element={<ClientRideDetail />} />
            <Route path="/rit/:id/bewerk" element={<EditRide />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="users" replace />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="rides" element={<AdminRides />} />
              <Route path="invoices" element={<AdminInvoices />} />
              <Route path="escorts" element={<AdminEscorts />} />
              <Route path="fuel" element={<AdminFuel />} />
            </Route>
            <Route path="/tarieven" element={<Pricing />} />
            <Route path="/voorwaarden" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
