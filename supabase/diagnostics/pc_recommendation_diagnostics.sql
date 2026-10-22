-- Read-only diagnostics for TechPickr PC recommendations.
-- Safe to run in the Supabase SQL editor; this script does not modify data.

-- 1. Confirm the component inventory and priced rows.
SELECT
  COUNT(*) AS total_components,
  COUNT(*) FILTER (WHERE source_name = 'pc-part-dataset') AS dataset_components,
  COUNT(*) FILTER (
    WHERE source_name = 'pc-part-dataset'
      AND trim(COALESCE(specs->>'price', '')) ~ '^[0-9]+(\.[0-9]+)?$'
      AND (specs->>'price')::numeric > 0
  ) AS dataset_numeric_positive_prices
FROM public.components;

-- 2. Check category spelling and data coverage.
SELECT category, COUNT(*) AS component_count,
       COUNT(*) FILTER (
         WHERE trim(COALESCE(specs->>'price', '')) ~ '^[0-9]+(\.[0-9]+)?$'
           AND (specs->>'price')::numeric > 0
       ) AS priced_count
FROM public.components
WHERE source_name = 'pc-part-dataset'
GROUP BY category
ORDER BY category;

-- 3. Show all visible overloads of the RPC. More than one overload can cause
-- PostgREST signature ambiguity when optional arguments overlap.
SELECT p.oid::regprocedure AS function_signature,
       pg_get_function_arguments(p.oid) AS arguments,
       pg_get_function_result(p.oid) AS result_type,
       p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'build_pc_recommendation'
ORDER BY p.oid::regprocedure::text;

-- 4. Run the two-argument signature currently used by the frontend.
-- An empty result is a successful SQL execution, but it means the function's
-- candidate filters did not select any parts for this budget.
SELECT * FROM public.build_pc_recommendation(60000, 85);
