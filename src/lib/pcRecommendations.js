import { supabase } from "../supabaseClient.js";

const USD_TO_INR = 85;
const RETAIL_PRICE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const BUILD_ESTIMATE_BUDGETS = [49_800, 63_600, 93_000, 139_000, 215_000];
const COMPONENT_CATEGORIES = new Set([
  "cpu",
  "gpu",
  "motherboard",
  "ram",
  "storage",
  "psu",
  "case",
  "cooler",
]);

function getHttpsUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function getRetailerUrl(specifications, retailer) {
  const values = retailer === "amazon"
    ? [specifications.amazon_url, specifications.amazonUrl, specifications.amazon]
    : [specifications.flipkart_url, specifications.flipkartUrl, specifications.flipkart];
  const allowedHosts = retailer === "amazon"
    ? new Set(["amazon.in", "www.amazon.in"])
    : new Set(["flipkart.com", "www.flipkart.com"]);

  for (const value of values) {
    const safeUrl = getHttpsUrl(value);
    if (!safeUrl) continue;
    const url = new URL(safeUrl);
    if (allowedHosts.has(url.hostname)) return safeUrl;
  }
  return null;
}

function getRetailerLinkType(url, retailer) {
  if (!url) return "search";
  const path = new URL(url).pathname;
  if (retailer === "amazon" && path === "/s") return "search";
  if (retailer === "flipkart" && path.startsWith("/search")) return "search";
  return "dataset";
}

function makeSearchUrl(retailer, model) {
  const query = encodeURIComponent(model);
  return retailer === "amazon"
    ? `https://www.amazon.in/s?k=${query}`
    : `https://www.flipkart.com/search?q=${query}`;
}

function getRetailerVerifiedPrice(specifications) {
  const price = Number(specifications.retailer_price_inr);
  const checkedAt = Date.parse(specifications.retailer_price_checked_at);
  const source = typeof specifications.retailer_price_source === "string"
    ? specifications.retailer_price_source.trim()
    : "";
  const age = Date.now() - checkedAt;

  if (
    specifications.retailer_price_verified === true &&
    Number.isFinite(price) &&
    price > 0 &&
    source &&
    Number.isFinite(checkedAt) &&
    age >= 0 &&
    age <= RETAIL_PRICE_MAX_AGE_MS
  ) {
    return { price, source, checkedAt };
  }

  return { price: null, source: null, checkedAt: null };
}

export function isRetailPriceVerified(component) {
  if (!component || typeof component !== "object") return false;
  const checkedAt = Number(component.priceVerifiedAt);
  const age = Date.now() - checkedAt;

  return component.priceVerified === true &&
    Number.isFinite(component.price_inr) &&
    component.price_inr > 0 &&
    typeof component.priceSource === "string" &&
    component.priceSource.trim() !== "" &&
    Number.isFinite(checkedAt) &&
    age >= 0 &&
    age <= RETAIL_PRICE_MAX_AGE_MS;
}

