
CREATE OR REPLACE FUNCTION public.recommend_pc_components(
    p_budget_max_inr NUMERIC,
    p_category TEXT DEFAULT NULL,
    p_usd_to_inr NUMERIC DEFAULT 85
)
RETURNS TABLE (
    id UUID,
    category TEXT,
    brand TEXT,
    model TEXT,
    price_usd NUMERIC,
    price_inr NUMERIC,
    socket TEXT,
    ram_type TEXT,
    specs JSONB
)
LANGUAGE SQL
STABLE
AS $$
    SELECT
        c.id,
        c.category,
        c.brand,
        c.model,
        (c.specs->>'price')::NUMERIC AS price_usd,
        ROUND(
            (c.specs->>'price')::NUMERIC * p_usd_to_inr,
            2
        ) AS price_inr,
        c.socket,
        c.ram_type,
        c.specs
    FROM public.components AS c
    WHERE c.source_name = 'pc-part-dataset'
      AND (c.specs->>'price') ~ '^[0-9]+(\.[0-9]+)?$'
      AND (c.specs->>'price')::NUMERIC > 0
      AND p_budget_max_inr > 0
      AND p_usd_to_inr > 0
      AND (
          p_category IS NULL
          OR c.category = LOWER(p_category)
      )
      AND (c.specs->>'price')::NUMERIC * p_usd_to_inr
          <= p_budget_max_inr
    ORDER BY
        (c.specs->>'price')::NUMERIC ASC
    LIMIT 100;
$$;
