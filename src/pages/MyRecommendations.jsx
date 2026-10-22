import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import { useAuth } from "../contexts/useAuth";
import {
  clearPendingRecommendation,
  deleteSavedRecommendation,
  listSavedRecommendations,
  readPendingRecommendation,
  saveRecommendation,
} from "../lib/savedRecommendations";
import "./Auth.css";

function recordSummary(record) {
  return record.recommendation_data?.recommendation?.summary || "Saved hardware recommendation.";
}

function recordDate(date) {
  if (!date) return "Date unavailable";
  const parsed = new Date(date);
  return Number.isNaN(parsed.valueOf()) ? "Date unavailable" : parsed.toLocaleString();
}

export default function MyRecommendations() {
  const { user, loading: authLoading } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingState, setPendingState] = useState(() => {
    try {
      return { item: readPendingRecommendation(), error: "" };
    } catch (pendingReadError) {
      return {
        item: null,
        error: pendingReadError instanceof Error ? pendingReadError.message : "Could not read the pending recommendation.",
      };
    }
  });
  const pending = pendingState.item;
  const pendingError = pendingState.error;
  const [retry, setRetry] = useState(0);
  const [deleting, setDeleting] = useState("");
  const requestPending = useRef(false);

  const loadRecords = useCallback(async () => {
    try {
      const savedRecords = await listSavedRecommendations();
      setRecords(savedRecords);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load saved recommendations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    const request = window.setTimeout(() => { void loadRecords(); }, 0);
    return () => window.clearTimeout(request);
  }, [authLoading, user, loadRecords]);

  useEffect(() => {
    if (!pending || !user || requestPending.current) return;
    requestPending.current = true;
    saveRecommendation(pending)
      .then(async () => {
        clearPendingRecommendation();
        setPendingState({ item: null, error: "" });
        await loadRecords();
      })
      .catch((saveError) => {
        setPendingState((current) => ({
          ...current,
          error: saveError instanceof Error ? saveError.message : "Could not save the pending recommendation.",
        }));
      })
      .finally(() => {
        requestPending.current = false;
      });
  }, [pending, user, retry, loadRecords]);

  async function removeRecord(record) {
    if (!window.confirm(`Delete "${record.title}" from My Recommendations?`)) return;
    setDeleting(record.id);
    setError("");
    try {
      await deleteSavedRecommendation(record.id);
      setRecords((current) => current.filter((item) => item.id !== record.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete this recommendation.");
    } finally {
      setDeleting("");
    }
  }

  if (authLoading) {
    return <main className="container account-page"><p className="account-loading" role="status">Checking your account…</p></main>;
  }
  if (!user) {
    return <main className="container account-page"><section className="account-card"><h1>Log in to continue</h1><p>Your saved recommendations are private to your account.</p><Link className="account-link" to="/login">Log in</Link></section></main>;
  }

  return (
    <main className="container account-page">
      <header>
        <p className="pc-builder-eyebrow">TECHPICKR / YOUR ACCOUNT</p>
        <h1>My Recommendations</h1>
        <p>{user.user_metadata?.display_name || user.email}</p>
      </header>

      {pendingError && (
        <div className="account-error" role="alert">
          {pendingError}
          {pending && <button className="account-link saved-retry" type="button" onClick={() => setRetry((value) => value + 1)}>Retry saving</button>}
        </div>
      )}
      {error && <p className="account-error" role="alert">{error}</p>}
      {loading ? (
        <p className="account-loading" role="status">Loading your saved recommendations…</p>
      ) : records.length === 0 ? (
        <section className="account-empty">
          <h2>No saved recommendations yet</h2>
          <p>Generate a laptop or PC recommendation and save it here to find it again later.</p>
          <Button to="/build">Get a recommendation</Button>
        </section>
      ) : (
        <div className="saved-list">
          {records.map((record) => (
            <article className="saved-card" key={record.id}>
              <div className="saved-card-top">
                <div>
                  <h2>{record.title}</h2>
                  <p className="saved-card-meta">
                    {record.recommendation_type === "pc_build" ? "PC build" : "Laptop"} · {recordDate(record.created_at)}
                    {record.ai_provider
                      ? ` · ${record.ai_provider}${record.model_name ? ` / ${record.model_name}` : ""}`
                      : ""}
                  </p>
                </div>
                <button className="saved-delete" type="button" onClick={() => removeRecord(record)} disabled={deleting === record.id}>
                  {deleting === record.id ? "Deleting…" : "Delete"}
                </button>
              </div>
              <p className="saved-card-summary">{recordSummary(record)}</p>
              <Link
                className="account-link"
                to="/results"
                state={{
                  type: record.recommendation_type,
                  userInput: record.user_input,
                  savedRecommendation: record.recommendation_data,
                }}
              >
                Open saved {record.recommendation_type === "pc_build" ? "PC build" : "laptop matches"}
              </Link>
              <details>
                <summary>Open saved recommendation and original requirements</summary>
                <h3>Original requirements</h3>
                <pre>{JSON.stringify(record.user_input, null, 2)}</pre>
                <h3>Saved recommendation data</h3>
                <pre>{JSON.stringify(record.recommendation_data, null, 2)}</pre>
              </details>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
