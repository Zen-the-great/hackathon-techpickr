import model from "./model_laptop.json";

const PORTABILITY = { performance: 0, balanced: 1, portable: 2 };

// useCase: gaming | office | programming | video_editing | ai_ml
// portability: "performance" | "balanced" | "portable"
export function recommendLaptop({ budget, useCase, portability }) {
  const x = model.features.map((name) => {
    if (name === "budget") return Number(budget);
    if (name === "portability") return PORTABILITY[portability] ?? 1;
    return name === `use_${useCase}` ? 1 : 0;
  });

  // Walk down the tree until we reach an answer
  let node = 0;
  while (model.left[node] !== -1) {
    node =
      x[model.feature[node]] <= model.threshold[node]
        ? model.left[node]
        : model.right[node];
  }

  const ranked = model.classes
    .map((label, i) => ({ label, confidence: model.value[node][i] }))
    .sort((a, b) => b.confidence - a.confidence)
    .filter((r) => r.confidence > 0)
    .slice(0, 3);

  const best = ranked[0];
  const split = best.label.lastIndexOf("_");

  return {
    label: best.label,                  // e.g. "gaming_mid"
    useCase: best.label.slice(0, split),
    tier: best.label.slice(split + 1),  // entry | mid | high | ultra
    confidence: best.confidence,
    alternatives: ranked.slice(1),
  };
}
