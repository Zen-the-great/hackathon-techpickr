import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import {
  savePendingRecommendation,
  saveRecommendation,
} from "../lib/savedRecommendations";
import { getPcPriceEstimate } from "../lib/pcRecommendations";
import "./RecommendationDisplay.css";

const PC_PRICE_SPEC_KEYS = new Set([
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
]);

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

function readableUseCases(requirements) {
  const useCases = Array.isArray(requirements?.useCases) ? requirements.useCases : [];
  return useCases.length
    ? useCases.map((useCase) => useCaseLabels[useCase] || useCase).join(", ")
    : "Not specified";
}

function itemKey(item) {
  return item.id ?? item.name ?? `${item.category ?? "item"}:${item.model ?? ""}`;
}

export default function RecommendationDisplay({ type, userInput, result }) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [comparedNames, setComparedNames] = useState([]);
  const requestPending = useRef(false);
  const recommendation = result.recommendation;
  const isLaptop = type === "laptop";
  const budgetMin = Number(userInput.budgetMin ?? 25_000);
  const budgetMax = Number(userInput.budgetMax ?? userInput.budget ?? 0);
  const laptopRecommendations = Array.isArray(recommendation.recommendations)
    ? recommendation.recommendations
    : [];
  const pcComponents = Array.isArray(result.components) ? result.components : [];
  const pcGuidance = !isLaptop && pcComponents.length === 0 ? laptopRecommendations : [];
  const displayItems = isLaptop
    ? laptopRecommendations
    : pcComponents.length > 0 ? pcComponents : pcGuidance;
  const componentPriceEstimates = pcComponents.map(getPcPriceEstimate);
  const hasCompletePriceEstimates =
    pcComponents.length > 0 && componentPriceEstimates.every(Boolean);
  const hasOnlyVerifiedPrices =
    hasCompletePriceEstimates && componentPriceEstimates.every((estimate) => estimate.verified);
  const knownPcTotal = hasCompletePriceEstimates
    ? componentPriceEstimates.reduce((total, estimate) => total + estimate.amount, 0)
    : null;
  const pcBudget = Number(result.budgetMaxInr ?? budgetMax);
  const pcRemaining = knownPcTotal === null || knownPcTotal === undefined
    ? null
    : pcBudget - knownPcTotal;
  const pcWarnings = Array.isArray(result.compatibilityWarnings)
    ? result.compatibilityWarnings
    : [];

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

  function toggleCompare(item) {
    const key = itemKey(item);
    setComparedNames((current) => {
      if (current.includes(key)) {
        return current.filter((name) => name !== key);
      }
      if (current.length >= 3) return current;
      return [...current, key];
    });
  }

  const comparedItems = laptopRecommendations.filter((item) =>
    comparedNames.includes(itemKey(item))
  );

  return (
    <section className="ai-recommendation" aria-live="polite">
      <div className="ai-recommendation-heading">
        <div>
          <span className="ai-recommendation-badge">
            {isLaptop
              ? "TechPickr laptop catalog"
              : pcComponents.length > 0 ? "PC component catalog" : "Gemini PC build guidance"}
          </span>
          <h2>{recommendation.title}</h2>
          <p>{recommendation.summary}</p>
        </div>
        <div className="ai-recommendation-budget">
          <span>Budget range</span>
          <strong>
            ₹{budgetMin.toLocaleString("en-IN")} – ₹{budgetMax.toLocaleString("en-IN")}
          </strong>
        </div>
      </div>

      <div className="ai-recommendation-requirements">
        <span><strong>Use cases:</strong> {readableUseCases(userInput)}</span>
        {userInput.performance && <span><strong>Performance:</strong> {userInput.performance}</span>}
        {userInput.portability && <span><strong>Portability:</strong> {userInput.portability}</span>}
        {userInput.priorities?.length > 0 && (
          <span><strong>Priorities:</strong> {userInput.priorities.map((priority) => priorityLabels[priority] || priority).join(", ")}</span>
        )}
        {userInput.details && <span><strong>Additional needs:</strong> {userInput.details}</span>}
      </div>

      {!isLaptop && pcComponents.length > 0 && (
        <div className="pc-build-costs">
          <div>
            <span>Budget</span>
            <strong>₹{pcBudget.toLocaleString("en-IN")}</strong>
          </div>
          <div>
            <span>{hasOnlyVerifiedPrices ? "Verified component total" : "Estimated component total"}</span>
            <strong>{knownPcTotal == null ? "Unavailable" : `₹${Number(knownPcTotal).toLocaleString("en-IN")}`}</strong>
          </div>
          <div>
            <span>{hasOnlyVerifiedPrices ? "Budget remaining" : "Estimated budget remaining"}</span>
            <strong>{pcRemaining == null ? "Unavailable" : `₹${pcRemaining.toLocaleString("en-IN")}`}</strong>
          </div>
          <p>Prices marked “estimate” are rounded catalog estimates, not live retailer quotes. Check Amazon or Flipkart for current prices and stock.</p>
        </div>
      )}

      {!isLaptop && pcGuidance.length > 0 && (
        <aside className="pc-build-compatibility" role="note">
          These are general component-selection approaches, not a priced or compatibility-checked parts list. Verify specific models, prices, and compatibility before purchase.
        </aside>
      )}

      {!isLaptop && pcWarnings.length > 0 && (
        <aside className="pc-build-compatibility" role="status">
          <strong>Compatibility is not fully verified</strong>
          <ul>{pcWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
          <p>Confirm socket, memory support, power requirements, and case/GPU clearance with manufacturer specifications before purchase.</p>
        </aside>
      )}

      {displayItems.length > 0 ? (
        <div className={`ai-recommendation-list ${isLaptop ? "product-recommendation-list" : ""}`}>
          {displayItems.map((item, index) => {
            const pcPriceEstimate = !isLaptop ? getPcPriceEstimate(item) : null;
            return (
            <article className="ai-recommendation-card" key={`${itemKey(item)}-${index}`}>
              <span className="ai-recommendation-number">
                {isLaptop ? `MATCH ${String(index + 1).padStart(2, "0")}` : `OPTION ${index + 1}`}
              </span>
              {isLaptop ? (
                <>
                  <h3>{item.name || [item.brand, item.model].filter(Boolean).join(" ") || item.model}</h3>
                  {item.price !== null && item.price !== undefined && (
                    <p className="product-price">
                      ₹{Number(item.price).toLocaleString("en-IN")}
                      <span>
                        {item.priceType === "estimated_dataset" ? "Estimated catalog price" : "Indicative catalog price"} · may have changed
                      </span>
                    </p>
                  )}
                  <dl className="product-specs">
                    {[
                      ["Processor", item.processor],
                      ["Graphics", item.graphics],
                      ["Memory", item.ram],
                      ["Storage", item.storage],
                      ["Display", item.display],
                    ].filter(([, value]) => value).map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="product-match-reason">{item.matchReason}</p>
                  {item.configuration && (
                    <p className="product-configuration">Catalog configuration: {item.configuration}</p>
                  )}
                  {item.limitations?.length > 0 && (
                    <ul className="product-limitations">
                      {item.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
                    </ul>
                  )}
                  <div className="product-card-actions">
                    {item.productUrl && (
                      <a
                        className="product-retailer-link"
                        href={item.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Product
                      </a>
                    )}
                    {item.amazonUrl && (
                      <a
                        className="product-retailer-link"
                        href={item.amazonUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {item.amazonLinkType === "search" || item.retailerLinkType === "search"
                          ? "Search Amazon"
                          : "View on Amazon"}
                      </a>
                    )}
                    {item.flipkartUrl && (
                      <a
                        className="product-retailer-link"
                        href={item.flipkartUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {item.flipkartLinkType === "search" || item.retailerLinkType === "search"
                          ? "Search Flipkart"
                          : "View on Flipkart"}
                      </a>
                    )}
                    <button
                      type="button"
                      className={`product-compare-button ${comparedNames.includes(itemKey(item)) ? "active" : ""}`}
                      onClick={() => toggleCompare(item)}
                      disabled={!comparedNames.includes(itemKey(item)) && comparedNames.length >= 3}
                      aria-pressed={comparedNames.includes(itemKey(item))}
                    >
                      {comparedNames.includes(itemKey(item)) ? "Added to compare" : "Compare"}
                    </button>
                  </div>
                </>
              ) : pcGuidance.length > 0 ? (
                <div className="pc-build-guidance-card">
                  <h3>{item.name}</h3>
                  <p>{item.fit}</p>
                  {item.guidance?.length > 0 && (
                    <div>
                      <h4>Component selection guidance</h4>
                      <ul>{item.guidance.map((line, lineIndex) => <li key={lineIndex}>{line}</li>)}</ul>
                    </div>
                  )}
                  {item.unknowns?.length > 0 && (
                    <div className="ai-recommendation-unknowns">
                      <h4>Verify before buying</h4>
                      <ul>{item.unknowns.map((line, lineIndex) => <li key={lineIndex}>{line}</li>)}</ul>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <span className="pc-component-category">{item.category}</span>
                  <h3>{item.model}</h3>
                  {item.brand && <p className="product-brand">{item.brand}</p>}
                  <p className="product-price">
                    {pcPriceEstimate
                      ? pcPriceEstimate.amount === 0
                        ? "Included"
                        : `₹${Number(pcPriceEstimate.amount).toLocaleString("en-IN")}`
                      : "Price unavailable"}
                    {pcPriceEstimate && (
                      <span>
                        {pcPriceEstimate.verified
                          ? pcPriceEstimate.source
                          : `Estimate · ${pcPriceEstimate.source}${pcPriceEstimate.checkedAt
                            ? ` · checked ${new Date(pcPriceEstimate.checkedAt).toLocaleDateString("en-IN")}`
                            : ""}`}
                      </span>
                    )}
                  </p>
                  <p className="pc-component-compatibility">
                    Compatibility: <strong>{item.compatibility_status || "Unverified"}</strong>
                  </p>
                  {Object.entries(item.specs || {}).filter(([key, value]) =>
                    !PC_PRICE_SPEC_KEYS.has(key.toLowerCase()) &&
                    value !== null && value !== undefined && typeof value !== "object"
                  ).slice(0, 8).length > 0 ? (
                    <dl className="product-specs">
                      {Object.entries(item.specs || {})
                        .filter(([key, value]) =>
                          !PC_PRICE_SPEC_KEYS.has(key.toLowerCase()) &&
                          value !== null && value !== undefined && typeof value !== "object"
                        )
                        .slice(0, 8)
                        .map(([key, value]) => (
                          <div key={key}>
                            <dt>{key.replaceAll("_", " ")}</dt>
                            <dd>{String(value)}</dd>
                          </div>
                        ))}
                    </dl>
                  ) : (
                    <p className="product-match-reason">Detailed specifications are not available in the component record.</p>
                  )}
                  <div className="product-card-actions">
                    {item.amazonUrl && (
                      <a className="product-retailer-link" href={item.amazonUrl} target="_blank" rel="noopener noreferrer">
                        {item.amazonLinkType === "search" ? "Search Amazon" : "View on Amazon"}
                      </a>
                    )}
                    {item.flipkartUrl && (
                      <a className="product-retailer-link" href={item.flipkartUrl} target="_blank" rel="noopener noreferrer">
                        {item.flipkartLinkType === "search" ? "Search Flipkart" : "View on Flipkart"}
                      </a>
                    )}
                  </div>
                </>
              )}
            </article>
          );
          })}
        </div>
      ) : (
        <div className="product-empty-state" role="status">
          <h3>{isLaptop ? "No matching laptops found in this budget range" : "No PC build guidance available"}</h3>
          <p>{isLaptop
            ? "Try widening the budget range or selecting fewer use cases."
            : "Check the Gemini backend configuration and retry. No product parts have been fabricated."}</p>
        </div>
      )}

      {isLaptop && comparedItems.length > 1 && (
        <section className="product-compare" aria-label="Laptop comparison">
          <div className="product-compare-heading">
            <div>
              <h3>Compare selected models</h3>
              <p>{comparedItems.length} models selected</p>
            </div>
            <button type="button" onClick={() => setComparedNames([])}>Clear comparison</button>
          </div>
          <div className="product-compare-table">
            {[
              ["Model", (item) => item.name],
              ["Indicative price", (item) => item.price == null ? "Not available" : `₹${Number(item.price).toLocaleString("en-IN")}`],
              ["Processor", (item) => item.processor || "Not listed"],
              ["Graphics", (item) => item.graphics || "Not listed"],
              ["Memory", (item) => item.ram || "Not listed"],
              ["Storage", (item) => item.storage || "Not listed"],
            ].map(([label, getValue]) => (
              <div className="product-compare-row" key={label}>
                <strong>{label}</strong>
                {comparedItems.map((item) => <span key={itemKey(item)}>{getValue(item)}</span>)}
              </div>
            ))}
          </div>
        </section>
      )}

      <aside className="ai-recommendation-disclaimer">
        {isLaptop
          ? "Laptop names, configurations and indicative prices come from the TechPickr catalog and are not checked live. The catalog has no product images, so images are deliberately not substituted. Amazon and Flipkart buttons open searches, not verified product listings. Confirm the exact configuration, current price, stock and return terms with the retailer before buying."
          : pcComponents.length > 0
            ? "PC component prices are indicative estimates, not live retailer quotes. Check the Amazon or Flipkart searches for current prices and stock. Confirm sockets, memory support, power requirements and physical fit before buying."
            : "Gemini provides general PC component-selection guidance. It does not return verified product models, prices, availability, or compatibility."}
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
