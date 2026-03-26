import { createRoot } from "react-dom/client";
import "./index.css";

const root = createRoot(document.getElementById("root")!);

// Show loading while deps resolve
root.render(
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Inter, sans-serif' }}>
    <p>Loading...</p>
  </div>
);

// Dynamic import so stale Vite dep chunks don't kill the page
Promise.all([
  import("./App"),
  import("./contexts/AuthContext"),
  import("./contexts/WishlistContext"),
  import("./contexts/NotificationContext"),
]).then(([{ default: App }, { AuthProvider }, { WishlistProvider }, { NotificationProvider }]) => {
  root.render(
    <AuthProvider>
      <WishlistProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </WishlistProvider>
    </AuthProvider>
  );
}).catch((err) => {
  console.error("Failed to load app:", err);
  root.render(
    <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
      <h1>Failed to load app</h1>
      <p>{String(err)}</p>
      <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>
        Reload
      </button>
    </div>
  );
});
