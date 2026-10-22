import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import {
  savePendingRecommendation,
  saveRecommendation,
} from "../lib/savedRecommendations";
import "./RecommendationDisplay.css";

function readableUseCases(requirements) {
  const useCases = Array.isArray(requirements?.useCases) ? requirements.useCases : [];
  return useCases.length ? useCases.join(", ") : "Not specified";
}

export default function RecommendationDisplay({ type, userInput, result }) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const requestPending = useRef(false);
  const recommendation = result.recommendation;
  const isLaptop = type === "laptop";

  async function onSave() {
    if (requestPending.current || saved) return;
    requestPending.current = true;
    setSaving(true);
    setMessage("");
    try {
      if (!user) {
        savePendingRecommendation({ type, userInput, result });
        navigate("/login", { state: { returnTo: location.pathname } });
        return;
      }
      await saveRecommendation({ type, userInput, result });
      setSaved(true);
      setMessage("Recommendation saved to your account.");
    } catch (error) {
      if (error?.needsLogin || error?.status === 401 || error?.code === "PGRST301") {
        try {
          savePendingRecommendation({ type, userInput, result });
          navigate("/login", { state: { returnTo: location.pathname } });
          return;
        } catch (storageError) {
          setMessage(storageError.message);
        }
      } else {
        setMessage(error instanceof Error ? error.message : "Could not save this recommendation.");
      }
    } finally {
      requestPending.current = false;
      setSaving(false);
    }
  }

  return (
    <section className="ai-recommendation" aria-live="polite">
      <div className="ai-recommendation-heading">
        <div>
          <span className="ai-recommendation-badge">Gemini guidance · {isLaptop ? "Laptop" : "PC build"}</span>
          <h2>{recommendation.title}</h2>
          <p>{recommendation.summary}</p>
        </div>
        <div className="ai-recommendation-budget">
          <span>Budget</span>
          <strong>₹{Number(userInput.budget).toLocaleString("en-IN")}</strong>
        </div>
      </div>

      <div className="ai-recommendation-requirements">
        <span><strong>Use cases:</strong> {readableUseCases(userInput)}</span>
        {userInput.performance && <span><strong>Performance:</strong> {userInput.performance}</span>}
        {userInput.portability && <span><strong>Portability:</strong> {userInput.portability}</span>}
        {userInput.priorities?.length > 0 && (
          <span><strong>Priorities:</strong> {userInput.priorities.join(", ")}</span>
        )}
        {userInput.details && <span><strong>Additional needs:</strong> {userInput.details}</span>}
      </div>

      <div className="ai-recommendation-list">
        {recommendation.recommendations.map((item, index) => (
          <article className="ai-recommendation-card" key={`${item.name}-${index}`}>
            <span className="ai-recommendation-number">OPTION {index + 1}</span>
            <h3>{item.name}</h3>
            <p>{item.fit}</p>
            {item.guidance?.length > 0 && (
              <div>
                <h4>What to look for</h4>
                <ul>{item.guidance.map((line, lineIndex) => <li key={lineIndex}>{line}</li>)}</ul>
              </div>
            )}
            {item.unknowns?.length > 0 && (
              <div className="ai-recommendation-unknowns">
                <h4>Verify before buying</h4>
                <ul>{item.unknowns.map((line, lineIndex) => <li key={lineIndex}>{line}</li>)}</ul>
              </div>
            )}
          </article>
        ))}
      </div>

      <aside className="ai-recommendation-disclaimer">
        AI-generated buying guidance only. Product specifications, prices, benchmarks, stock and availability have not been verified against live retailer or manufacturer sources. For PC builds, check compatibility using manufacturer specifications before buying.
      </aside>

      <div className="ai-recommendation-actions">
        <button type="button" className="ai-save-button" onClick={onSave} disabled={saving || saved || authLoading}>
          {saving ? "Saving…" : saved ? "Saved" : "Save Recommendation"}
        </button>
        {user && <Link to="/my-recommendations" className="ai-history-link">My Recommendations</Link>}
        <span className="ai-save-message" role="status" aria-live="polite">
          {message}
        </span>
      </div>
    </section>
  );
}
