import { supabase } from "../supabaseClient.js";

const USD_TO_INR = 85;
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
    const priceUsd = Number(row.price_usd);
    const priceInr = Number(row.price_inr);
    const amazonUrl = getRetailerUrl(specifications, "amazon");
    const flipkartUrl = getRetailerUrl(specifications, "flipkart");

    return {
      category: row.category,
      model: row.model,
      brand: typeof specifications.brand === "string" ? specifications.brand : null,
      priceUsd: Number.isFinite(priceUsd) && priceUsd > 0 ? priceUsd : null,
      price_inr: Number.isFinite(priceInr) && priceInr > 0 ? priceInr : null,
      priceSource: "PC Part dataset price converted at ₹85/USD",
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

  const totalPriceInr = components.length > 0 && components.every((component) => component.price_inr !== null)
    ? components.reduce((total, component) => total + component.price_inr, 0)
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
        ? `Catalog parts are selected using fixed per-category budget shares. The current RPC does not rank for the selected workload (${selectedUses}) or priorities. Compatibility and current availability have not been verified.`
        : "The PC component catalog returned no build for this budget. Try increasing the budget or changing the requirements.",
      recommendations: [],
    },
    components,
    totalPriceInr,
    budgetMaxInr,
    withinBudget: totalPriceInr === null ? null : totalPriceInr <= budgetMaxInr,
    compatibilityWarnings: warnings,
    sourceLabel: "PC Part dataset via Supabase",
    conversionRateInrPerUsd: USD_TO_INR,
  };
}

export async function generatePcRecommendation(requirements) {
  if (!supabase) {
    throw new Error("The PC component catalog is unavailable. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  const budgetMaxInr = Number(requirements.budgetMax ?? requirements.budget);
  if (!Number.isFinite(budgetMaxInr) || budgetMaxInr <= 0) {
    throw new Error("A valid maximum budget is required to search the PC component catalog.");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30_000);
  try {
    const { data, error } = await supabase.rpc("build_pc_recommendation", {
      p_budget_max_inr: budgetMaxInr,
      p_usd_to_inr: USD_TO_INR,
    }).abortSignal(controller.signal);

    if (controller.signal.aborted) {
      throw new Error("The PC component catalog request timed out. Retry the component search.");
    }
    if (error) {
      const setupGuidance = ["PGRST202", "PGRST205"].includes(error.code)
        ? "Install public.build_pc_recommendation and populate public.components with PC Part dataset records."
        : "Check that the PC component data is readable by the application.";
      throw new Error(`Could not load PC components from Supabase: ${error.message}. ${setupGuidance}`);
    }

    return mapPcBuildResponse(data, budgetMaxInr, requirements);
  } catch (error) {
    if (controller.signal.aborted &&
        !(error instanceof Error && error.message.includes("timed out"))) {
      throw new Error("The PC component catalog request timed out. Retry the component search.", { cause: error });
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
