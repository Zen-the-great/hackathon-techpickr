
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "../components/Button";
import "./Questionnaire.css";

const TOTAL_STEPS = 5;
const MAX_USES = 7;

// Both options are now enabled.
const deviceOptions = [
  { value: "laptop", title: "laptop", text: "laptopText" },
  { value: "desktop", title: "desktop", text: "desktopText" },
];

const useCaseOptions = [
  { value: "gaming", title: "gaming" },
  { value: "video-editing", title: "videoEditing" },
  { value: "programming", title: "programming" },
  { value: "studying", title: "studying" },
  { value: "graphic-design", title: "graphicDesign" },
  { value: "everyday", title: "everyday" },
  { value: "ai-ml", title: "aiMl" },
];

const detailsHint = {
  gaming: "gamingHint",
  "video-editing": "videoHint",
  programming: "programmingHint",
  studying: "studyHint",
  "graphic-design": "designHint",
  everyday: "everydayHint",
  "ai-ml": "aiHint",
};

const performanceOptions = [
  { value: "basic", title: "basic", text: "basicText" },
  { value: "balanced", title: "balanced", text: "balancedText" },
  { value: "high", title: "high", text: "highText" },
];

const portabilityOptions = [
  { value: "portable", title: "portable", text: "portableText" },
  {
    value: "balanced",
    title: "balanced",
    text: "portableBalancedText",
  },
  {
    value: "performance",
    title: "performanceFirst",
    text: "performanceText",
  },
];

