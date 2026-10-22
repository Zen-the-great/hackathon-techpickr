import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import RollLink from "./RollLink";
import { useAuth } from "../contexts/useAuth";
import { supabase } from "../supabaseClient.js";
import "./Navbar.css";

function Navbar() {
  const { t, i18n } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [accountError, setAccountError] = useState("");
  const profileName = [
    user?.user_metadata?.full_name,
    user?.user_metadata?.name,
    user?.email,
  ].find((value) => typeof value === "string" && value.trim()) || "My profile";
  const profileInitials = profileName
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
  const profileImage = [
    user?.user_metadata?.avatar_url,
    user?.user_metadata?.picture,
  ].find((value) => typeof value === "string" && value.trim());

  // slightly stronger background after the page is scrolled
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // scroll to a section on the Home page (go Home first if needed)
  const goToSection = (id) => (e) => {
    e.preventDefault();
    const scroll = () =>
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (location.pathname === "/") {
      scroll();
    } else {
      navigate("/");
      setTimeout(scroll, 150);
    }
  };

  async function signOut() {
    setAccountError("");
    if (!supabase) {
      setAccountError("Supabase is not configured.");
      return;
    }
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setAccountError(error.message || "Could not log out.");
        return;
      }
      navigate("/");
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "Could not log out.");
    }
  }

  return (
    <header className={`nav ${scrolled ? "nav-scrolled" : ""}`}>
      <Link to="/" className="nav-logo" aria-label={t("nav.home")}>
        <img className="nav-logo-icon" src="/techpickr-logo.png" alt="" />
      </Link>

      <nav className="nav-links" id="nav-menu" aria-label={t("nav.aria")}>
        <RollLink to="/why-us">{t("nav.whyUs")}</RollLink>
        <RollLink to="/community">{t("nav.community")}</RollLink>
        <RollLink href="/#features" onClick={goToSection("features")}>
          {t("nav.features")}
        </RollLink>
        <RollLink to={user ? "/my-recommendations" : "/login"}>
          {user ? "My Recommendations" : "Log in"}
        </RollLink>
      </nav>

      <div className="nav-actions">
        <label className="nav-language" title={t("language.label")}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
          </svg>
          <span className="sr-only">{t("language.label")}</span>
          <select
            value={i18n.resolvedLanguage || "en"}
            onChange={(event) => i18n.changeLanguage(event.target.value)}
            aria-label={t("language.label")}
          >
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="ja">日本語</option>
          </select>
        </label>

        <Link to="/build" className="nav-cta nav-cta-desktop">
          {t("nav.buildPc")} <span aria-hidden="true">→</span>
        </Link>
        {user && (
          <div className="nav-account">
            <Link
              to="/my-recommendations"
              className="nav-avatar"
              aria-label={profileName}
              title={profileName}
            >
              {profileImage
                ? <img src={profileImage} alt="" />
                : <span>{profileInitials}</span>}
            </Link>
            <button type="button" className="nav-signout-desktop" onClick={signOut}>
              Log out
            </button>
          </div>
        )}
      </div>

      {accountError && <span className="nav-account-error" role="alert">{accountError}</span>}
    </header>
  );
}

export default Navbar;
