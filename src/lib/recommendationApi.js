import allLaptops from "../engine/all_laptops.json";

const configuredApiUrl = import.meta.env.VITE_RECOMMENDATION_API_URL?.trim().replace(/\/+$/, "");

const datasetUseCases = {
  gaming: ["gaming"],
  "video-editing": ["video_editing"],
  programming: ["programming"],
  engineering: ["programming"],
  "3d-modeling": ["gaming", "video_editing"],
  studying: ["office"],
  office: ["office"],
  "graphic-design": ["video_editing"],
  everyday: ["office"],
  "ai-ml": ["ai_ml"],
};

function isDisplayableLaptop(laptop) {
  return typeof laptop.name === "string" &&
    laptop.name.trim() !== "" &&
    typeof laptop.brand === "string" &&
    laptop.brand.trim() !== "" &&
    !/\b(?:launches|unveils|introduces|announces|reveals)\b/i.test(laptop.name) &&
    !/^(?:option|laptop approach|high-performance laptop|recommended configuration)\b/i.test(laptop.name) &&
    Number.isFinite(laptop.price);
}

export function generateClientSideLaptopRecommendation(requirements = {}) {
  const minBudget = Number(requirements.budgetMin ?? 25000);
  const maxBudget = Number(requirements.budgetMax ?? requirements.budget ?? 70000);
  const rawUses = Array.isArray(requirements.useCases) ? requirements.useCases : ["everyday"];
  const targetDatasetUses = [...new Set(rawUses.flatMap((u) => datasetUseCases[u] || [u]))];

  // Filter laptops strictly within the budget range
  let pool = allLaptops.filter((l) =>
    isDisplayableLaptop(l) &&
    l.price >= minBudget &&
    l.price <= maxBudget
  );

  // If pool is empty, expand range gracefully
  if (pool.length === 0) {
    pool = allLaptops.filter((l) =>
      isDisplayableLaptop(l) &&
      l.price <= maxBudget * 1.15 &&
      l.price >= Math.max(20000, minBudget * 0.85)
    );
  }

  // Score candidate laptops based on how many requested uses they satisfy and performance
  const scored = pool.map((laptop) => {
    const matchesAll = targetDatasetUses.every((u) => laptop.can?.includes(u));
    const matchCount = targetDatasetUses.filter((u) => laptop.can?.includes(u)).length;
    const avgScore = targetDatasetUses.reduce((sum, u) => sum + (Number(laptop.s?.[u]) || 60), 0) / Math.max(targetDatasetUses.length, 1);
    const valueScore = avgScore / (laptop.price || 50000);
    return { ...laptop, matchesAll, matchCount, avgScore, valueScore };
  });

  scored.sort((a, b) =>
    (b.matchesAll ? 1 : 0) - (a.matchesAll ? 1 : 0) ||
    b.matchCount - a.matchCount ||
    b.avgScore - a.avgScore ||
    a.price - b.price
  );

  // Pick unique models
  const seenModels = new Set();
  const uniquePicks = [];
  for (const item of scored) {
    const key = `${item.brand} ${item.cpu} ${item.gpu}`.toLowerCase();
    if (!seenModels.has(key)) {
      seenModels.add(key);
      uniquePicks.push(item);
      if (uniquePicks.length >= 3) break;
    }
  }

  const recommendations = uniquePicks.map((candidate, index) => {
    const cleanName = candidate.name
      .replace(/\b(?:launches|unveils|introduces|announces|reveals)\b/gi, "")
      .replace(new RegExp(`^${candidate.brand}\\s+`, "i"), "")
      .replace(/\s+/g, " ")
      .trim();
    const displayName = candidate.brand ? `${candidate.brand} ${cleanName}` : cleanName;
    const searchTerms = `${displayName} ${candidate.cpu || ""} ${candidate.gpu || ""}`
      .replace(/\b(?:Laptop|Gaming Laptop|Creator Laptop)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    return {
      id: `local-match-${index + 1}`,
      name: displayName,
      brand: candidate.brand || null,
      model: cleanName,
      configuration: [
        candidate.cpu,
        candidate.gpu,
        candidate.ram,
        candidate.storage ? `${candidate.storage} storage` : null,
      ].filter(Boolean).join(" · ") || null,
      imageUrl: null,
      price: candidate.price,
      priceType: "indicative_market",
      processor: candidate.cpu || null,
      graphics: candidate.gpu || null,
      ram: candidate.ram || null,
      storage: candidate.storage || null,
      display: candidate.screen || null,
      matchReason: `Matched for ${rawUses.join(", ")} based on benchmark ratings within ₹${minBudget.toLocaleString("en-IN")}–₹${maxBudget.toLocaleString("en-IN")}.`,
      limitations: [
        "Live seller prices on Amazon and Flipkart may fluctuate based on daily sales and merchant stock.",
      ],
      source: "TechPickr Offline Catalog Fallback",
      amazonUrl: `https://www.amazon.in/s?k=${encodeURIComponent(searchTerms || displayName)}`,
      amazonLinkType: "search",
      flipkartUrl: `https://www.flipkart.com/search?q=${encodeURIComponent(searchTerms || displayName)}`,
      flipkartLinkType: "search",
      retailerLinkType: "search",
      position: index + 1,
    };
  });

  return {
    recommendation: {
      title: `Top Laptop Matches (₹${minBudget.toLocaleString("en-IN")} – ₹${maxBudget.toLocaleString("en-IN")})`,
      summary: `${recommendations.length} recommended laptop model${recommendations.length === 1 ? "" : "s"} tailored for ${rawUses.join(", ")}. Prices are indicative market averages.`,
      recommendations,
      budget: {
        min: minBudget,
        max: maxBudget,
        currency: "INR",
      },
      rankingSource: "catalog-offline-fallback",
    },
    ai_provider: "techpickr-offline",
    model_name: null,
  };
}

export async function generateRecommendation(type, requirements) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20_000);

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
      // Non-JSON responses usually indicate a proxy or backend 502/503.
    }

    if (response.ok && payload?.recommendation && Array.isArray(payload.recommendation.recommendations)) {
      return payload;
    }

    console.warn(`Backend recommendation returned HTTP ${response.status}. Using the local laptop catalog fallback.`);
    return generateClientSideLaptopRecommendation(requirements);
  } catch (error) {
    console.warn("Backend request failed or timed out. Using the local laptop catalog fallback:", error?.message || error);
    return generateClientSideLaptopRecommendation(requirements);
  } finally {
    window.clearTimeout(timeout);
  }
}
