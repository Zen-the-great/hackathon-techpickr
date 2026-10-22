import { supabase } from "../supabaseClient.js";

const RPC_NAME = "build_pc_recommendation";
const DEFAULT_USD_TO_INR = 85;

function makeSupabaseError(error, context) {
  const code = error?.code ? ` [${error.code}]` : "";
  const message = error?.message || "Unknown Supabase error";
  const details = error?.details ? ` Details: ${error.details}` : "";
  const hint = error?.hint ? ` Hint: ${error.hint}` : "";
  return new Error(`${context}${code}: ${message}${details}${hint}`);
}

async function callRecommendationRpc(budget, exchangeRate) {
  // Support both deployed SQL signatures: the original two-argument function
  // and the newer three-argument function with p_candidate_limit.
  const attempts = [
    {
      p_budget_max_inr: budget,
      p_usd_to_inr: exchangeRate,
    },
    {
      p_budget_max_inr: budget,
      p_usd_to_inr: exchangeRate,
      p_candidate_limit: 32,
    },
  ];
  const errors = [];

  for (const args of attempts) {
    const { data, error } = await supabase.rpc(RPC_NAME, args);
    if (!error) {
      if (data !== null && !Array.isArray(data)) {
        throw new Error(`Supabase RPC ${RPC_NAME} returned an unexpected response type.`);
      }
      return { data: data ?? [], signature: Object.hasOwn(args, "p_candidate_limit") ? "3-argument" : "2-argument" };
    }

    errors.push(error);
    // Retry only for function/signature/schema-cache errors. Do not hide RLS,
    // network, or other operational errors by sending a second request.
    const code = String(error.code || "");
    const text = `${error.message || ""} ${error.details || ""}`.toLowerCase();
    const signatureMismatch = ["PGRST202", "PGRST203", "42883"].includes(code) ||
      text.includes("function") && (text.includes("not found") || text.includes("could not find") || text.includes("ambiguous"));
    if (!signatureMismatch) {
      throw makeSupabaseError(error, "Supabase PC recommendation request failed");
    }
  }

  throw makeSupabaseError(errors[errors.length - 1], "Supabase PC recommendation function signature does not match the frontend");
}

export async function getPCBuildRecommendation(answersOrBudget, usdToInr = DEFAULT_USD_TO_INR) {
  const budgetInput = answersOrBudget !== null && typeof answersOrBudget === "object"
    ? answersOrBudget.budget
    : answersOrBudget;
  const budget = Number(budgetInput);
  const exchangeRate = Number(usdToInr);

  if (!Number.isFinite(budget) || budget <= 0) {
    throw new Error("Enter a valid budget greater than ₹0.");
  }
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    throw new Error("The exchange rate must be greater than zero.");
  }
  if (!supabase) {
    throw new Error("Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local, then restart Vite.");
  }

  const { data, signature } = await callRecommendationRpc(budget, exchangeRate);
  const components = data.map((component) => {
    if (!component || typeof component !== "object") {
      throw new Error("Supabase returned an invalid component row.");
    }
    const rawPrice = component.price_inr;
    const hasPrice = rawPrice !== null && rawPrice !== undefined && !(typeof rawPrice === "string" && rawPrice.trim() === "");
    const numericPrice = hasPrice ? Number(rawPrice) : null;
    return {
      ...component,
      price_inr: Number.isFinite(numericPrice) && numericPrice > 0 ? numericPrice : null,
      compatibility_status: component.compatibility_status || "UNVERIFIED: compatibility data was not supplied by the database",
    };
  });

  const allPricesAvailable = components.length > 0 && components.every((component) => component.price_inr !== null);
  const totalPriceInr = allPricesAvailable ? components.reduce((sum, component) => sum + component.price_inr, 0) : null;

  return {
    components,
    totalPriceInr,
    budgetMaxInr: budget,
    allPricesAvailable,
    withinBudget: totalPriceInr === null ? null : totalPriceInr <= budget,
    recommendationSource: "supabase_rpc",
    sourceLabel: `Live Supabase RPC (${signature})`,
    diagnostic: components.length === 0
      ? "Supabase responded successfully, but the recommendation function returned zero rows. Check the function definition, category budget limits, and live component prices."
      : null,
  };
}
