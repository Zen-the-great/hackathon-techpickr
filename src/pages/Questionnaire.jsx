import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import "./Questionnaire.css";

const TOTAL_STEPS = 5;
const MAX_USES = 7;
const MAX_PRIORITIES = 3;
const LAPTOP_MIN_BUDGET = 25_000;
const LAPTOP_MAX_BUDGET = 300_000;
const DESKTOP_MIN_BUDGET = 20_000;
const DESKTOP_MAX_BUDGET = 500_000;
const BUDGET_STEP = 1_000;

const deviceOptions = [
  {
    value: "laptop",
    icon: "↗",
    title: "Laptop",
    text: "Portable and ready to use.",
  },
  {
    value: "desktop",
    icon: "▣",
    title: "Custom desktop PC",
    text: "A configurable system with greater component flexibility.",
  },
];

const useCaseOptions = [
  { value: "gaming", icon: "◈", title: "Gaming", text: "Games from casual to demanding." },
  { value: "programming", icon: "</>", title: "Coding & software development", text: "Development tools, IDEs and multitasking." },
  { value: "engineering", icon: "⌘", title: "Engineering applications", text: "CAD, simulation and technical software." },
  { value: "video-editing", icon: "▶", title: "Video editing", text: "Editing footage and creative workflows." },
  { value: "3d-modeling", icon: "◇", title: "3D modelling & rendering", text: "Modelling, rendering and visual projects." },
  { value: "graphic-design", icon: "✳", title: "Graphic design", text: "Illustration, layout and image editing." },
  { value: "studying", icon: "▤", title: "College & studying", text: "Research, classes and coursework." },
  { value: "office", icon: "▦", title: "Office productivity", text: "Documents, meetings and spreadsheets." },
  { value: "everyday", icon: "◉", title: "Everyday use", text: "Browsing, streaming and daily tasks." },
  { value: "ai-ml", icon: "◎", title: "AI & machine learning", text: "Local development and model workloads." },
];

const priorityOptions = [
  { value: "performance", title: "Performance", text: "More headroom for demanding work." },
  { value: "value", title: "Value for money", text: "Make the budget go further." },
  { value: "low-noise", title: "Low noise", text: "A quieter system matters." },
  { value: "efficiency", title: "Power efficiency", text: "Use power thoughtfully." },
  { value: "upgradeability", title: "Upgradeability", text: "Leave room for future changes." },
  { value: "portability", title: "Portability", text: "Easy to carry around.", devices: ["laptop"] },
  { value: "battery-life", title: "Battery life", text: "Work away from a power outlet.", devices: ["laptop"] },
  { value: "compact-size", title: "Compact size", text: "Keep the desktop footprint small.", devices: ["desktop"] },
];

const budgetPresets = [
  { label: "Under ₹40,000", min: "minimum", max: 40_000 },
  { label: "₹40,000–₹70,000", min: 40_000, max: 70_000 },
  { label: "₹70,000–₹1,00,000", min: 70_000, max: 100_000 },
  { label: "Above ₹1,00,000", min: 100_000, max: "maximum" },
];

