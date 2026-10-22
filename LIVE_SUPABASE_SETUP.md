# TechPickr PC advisor: live Supabase troubleshooting

## What this update changes

- Keeps `Results.jsx` and `Results.css` dedicated to the existing laptop recommendation flow.
- Keeps the PC recommendation results on `/pc-builder` in `PcBuilder.jsx` and `PcBuilder.css`.
- Makes the PC recommendation client try both the two-argument and three-argument `build_pc_recommendation` RPC signatures when Supabase reports a function-signature/schema-cache error.
- Displays the recommendation source and gives a specific message when Supabase succeeds but returns zero rows.
- Adds a read-only SQL diagnostic script at `supabase/diagnostics/pc_recommendation_diagnostics.sql`.

## Configure credentials

This ZIP deliberately does not contain `.env.local`. In the project root (same folder as `package.json`), copy `.env.example` to `.env.local` and fill in your own values:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
```

Never put a Supabase service-role/secret key in a `VITE_` variable or frontend file. Do not share `.env.local` publicly.

Restart Vite after changing environment variables:

```powershell
# Stop the running server with Ctrl+C first
npm.cmd run dev
```

## Check the live database

1. Open the SQL Editor for the intended Supabase project.
2. Run `supabase/diagnostics/pc_recommendation_diagnostics.sql`. It is read-only.
3. Confirm the inventory count and category counts are nonzero.
4. Inspect the listed `build_pc_recommendation` signatures. If both two- and three-argument overloads exist, the frontend now retries the alternate signature when PostgREST reports a signature ambiguity.
5. Run `SELECT * FROM public.build_pc_recommendation(60000, 85);` and check that rows are returned.
6. In the browser, open DevTools → Network, submit `/pc-builder`, and inspect the `/rest/v1/rpc/build_pc_recommendation` request and response.

## Important limitation

The currently checked-in SQL function chooses the cheapest part in each category's budget share. It does **not** implement a full compatibility search, and a nonempty result is not proof that all parts work together. The UI must continue to describe compatibility as unverified unless the compatibility checks have actually been performed. Benchmark calibration is also not established by this SQL function.
