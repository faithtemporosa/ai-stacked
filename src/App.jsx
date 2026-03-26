import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Catalog from "./pages/Catalog";
import AgentDetail from "./pages/AgentDetail";
import BuildMyStack from "./pages/BuildMyStack";
import Cart from "./pages/Cart";
import Auth from "./pages/Auth";
import Wishlist from "./pages/Wishlist";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import OrderSuccess from "./pages/OrderSuccess";
import MyOrders from "./pages/MyOrders";
import Affiliate from "./pages/Affiliate";
import Onboarding from "./pages/Onboarding";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/catalog" element={<Catalog />} />
      <Route path="/automation/:id" element={<AgentDetail />} />
      <Route path="/build-my-stack" element={<BuildMyStack />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/wishlist" element={<Wishlist />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/order-success" element={<OrderSuccess />} />
      <Route path="/my-orders" element={<MyOrders />} />
      <Route path="/affiliate" element={<Affiliate />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
