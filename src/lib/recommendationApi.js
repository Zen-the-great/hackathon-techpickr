const configuredApiUrl = import.meta.env.VITE_RECOMMENDATION_API_URL?.trim().replace(/\/+$/, "");

export async function generateRecommendation(type, requirements) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 45_000);

  try {
    const response = await fetch(`${configuredApiUrl || ""}/api/recommendations/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ type, requirements }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error || `Recommendation request failed (${response.status}).`);
    }
    if (!payload?.recommendation || !Array.isArray(payload.recommendation.recommendations)) {
      throw new Error("The recommendation service returned an invalid response.");
    }
    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("The recommendation request timed out. Please try again.", { cause: error });
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
