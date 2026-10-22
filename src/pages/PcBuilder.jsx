import { useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "../components/Button";
import RecommendationDisplay from "../components/RecommendationDisplay";
import {
  getPcPriceEstimate,
  generatePcRecommendation,
} from "../lib/pcRecommendations";
import "./Questionnaire.css";
import "./PcBuilder.css";

const TOTAL_STEPS = 5;
const MAX_USES = 7;
const MAX_PRIORITIES = 3;
const PC_BUDGET_MIN_INR = 20000;
const PC_BUDGET_MAX_INR = 500000;
const PC_BUDGET_STEP_INR = 1000;
const DEFAULT_BUDGET_INR = 60000;

const useCaseOptions = [
  { value: "gaming", title: "gaming" },
  { value: "video-editing", title: "videoEditing" },
  { value: "programming", title: "programming" },
  { value: "engineering", display: "Engineering applications" },
  { value: "3d-modeling", display: "3D modelling & rendering" },
  { value: "studying", title: "studyingOffice" },
  { value: "graphic-design", title: "graphicDesign" },
  { value: "ai-ml", title: "aiMl" },
  { value: "everyday", title: "everyday" },
];

const performanceOptions = [
  { value: "basic", title: "basic", text: "basicText" },
  { value: "balanced", title: "balanced", text: "balancedText" },
  { value: "high", title: "high", text: "highText" },
];

const priorityOptions = [
  { value: "value", title: "value" },
  { value: "gaming-performance", title: "gamingPerformance" },
  {
    value: "video-editing-performance",
    title: "videoEditingPerformance",
  },
  { value: "low-noise", title: "lowNoise" },
  { value: "power-efficiency", title: "powerEfficiency" },
  { value: "upgradeability", title: "upgradeability" },
  { value: "performance", display: "Performance" },
  { value: "efficiency", display: "Power efficiency" },
  { value: "portability", display: "Portability" },
  { value: "battery-life", display: "Battery life" },
  { value: "compact-size", display: "Compact size" },
];

const CATEGORY_ORDER = [
  "cpu",
  "processor",
  "gpu",
  "graphics card",
  "motherboard",
  "ram",
  "memory",
  "storage",
  "ssd",
  "psu",
  "power supply",
  "case",
  "cooler",
  "cooling",
];

function formatINR(amount, language) {
  const locale = {
    en: "en-IN",
    hi: "hi-IN",
    es: "es-IN",
    fr: "fr-IN",
    de: "de-DE",
    ja: "ja-JP",
  }[language] || "en-IN";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getBudgetError(value, t, language) {
  const budget = Number(value);

  if (
    value === "" ||
    !Number.isInteger(budget) ||
    budget % PC_BUDGET_STEP_INR !== 0
  ) {
    return t("pcBuilder.budgetInvalid");
  }

  if (budget < PC_BUDGET_MIN_INR) {
    return t("pcBuilder.budgetTooLow", {
      amount: formatINR(PC_BUDGET_MIN_INR, language),
    });
  }

  if (budget > PC_BUDGET_MAX_INR) {
    return t("pcBuilder.budgetTooHigh", {
      amount: formatINR(PC_BUDGET_MAX_INR, language),
    });
  }

  return "";
}

function getCategoryName(category) {
  if (!category) return "Other component";

  return String(category)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getSpecifications(component) {
  const specifications = [];
  const specs =
    component.specs &&
    typeof component.specs === "object" &&
    !Array.isArray(component.specs)
      ? component.specs
      : {};

  const add = (label, value) => {
    if (value !== undefined && value !== null && value !== "") {
      specifications.push({ label, value });
    }
  };

  add("Brand", component.brand || specs.brand);
  add("CPU socket", component.socket || specs.socket);
  add("Memory type", component.ram_type || specs.ram_type);
  add("Form factor", component.form_factor || specs.form_factor);

  Object.entries(specs)
    .filter(([key]) =>
      ![
    "brand",
    "price",
    "price_usd",
    "retailer_price_inr",
    "retailer_price_verified",
    "retailer_price_source",
    "retailer_price_checked_at",
    "price_estimate_inr",
    "price_estimate_source",
    "price_estimate_checked_at",
    "socket",
    "ram_type",
    "form_factor",
      ]
    .includes(key.toLowerCase())
    )
    .slice(0, 7)
    .forEach(([key, value]) => {
      if (
        value !== null &&
        value !== undefined &&
        typeof value !== "object" &&
        String(value).trim() !== ""
      ) {
        add(
          key.replaceAll("_", " ").replace(/\b\w/g, (character) =>
            character.toUpperCase()
          ),
          String(value)
        );
      }
    });

  return specifications.slice(0, 7);
}

function getCompatibilityLabel(component, t) {
  const originalStatus = String(component.compatibility_status || "");
  const status = originalStatus.toLowerCase();

  if (status.includes("incompatible") || status.includes("failed")) {
    return { label: originalStatus, type: "warning" };
  }
  if (status.includes("not compatible")) {
    return { label: originalStatus, type: "warning" };
  }

  if (status.includes("unverified") || status.includes("not fully verified")) {
    return { label: originalStatus, type: "unknown" };
  }

  if (status.includes("conditional") || status.includes("warning")) {
    return { label: originalStatus, type: "warning" };
  }

  if (status.includes("pass") || status.includes("compatible")) {
    return { label: originalStatus, type: "pass" };
  }

  return {
    label: originalStatus || t("pcBuilder.unknownCompatibility"),
    type: "unknown",
  };
}

function PcBuilder() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const initialRequirements = location.state?.userInput ?? location.state?.initialRequirements;
  const [step, setStep] = useState(() => initialRequirements?.useCases?.length ? 2 : 1);
  const [answers, setAnswers] = useState(() => ({
    budget: initialRequirements?.budgetMax ?? initialRequirements?.budget ?? DEFAULT_BUDGET_INR,
    budgetMin: initialRequirements?.budgetMin ?? PC_BUDGET_MIN_INR,
    budgetMax: initialRequirements?.budgetMax ?? initialRequirements?.budget ?? DEFAULT_BUDGET_INR,
    useCases: initialRequirements?.useCases ?? [],
    details: initialRequirements?.details ?? "",
    performance: initialRequirements?.performance ?? "balanced",
    priorities: initialRequirements?.priorities ?? [],
  }));
  const [result, setResult] = useState(() => location.state?.savedRecommendation ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestPending = useRef(false);

  const budgetError = getBudgetError(answers.budget, t, i18n.language);
  const canContinue =
    (step === 1 && answers.useCases.length > 0) ||
    (step === 2 && !budgetError) ||
    step === 3 ||
    step === 4 ||
    step === 5;

  function toggleSelection(key, value, limit = Infinity) {
    setAnswers((previous) => {
      const selected = previous[key];
      if (selected.includes(value)) {
        return {
          ...previous,
          [key]: selected.filter((item) => item !== value),
        };
      }

      if (selected.length >= limit) return previous;

      return {
        ...previous,
        [key]: [...selected, value],
      };
    });
  }

  async function submitRecommendation() {
    if (requestPending.current || budgetError) return;

    requestPending.current = true;
    setLoading(true);
    setError("");

    try {
      const recommendation = await generatePcRecommendation({
        ...answers,
        budget: Number(answers.budget),
        budgetMax: Number(answers.budget),
      });
      setResult(recommendation);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t("pcBuilder.requestFailed")
      );
    } finally {
      requestPending.current = false;
      setLoading(false);
    }
  }

  function goNext() {
    if (!canContinue || loading) return;

    if (step < TOTAL_STEPS) {
      setStep((currentStep) => currentStep + 1);
      return;
    }

    void submitRecommendation();
  }

  function editAnswers(editStep) {
    setResult(null);
    setError("");
    setStep(editStep);
  }

  const selectedUseCases = useCaseOptions
    .filter((option) => answers.useCases.includes(option.value))
    .map((option) => option.display || t(`pcBuilder.${option.title}`));
  const selectedPriorities = priorityOptions
    .filter((option) => answers.priorities.includes(option.value))
    .map((option) => option.display || t(`pcBuilder.${option.title}`));

  const components = result?.components ?? [];
  const sortedComponents = [...components].sort((first, second) => {
    const firstCategory = String(first.category || "").toLowerCase();
    const secondCategory = String(second.category || "").toLowerCase();
    const firstIndex = CATEGORY_ORDER.findIndex((item) =>
      firstCategory.includes(item)
    );
    const secondIndex = CATEGORY_ORDER.findIndex((item) =>
      secondCategory.includes(item)
    );

    return (firstIndex < 0 ? 999 : firstIndex) -
      (secondIndex < 0 ? 999 : secondIndex);
  });

  const componentPriceEstimates = components.map(getPcPriceEstimate);
  const hasCompletePriceEstimates =
    components.length > 0 && componentPriceEstimates.every(Boolean);
  const hasOnlyVerifiedPrices =
    hasCompletePriceEstimates && componentPriceEstimates.every((estimate) => estimate.verified);
  const total = hasCompletePriceEstimates
    ? componentPriceEstimates.reduce((sum, estimate) => sum + estimate.amount, 0)
    : null;
  const budget = result?.budgetMaxInr ?? Number(answers.budget);
  const remaining = total === null || total === undefined
    ? null
    : budget - total;
  const usedPercent =
    total !== null && total !== undefined && budget > 0
      ? Math.min((total / budget) * 100, 100)
      : null;

  function renderReviewItem(label, value, editStep) {
    return (
      <article className="pc-review-item" key={label}>
        <div>
          <h3>{label}</h3>
          <p>{value || t("pcBuilder.notSelected")}</p>
        </div>
        <Button variant="secondary" onClick={() => editAnswers(editStep)}>
          {t("pcBuilder.edit")}
        </Button>
      </article>
    );
  }

  if (result) {
    return (
      <main className="container quiz pc-advisor">
        <header className="pc-advisor-header">
          <p className="pc-builder-eyebrow">TECHPICKR / PC ADVISOR</p>
          <h1>{t("pcBuilder.title")}</h1>
          <p className="pc-builder-description">{t("pcBuilder.description")}</p>
        </header>
        <RecommendationDisplay type="pc_build" userInput={answers} result={result} />
        <div className="pc-result-actions">
          <Button onClick={() => editAnswers(TOTAL_STEPS)} arrow>
            {t("pcBuilder.adjustAnswers")}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="container quiz pc-advisor">
      <header className="pc-advisor-header">
        <p className="pc-builder-eyebrow">TECHPICKR / PC ADVISOR</p>
        <h1>{t("pcBuilder.title")}</h1>
        <p className="pc-builder-description">
          {t("pcBuilder.description")}
        </p>
      </header>

      {result ? (
        <section className="pc-builder-results" aria-live="polite">
          <div className="pc-builder-results-heading">
            <div>
              <p className="pc-builder-eyebrow">YOUR PC ADVISOR RESULTS</p>
              <h2>
                {components.length
                  ? t("pcBuilder.resultsTitle")
                  : t("pcBuilder.noComponentsTitle")}
              </h2>
              <p>{t("pcBuilder.resultsDescription")}</p>
              {result.sourceLabel && (
                <p className="pc-builder-source" role="status">
                  Recommendation source: <strong>{result.sourceLabel}</strong>
                </p>
              )}
            </div>
            {components.length > 0 && (
              <span className="pc-builder-count">
                {t("pcBuilder.componentCount", {
                  count: components.length,
                })}
              </span>
            )}
          </div>

          {components.length === 0 ? (
            <div className="pc-builder-empty">
              <div className="pc-builder-empty-mark" aria-hidden="true">
                !
              </div>
              <p>{result.diagnostic || t("pcBuilder.noComponentsText")}</p>
              <p className="pc-builder-source">The request reached Supabase, but no component rows were returned. This is different from a missing environment variable or a network failure.</p>
              <Button onClick={() => editAnswers(TOTAL_STEPS)}>
                {t("pcBuilder.adjustAnswers")}
              </Button>
            </div>
          ) : (
            <>
              <div className="pc-builder-summary">
                <div className="pc-builder-summary-item">
                  <span>{t("pcBuilder.maximumBudget")}</span>
                  <strong>{formatINR(budget, i18n.language)}</strong>
                </div>
                {total !== null && total !== undefined && (
                  <div className="pc-builder-summary-item">
                    <span>{t(hasOnlyVerifiedPrices ? "pcBuilder.listedTotal" : "pcBuilder.estimatedTotal")}</span>
                    <strong>{formatINR(total, i18n.language)}</strong>
                  </div>
                )}
                {remaining !== null && (
                  <div className="pc-builder-summary-item">
                    <span>
                      {remaining >= 0
                        ? t(hasOnlyVerifiedPrices ? "pcBuilder.budgetRemaining" : "pcBuilder.estimatedBudgetRemaining")
                        : t(hasOnlyVerifiedPrices ? "pcBuilder.overBudget" : "pcBuilder.estimatedOverBudget")}
                    </span>
                    <strong className={remaining < 0 ? "pc-builder-over" : ""}>
                      {formatINR(Math.abs(remaining), i18n.language)}
                    </strong>
                  </div>
                )}
              </div>

              {usedPercent !== null && (
                <div className="pc-builder-progress">
                  <div className="pc-builder-progress-labels">
                    <span>{t(hasOnlyVerifiedPrices ? "pcBuilder.listedTotal" : "pcBuilder.estimatedTotal")}</span>
                    <strong>{usedPercent.toFixed(0)}%</strong>
                  </div>
                  <div
                    className="pc-builder-progress-track"
                    role="progressbar"
                    aria-label={t("pcBuilder.listedTotal")}
                    aria-valuenow={Math.round(usedPercent)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="pc-builder-progress-fill"
                      style={{ width: `${usedPercent}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="pc-builder-list">
                {sortedComponents.map((component, index) => {
                  const specifications = getSpecifications(component);
                  const compatibility = getCompatibilityLabel(component, t);
                  const priceEstimate = getPcPriceEstimate(component);
                  const brand =
                    component.brand ||
                    (typeof component.specs?.brand === "string"
                      ? component.specs.brand
                      : "");

                  return (
                    <article
                      className="pc-builder-card"
                      key={`${component.category}-${component.model}-${index}`}
                    >
                      <div className="pc-builder-card-top">
                        <span className="pc-builder-category">
                          {getCategoryName(component.category)}
                        </span>
                        <span
                          className={`pc-builder-status ${compatibility.type}`}
                        >
                          {compatibility.label}
                        </span>
                      </div>
                      <div className="pc-builder-card-body">
                        <div className="pc-builder-part-number">
                          {t("pcBuilder.part", { number: index + 1 })}
                        </div>
                        <h3>
                          {component.model || t("pcBuilder.unnamedComponent")}
                        </h3>
                        {brand && <p className="pc-builder-brand">{brand}</p>}
                        <p className="pc-builder-price">
                          {priceEstimate
                            ? priceEstimate.amount === 0
                              ? t("pcBuilder.included")
                              : formatINR(priceEstimate.amount, i18n.language)
                            : t("pcBuilder.priceUnavailable")}
                          {priceEstimate && (
                            <span className="pc-builder-price-source">
                              {priceEstimate.verified
                                ? priceEstimate.source
                                : `${t("pcBuilder.estimatedPrice")}${priceEstimate.checkedAt
                                  ? ` · ${new Date(priceEstimate.checkedAt).toLocaleDateString(i18n.language)}`
                                  : ""}`}
                            </span>
                          )}
                        </p>
                        {specifications.length > 0 ? (
                          <dl className="pc-builder-specs">
                            {specifications.map((specification) => (
                              <div key={specification.label}>
                                <dt>{specification.label}</dt>
                                <dd>{specification.value}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : (
                          <p className="pc-builder-no-specs">
                            {t("pcBuilder.noSpecifications")}
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              {total === null && (
                <p className="pc-builder-warning" role="status">
                  {t("pcBuilder.missingPrices")}
                </p>
              )}

              {hasCompletePriceEstimates && total > budget && (
                <p className="pc-builder-warning" role="status">
                  {t(hasOnlyVerifiedPrices ? "pcBuilder.overBudgetMessage" : "pcBuilder.estimatedOverBudgetMessage")}
                </p>
              )}

              <aside className="pc-builder-note">
                <strong>{t("pcBuilder.beforeYouBuy")}</strong>
                <p>{t("pcBuilder.beforeYouBuyText")}</p>
                <p>{t("pcBuilder.priceNote")}</p>
                <p>{t("pcBuilder.selectionLogic")}</p>
                <p>{t("pcBuilder.recommendationLimit")}</p>
              </aside>

              <div className="pc-result-actions">
                <Button onClick={() => editAnswers(TOTAL_STEPS)} arrow>
                  {t("pcBuilder.adjustAnswers")}
                </Button>
              </div>
            </>
          )}
        </section>
      ) : (
        <>
          <div className="quiz-progress">
            <p className="quiz-step-label">
              {t("pcBuilder.step", { step, total: TOTAL_STEPS })}
            </p>
            <div
              className="progress-track"
              role="progressbar"
              aria-label={t("pcBuilder.step", { step, total: TOTAL_STEPS })}
              aria-valuenow={step}
              aria-valuemin={1}
              aria-valuemax={TOTAL_STEPS}
            >
              <div
                className="progress-fill"
                style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
              />
            </div>
          </div>

          <div className="quiz-body" key={step}>
            {step === 1 && (
              <>
                <h2>{t("pcBuilder.purposeTitle")}</h2>
                <p className="quiz-help">{t("pcBuilder.purposeHelp")}</p>
                <div className="option-grid three">
                  {useCaseOptions.map((option) => {
                    const selected = answers.useCases.includes(option.value);
                    const locked = !selected && answers.useCases.length >= MAX_USES;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={locked}
                        className={`option ${selected ? "selected" : ""}`}
                        aria-pressed={selected}
                        onClick={() =>
                          toggleSelection("useCases", option.value, MAX_USES)
                        }
                      >
                        <span className="option-title">
                          {option.display || t(`pcBuilder.${option.title}`)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2>{t("pcBuilder.budgetTitle")}</h2>
                <p className="quiz-help">{t("pcBuilder.budgetHelp")}</p>
                <div className="budget-value">
                  {answers.budget !== "" && !budgetError
                    ? `${formatINR(Number(answers.budgetMin), i18n.language)} – ${formatINR(Number(answers.budget), i18n.language)}`
                    : t("pcBuilder.budgetInvalid")}
                </div>
                <label className="pc-budget-label" htmlFor="pc-budget">
                  {t("pcBuilder.budgetInputLabel")}
                </label>
                <div className="pc-budget-input-wrap">
                  <span aria-hidden="true">₹</span>
                  <input
                    id="pc-budget"
                    type="number"
                    min={PC_BUDGET_MIN_INR}
                    max={PC_BUDGET_MAX_INR}
                    step="1000"
                    value={answers.budget}
                    aria-invalid={Boolean(budgetError)}
                    aria-describedby="pc-budget-limits pc-budget-error"
                    onChange={(event) =>
                      setAnswers((previous) => {
                        const maximum = event.target.value;
                        if (maximum === "") return { ...previous, budget: "" };
                        const budgetMax = Number(maximum);
                        return {
                          ...previous,
                          budget: maximum,
                          budgetMax,
                          budgetMin: budgetMax >= PC_BUDGET_MIN_INR
                            ? Math.max(
                              PC_BUDGET_MIN_INR,
                              Math.min(Number(previous.budgetMin), budgetMax)
                            )
                            : previous.budgetMin,
                        };
                      })
                    }
                  />
                </div>
                <input
                  className="slider pc-budget-slider"
                  type="range"
                  min={PC_BUDGET_MIN_INR}
                  max={PC_BUDGET_MAX_INR}
                  step={PC_BUDGET_STEP_INR}
                  value={Math.min(
                    PC_BUDGET_MAX_INR,
                    Math.max(
                      PC_BUDGET_MIN_INR,
                      Number(answers.budget) || DEFAULT_BUDGET_INR
                    )
                  )}
                  aria-label={t("pcBuilder.budgetLabel")}
                  onChange={(event) =>
                    setAnswers((previous) => ({
                      ...previous,
                      budget: Number(event.target.value),
                      budgetMax: Number(event.target.value),
                      budgetMin: Math.min(Number(previous.budgetMin), Number(event.target.value)),
                    }))
                  }
                />
                <div className="slider-labels" id="pc-budget-limits">
                  <span>
                    {formatINR(PC_BUDGET_MIN_INR, i18n.language)}
                  </span>
                  <span>
                    {formatINR(PC_BUDGET_MAX_INR, i18n.language)}
                  </span>
                </div>
                <p
                  className="pc-budget-error"
                  id="pc-budget-error"
                  role={budgetError ? "alert" : undefined}
                >
                  {budgetError}
                </p>
              </>
            )}

            {step === 3 && (
              <>
                <h2>{t("pcBuilder.performanceTitle")}</h2>
                <p className="quiz-help">
                  {t("pcBuilder.performanceHelp")}
                </p>
                <div className="option-grid three">
                  {performanceOptions.map((option) => {
                    const selected = answers.performance === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`option ${selected ? "selected" : ""}`}
                        aria-pressed={selected}
                        onClick={() =>
                          setAnswers((previous) => ({
                            ...previous,
                            performance: option.value,
                          }))
                        }
                      >
                        <span className="option-title">
                          {option.display || t(`pcBuilder.${option.title}`)}
                        </span>
                        <span className="option-text">
                          {t(`pcBuilder.${option.text}`)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <h2>{t("pcBuilder.prioritiesTitle")}</h2>
                <p className="quiz-help">
                  {t("pcBuilder.prioritiesHelp")}{" "}
                  {answers.priorities.length}/3
                </p>
                <div className="option-grid three">
                  {priorityOptions.map((option) => {
                    const selected = answers.priorities.includes(option.value);
                    const locked =
                      !selected &&
                      answers.priorities.length >= MAX_PRIORITIES;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={locked}
                        className={`option ${selected ? "selected" : ""}`}
                        aria-pressed={selected}
                        onClick={() =>
                          toggleSelection(
                            "priorities",
                            option.value,
                            MAX_PRIORITIES
                          )
                        }
                      >
                        <span className="option-title">
                          {option.display || t(`pcBuilder.${option.title}`)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <h2>{t("pcBuilder.reviewTitle")}</h2>
                <p className="quiz-help">{t("pcBuilder.reviewHelp")}</p>
                <div className="pc-review-list">
                  {renderReviewItem(
                    t("pcBuilder.purposeLabel"),
                    selectedUseCases.join(", "),
                    1
                  )}
                  {renderReviewItem(
                    t("pcBuilder.budgetLabelShort"),
                    `${formatINR(Number(answers.budgetMin), i18n.language)} – ${formatINR(Number(answers.budget), i18n.language)}`,
                    2
                  )}
                  {renderReviewItem(
                    t("pcBuilder.performanceLabel"),
                    t(
                      `pcBuilder.${
                        performanceOptions.find(
                          (option) => option.value === answers.performance
                        )?.title || "balanced"
                      }`
                    ),
                    3
                  )}
                  {renderReviewItem(
                    t("pcBuilder.prioritiesLabel"),
                    selectedPriorities.join(", "),
                    4
                  )}
                </div>
                <p className="pc-builder-note pc-recommendation-limit">
                  {t("pcBuilder.recommendationLimit")}
                </p>
                {error && (
                  <div className="pc-builder-error" role="alert">
                    <strong>{t("pcBuilder.requestFailed")}</strong>
                    <p>{error}</p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="quiz-actions" aria-live="polite" aria-busy={loading}>
            {step > 1 ? (
              <Button
                variant="secondary"
                onClick={() => setStep((currentStep) => currentStep - 1)}
                disabled={loading}
              >
                {t("pcBuilder.back")}
              </Button>
            ) : (
              <span />
            )}
            <Button
              onClick={goNext}
              disabled={!canContinue || loading}
              arrow={!loading && step === TOTAL_STEPS}
            >
              {loading
                ? (
                    <>
                      <span className="pc-builder-spinner" aria-hidden="true" />
                      {t("pcBuilder.findingComponents")}
                    </>
                  )
                : step === TOTAL_STEPS
                  ? t("pcBuilder.findComponents")
                  : t("pcBuilder.continue")}
            </Button>
          </div>
        </>
      )}
    </main>
  );
}

export default PcBuilder;
