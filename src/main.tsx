import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext";
import { WishlistProvider } from "./contexts/WishlistContext";
import { NotificationProvider } from "./contexts/NotificationContext";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <WishlistProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </WishlistProvider>
  </AuthProvider>
);
