
import { supabase } from "../supabaseClient";

/**
 * Fetch PC build recommendations from Supabase.
 *
 * @param {number} budgetMaxInr - Maximum budget in INR.
 * @param {number} usdToInr - Configurable USD-to-INR conversion rate.
 */
export async function getPCBuildRecommendation(
  budgetMaxInr,
  usdToInr = 85
) {
  if (!Number.isFinite(budgetMaxInr) || budgetMaxInr <= 0) {
    throw new Error("Enter a valid PC budget in INR.");
  }

  const { data, error } = await supabase.rpc(
    "build_pc_recommendation",
    {
      p_budget_max_inr: budgetMaxInr,
      p_usd_to_inr: usdToInr,
    }
  );

  if (error) {
    console.error("PC recommendation error:", error);
    throw new Error(error.message);
  }

  const components = data ?? [];

  const totalPriceInr = components.reduce(
    (total, component) => total + Number(component.price_inr || 0),
    0
  );

  return {
    components,
    totalPriceInr,
    withinBudget: totalPriceInr <= budgetMaxInr,
  };
}