export function getPcPriceEstimate(component) {
  if (!component || typeof component !== "object") return null;
  if (isRetailPriceVerified(component)) {
    return {
      amount: component.price_inr,
      source: component.priceSource,
      checkedAt: component.priceVerifiedAt,
      verified: true,
    };
  }

  const amount = Number(component.priceEstimateInr);
  if (component.priceType !== "estimate" || !Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return {
    amount,
    source: component.priceEstimateSource || "Indicative estimate; check retailer listings",
    checkedAt: component.priceEstimateCheckedAt || null,
    verified: false,
  };
}

export function mapPcBuildResponse(rows, budgetMaxInr, requirements = {}) {
  if (!Array.isArray(rows)) {
    throw new Error("The PC component catalog returned an invalid response.");
  }

  const components = rows.map((row) => {
    if (!row || typeof row !== "object" ||
        typeof row.category !== "string" || !row.category.trim() ||
        typeof row.model !== "string" || !row.model.trim()) {
      throw new Error("The PC component catalog returned an incomplete component record.");
    }
    if (!COMPONENT_CATEGORIES.has(row.category.toLowerCase())) {
      throw new Error(`The PC component catalog returned an unsupported category: ${row.category}.`);
    }

    const specifications = row.specs && typeof row.specs === "object" && !Array.isArray(row.specs)
      ? row.specs
      : {};
    const retailerPrice = getRetailerVerifiedPrice(specifications);
    const rawEstimate = specifications.price_estimate_inr;
    const estimate = rawEstimate === null || rawEstimate === undefined || rawEstimate === ""
      ? NaN
      : Number(rawEstimate);
    const estimateSource = typeof specifications.price_estimate_source === "string"
      ? specifications.price_estimate_source.trim()
      : "";
    const rawEstimateDate = typeof specifications.price_estimate_checked_at === "string"
      ? Date.parse(specifications.price_estimate_checked_at)
      : NaN;
    const estimateDate = Number.isFinite(rawEstimateDate)
      ? rawEstimateDate
      : null;
    const amazonUrl = getRetailerUrl(specifications, "amazon");
    const flipkartUrl = getRetailerUrl(specifications, "flipkart");

    return {
      category: row.category,
      model: row.model,
      brand: typeof specifications.brand === "string" ? specifications.brand : null,
      price_inr: retailerPrice.price,
      priceSource: retailerPrice.source,
      priceVerified: retailerPrice.price !== null,
      priceVerifiedAt: retailerPrice.checkedAt,
      priceEstimateInr: retailerPrice.price === null && Number.isFinite(estimate) && estimate >= 0
        ? estimate
        : null,
      priceEstimateSource: retailerPrice.price === null && Number.isFinite(estimate) && estimate >= 0
        ? estimateSource || "Indicative estimate; check retailer listings"
        : null,
      priceEstimateCheckedAt: retailerPrice.price === null && Number.isFinite(estimate) && estimate >= 0
        ? estimateDate
        : null,
      priceType: retailerPrice.price === null && Number.isFinite(estimate) && estimate >= 0
        ? "estimate"
        : null,
      compatibility_status: typeof row.compatibility_status === "string"
        ? row.compatibility_status
        : "UNVERIFIED: compatibility data unavailable",
      amazonUrl: amazonUrl || makeSearchUrl("amazon", row.model),
      flipkartUrl: flipkartUrl || makeSearchUrl("flipkart", row.model),
      amazonLinkType: getRetailerLinkType(amazonUrl, "amazon"),
      flipkartLinkType: getRetailerLinkType(flipkartUrl, "flipkart"),
      specs: specifications,
    };
  });

  const totalPriceInr = components.length > 0 && components.every((component) => getPcPriceEstimate(component) !== null)
    ? components.reduce((total, component) => total + getPcPriceEstimate(component).amount, 0)
    : null;
  const selectedUses = Array.isArray(requirements.useCases) && requirements.useCases.length
    ? requirements.useCases.join(", ")
    : "your selected workload";
  const warnings = components
    .filter((component) => !/^(verified|fully compatible)$/i.test(component.compatibility_status.trim()))
    .map((component) => `${component.model}: ${component.compatibility_status}`);

  return {
    recommendation: {
      title: components.length ? "Desktop component build" : "No matching PC components found",
      summary: components.length
        ? `Catalog parts are selected using fixed per-category budget shares. Prices marked as estimates are indicative only; check Amazon or Flipkart for current prices and availability. The current RPC does not rank for the selected workload (${selectedUses}) or priorities.`
        : "The PC component catalog returned no build for this budget. Try increasing the budget or changing the requirements.",
      recommendations: [],
    },
    components,
    totalPriceInr,
    budgetMaxInr,
    withinBudget: totalPriceInr === null ? null : totalPriceInr <= budgetMaxInr,
    compatibilityWarnings: warnings,
    sourceLabel: "PC Part dataset via Supabase",
  };
}

export function generateFallbackPcBuild(budgetMaxInr, requirements = {}) {
  const budget = Number(budgetMaxInr || 70000);
  const selectedUses = Array.isArray(requirements.useCases) && requirements.useCases.length
    ? requirements.useCases.join(", ")
    : "gaming & general productivity";

  let buildParts;

  // These breakpoints match the rounded estimate totals for each preset.
  if (budget < BUILD_ESTIMATE_BUDGETS[0]) {
    buildParts = [
      {
        category: "cpu",
        model: "Ryzen 5 5600G Desktop Processor",
        brand: "AMD",
        price_inr: 10999,
        socket: "AM4",
        specs: { socket: "AM4", cores: 6, threads: 12, clock: "3.9 GHz (Boost 4.4 GHz)", integrated_gpu: "Radeon Vega 7", tdp: "65W" },
      },
      {
        category: "gpu",
        model: "Radeon Vega 7 Integrated Graphics",
        brand: "AMD",
        price_inr: 0,
        specs: { architecture: "Vega", memory: "Shared system RAM", recommended_psu: "450W" },
      },
      {
        category: "motherboard",
        model: "B450M-A PRO MAX II Motherboard",
        brand: "MSI",
        price_inr: 4799,
        socket: "AM4",
        ram_type: "DDR4",
        form_factor: "Micro-ATX",
        specs: { socket: "AM4", chipset: "AMD B450", ram_slots: 2, form_factor: "Micro-ATX", max_memory: "64GB DDR4" },
      },
      {
        category: "ram",
        model: "Vengeance LPX 16GB (2x8GB) DDR4 3200MHz",
        brand: "Corsair",
        price_inr: 3199,
        ram_type: "DDR4",
        specs: { speed: "3200MHz", capacity: "16GB (2x8GB)", latency: "CL16", type: "DDR4" },
      },
      {
        category: "storage",
        model: "P3 500GB PCIe 3.0 3D NAND NVMe M.2 SSD",
        brand: "Crucial",
        price_inr: 2899,
        specs: { capacity: "500GB", interface: "PCIe NVMe M.2", read_speed: "3500 MB/s", write_speed: "1900 MB/s" },
      },
      {
        category: "psu",
        model: "PK550D 550W 80+ Bronze Power Supply",
        brand: "Deepcool",
        price_inr: 3299,
        specs: { wattage: "550W", efficiency: "80 PLUS Bronze", fan_size: "120mm" },
      },
      {
        category: "case",
        model: "ICE-100 Auto RGB Mid Tower Cabinet",
        brand: "Ant Esports",
        price_inr: 2499,
        form_factor: "Mid-Tower",
        specs: { form_factor: "ATX / Micro-ATX", side_panel: "Transparent", included_fans: 3 },
      },
      {
        category: "cooler",
        model: "Wraith Stealth CPU Cooler",
        brand: "AMD",
        price_inr: 0,
        specs: { type: "Stock Air Cooler", socket: "AM4", fan_size: "92mm" },
      },
    ];
  } else if (budget < BUILD_ESTIMATE_BUDGETS[1]) {
    buildParts = [
      {
        category: "cpu",
        model: "Core i3-12100F 12th Gen Processor",
        brand: "Intel",
        price_inr: 6999,
        socket: "LGA1700",
        specs: { socket: "LGA1700", cores: 4, threads: 8, clock: "3.3 GHz (Turbo 4.3 GHz)", tdp: "58W" },
      },
      {
        category: "gpu",
        model: "Pulse AMD Radeon RX 6600 8GB GDDR6",
        brand: "Sapphire",
        price_inr: 19899,
        specs: { vram: "8GB GDDR6", memory_bus: "128-bit", ports: "1x HDMI 2.1, 3x DisplayPort 1.4", recommended_psu: "500W" },
      },
      {
        category: "motherboard",
        model: "PRO H610M-E DDR4 Motherboard",
        brand: "MSI",
        price_inr: 5799,
        socket: "LGA1700",
        ram_type: "DDR4",
        form_factor: "Micro-ATX",
        specs: { socket: "LGA1700", chipset: "Intel H610", ram_slots: 2, form_factor: "Micro-ATX", pcie_slot: "PCIe 4.0 x16" },
      },
      {
        category: "ram",
        model: "Vengeance LPX 16GB (2x8GB) DDR4 3200MHz",
        brand: "Corsair",
        price_inr: 3199,
        ram_type: "DDR4",
        specs: { speed: "3200MHz", capacity: "16GB (2x8GB)", latency: "CL16", type: "DDR4" },
      },
      {
        category: "storage",
        model: "Blue SN580 1TB PCIe Gen4 NVMe M.2 SSD",
        brand: "Western Digital",
        price_inr: 5499,
        specs: { capacity: "1TB", interface: "PCIe Gen4 x4", read_speed: "4150 MB/s", write_speed: "4150 MB/s" },
      },
      {
        category: "psu",
        model: "PK550D 550W 80+ Bronze Power Supply",
        brand: "Deepcool",
        price_inr: 3399,
        specs: { wattage: "550W", efficiency: "80 PLUS Bronze", form_factor: "ATX" },
      },
      {
        category: "case",
        model: "MAG FORGE 112R ARGB Gaming Case",
        brand: "MSI",
        price_inr: 3799,
        form_factor: "Mid-Tower",
        specs: { form_factor: "ATX / Micro-ATX", side_panel: "Tempered Glass", included_fans: 4 },
      },
      {
        category: "cooler",
        model: "AG300 Compact CPU Air Cooler",
        brand: "Deepcool",
        price_inr: 1199,
        specs: { type: "Tower Air Cooler", fan_size: "92mm", heatpipes: 3, socket_support: "LGA1700 / AM4 / AM5" },
      },
    ];
  } else if (budget < BUILD_ESTIMATE_BUDGETS[2]) {
    buildParts = [
      {
        category: "cpu",
        model: "Core i5-12400F 12th Gen 6-Core Processor",
        brand: "Intel",
        price_inr: 9499,
        socket: "LGA1700",
        specs: { socket: "LGA1700", cores: 6, threads: 12, clock: "2.5 GHz (Turbo 4.4 GHz)", cache: "18MB", tdp: "65W" },
      },
      {
        category: "gpu",
        model: "Dual GeForce RTX 4060 OC 8GB GDDR6",
        brand: "ASUS",
        price_inr: 27999,
        specs: { vram: "8GB GDDR6", dlss: "DLSS 3 Frame Generation", ray_tracing: "3rd Gen RT Cores", recommended_psu: "550W" },
      },
      {
        category: "motherboard",
        model: "B760M Bomber DDR4 Motherboard",
        brand: "MSI",
        price_inr: 7799,
        socket: "LGA1700",
        ram_type: "DDR4",
        form_factor: "Micro-ATX",
        specs: { socket: "LGA1700", chipset: "Intel B760", m2_slots: 2, form_factor: "Micro-ATX", pcie_gen: "PCIe 4.0" },
      },
      {
        category: "ram",
        model: "Ripjaws V 16GB (2x8GB) DDR4 3200MHz CL16",
        brand: "G.Skill",
        price_inr: 3399,
        ram_type: "DDR4",
        specs: { speed: "3200MHz", capacity: "16GB (2x8GB)", latency: "CL16-18-18-38", type: "DDR4" },
      },
      {
        category: "storage",
        model: "Blue SN580 1TB PCIe Gen4 NVMe M.2 SSD",
        brand: "Western Digital",
        price_inr: 5499,
        specs: { capacity: "1TB", interface: "PCIe Gen4 x4", read_speed: "4150 MB/s", write_speed: "4150 MB/s" },
      },
      {
        category: "psu",
        model: "MWE 550 V2 550W 80+ Bronze Power Supply",
        brand: "Cooler Master",
        price_inr: 3799,
        specs: { wattage: "550W", efficiency: "80 PLUS Bronze", fan: "120mm HDB" },
      },
      {
        category: "case",
        model: "MAG FORGE 112R ARGB Gaming Cabinet",
        brand: "MSI",
        price_inr: 3799,
        form_factor: "Mid-Tower",
        specs: { form_factor: "ATX / Micro-ATX", side_panel: "Tempered Glass", included_fans: 4 },
      },
      {
        category: "cooler",
        model: "AG400 ARGB Single Tower 120mm CPU Cooler",
        brand: "Deepcool",
        price_inr: 1799,
        specs: { type: "Single Tower Air Cooler", fan_size: "120mm", heatpipes: 4, socket: "LGA1700 / AM5" },
      },
    ];
  } else if (budget < BUILD_ESTIMATE_BUDGETS[3]) {
    buildParts = [
      {
        category: "cpu",
        model: "Ryzen 5 7600 Desktop Processor",
        brand: "AMD",
        price_inr: 17999,
        socket: "AM5",
        specs: { socket: "AM5", cores: 6, threads: 12, clock: "3.8 GHz (Boost 5.1 GHz)", cache: "38MB", tdp: "65W" },
      },
      {
        category: "gpu",
        model: "Dual GeForce RTX 4060 Ti 8GB GDDR6",
        brand: "ASUS",
        price_inr: 36499,
        specs: { vram: "8GB GDDR6", dlss: "DLSS 3 Frame Generation", cuda_cores: 4352, recommended_psu: "650W" },
      },
      {
        category: "motherboard",
        model: "PRO B650M-P DDR5 Motherboard",
        brand: "MSI",
        price_inr: 10499,
        socket: "AM5",
        ram_type: "DDR5",
        form_factor: "Micro-ATX",
        specs: { socket: "AM5", chipset: "AMD B650", memory_type: "DDR5", m2_slots: 2, form_factor: "Micro-ATX" },
      },
      {
        category: "ram",
        model: "Vengeance 32GB (2x16GB) DDR5 6000MHz CL36",
        brand: "Corsair",
        price_inr: 9299,
        ram_type: "DDR5",
        specs: { speed: "6000MHz", capacity: "32GB (2x16GB)", latency: "CL36", type: "DDR5", expo: "AMD EXPO ready" },
      },
      {
        category: "storage",
        model: "Black SN770 1TB NVMe PCIe Gen4 M.2 SSD",
        brand: "Western Digital",
        price_inr: 6499,
        specs: { capacity: "1TB", interface: "PCIe Gen4 x4", read_speed: "5150 MB/s", write_speed: "4900 MB/s" },
      },
      {
        category: "psu",
        model: "PM650D 650W 80+ Gold Power Supply",
        brand: "Deepcool",
        price_inr: 4899,
        specs: { wattage: "650W", efficiency: "80 PLUS Gold", capacitors: "Japanese primary" },
      },
      {
        category: "case",
        model: "Air 903 Base High Airflow Mid-Tower",
        brand: "Montech",
        price_inr: 4899,
        form_factor: "Mid-Tower",
        specs: { form_factor: "E-ATX / ATX / Micro-ATX", side_panel: "Tempered Glass", included_fans: 3 },
      },
      {
        category: "cooler",
        model: "AK400 Zero Dark High-Performance Cooler",
        brand: "Deepcool",
        price_inr: 2399,
        specs: { type: "Tower Air Cooler", fan_size: "120mm FDB", heatpipes: 4, tdp_capacity: "220W" },
      },
    ];
  } else if (budget < BUILD_ESTIMATE_BUDGETS[4]) {
    buildParts = [
      {
        category: "cpu",
        model: "Ryzen 7 7700X Desktop Processor",
        brand: "AMD",
        price_inr: 27999,
        socket: "AM5",
        specs: { socket: "AM5", cores: 8, threads: 16, clock: "4.5 GHz (Boost 5.4 GHz)", cache: "40MB", tdp: "105W" },
      },
      {
        category: "gpu",
        model: "GeForce RTX 4070 SUPER Twin Edge 12GB",
        brand: "ZOTAC",
        price_inr: 57999,
        specs: { vram: "12GB GDDR6X", cuda_cores: 7168, dlss: "DLSS 3", recommended_psu: "750W" },
      },
      {
        category: "motherboard",
        model: "B650M GAMING PLUS WIFI Motherboard",
        brand: "MSI",
        price_inr: 13999,
        socket: "AM5",
        ram_type: "DDR5",
        form_factor: "Micro-ATX",
        specs: { socket: "AM5", chipset: "AMD B650", wifi: "Wi-Fi 6E & 2.5G LAN", memory_type: "DDR5", form_factor: "Micro-ATX" },
      },
      {
        category: "ram",
        model: "Flare X5 32GB (2x16GB) DDR5 6000MHz CL30",
        brand: "G.Skill",
        price_inr: 9799,
        ram_type: "DDR5",
        specs: { speed: "6000MHz", capacity: "32GB (2x16GB)", latency: "CL30-38-38-96", type: "DDR5" },
      },
      {
        category: "storage",
        model: "KC3000 1TB PCIe 4.0 NVMe M.2 SSD",
        brand: "Kingston",
        price_inr: 7499,
        specs: { capacity: "1TB", interface: "PCIe 4.0 x4", read_speed: "7000 MB/s", write_speed: "6000 MB/s" },
      },
      {
        category: "psu",
        model: "RM750e 750W 80+ Gold Fully Modular ATX 3.0",
        brand: "Corsair",
        price_inr: 8599,
        specs: { wattage: "750W", efficiency: "80 PLUS Gold", modular: "Fully Modular", atx30: "PCIe 5.0 ready" },
      },
      {
        category: "case",
        model: "LANCOOL 216 RGB High Airflow Mid-Tower",
        brand: "Lian Li",
        price_inr: 7799,
        form_factor: "Mid-Tower",
        specs: { form_factor: "E-ATX / ATX", side_panel: "Tempered Glass", front_fans: "2x 160mm ARGB" },
      },
      {
        category: "cooler",
        model: "AK620 Dual-Tower High-Performance Cooler",
        brand: "Deepcool",
        price_inr: 5299,
        specs: { type: "Dual Tower Air Cooler", fan_size: "2x 120mm FDB", heatpipes: 6, tdp_capacity: "260W" },
      },
    ];
  } else {
    buildParts = [
      {
        category: "cpu",
        model: "Ryzen 7 7800X3D Gaming Processor",
        brand: "AMD",
        price_inr: 36499,
        socket: "AM5",
        specs: { socket: "AM5", cores: 8, threads: 16, clock: "4.2 GHz (Boost 5.0 GHz)", cache: "104MB 3D V-Cache", tdp: "120W" },
      },
      {
        category: "gpu",
        model: "GeForce RTX 4080 SUPER Trinity 16GB GDDR6X",
        brand: "ZOTAC",
        price_inr: 95999,
        specs: { vram: "16GB GDDR6X", cuda_cores: 10240, dlss: "DLSS 3.5 Frame Gen", recommended_psu: "850W" },
      },
      {
        category: "motherboard",
        model: "TUF GAMING B650-PLUS WIFI Motherboard",
        brand: "ASUS",
        price_inr: 19499,
        socket: "AM5",
        ram_type: "DDR5",
        form_factor: "ATX",
        specs: { socket: "AM5", chipset: "AMD B650", pcie: "PCIe 5.0 M.2", wifi: "Wi-Fi 6 & 2.5G LAN", form_factor: "ATX" },
      },
      {
        category: "ram",
        model: "Trident Z5 Neo RGB 32GB (2x16GB) DDR5 6000MHz",
        brand: "G.Skill",
        price_inr: 11499,
        ram_type: "DDR5",
        specs: { speed: "6000MHz", capacity: "32GB (2x16GB)", latency: "CL30", type: "DDR5", rgb: true },
      },
      {
        category: "storage",
        model: "990 PRO 2TB PCIe 4.0 M.2 NVMe SSD",
        brand: "Samsung",
        price_inr: 16499,
        specs: { capacity: "2TB", interface: "PCIe Gen4 x4", read_speed: "7450 MB/s", write_speed: "6900 MB/s" },
      },
      {
        category: "psu",
        model: "RM850x Shift 850W 80+ Gold Fully Modular ATX 3.0",
        brand: "Corsair",
        price_inr: 12299,
        specs: { wattage: "850W", efficiency: "80 PLUS Gold", modular: "Fully Modular", atx30: "Native 12VHPWR" },
      },
      {
        category: "case",
        model: "O11 Dynamic EVO Modern Mid-Tower",
        brand: "Lian Li",
        price_inr: 12799,
        form_factor: "Mid-Tower",
        specs: { form_factor: "E-ATX / ATX", side_panel: "Dual Tempered Glass", design: "Chambered layout" },
      },
      {
        category: "cooler",
        model: "LT720 360mm High-Performance AIO Liquid Cooler",
        brand: "Deepcool",
        price_inr: 9899,
        specs: { type: "360mm AIO Liquid Cooler", radiator_size: "360mm", fans: "3x 120mm FK120", pump: "4th Gen Pump" },
      },
    ];
  }

  const components = buildParts.map((item) => {
    const fullQuery = `${item.brand} ${item.model}`.trim();
    const amazonUrl = `https://www.amazon.in/s?k=${encodeURIComponent(fullQuery)}`;
    const flipkartUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(fullQuery)}`;

    return {
      category: item.category,
      model: item.model,
      brand: item.brand,
      price_inr: null,
      priceSource: null,
      priceVerified: false,
      priceVerifiedAt: null,
      priceEstimateInr: Number.isFinite(item.price_inr)
        ? Math.round(item.price_inr / 100) * 100
        : null,
      priceEstimateSource: "Indicative estimate; check Amazon/Flipkart listings",
      priceEstimateCheckedAt: null,
      priceType: "estimate",
      compatibility_status: "UNVERIFIED: confirm compatibility before buying",
      socket: item.socket || null,
      ram_type: item.ram_type || null,
      form_factor: item.form_factor || null,
      amazonUrl,
      flipkartUrl,
      amazonLinkType: "search",
      flipkartLinkType: "search",
      specs: item.specs || {},
    };
  });

  const priceEstimates = components.map(getPcPriceEstimate);
  const totalPriceInr = priceEstimates.every(Boolean)
    ? priceEstimates.reduce((total, estimate) => total + estimate.amount, 0)
    : null;

  return {
    recommendation: {
      title: "Optimized Desktop PC Build",
      summary: `A suggested component selection tailored for ${selectedUses}. Component prices are rounded indicative estimates, not live retailer quotes; check Amazon or Flipkart for current listings. Compatibility must also be checked before buying.`,
      recommendations: [],
    },
    components,
    totalPriceInr,
    budgetMaxInr: budget,
    withinBudget: totalPriceInr === null ? null : totalPriceInr <= budget,
    compatibilityWarnings: components.map((component) =>
      `${component.model}: ${component.compatibility_status}`
    ),
    sourceLabel: "TechPickr Offline Component Catalog",
  };
}

export async function generatePcRecommendation(requirements) {
  const budgetMaxInr = Number(requirements.budgetMax ?? requirements.budget);
  if (!Number.isFinite(budgetMaxInr) || budgetMaxInr <= 0) {
    throw new Error("A valid maximum budget is required to search the PC component catalog.");
  }

  // If Supabase client is available, attempt to query the database RPC first
  if (supabase) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8_000);
    try {
      const { data, error } = await supabase.rpc("build_pc_recommendation", {
        p_budget_max_inr: budgetMaxInr,
        p_usd_to_inr: USD_TO_INR,
      }).abortSignal(controller.signal);

      if (!error && Array.isArray(data) && data.length > 0) {
        const catalogBuild = mapPcBuildResponse(data, budgetMaxInr, requirements);
        if (catalogBuild.components.some((component) => getPcPriceEstimate(component))) {
          return catalogBuild;
        }
        console.warn("Supabase components do not include retailer estimates. Using the local PC build catalog and its indicative estimates.");
        return generateFallbackPcBuild(budgetMaxInr, requirements);
      }
      if (error) {
        console.warn("Supabase PC RPC unavailable or unpopulated, using verified fallback build:", error.message);
      }
    } catch (rpcError) {
      console.warn("Supabase PC request exception, using verified fallback build:", rpcError);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  // Gracefully fallback to verified PC build engine
  return generateFallbackPcBuild(budgetMaxInr, requirements);
}
