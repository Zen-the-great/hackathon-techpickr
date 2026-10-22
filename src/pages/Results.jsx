import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Button from "../components/Button";
import RecommendationDisplay from "../components/RecommendationDisplay";
import { generatePcRecommendation } from "../lib/pcRecommendations";
import { generateRecommendation } from "../lib/recommendationApi";
import "./Results.css";

const useCaseLabels = {
  gaming: "Gaming",
  "video-editing": "Video editing",
  programming: "Coding & software development",
  engineering: "Engineering applications",
  "3d-modeling": "3D modelling & rendering",
  studying: "College & studying",
  office: "Office productivity",
  "graphic-design": "Graphic design",
  everyday: "Everyday use",
  "ai-ml": "AI & machine learning",
};
const priorityLabels = {
  performance: "Performance",
  value: "Value for money",
  "low-noise": "Low noise",
  efficiency: "Power efficiency",
  "power-efficiency": "Power efficiency",
  upgradeability: "Upgradeability",
  "gaming-performance": "Gaming performance",
  "video-editing-performance": "Video editing performance",
  portability: "Portability",
  "battery-life": "Battery life",
  "compact-size": "Compact size",
};

export default function Results() {
  const location = useLocation();
  const routeState = location.state;
  const userInput = routeState?.userInput ?? routeState;
  const savedResult = routeState?.savedRecommendation;
  const recommendationType = routeState?.type === "pc_build" ||
    userInput?.device === "desktop" ||
    Array.isArray(savedResult?.components)
    ? "pc_build"
    : "laptop";
  const [generatedResult, setGeneratedResult] = useState(null);
  const result = savedResult ?? generatedResult;
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const requestStarted = useRef(false);

  const requestResult = useCallback(async () => {
    if (!userInput || requestStarted.current) return;
    requestStarted.current = true;
    setLoading(true);
    setError("");
    try {
      const recommendation = recommendationType === "pc_build"
        ? await generatePcRecommendation(userInput)
        : await generateRecommendation("laptop", userInput);
      setGeneratedResult(recommendation);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not generate a recommendation.");
    } finally {
      requestStarted.current = false;
      setLoading(false);
    }
  }, [recommendationType, userInput]);

  useEffect(() => {
    if (!userInput) return undefined;
    if (savedResult) return undefined;
    const request = window.setTimeout(() => { void requestResult(); }, 0);
    return () => window.clearTimeout(request);
  }, [requestResult, savedResult, userInput]);

  if (!userInput) {
    return (
      <main className="rs-page">
        <div className="rs-wrap rs-empty">
          <h1>No requirements found</h1>
          <p>Complete the questionnaire first to get a tailored laptop recommendation.</p>
          <Button to="/build">Start questionnaire</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="rs-page">
      <div className="rs-wrap">
        <section className="rs-hero">
          <span className="rs-badge">
            {recommendationType === "pc_build"
              ? "TECHPICKR / PC BUILD"
              : "TECHPICKR / LAPTOP MATCHES"}
          </span>
          <h1>
            <strong>
              {recommendationType === "pc_build"
                ? "Your PC Build Recommendation"
                : "Your Laptop Recommendations"}
            </strong>
          </h1>
          <p>
            {recommendationType === "pc_build"
              ? "A component build selected from the PC catalog for your budget and requirements."
              : "Specific models from our laptop catalog, filtered to your selected budget range and use cases."}
          </p>
          <div className="rs-summary-chips">
            <span><strong>Budget</strong> ₹{Number(userInput.budgetMin ?? 25_000).toLocaleString("en-IN")} – ₹{Number(userInput.budgetMax ?? userInput.budget ?? 0).toLocaleString("en-IN")}</span>
            <span><strong>For</strong> {Array.isArray(userInput.useCases)
              ? userInput.useCases.map((useCase) => useCaseLabels[useCase] || useCase).join(", ")
              : "Not specified"}</span>
            {userInput.priorities?.length > 0 && (
              <span><strong>Priorities</strong> {userInput.priorities.map((priority) => priorityLabels[priority] || priority).join(", ")}</span>
            )}
          </div>
        </section>
        {loading && (
          <div className="rs-loading-grid" role="status" aria-label="Finding matching laptops">
            <span className="sr-only">Finding matching laptops…</span>
            {[0, 1, 2].map((item) => (
              <article className="rs-skeleton-card" key={item} aria-hidden="true">
                <span className="rs-skeleton-line short" />
                <span className="rs-skeleton-line title" />
                <span className="rs-skeleton-line" />
                <span className="rs-skeleton-line medium" />
                <span className="rs-skeleton-specs" />
              </article>
            ))}
          </div>
        )}
        {error && (
          <div className="rs-error" role="alert">
            <p>{error}</p>
            <button type="button" className="rs-again" onClick={() => void requestResult()} disabled={loading}>
              Retry recommendation
            </button>
          </div>
        )}
        {result && (
          <RecommendationDisplay type={recommendationType} userInput={userInput} result={result} />
        )}
        <div className="rs-actions">
          <Link
            to="/build"
            state={{ initialRequirements: userInput }}
            className="rs-again"
          >
            Edit answers
          </Link>
          <Link to="/my-recommendations" className="rs-again">My Recommendations</Link>
        </div>
      </div>
    </main>
  );
}
