import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "./contexts/CartContext";
import { ConnectionStatusBanner } from "./components/ConnectionStatusBanner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useAnalyticsTracker } from "./hooks/use-analytics-tracker";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SeedAutomations from "./pages/SeedAutomations";
import CreatorPartnerships from "./pages/CreatorPartnerships";
import BrandCampaigns from "./pages/BrandCampaigns";
import AutomationsSupport from "./pages/AutomationsSupport";
import GrowthStrategy from "./pages/GrowthStrategy";
import GetStarted from "./pages/GetStarted";
import AutomationsCatalog from "./pages/AutomationsCatalog";
import AutomationDetail from "./pages/AutomationDetail";
import BuildMyStack from "./pages/BuildMyStack";
import Cart from "./pages/Cart";
import Auth from "./pages/Auth";
import AdminLogin from "./pages/AdminLogin";
import Wishlist from "./pages/Wishlist";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import OrderSuccess from "./pages/OrderSuccess";
import MyOrders from "./pages/MyOrders";
import SubscriptionManagement from "./pages/SubscriptionManagement";
import Analytics from "./pages/Analytics";
import Onboarding from "./pages/Onboarding";
import CustomerCredentials from "./pages/CustomerCredentials";
import AdminCredentials from "./pages/AdminCredentials";
import CredentialsApiDocs from "./pages/CredentialsApiDocs";
import AffiliateDashboard from "./pages/AffiliateDashboard";
import AdminAffiliates from "./pages/AdminAffiliates";
import AdminToolCredentials from "./pages/AdminToolCredentials";
import ReferralLanding from "./pages/ReferralLanding";
import PricingAnalysis from "./pages/PricingAnalysis";

const queryClient = new QueryClient();

const AppContent = () => {
  useAnalyticsTracker();
  
  return (
    <>
      <ConnectionStatusBanner />
      <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/catalog" element={<AutomationsCatalog />} />
              <Route path="/automation/:id" element={<AutomationDetail />} />
              <Route path="/build-my-stack" element={<BuildMyStack />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/order-success" element={<OrderSuccess />} />
              <Route path="/my-orders" element={<MyOrders />} />
              <Route path="/subscription-management" element={<SubscriptionManagement />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/credentials" element={<AdminCredentials />} />
              <Route path="/credentials" element={<CustomerCredentials />} />
              <Route path="/credentials/api-docs" element={<CredentialsApiDocs />} />
              <Route path="/affiliate" element={<AffiliateDashboard />} />
              <Route path="/admin/affiliates" element={<AdminAffiliates />} />
              <Route path="/admin/tool-credentials" element={<AdminToolCredentials />} />
              <Route path="/referral" element={<ReferralLanding />} />
              <Route path="/seed-automations" element={<SeedAutomations />} />
              <Route path="/creator-partnerships" element={<CreatorPartnerships />} />
              <Route path="/brand-campaigns" element={<BrandCampaigns />} />
              <Route path="/automations-support" element={<AutomationsSupport />} />
              <Route path="/growth-strategy" element={<GrowthStrategy />} />
              <Route path="/get-started" element={<GetStarted />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/pricing-analysis" element={<PricingAnalysis />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