const priorityOptions = [
  { value: "performance", title: "performance" },
  { value: "value", title: "value" },
  { value: "low-noise", title: "lowNoise" },
  { value: "efficiency", title: "efficiency" },
  { value: "upgradeability", title: "upgradeability" },
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

function Questionnaire() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  const [answers, setAnswers] = useState({
    device: "laptop",
    portability: "balanced",
    budget: 60000,
    useCases: [],
    details: "",
    performance: "balanced",
    priorities: [],
  });

  const update = (key, value) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Choose several use cases, up to MAX_USES.
  const toggleUseCase = (value) => {
    setAnswers((prev) => {
      if (prev.useCases.includes(value)) {
        return {
          ...prev,
          useCases: prev.useCases.filter((item) => item !== value),
        };
      }

      if (prev.useCases.length >= MAX_USES) {
        return prev;
      }

      return {
        ...prev,
        useCases: [...prev.useCases, value],
      };
    });
  };

  // Select up to three priorities.
  const togglePriority = (value) => {
    setAnswers((prev) => {
      if (prev.priorities.includes(value)) {
        return {
          ...prev,
          priorities: prev.priorities.filter((item) => item !== value),
        };
      }

      if (prev.priorities.length >= 3) {
        return prev;
      }

      return {
        ...prev,
        priorities: [...prev.priorities, value],
      };
    });
  };

  const canContinue =
    (step === 1 && answers.device !== "") ||
    step === 2 ||
    (step === 3 && answers.useCases.length >= 1) ||
    step === 4 ||
    (step === 5 && answers.priorities.length >= 1);

  const goNext = () => {
    if (!canContinue) return;

    // Desktop users go directly to the custom PC builder.
    if (step === 1 && answers.device === "desktop") {
      navigate("/pc-builder");
      return;
    }

    // Preserve the existing laptop recommendation flow.
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      navigate("/results", {
        state: answers,
      });
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <main className="container quiz">
      <div className="quiz-progress">
        <p className="quiz-step-label">
          {t("quiz.step", {
            step,
            total: TOTAL_STEPS,
          })}
        </p>

        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${(step / TOTAL_STEPS) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="quiz-body" key={step}>
        {step === 1 && (
          <>
            <h2>{t("quiz.whatDevice")}</h2>
            <p className="quiz-help">{t("quiz.pickOne")}</p>

            <div className="option-grid two">
              {deviceOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`option ${
                    answers.device === option.value ? "selected" : ""
                  }`}
                  aria-pressed={answers.device === option.value}
                  onClick={() => update("device", option.value)}
                >
                  <span className="option-title">
                    {t(`quiz.${option.title}`)}
                  </span>

                  <span className="option-text">
                    {t(`quiz.${option.text}`)}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2>{t("quiz.budget")}</h2>
            <p className="quiz-help">{t("quiz.budgetHelp")}</p>

            <div className="budget-value">
              {formatINR(answers.budget, i18n.language)}
            </div>

            <input
              className="slider"
              type="range"
              min="25000"
              max="300000"
              step="5000"
              value={answers.budget}
              onChange={(event) =>
                update("budget", Number(event.target.value))
              }
              aria-label={t("quiz.budgetLabel")}
            />

            <div className="slider-labels">
              <span>{formatINR(25000, i18n.language)}</span>
              <span>{formatINR(300000, i18n.language)}</span>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2>{t("quiz.use")}</h2>

            <p className="quiz-help">
              {t("quiz.chooseAll")}{" "}
              {t("quiz.selected", {
                count: answers.useCases.length,
              })}
            </p>

            <div className="option-grid three">
              {useCaseOptions.map((option) => {
                const selected = answers.useCases.includes(option.value);
                const locked =
                  !selected && answers.useCases.length >= MAX_USES;

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={locked}
                    className={`option ${selected ? "selected" : ""}`}
                    aria-pressed={selected}
                    onClick={() => toggleUseCase(option.value)}
                  >
                    <span className="option-title">
                      {t(`quiz.${option.title}`)}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2>{t("quiz.demand")}</h2>
            <p className="quiz-help">{t("quiz.notSure")}</p>

            <div className="option-grid three">
              {performanceOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`option ${
                    answers.performance === option.value ? "selected" : ""
                  }`}
                  aria-pressed={answers.performance === option.value}
                  onClick={() => update("performance", option.value)}
                >
                  <span className="option-title">
                    {t(`quiz.${option.title}`)}
                  </span>

                  <span className="option-text">
                    {t(`quiz.${option.text}`)}
                  </span>
                </button>
              ))}
            </div>

            <h3 className="quiz-subhead">{t("quiz.portability")}</h3>

            <div className="option-grid three">
              {portabilityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`option ${
                    answers.portability === option.value ? "selected" : ""
                  }`}
                  aria-pressed={answers.portability === option.value}
                  onClick={() => update("portability", option.value)}
                >
                  <span className="option-title">
                    {t(`quiz.${option.title}`)}
                  </span>

                  <span className="option-text">
                    {t(`quiz.${option.text}`)}
                  </span>
                </button>
              ))}
            </div>

            <label className="field-label" htmlFor="details">
              {t(
                `quiz.${
                  detailsHint[answers.useCases[0]] || detailsHint.everyday
                }`
              )}
            </label>

            <input
              id="details"
              className="text-input"
              type="text"
              placeholder={t("quiz.detailsPlaceholder")}
              value={answers.details}
              onChange={(event) => update("details", event.target.value)}
            />
          </>
        )}

        {step === 5 && (
          <>
            <h2>{t("quiz.mostImportant")}</h2>

            <p className="quiz-help">
              {t("quiz.pickThree", {
                count: answers.priorities.length,
              })}
            </p>

            <div className="option-grid three">
              {priorityOptions.map((option) => {
                const selected = answers.priorities.includes(option.value);

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`option ${selected ? "selected" : ""}`}
                    aria-pressed={selected}
                    onClick={() => togglePriority(option.value)}
                  >
                    <span className="option-title">
                      {t(`quiz.${option.title}`)}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="quiz-actions">
        {step > 1 ? (
          <Button variant="secondary" onClick={goBack}>
            {t("quiz.back")}
          </Button>
        ) : (
          <span />
        )}

        <button
          type="button"
          className="btn btn-primary"
          onClick={goNext}
          disabled={!canContinue}
        >
          {step === TOTAL_STEPS
            ? t("quiz.seeBuilds")
            : t("quiz.continue")}
        </button>
      </div>
    </main>
  );
}

export default Questionnaire;
