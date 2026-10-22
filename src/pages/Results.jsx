import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "../components/Button";
import { getRecommendations } from "../engine/recommend";
import "./Results.css";

const useCaseLabels = {
  gaming: "gaming",
  "video-editing": "videoEditing",
  programming: "programming",
  studying: "officeStudy",
  "graphic-design": "videoEditing",
  everyday: "officeStudy",
  "ai-ml": "aiMl",
};

// Your quiz answers -> the names the model was trained on
const modelUseCase = {
  gaming: "gaming",
  "video-editing": "video_editing",
  programming: "programming",
  studying: "office",
  "graphic-design": "video_editing",
  everyday: "office",
  "ai-ml": "ai_ml",
};

const modelLabels = {
  gaming: "gaming",
  video_editing: "videoEditing",
  programming: "programming",
  office: "officeStudy",
  ai_ml: "aiMl",
};

const priorityLabels = {
  performance: "performance",
  value: "value",
  "low-noise": "lowNoise",
  efficiency: "efficiency",
  upgradeability: "upgradeability",
};

const ROLE_TEXT = {
  save: { label: "saveMoney", text: "saveText" },
  best: { label: "bestFit", text: "bestText" },
  plus: { label: "performancePlus", text: "plusText" },
};

function localeFor(language) {
  return { en: "en-IN", hi: "hi-IN", es: "es-IN", fr: "fr-IN", de: "de-IN", ja: "ja-IN" }[language] || "en-IN";
}

function formatINR(amount, locale) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

// colour of the progress bar depends on the score
function scoreColor(score) {
  if (score >= 85) return "#34d399";
  if (score >= 75) return "#a3e635";
  if (score >= 60) return "#fbbf24";
  return "#fb923c";
}

