import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import RollLink from "./RollLink";
import { useAuth } from "../contexts/useAuth";
import { supabase } from "../supabaseClient.js";
import "./Navbar.css";

// The ids must match the id="..." of the sections on your Home page.
const sectionLinks = [
  { key: "howItWorks", id: "how-it-works" },
  { key: "features", id: "features" },
  { key: "exploreBuilds", id: "build" },
];

function Navbar() {
  const { t, i18n } = useTranslation();
  const [openPath, setOpenPath] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [accountError, setAccountError] = useState("");
  const open = openPath === location.pathname;

  // slightly stronger background after the page is scrolled
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // close the mobile menu with the Escape key
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpenPath("");
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // scroll to a section on the Home page (go Home first if needed)
  const goToSection = (id) => (e) => {
    e.preventDefault();
    setOpenPath("");
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
    <header className={`nav ${scrolled ? "nav-scrolled" : ""} ${open ? "nav-open" : ""}`}>
      <Link to="/" className="nav-logo" aria-label={t("nav.home")}>
        <span className="nav-logo-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
          </svg>
        </span>
        <span className="nav-logo-text">
          Tech<span>Pickr</span>
        </span>
      </Link>

      <nav className="nav-links" id="nav-menu" aria-label={t("nav.aria")}>
        <RollLink to="/why-us">{t("nav.whyUs")}</RollLink>
        <RollLink to="/community">{t("nav.community")}</RollLink>
        {sectionLinks.map((s) => (
          <RollLink key={s.id} href={`/#${s.id}`} onClick={goToSection(s.id)}>
            {t(`nav.${s.key}`)}
          </RollLink>
        ))}
        <RollLink to={user ? "/my-recommendations" : "/login"}>
          {user ? "My Recommendations" : "Log in"}
        </RollLink>
        <Link to="/build" className="nav-cta nav-cta-mobile">
          {t("nav.buildPc")} <span aria-hidden="true">→</span>
        </Link>
        {user && (
          <button type="button" className="nav-signout-mobile" onClick={signOut}>
            Log out
          </button>
        )}
      </nav>

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
        <button type="button" className="nav-signout-desktop" onClick={signOut} title={user.email || "Log out"}>
          Log out
        </button>
      )}

      <button
        type="button"
        className="nav-burger"
        aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
        aria-expanded={open}
        aria-controls="nav-menu"
        onClick={() => setOpenPath(open ? "" : location.pathname)}
      >
        <span />
        <span />
      </button>
      {accountError && <span className="nav-account-error" role="alert">{accountError}</span>}
    </header>
  );
}

export default Navbar;
