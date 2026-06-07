import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { NotificationsListener } from "@/components/NotificationsListener";
import { PendingApprovalBanner } from "@/components/PendingApprovalBanner";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { CookieConsent } from "@/components/site/CookieConsent";
import { FloatingBackButton } from "@/components/site/FloatingBackButton";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import RequestRide from "./pages/RequestRide.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import EscortSettings from "./pages/EscortSettings.tsx";
import Invoices from "./pages/Invoices.tsx";
import BillingDetails from "./pages/BillingDetails.tsx";
import History from "./pages/History.tsx";
import Subscription from "./pages/Subscription.tsx";
import RolePicker from "./pages/RolePicker.tsx";

import EscortRideDetail from "./pages/EscortRideDetail.tsx";
import ClientRideDetail from "./pages/ClientRideDetail.tsx";
import EditRide from "./pages/EditRide.tsx";
import NotFound from "./pages/NotFound.tsx";
import Terms from "./pages/Terms.tsx";

import Privacy from "./pages/Privacy.tsx";
import Security from "./pages/Security.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import AdminLayout from "./pages/admin/AdminLayout.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminRides from "./pages/admin/AdminRides.tsx";
import AdminInvoices from "./pages/admin/AdminInvoices.tsx";
import AdminEscorts from "./pages/admin/AdminEscorts.tsx";
import AdminEscortDetail from "./pages/admin/AdminEscortDetail.tsx";
import AdminFuel from "./pages/admin/AdminFuel.tsx";
import AdminExcluded from "./pages/admin/AdminExcluded.tsx";
import AdminEmailChanges from "./pages/admin/AdminEmailChanges.tsx";
import ExcludedEscorts from "./pages/ExcludedEscorts.tsx";
import PreferredClients from "./pages/PreferredClients.tsx";
import FuelPrices from "./pages/FuelPrices.tsx";
import HoeWerktViaCust from "./pages/HoeWerktViaCust.tsx";
import WatKostViaCust from "./pages/WatKostViaCust.tsx";
import InfoNederland from "./pages/InfoNederland.tsx";
import InfoBelgie from "./pages/InfoBelgie.tsx";
import Faq from "./pages/Faq.tsx";
import Team from "./pages/Team.tsx";
import ChecklistSpeciaalTransport from "./pages/ChecklistSpeciaalTransport.tsx";
import AcceptInvitation from "./pages/AcceptInvitation.tsx";
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
          <PaymentTestModeBanner />
          <SubscriptionBanner />
          <CookieConsent />
          <FloatingBackButton />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/hoe-werkt-viacust" element={<HoeWerktViaCust />} />
            <Route path="/wat-kost-viacust" element={<WatKostViaCust />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/info/nederland" element={<InfoNederland />} />
            <Route path="/info/belgie" element={<InfoBelgie />} />
            <Route path="/checklist-speciaal-transport" element={<ChecklistSpeciaalTransport />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/kies-rol" element={<RolePicker />} />
            <Route path="/aanvragen" element={<RequestRide />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profiel" element={<EscortSettings />} />
            <Route path="/facturen" element={<Invoices />} />
            <Route path="/facturatiegegevens" element={<BillingDetails />} />
            <Route path="/geschiedenis" element={<History />} />
            
            <Route path="/brandstofprijzen" element={<FuelPrices />} />
            <Route path="/uitgesloten-begeleiders" element={<ExcludedEscorts />} />
            <Route path="/voorkeursopdrachtgevers" element={<PreferredClients />} />
            <Route path="/opdracht/:id" element={<EscortRideDetail />} />
            <Route path="/rit/:id" element={<ClientRideDetail />} />
            <Route path="/rit/:id/bewerk" element={<EditRide />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="users" replace />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="rides" element={<AdminRides />} />
              <Route path="invoices" element={<AdminInvoices />} />
              <Route path="escorts" element={<AdminEscorts />} />
              <Route path="escorts/:id" element={<AdminEscortDetail />} />
              <Route path="fuel" element={<AdminFuel />} />
              <Route path="excluded" element={<AdminExcluded />} />
              <Route path="email-changes" element={<AdminEmailChanges />} />
            </Route>
            
            <Route path="/voorwaarden" element={<Terms />} />
            <Route path="/team" element={<Team />} />
            <Route path="/uitnodiging" element={<AcceptInvitation />} />
            <Route path="/beveiliging" element={<Security />} />
            <Route path="/privacy" element={<Privacy forceLang="nl" />} />
            <Route path="/privacy-en" element={<Privacy forceLang="en" />} />
            <Route path="/datenschutz" element={<Privacy forceLang="de" />} />
            <Route path="/confidentialite" element={<Privacy forceLang="fr" />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/abonnement" element={<Subscription />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
