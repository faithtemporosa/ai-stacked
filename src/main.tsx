import { createRoot } from "react-dom/client";

const root = createRoot(document.getElementById("root")!);
root.render(
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Inter, sans-serif', fontSize: '2rem' }}>
    <h1>App is loading... if you see this, Vite works!</h1>
  </div>
);