function formatINR(amount) {
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

function Questionnaire() {
  const location = useLocation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState(() => {
    const initialRequirements = location.state?.initialRequirements ??
      location.state?.userInput ??
      location.state;
    const budgetMax = initialRequirements?.budgetMax ??
      initialRequirements?.budget ??
      70_000;

    return {
      device: initialRequirements?.device ?? "laptop",
      budget: budgetMax,
      budgetMin: initialRequirements?.budgetMin ?? 40_000,
      budgetMax,
      useCases: initialRequirements?.useCases ?? [],
      details: initialRequirements?.details ?? "",
      priorities: initialRequirements?.priorities ?? [],
    };
  });

  const budgetMinimum = answers.device === "desktop" ? DESKTOP_MIN_BUDGET : LAPTOP_MIN_BUDGET;
  const budgetMaximum = answers.device === "desktop" ? DESKTOP_MAX_BUDGET : LAPTOP_MAX_BUDGET;
  const rangeStart = ((answers.budgetMin - budgetMinimum) / (budgetMaximum - budgetMinimum)) * 100;
  const rangeEnd = ((answers.budgetMax - budgetMinimum) / (budgetMaximum - budgetMinimum)) * 100;
  const availablePriorities = priorityOptions.filter((option) =>
    !option.devices || option.devices.includes(answers.device)
  );
  const selectedUseCases = useCaseOptions.filter((option) =>
    answers.useCases.includes(option.value)
  );
  const selectedPriorities = availablePriorities.filter((option) =>
    answers.priorities.includes(option.value)
  );

  function updateDevice(device) {
    const minimum = device === "desktop" ? DESKTOP_MIN_BUDGET : LAPTOP_MIN_BUDGET;
    const maximum = device === "desktop" ? DESKTOP_MAX_BUDGET : LAPTOP_MAX_BUDGET;
    setAnswers((current) => ({
      ...current,
      device,
      budgetMin: Math.max(minimum, Math.min(current.budgetMin, maximum)),
      budgetMax: Math.max(minimum, Math.min(current.budgetMax, maximum)),
      budget: Math.max(minimum, Math.min(current.budgetMax, maximum)),
      priorities: current.priorities.filter((priority) =>
        priorityOptions.find((option) => option.value === priority)?.devices?.includes(device) !== false
      ),
    }));
  }

  function updateBudget(key, rawValue) {
    const amount = Math.round(Number(rawValue));
    if (!Number.isFinite(amount)) return;
    const value = Math.min(budgetMaximum, Math.max(budgetMinimum, amount));
    setAnswers((current) => {
      const next = { ...current, [key]: value };
      if (key === "budgetMin" && value > current.budgetMax) next.budgetMax = value;
      if (key === "budgetMax" && value < current.budgetMin) next.budgetMin = value;
      next.budget = next.budgetMax;
      return next;
    });
  }

  function applyPreset(preset) {
    const minimum = preset.min === "minimum" ? budgetMinimum : preset.min;
    const maximum = preset.max === "maximum" ? budgetMaximum : preset.max;
    setAnswers((current) => ({
      ...current,
      budgetMin: Math.max(budgetMinimum, minimum),
      budgetMax: Math.min(budgetMaximum, maximum),
      budget: Math.min(budgetMaximum, maximum),
    }));
  }

  function toggleUseCase(value) {
    setAnswers((current) => {
      if (current.useCases.includes(value)) {
        return { ...current, useCases: current.useCases.filter((item) => item !== value) };
      }
      if (current.useCases.length >= MAX_USES) return current;
      return { ...current, useCases: [...current.useCases, value] };
    });
  }

  function togglePriority(value) {
    setAnswers((current) => {
      if (current.priorities.includes(value)) {
        return { ...current, priorities: current.priorities.filter((item) => item !== value) };
      }
      if (current.priorities.length >= MAX_PRIORITIES) return current;
      return { ...current, priorities: [...current.priorities, value] };
    });
  }

  const canContinue = step !== 2 || answers.useCases.length > 0;

  function goNext() {
    if (!canContinue) return;
    if (step < TOTAL_STEPS) {
      setStep((current) => current + 1);
      return;
    }

    navigate("/results", { state: answers });
  }

  function goBack() {
    if (step > 1) setStep((current) => current - 1);
  }

  function editStep(target) {
    setStep(target);
  }

  return (
    <main className="container quiz">
      <div className="quiz-progress">
        <p className="quiz-step-label">Step {step} of {TOTAL_STEPS}</p>
        <div
          className="progress-track"
          role="progressbar"
          aria-label={`Step ${step} of ${TOTAL_STEPS}`}
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
        >
          <div className="progress-fill" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </div>
      </div>

      <div className="quiz-body" key={step}>
        {step === 1 && (
          <>
            <p className="quiz-eyebrow">START WITH YOUR DEVICE</p>
            <h2>What do you need?</h2>
            <p className="quiz-help">Choose the kind of computer you want advice about.</p>
            <div className="option-grid two device-grid">
              {deviceOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`option device-option ${answers.device === option.value ? "selected" : ""}`}
                  aria-pressed={answers.device === option.value}
                  onClick={() => updateDevice(option.value)}
                >
                  <span className="option-icon" aria-hidden="true">{option.icon}</span>
                  <span className="option-title">{option.title}</span>
                  <span className="option-text">{option.text}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="quiz-eyebrow">YOUR WORKLOAD</p>
            <h2>What will you use it for?</h2>
            <p className="quiz-help">
              Choose all that apply. {answers.useCases.length} selected (choose up to {MAX_USES}).
            </p>
            <div className="option-grid three use-case-grid">
              {useCaseOptions.map((option) => {
                const selected = answers.useCases.includes(option.value);
                const disabled = !selected && answers.useCases.length >= MAX_USES;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={disabled}
                    className={`option use-case-option ${selected ? "selected" : ""}`}
                    aria-pressed={selected}
                    onClick={() => toggleUseCase(option.value)}
                  >
                    <span className="option-icon" aria-hidden="true">{option.icon}</span>
                    <span className="option-title">{option.title}</span>
                    <span className="option-text">{option.text}</span>
                  </button>
                );
              })}
            </div>
            <label className="field-label" htmlFor="details">
              Specific applications or games <span>(optional)</span>
            </label>
            <input
              id="details"
              className="text-input"
              type="text"
              maxLength={500}
              placeholder="For example: Blender, AutoCAD, Valorant"
              value={answers.details}
              onChange={(event) => setAnswers((current) => ({ ...current, details: event.target.value }))}
            />
          </>
        )}

        {step === 3 && (
          <>
            <p className="quiz-eyebrow">PLAN YOUR SPEND</p>
            <h2>What is your budget range?</h2>
            <p className="quiz-help">Choose a minimum and maximum. Catalog prices are not live-verified.</p>
            <div className="budget-value" aria-live="polite">
              {formatINR(answers.budgetMin)} <span>–</span> {formatINR(answers.budgetMax)}
            </div>
            <div className="budget-presets" aria-label="Suggested budget ranges">
              {budgetPresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="budget-preset"
                  onClick={() => applyPreset(preset)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="range-inputs">
              <label>
                Minimum budget
                <span className="range-number">
                  <span aria-hidden="true">₹</span>
                  <input
                    type="number"
                    min={budgetMinimum}
                    max={answers.budgetMax}
                    step={BUDGET_STEP}
                    value={answers.budgetMin}
                    aria-label="Minimum budget in rupees"
                    onChange={(event) => updateBudget("budgetMin", event.target.value)}
                  />
                </span>
              </label>
              <label>
                Maximum budget
                <span className="range-number">
                  <span aria-hidden="true">₹</span>
                  <input
                    type="number"
                    min={answers.budgetMin}
                    max={budgetMaximum}
                    step={BUDGET_STEP}
                    value={answers.budgetMax}
                    aria-label="Maximum budget in rupees"
                    onChange={(event) => updateBudget("budgetMax", event.target.value)}
                  />
                </span>
              </label>
            </div>
            <div className="budget-range-slider" style={{ "--range-start": `${rangeStart}%`, "--range-end": `${rangeEnd}%` }}>
              <div className="budget-range-track" aria-hidden="true" />
              <div className="budget-range-fill" aria-hidden="true" />
              <input
                className="range-slider range-slider-min"
                type="range"
                min={budgetMinimum}
                max={budgetMaximum}
                step={BUDGET_STEP}
                value={answers.budgetMin}
                aria-label="Minimum budget range"
                onChange={(event) => updateBudget("budgetMin", event.target.value)}
              />
              <input
                className="range-slider range-slider-max"
                type="range"
                min={budgetMinimum}
                max={budgetMaximum}
                step={BUDGET_STEP}
                value={answers.budgetMax}
                aria-label="Maximum budget range"
                onChange={(event) => updateBudget("budgetMax", event.target.value)}
              />
            </div>
            <div className="slider-labels">
              <span>{formatINR(budgetMinimum)}</span>
              <span>{formatINR(budgetMaximum)}</span>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <p className="quiz-eyebrow">TUNE YOUR MATCH</p>
            <h2>What matters most to you?</h2>
            <p className="quiz-help">
              Choose up to three priorities. {answers.priorities.length} of {MAX_PRIORITIES} selected.
            </p>
            <div className="option-grid three priority-grid">
              {availablePriorities.map((option) => {
                const selected = answers.priorities.includes(option.value);
                const disabled = !selected && answers.priorities.length >= MAX_PRIORITIES;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={disabled}
                    className={`option ${selected ? "selected" : ""}`}
                    aria-pressed={selected}
                    onClick={() => togglePriority(option.value)}
                  >
                    <span className="option-title">{option.title}</span>
                    <span className="option-text">{option.text}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <p className="quiz-eyebrow">READY WHEN YOU ARE</p>
            <h2>Review your choices</h2>
            <p className="quiz-help">Check your answers, or go back to change anything.</p>
            <div className="quiz-review">
              <article className="quiz-review-row">
                <div><h3>Device</h3><p>{answers.device === "laptop" ? "Laptop" : "Custom desktop PC"}</p></div>
                <button type="button" onClick={() => editStep(1)}>Edit</button>
              </article>
              <article className="quiz-review-row">
                <div><h3>Use cases</h3><p>{selectedUseCases.map((option) => option.title).join(", ") || "Not selected"}</p></div>
                <button type="button" onClick={() => editStep(2)}>Edit</button>
              </article>
              <article className="quiz-review-row">
                <div>
                  <h3>Budget range</h3>
                  <p>{formatINR(answers.budgetMin)} – {formatINR(answers.budgetMax)}</p>
                </div>
                <button type="button" onClick={() => editStep(3)}>Edit</button>
              </article>
              <article className="quiz-review-row">
                <div><h3>Priorities</h3><p>{selectedPriorities.map((option) => option.title).join(", ") || "No specific priorities"}</p></div>
                <button type="button" onClick={() => editStep(4)}>Edit</button>
              </article>
              {answers.details && (
                <article className="quiz-review-row">
                  <div><h3>Applications or games</h3><p>{answers.details}</p></div>
                  <button type="button" onClick={() => editStep(2)}>Edit</button>
                </article>
              )}
            </div>
          </>
        )}
      </div>

      <div className="quiz-actions">
        {step > 1 ? <Button variant="secondary" onClick={goBack}>Back</Button> : <span />}
        <button type="button" className="btn btn-primary" onClick={goNext} disabled={!canContinue}>
          {step === TOTAL_STEPS
            ? answers.device === "laptop" ? "Generate laptop matches" : "Continue to PC Builder"
            : "Continue"}
        </button>
      </div>
    </main>
  );
}

export default Questionnaire;
