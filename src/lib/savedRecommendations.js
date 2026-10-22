import { supabase } from "../supabaseClient.js";

export const PENDING_RECOMMENDATION_KEY = "techpickr.pendingRecommendation";

function redactSensitiveText(value) {
  return value
    .replace(/\b(api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret|authorization)\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, "$1=[redacted]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [redacted]");
}

function safeRecommendationItem(item) {
  const userInput = {
    budget: item.userInput.budget,
    ...(item.userInput.budgetMin !== undefined ? { budgetMin: item.userInput.budgetMin } : {}),
    ...(item.userInput.budgetMax !== undefined ? { budgetMax: item.userInput.budgetMax } : {}),
    useCases: item.userInput.useCases,
    ...(item.userInput.device ? { device: item.userInput.device } : {}),
    ...(item.userInput.performance ? { performance: item.userInput.performance } : {}),
    ...(item.userInput.portability ? { portability: item.userInput.portability } : {}),
    ...(item.userInput.priorities ? { priorities: item.userInput.priorities } : {}),
    ...(item.userInput.details ? { details: redactSensitiveText(String(item.userInput.details)) } : {}),
  };
  return { ...item, userInput };
}

export function savePendingRecommendation(item) {
  try {
    window.sessionStorage.setItem(PENDING_RECOMMENDATION_KEY, JSON.stringify(safeRecommendationItem(item)));
  } catch {
    throw new Error("This browser could not temporarily store the recommendation. Enable session storage and try again.");
  }
}

export function readPendingRecommendation() {
  let serialized;
  try {
    serialized = window.sessionStorage.getItem(PENDING_RECOMMENDATION_KEY);
  } catch {
    throw new Error("This browser could not read the pending recommendation. Enable session storage and reload.");
  }
  if (!serialized) return null;
  try {
    const item = JSON.parse(serialized);
    if (!item || !["laptop", "pc_build"].includes(item.type) ||
        !item.userInput || !item.result?.recommendation) {
      throw new Error("The pending recommendation is incomplete.");
    }
    return item;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("The pending recommendation could not be read. Generate it again to continue.", { cause: error });
    }
    throw error;
  }
}

export function clearPendingRecommendation() {
  try {
    window.sessionStorage.removeItem(PENDING_RECOMMENDATION_KEY);
  } catch {
    throw new Error("The recommendation was saved, but the temporary browser copy could not be cleared.");
  }
}

export async function saveRecommendation({ type, userInput, result }) {
  if (!supabase) {
    throw new Error("Supabase is not configured. Set the frontend Supabase variables before saving recommendations.");
  }
  if (!["laptop", "pc_build"].includes(type) || !userInput || !result?.recommendation) {
    throw new Error("The recommendation is missing required save information.");
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error(`Could not verify your Supabase session: ${sessionError.message}`);
  if (!session?.user?.id) {
    throw Object.assign(new Error("Your session has expired. Log in again to save this recommendation."), {
      needsLogin: true,
    });
  }

  const title = typeof result.recommendation.title === "string"
    ? result.recommendation.title.slice(0, 160)
    : type === "laptop" ? "Laptop recommendation" : "PC build recommendation";
  const row = {
    user_id: session.user.id,
    title,
    recommendation_type: type,
    user_input: safeRecommendationItem({ type, userInput, result }).userInput,
    recommendation_data: result,
    ai_provider: result.ai_provider || (type === "laptop" ? "techpickr-catalog" : "supabase-pc-catalog"),
    model_name: result.model_name || null,
  };
  const { data, error } = await supabase
    .from("saved_recommendations")
    .insert(row)
    .select("id")
    .single();
  if (error) {
    throw Object.assign(new Error(error.message || "Supabase could not save this recommendation."), {
      code: error.code,
      status: error.status,
    });
  }
  if (!data?.id) {
    throw new Error("Supabase did not confirm that the recommendation was saved.");
  }
  return data;
}

export async function listSavedRecommendations() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Set the frontend Supabase variables to load saved recommendations.");
  }
  const { data, error } = await supabase
    .from("saved_recommendations")
    .select("id, title, recommendation_type, user_input, recommendation_data, ai_provider, model_name, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(`Could not load your recommendations: ${error.message}`);
  }
  return data || [];
}

export async function deleteSavedRecommendation(id) {
  if (!supabase || typeof id !== "string" || !id) {
    throw new Error("A valid saved recommendation is required.");
  }
  const { data, error } = await supabase
    .from("saved_recommendations")
    .delete()
    .eq("id", id)
    .select("id")
    .single();
  if (error) {
    throw new Error(`Could not delete this recommendation: ${error.message}`);
  }
  if (!data?.id) {
    throw new Error("Supabase did not confirm that the recommendation was deleted.");
  }
}
