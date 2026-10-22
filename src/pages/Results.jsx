import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Button from "../components/Button";
import RecommendationDisplay from "../components/RecommendationDisplay";
import { generateRecommendation } from "../lib/recommendationApi";
import "./Results.css";

export default function Results() {
  const { state: userInput } = useLocation();
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const requestStarted = useRef(false);

  const requestResult = useCallback(async () => {
    if (!userInput || requestStarted.current) return;
    requestStarted.current = true;
    setLoading(true);
    setError("");
    try {
      setResult(await generateRecommendation("laptop", userInput));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not generate a recommendation.");
    } finally {
      requestStarted.current = false;
      setLoading(false);
    }
  }, [userInput]);

  useEffect(() => {
    if (!userInput) return undefined;
    const request = window.setTimeout(() => { void requestResult(); }, 0);
    return () => window.clearTimeout(request);
  }, [requestResult, userInput]);

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
          <span className="rs-badge">TechPickr · Gemini advisor</span>
          <h1><strong>Laptop recommendations</strong></h1>
          <p>Advice based on your original budget and use-case answers.</p>
        </section>
        {loading && <p className="rs-loading" role="status">Gemini is preparing your recommendation…</p>}
        {error && (
          <div className="rs-error" role="alert">
            <p>{error}</p>
            <button type="button" className="rs-again" onClick={() => void requestResult()} disabled={loading}>
              Retry recommendation
            </button>
          </div>
        )}
        {result && (
          <RecommendationDisplay type="laptop" userInput={userInput} result={result} />
        )}
        <div className="rs-actions">
          <Link to="/build" className="rs-again">Change answers</Link>
          <Link to="/my-recommendations" className="rs-again">My Recommendations</Link>
        </div>
      </div>
    </main>
  );
}
