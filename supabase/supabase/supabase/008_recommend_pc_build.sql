
CREATE OR REPLACE FUNCTION public.recommend_pc_build(
    p_budget_max_inr NUMERIC,
    p_usd_to_inr NUMERIC DEFAULT 85
)
RETURNS TABLE (
    category TEXT,
    model TEXT,
    price_usd NUMERIC,
    price_inr NUMERIC,
    specs JSONB
)
LANGUAGE SQL
STABLE
AS $$
    WITH category_budgets AS (
        SELECT *
        FROM (
            VALUES
                ('cpu', 0.20::NUMERIC),
                ('gpu', 0.35::NUMERIC),
                ('motherboard', 0.12::NUMERIC),
                ('ram', 0.08::NUMERIC),
                ('storage', 0.08::NUMERIC),
                ('psu', 0.07::NUMERIC),
                ('case', 0.06::NUMERIC),
                ('cooler', 0.04::NUMERIC)
        ) AS b(category, budget_share)
    ),
    candidates AS (
        SELECT
            c.category,
            c.model,
            (c.specs->>'price')::NUMERIC AS price_usd,
            c.specs,
            ROW_NUMBER() OVER (
                PARTITION BY c.category
                ORDER BY (c.specs->>'price')::NUMERIC ASC
            ) AS rn
        FROM public.components c
        JOIN category_budgets b
          ON b.category = c.category
        WHERE c.source_name = 'pc-part-dataset'
          AND (c.specs->>'price') ~ '^[0-9]+(\.[0-9]+)?$'
          AND (c.specs->>'price')::NUMERIC > 0
          AND (c.specs->>'price')::NUMERIC * p_usd_to_inr
              <= p_budget_max_inr * b.budget_share
    )
    SELECT
        c.category,
        c.model,
        c.price_usd,
        ROUND(c.price_usd * p_usd_to_inr, 2),
        c.specs
    FROM candidates c
    WHERE c.rn <= 3
    ORDER BY c.category, c.price_usd ASC;
$$;