// small line icons (no extra packages needed)
const ICONS = {
  sparkles: (
    <>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
    </>
  ),
  laptop: (
    <path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16" />
  ),
  bolt: (
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
  ),
  cart: (
    <>
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </>
  ),
  wallet: (
    <>
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </>
  ),
  cpu: (
    <>
      <rect width="16" height="16" x="4" y="4" rx="2" />
      <rect width="6" height="6" x="9" y="9" rx="1" />
      <path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2" />
    </>
  ),
  shield: (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
};

function Icon({ name, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

// circular score ring
function Ring({ value }) {
  const { t } = useTranslation();
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(value, 100) / 100);
  return (
    <div className="rs-ring">
      <svg viewBox="0 0 128 128" width="136" height="136">
        <circle cx="64" cy="64" r={radius} className="rs-ring-bg" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          className="rs-ring-fg"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 64 64)"
        />
      </svg>
      <div className="rs-ring-text">
        <strong>{value}%</strong>
        <span>{t("results.score")}</span>
      </div>
    </div>
  );
}

function Results() {
  const { t, i18n } = useTranslation();
  const locale = localeFor(i18n.language);
  const { state } = useLocation();

  if (!state) {
    return (
      <main className="rs-page">
        <div className="rs-wrap rs-empty">
          <h1>{t("results.noAnswers")}</h1>
          <p>{t("results.answerFirst")}</p>
          <Button to="/build">{t("nav.buildPc")}</Button>
        </div>
      </main>
    );
  }

  // supports the new list (useCases) and the old single value (useCase)
  const chosen = state.useCases?.length ? state.useCases : [state.useCase || "everyday"];
  const modelUses = [...new Set(chosen.map((u) => modelUseCase[u] || "office"))];

  const { result, picks, overBudget, combined } = getRecommendations({
    budget: state.budget,
    useCases: modelUses,
    portability: state.portability || "balanced",
  });

  const useText = chosen.map((u) => useCaseLabels[u] ? t(`results.${useCaseLabels[u]}`) : u).join(" + ");
  const perfText = modelUses.map((u) => t(`results.${modelLabels[u]}`)).join(" + ");

  if (picks.length === 0) {
    return (
      <main className="rs-page">
        <div className="rs-wrap rs-empty">
          <h1>{t("results.noMatches")}</h1>
          <p>
            {modelUses.length > 1
              ? t("results.noAllUses")
              : t("results.tryBudget")}
          </p>
          <Button to="/build">{t("results.changeAnswers")}</Button>
        </div>
      </main>
    );
  }

  const topScore = Math.round(Math.max(...picks.map((p) => p.laptop.perf)));
  const bestFit = picks.find((p) => p.role === "best") || picks[0];
  const anyEstimated = picks.some((p) => p.laptop.est);

  return (
    <main className="rs-page">
      <div className="rs-wrap">
        {/* ---------- summary card ---------- */}
        <section className="rs-hero">
          <div className="rs-hero-top">
            <div className="rs-hero-text">
              <span className="rs-badge">
                <Icon name="sparkles" size={14} /> {t("results.matched")}
              </span>
              <h1>
                <strong>{topScore}%</strong> {t("results.topPerformance")}
              </h1>
              <p>
                {t("results.realLaptopsFor", { uses: useText, performance: perfText })}
              </p>
            </div>
            <Ring value={topScore} />
          </div>

          <div className="rs-stats">
            <div className="rs-stat">
              <span className="rs-stat-label"><Icon name="wallet" size={14} /> {t("results.budget")}</span>
              <strong>{formatINR(state.budget, locale)}</strong>
            </div>
            <div className="rs-stat">
              <span className="rs-stat-label"><Icon name="laptop" size={14} /> {t("results.laptops")}</span>
              <strong>{picks.length}</strong>
            </div>
            <div className="rs-stat">
              <span className="rs-stat-label"><Icon name="bolt" size={14} /> {t("results.bestFitPrice")}</span>
              <strong>{formatINR(bestFit.laptop.price, locale)}</strong>
            </div>
            <div className="rs-stat">
              <span className="rs-stat-label"><Icon name="shield" size={14} /> {t("results.data")}</span>
              <strong className={anyEstimated ? "rs-warn" : "rs-ok"}>
                {anyEstimated ? t("results.partEstimated") : "PassMark"}
              </strong>
            </div>
          </div>
        </section>

        {state.priorities?.length > 0 && (
          <div className="rs-priorities">
            <span>{t("results.priorities")}</span>
            {state.priorities.map((p, i) => (
              <span className="rs-chip" key={p}>
                {i + 1}. {t(`results.${priorityLabels[p]}`)}
              </span>
            ))}
          </div>
        )}

        {overBudget && (
          <p className="rs-alert">
            {t("results.overBudget")}
          </p>
        )}

        {/* ---------- the laptops ---------- */}
        <div className="rs-list">
          {picks.map(({ role, laptop: l }, i) => {
            const score = Math.round(l.perf);
            const est = l.est ? " (est.)" : "";
            const color = scoreColor(score);
            return (
              <article
                key={l.name}
                className={`rs-card ${role === "best" ? "rs-card-best" : ""}`}
                style={{ animationDelay: `${i * 110}ms` }}
              >
                <div className="rs-card-head">
                  <div className="rs-icon">
                    <Icon name="laptop" size={22} />
                  </div>
                  <div className="rs-card-title">
                    <span className="rs-role">
                      {t(`results.${ROLE_TEXT[role].label}`).toUpperCase()}
                      {role === "best" && <em>{t("results.recommended")}</em>}
                    </span>
                    <h3>{l.name}</h3>
                    <span className="rs-brand">{l.brand}</span>
                  </div>
                  <div className="rs-price">{formatINR(l.price, locale)}</div>
                </div>

                <p className="rs-desc">
                  {t(`results.${ROLE_TEXT[role].text}`)} {l.cpu}, {l.gpu}, {l.ram} RAM.
                </p>

                <div className="rs-bar-row">
                  <div className="rs-bar">
                    <div
                      className="rs-bar-fill"
                      style={{ width: `${score}%`, background: color }}
                    />
                  </div>
                  <span className="rs-bar-value" style={{ color }}>
                    <Icon name="bolt" size={14} /> {score}%
                  </span>
                </div>

                {combined && (
                  <div className="rs-uses">
                    {modelUses.map((u) => (
                      <span key={u}>
                        {t(`results.${modelLabels[u]}`)} <b>{Math.round(l.s[u])}</b>
                      </span>
                    ))}
                  </div>
                )}

                <dl className="rs-specs">
                  <div><dt>CPU</dt><dd>{l.cpu}</dd></div>
                  <div><dt>{t("results.cpuBenchmark")}</dt><dd>{l.cpu_score.toLocaleString(locale)}{est}</dd></div>
                  <div><dt>GPU</dt><dd>{l.gpu}</dd></div>
                  <div><dt>{t("results.gpuBenchmark")}</dt><dd>{l.gpu_score.toLocaleString(locale)}{est}</dd></div>
                  <div><dt>{t("results.ramStorage")}</dt><dd>{l.ram} / {l.storage}</dd></div>
                  <div><dt>{t("results.screenWeight")}</dt><dd>{l.screen} / {l.weight}</dd></div>
                </dl>

                <div className="rs-card-foot">
                  <span className="rs-note">{t("results.priceNote")}</span>
                  <a className="rs-buy" href={l.amazon} target="_blank" rel="noreferrer">
                    <Icon name="cart" size={15} /> {t("results.viewAmazon")}
                  </a>
                </div>
              </article>
            );
          })}
        </div>

        <p className="rs-footnote">
          {t("results.footnote")}{" "}
          {combined
            ? t("results.combinedNote")
            : t("results.modelConfidence", { confidence: Math.round(result.confidence * 100) })}
        </p>

        <div className="rs-actions">
          <Link to="/build" className="rs-again">{t("results.changeAnswers")}</Link>
        </div>
      </div>
    </main>
  );
}

export default Results;
