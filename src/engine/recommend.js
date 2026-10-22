import { recommendLaptop } from "./predictLaptop";
import laptops from "./laptops.json";
import allLaptops from "./all_laptops.json";

const TIERS = ["entry", "mid", "high", "ultra"];

// Pick up to 3 different laptops that fit the budget:
//   Performance+ = fastest for this use case
//   Save Money   = cheapest one that still performs well
//   Best Fit     = best performance per rupee, close to the top performance
export function pickThree(candidates, budget) {
  const seen = new Set();
  const all = candidates.filter((l) => !seen.has(l.name) && seen.add(l.name));
  const affordable = all.filter((l) => l.price <= budget);

  if (affordable.length === 0) {
    const cheapest = [...all].sort((a, b) => a.price - b.price)[0];
    return { picks: cheapest ? [{ role: "best", laptop: cheapest }] : [], overBudget: true };
  }

  const value = (l) => l.perf / l.price;
  const topPerf = Math.max(...affordable.map((l) => l.perf));
  const used = new Set();
  const chosen = [];
  const take = (laptop) => {
    if (laptop && !used.has(laptop.name)) {
      used.add(laptop.name);
      chosen.push(laptop);
    }
  };
  const left = () => affordable.filter((l) => !used.has(l.name));

  // fastest
  take([...affordable].sort((a, b) => b.perf - a.perf || a.price - b.price)[0]);
  const plus = chosen[0];

  // cheapest that still performs well
  let pool = left().filter((l) => l.perf >= 0.7 * topPerf);
  if (pool.length === 0) pool = left();
  take([...pool].sort((a, b) => a.price - b.price)[0]);

  // best value, close to the top performance
  pool = left().filter((l) => l.perf >= 0.85 * topPerf);
  if (pool.length === 0) pool = left();
  take([...pool].sort((a, b) => value(b) - value(a))[0]);

  // name the roles so that the labels always make sense
  const others = chosen.filter((l) => l !== plus).sort((a, b) => a.price - b.price);
  const picks = [{ role: "plus", laptop: plus }];
  if (others.length === 2) {
    picks.push({ role: "save", laptop: others[0] }, { role: "best", laptop: others[1] });
  } else if (others.length === 1) {
    picks.push({ role: others[0].price < plus.price ? "save" : "best", laptop: others[0] });
  }
  picks.sort((a, b) => a.laptop.price - b.laptop.price);
  return { picks, overBudget: false };
}

// One use: ask the decision tree for a tier, then choose real laptops from the data.
// If nothing in that tier fits the budget, step down to cheaper tiers.
function getSingle({ budget, useCase, portability }) {
  const result = recommendLaptop({ budget, useCase, portability });
  const startIdx = TIERS.indexOf(result.tier);

  for (let t = startIdx; t >= 0; t--) {
    // look at this tier and the one above it, so a bigger budget can still reach faster laptops
    const here = laptops[`${result.useCase}_${TIERS[t]}`]?.[portability] || [];
    const above = TIERS[t + 1] ? laptops[`${result.useCase}_${TIERS[t + 1]}`]?.[portability] || [] : [];
    const candidates = [...here, ...above];
    const { picks, overBudget } = pickThree(candidates, budget);
    if (picks.length > 0 && !overBudget) {
      return { result, picks, overBudget: false, tierUsed: TIERS[t], combined: false };
    }
  }
  // nothing affordable anywhere: show the cheapest option in the predicted tier
  const key = `${result.useCase}_${result.tier}`;
  const { picks } = pickThree(laptops[key]?.[portability] || [], budget);
  return { result, picks, overBudget: true, tierUsed: result.tier, combined: false };
}

// Several uses: keep only laptops that can do ALL of them,
// then rank by the average benchmark score across those uses.
function getCombined({ budget, useCases, portability }) {
  const capable = allLaptops.filter((l) => useCases.every((u) => l.can.includes(u)));
  const samePort = capable.filter((l) => l.port === portability);
  const base = samePort.length >= 6 ? samePort : capable;

  const candidates = base.map((l) => ({
    ...l,
    link: l.amazon,
    perf: useCases.reduce((sum, u) => sum + l.s[u], 0) / useCases.length,
  }));

  const { picks, overBudget } = pickThree(candidates, budget);
  return { result: null, picks, overBudget, tierUsed: null, combined: true };
}

// useCases: a list such as ["gaming", "programming"]
export function getRecommendations({ budget, useCases, portability }) {
  const uses = [...new Set(useCases)];
  if (uses.length <= 1) {
    return getSingle({ budget, useCase: uses[0] || "office", portability });
  }
  return getCombined({ budget, useCases: uses, portability });
}
