-- ============================================================================
-- TechPickr PC Component Schema & Recommendation RPC Setup
-- Execute this script in your Supabase SQL Editor if you want to store and
-- query PC components directly from your Supabase PostgreSQL database.
-- ============================================================================

-- 1. Create the components table
CREATE TABLE IF NOT EXISTS public.components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    model TEXT NOT NULL,
    brand TEXT,
    socket TEXT,
    ram_type TEXT,
    form_factor TEXT,
    specs JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_name TEXT NOT NULL DEFAULT 'pc-part-dataset',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_components_category ON public.components(category);
CREATE INDEX IF NOT EXISTS idx_components_source ON public.components(source_name);

-- 3. Populate base PC components (prices in USD; converted at ₹85/USD by the RPC)
INSERT INTO public.components (category, model, brand, socket, ram_type, form_factor, specs, source_name)
VALUES
  -- CPUs
  ('cpu', 'AMD Ryzen 5 5600G Desktop Processor', 'AMD', 'AM4', 'DDR4', NULL, '{"price": 129, "cores": 6, "threads": 12, "clock": "3.9 GHz"}'::jsonb, 'pc-part-dataset'),
  ('cpu', 'Intel Core i3-12100F 12th Gen', 'Intel', 'LGA1700', 'DDR4', NULL, '{"price": 82, "cores": 4, "threads": 8, "clock": "3.3 GHz"}'::jsonb, 'pc-part-dataset'),
  ('cpu', 'Intel Core i5-12400F 12th Gen', 'Intel', 'LGA1700', 'DDR4', NULL, '{"price": 111, "cores": 6, "threads": 12, "clock": "2.5 GHz"}'::jsonb, 'pc-part-dataset'),
  ('cpu', 'AMD Ryzen 5 7600 Desktop Processor', 'AMD', 'AM5', 'DDR5', NULL, '{"price": 211, "cores": 6, "threads": 12, "clock": "3.8 GHz"}'::jsonb, 'pc-part-dataset'),
  ('cpu', 'AMD Ryzen 7 7800X3D Gaming Processor', 'AMD', 'AM5', 'DDR5', NULL, '{"price": 429, "cores": 8, "threads": 16, "clock": "4.2 GHz"}'::jsonb, 'pc-part-dataset'),

  -- GPUs
  ('gpu', 'Integrated Vega 7 Graphics', 'AMD', NULL, NULL, NULL, '{"price": 1, "vram": "Shared"}'::jsonb, 'pc-part-dataset'),
  ('gpu', 'Sapphire Pulse AMD Radeon RX 6600 8GB', 'Sapphire', NULL, NULL, NULL, '{"price": 234, "vram": "8GB GDDR6"}'::jsonb, 'pc-part-dataset'),
  ('gpu', 'ASUS Dual GeForce RTX 4060 OC 8GB', 'ASUS', NULL, NULL, NULL, '{"price": 329, "vram": "8GB GDDR6"}'::jsonb, 'pc-part-dataset'),
  ('gpu', 'ZOTAC Gaming GeForce RTX 4070 SUPER 12GB', 'ZOTAC', NULL, NULL, NULL, '{"price": 682, "vram": "12GB GDDR6X"}'::jsonb, 'pc-part-dataset'),

  -- Motherboards
  ('motherboard', 'MSI B450M-A PRO MAX II', 'MSI', 'AM4', 'DDR4', 'Micro-ATX', '{"price": 56, "chipset": "AMD B450"}'::jsonb, 'pc-part-dataset'),
  ('motherboard', 'MSI PRO H610M-E DDR4', 'MSI', 'LGA1700', 'DDR4', 'Micro-ATX', '{"price": 68, "chipset": "Intel H610"}'::jsonb, 'pc-part-dataset'),
  ('motherboard', 'MSI PRO B650M-P DDR5', 'MSI', 'AM5', 'DDR5', 'Micro-ATX', '{"price": 123, "chipset": "AMD B650"}'::jsonb, 'pc-part-dataset'),

  -- RAM
  ('ram', 'Corsair Vengeance LPX 16GB (2x8GB) DDR4 3200', 'Corsair', NULL, 'DDR4', NULL, '{"price": 37, "speed": "3200MHz", "capacity": "16GB"}'::jsonb, 'pc-part-dataset'),
  ('ram', 'Corsair Vengeance 32GB (2x16GB) DDR5 6000', 'Corsair', NULL, 'DDR5', NULL, '{"price": 109, "speed": "6000MHz", "capacity": "32GB"}'::jsonb, 'pc-part-dataset'),

  -- Storage
  ('storage', 'Crucial P3 500GB PCIe 3.0 NVMe SSD', 'Crucial', NULL, NULL, 'M.2 2280', '{"price": 34, "capacity": "500GB"}'::jsonb, 'pc-part-dataset'),
  ('storage', 'WD Blue SN580 1TB PCIe 4.0 NVMe SSD', 'Western Digital', NULL, NULL, 'M.2 2280', '{"price": 64, "capacity": "1TB"}'::jsonb, 'pc-part-dataset'),

  -- Power Supplies
  ('psu', 'Deepcool PK550D 550W 80+ Bronze', 'Deepcool', NULL, NULL, 'ATX', '{"price": 39, "wattage": "550W"}'::jsonb, 'pc-part-dataset'),
  ('psu', 'Cooler Master MWE 650W 80+ Bronze V2', 'Cooler Master', NULL, NULL, 'ATX', '{"price": 58, "wattage": "650W"}'::jsonb, 'pc-part-dataset'),
  ('psu', 'Corsair RM750e 750W 80+ Gold Fully Modular', 'Corsair', NULL, NULL, 'ATX', '{"price": 101, "wattage": "750W"}'::jsonb, 'pc-part-dataset'),

  -- Cases
  ('case', 'Ant Esports ICE-100 Auto RGB Mid Tower', 'Ant Esports', NULL, NULL, 'Mid-Tower', '{"price": 29, "side_panel": "Transparent"}'::jsonb, 'pc-part-dataset'),
  ('case', 'MSI MAG FORGE 112R ARGB Gaming Cabinet', 'MSI', NULL, NULL, 'Mid-Tower', '{"price": 44, "side_panel": "Tempered Glass"}'::jsonb, 'pc-part-dataset'),

  -- Coolers
  ('cooler', 'Wraith Stealth CPU Cooler', 'AMD', 'AM4', NULL, NULL, '{"price": 5, "type": "Air Cooler"}'::jsonb, 'pc-part-dataset'),
  ('cooler', 'Deepcool AG400 Single Tower 120mm Cooler', 'Deepcool', 'LGA1700/AM5', NULL, NULL, '{"price": 21, "type": "Tower Cooler"}'::jsonb, 'pc-part-dataset')
ON CONFLICT DO NOTHING;

-- 4. Enable Row Level Security (read-only for all users)
ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'components' AND policyname = 'components_select_public'
    ) THEN
        CREATE POLICY "components_select_public" ON public.components FOR SELECT TO anon, authenticated USING (true);
    END IF;
END $$;

-- 5. Create or Replace public.build_pc_recommendation function
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
SECURITY DEFINER
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
            ELSE 'Verified compatible: socket & power aligned'
        END AS compatibility_status,
        c.specs
    FROM cheapest c
    CROSS JOIN build_total t
    WHERE t.total_inr <= p_budget_max_inr
    ORDER BY c.category;
$$;

-- Grant execution to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.build_pc_recommendation(NUMERIC, NUMERIC) TO anon, authenticated;
