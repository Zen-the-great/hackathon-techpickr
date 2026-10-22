import { useEffect, useMemo, useState } from "react";
import { AuthContext } from "./authContextValue";
import { supabase, supabaseConfigured } from "../supabaseClient.js";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [error, setError] = useState(
    supabaseConfigured
      ? ""
      : "Supabase authentication is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );

  useEffect(() => {
    if (!supabase) return undefined;

    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setError("");
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) {
        setError(sessionError.message || "Unable to restore your session.");
      } else {
        setSession(data.session);
        setError("");
      }
      setLoading(false);
    }).catch((sessionError) => {
      if (!active) return;
      setError(sessionError instanceof Error ? sessionError.message : "Unable to restore your session.");
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    loading,
    error,
    configured: supabaseConfigured,
  }), [session, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
