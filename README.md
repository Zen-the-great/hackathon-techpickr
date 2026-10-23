# TechPickr

TechPickr is a React + Vite PC and laptop advisor. Gemini chat runs through a small Node backend so the Gemini API key is never part of the browser build. Laptop matches come from the project's local catalog; Gemini can rank catalog candidates but cannot add products or invent specifications. Desktop builds come from the Supabase PC Part component catalog. Supabase Auth manages accounts, and saved recommendations are protected by your Supabase RLS policies.

## Configure environment

Use one project-root `.env` file for local configuration. Copy `.env.example` to `.env`, then set the Supabase values:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
VITE_SUPABASE_GOOGLE_AUTH_ENABLED=false
```

Set `GEMINI_API_KEY` in the same root `.env` for the backend. Keep it unprefixed: Vite exposes `VITE_` variables in browser code, so never use `VITE_GEMINI_API_KEY` or include the Gemini key in the frontend build. The root `.env` is ignored by Git; `.env.example` and `server/.env.example` are templates only.
Restart the backend after changing `GEMINI_API_KEY` so the server loads the new value.

Google sign-in is shown only when `VITE_SUPABASE_GOOGLE_AUTH_ENABLED=true` and Google OAuth is configured in the Supabase dashboard. Email/password authentication works independently.

## Supabase setup

Create `public.profiles` and `public.saved_recommendations` using the schema described in the project request. Enable RLS. The app never creates or recreates tables. PC builds call the read-only `public.build_pc_recommendation` RPC from [`supabase/supabase/supabase/supabase/009_build_pc_recommendation.sql`](./supabase/supabase/supabase/supabase/009_build_pc_recommendation.sql), which expects the existing `public.components` table populated with rows whose `source_name` is `pc-part-dataset`. Apply that function to the existing database if it is not already installed; this project does not delete or recreate component tables. The RPC selects the least expensive eligible record in fixed per-category budget shares; it does not rank parts by workload or user priorities, and compatibility is explicitly marked as unverified. The offline build catalog shows rounded indicative price estimates with Amazon/Flipkart search links; these are not live retailer quotes. For database rows to show estimates, populate `specs.price_estimate_inr`, `specs.price_estimate_source`, and optionally `specs.price_estimate_checked_at`. Dataset USD prices are not converted and shown as Indian retail prices.

Example policies for the operations used by the app (apply only after the tables exist; do not add duplicate policy names):

```sql
alter table public.profiles enable row level security;
alter table public.saved_recommendations enable row level security;

create policy "profiles_select_own"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy "saved_recommendations_select_own"
on public.saved_recommendations for select to authenticated
using ((select auth.uid()) = user_id);

create policy "saved_recommendations_insert_own"
on public.saved_recommendations for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "saved_recommendations_delete_own"
on public.saved_recommendations for delete to authenticated
using ((select auth.uid()) = user_id);
```

Do not grant anonymous access to profile or saved-recommendation data. The frontend sends the authenticated session and relies on RLS; list queries do not download other users' rows for client-side filtering. The PC component RPC is read-only and must be executable by the role used by the app; do not expose service-role credentials in the frontend.

In Supabase Authentication settings, add your local and deployed callback URLs to the allowed redirect URLs. Local Vite uses `http://localhost:5173/my-recommendations`. If enabling Google, configure its provider credentials in Supabase first, then turn on the frontend flag.

## Install and run on Windows PowerShell

Run from the project folder (the directory containing `package.json`):

```powershell
npm.cmd install
```

Terminal 1 — Gemini backend:

```powershell
npm.cmd run dev:backend
```

Terminal 2 — frontend:

```powershell
npm.cmd run dev
```

Open the URL printed by Vite. The Vite development proxy forwards `/api` requests to `http://127.0.0.1:3001`. For a production deployment, deploy the Node backend separately and configure the hosting service to provide its port and bind it on a reachable interface (set `HOST=0.0.0.0` for container hosts that require it). Set backend `FRONTEND_ORIGIN` to the deployed frontend origin, and set frontend `VITE_RECOMMENDATION_API_URL` to the public backend origin (without `/api`) before building. Rebuild and redeploy the frontend after changing that Vite variable. Check `https://YOUR_BACKEND_ORIGIN/api/health` returns JSON with `"ok": true` before testing recommendations; a proxy-generated HTTP 502 usually means the backend is not reachable at the configured origin.

The default production build uses root-relative URLs for Vercel and other root-domain hosts. For GitHub Pages at `https://<owner>.github.io/TechPickr/`, use `npm run build:github-pages`; its `404.html` fallback preserves deep links such as `/my-recommendations`.

Useful checks:

```powershell
npm.cmd run build
npm.cmd run lint
Invoke-RestMethod http://127.0.0.1:3001/api/health
```

Health output reports whether Gemini is configured, but never returns the key.

## Manual test checklist

1. Register using email/password. If Supabase email confirmation is enabled, confirm the email before logging in.
2. Log in, refresh the page, and confirm the account remains signed in; log out from the navigation bar.
3. Use `/build` for either a laptop or desktop recommendation. Laptop results should show identifiable catalog models with catalog specs, indicative (not live-verified) prices, and clearly labelled Amazon/Flipkart searches. Desktop results should contain actual component records, show rounded estimates and an estimated total when estimates exist, link to Amazon/Flipkart searches, and include explicit compatibility warnings. Verify current price and availability with the retailer.
4. Ask TechBot a technology question and confirm it responds through the Gemini backend.
5. Save each recommendation. When signed out, confirm the app routes to login and then saves the pending recommendation without generating again.
6. Open **My Recommendations**, expand an entry to inspect its original requirements and saved response, then delete it and confirm removal.
7. Test an account with no saved entries for the empty state. Confirm a second user cannot read or delete the first user's entries under RLS.
8. If testing deployment, verify the Gemini key is absent from `dist` and from browser network requests.

Live Gemini, authentication and database operations require your own configured credentials and database setup; successful local builds do not test those external services.

Laptop recommendations still work without `GEMINI_API_KEY`: the server filters and ranks the local catalog, with optional Gemini ranking; if Gemini rate-limits the ranking request, it uses the local ranking instead. The PC component catalog requires the Supabase URL/key and the `build_pc_recommendation` RPC; it does not require Gemini. TechBot requires the backend key. Product images are not shown, and neither catalog provides live stock checks. Retailer buttons without verified listing URLs are searches, not product listings.
