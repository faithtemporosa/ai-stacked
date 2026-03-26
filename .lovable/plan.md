

## Problem

The app shows a blank page because Vite's dependency cache is corrupted. The browser requests pre-bundled deps (like `@tanstack/react-query`, `@supabase/supabase-js`, `sonner`) with stale version hashes, and Vite returns **504 Outdated Optimize Dep** errors. Since these are top-level imports in `main.tsx` and `App.tsx`, the entire app fails to render.

## Simplest Fix

Two changes:

### 1. Force Vite to rebuild dependency cache (`vite.config.ts`)

Add `optimizeDeps.force: true` -- this tells Vite to throw away its cached pre-bundled deps and rebuild them from scratch on the next server start. This is the one-line fix for the stale hash problem.

```typescript
optimizeDeps: {
  force: true,
},
```

### 2. Make `main.tsx` resilient with dynamic import

Instead of static top-level imports that fail silently on 504 errors, wrap the app bootstrap in a dynamic `import()` with error handling. This way, even if deps are still loading, the user sees a loading state instead of a blank page.

```typescript
// main.tsx - simplified
import { createRoot } from "react-dom/client";
import "./index.css";

const root = createRoot(document.getElementById("root")!);

// Show loading while deps resolve
root.render(<div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',fontFamily:'Inter,sans-serif'}}>Loading...</div>);

// Dynamic import so 504 retries don't kill the page
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
  root.render(<div style={{padding:'2rem',fontFamily:'Inter,sans-serif'}}><h1>Failed to load app</h1><p>{String(err)}</p><button onClick={() => window.location.reload()}>Reload</button></div>);
});
```

### Files to modify

| File | Change |
|------|--------|
| `vite.config.ts` | Add `force: true` to `optimizeDeps` |
| `src/main.tsx` | Replace static imports with dynamic import + loading fallback |

