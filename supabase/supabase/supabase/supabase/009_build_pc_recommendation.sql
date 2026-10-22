
CREATE OR REPLACE FUNCTION public.build_pc_recommendation(
    p_budget_max_inr NUMERIC,
    p_usd_to_inr NUMERIC DEFAULT 85
)
RETURNS TABLE (
    category TEXT,
    model TEXT,
    price_usd NUMERIC,
    price_inr NUMERIC,
    compatibility_status TEXT,
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
            ROUND(
                (c.specs->>'price')::NUMERIC * p_usd_to_inr,
                2
            ) AS price_inr,
            c.socket,
            c.ram_type,
            c.specs,
            b.budget_share,
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
          AND p_budget_max_inr > 0
          AND p_usd_to_inr > 0
          AND (c.specs->>'price')::NUMERIC * p_usd_to_inr
              <= p_budget_max_inr * b.budget_share
    ),
    cheapest AS (
        SELECT *
        FROM candidates
        WHERE rn = 1
    ),
    build_total AS (
        SELECT COALESCE(SUM(price_inr), 0) AS total_inr
        FROM cheapest
    )
    SELECT
        c.category,
        c.model,
        c.price_usd,
        c.price_inr,
        CASE
            WHEN c.category = 'cpu'
                 AND c.socket IS NULL
                THEN 'UNVERIFIED: CPU socket missing'
            WHEN c.category = 'motherboard'
                 AND c.ram_type IS NULL
                THEN 'UNVERIFIED: motherboard RAM type missing'
            ELSE 'NOT FULLY VERIFIED'
        END AS compatibility_status,
        c.specs
    FROM cheapest c
    CROSS JOIN build_total t
    WHERE t.total_inr <= p_budget_max_inr
    ORDER BY c.category;
$$;
