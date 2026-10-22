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
    const responseText = await response.text();
    let payload = null;
    try {
      payload = JSON.parse(responseText);
    } catch {
      // Non-JSON responses usually indicate a proxy or deployment error.
    }
    if (!response.ok) {
      if (typeof payload?.error === "string") {
        throw new Error(payload.error);
      }
      throw new Error(
        `Recommendation service returned an unexpected response (HTTP ${response.status}). Check the backend URL and logs.`
      );
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
