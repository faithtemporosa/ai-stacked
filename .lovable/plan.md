

## Root Cause Analysis

The blank page is caused by **Vite's dependency optimization cache being corrupted/stale**. The browser console shows:

```
504 - Failed to load: /.vite/deps/@tanstack_react-query.js?v=5532ec53
```

The version hash `v=5532ec53` is outdated. The running Vite dev server's in-memory module graph references old hashes, but the on-disk cache was rebuilt multiple times during previous debugging attempts. When Vite detects this mismatch, it returns `504 Outdated Optimize Dep`, which kills the app since `@tanstack/react-query` is imported by `App.tsx` at the top level.

The app works intermittently (session replay confirms the user navigated to `/catalog` and `/admin/affiliates` successfully), but on fresh loads it often fails.

## Fix Plan

### Step 1: Reset Vite config to force a clean server restart

Write a minimal change to `vite.config.ts` (add an `optimizeDeps.exclude: []` no-op) to force Vite to detect a config change and perform a full dependency re-optimization on restart. This clears the stale hash.

### Step 2: Remove the `next-themes` dependency usage

`src/components/ui/sonner.tsx` imports `useTheme` from `next-themes`, but no `ThemeProvider` wraps the app. This means `useTheme()` returns `undefined`/defaults silently. Replace it with a hardcoded `"system"` theme value to remove the unnecessary dependency and potential silent error.

### Step 3: Clean up the `frontend/` directory reference

The `frontend/` subdirectory contains a legacy CRA-based app (`craco`, `react-scripts`) that is completely separate from the root Vite app. Its `package.json`, `src/App.js`, etc. are unused but add confusion. No code changes needed here, but noting it for awareness.

## Technical Details

**Files to modify:**

| File | Change |
|------|--------|
| `vite.config.ts` | Restore standard Lovable config with a fresh timestamp comment to force server restart |
| `src/components/ui/sonner.tsx` | Remove `next-themes` import; hardcode theme to `"system"` |

**Why previous fixes didn't work:** Each attempt to run `npx vite optimize` or clear `.vite/deps` created new hashes on disk, but the running Vite server process kept its old in-memory hashes. The server needs a config-level change to trigger a full restart with fresh optimization.

