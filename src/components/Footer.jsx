import "./Footer.css";
import { useTranslation } from "react-i18next";

function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <a href="/" className="logo">
            Tech<span>Pickr</span>
          </a>
          <p>{t("footer.description")}</p>
        </div>

        <nav className="footer-links">
          <a href="#how-it-works">{t("nav.howItWorks")}</a>
          <a href="#features">{t("nav.features")}</a>
          <a href="#explore">{t("nav.exploreBuilds")}</a>
          <a href="#build">{t("nav.buildPc")}</a>
        </nav>
      </div>

      <div className="container footer-bottom">
        <p>{t("footer.copyright")}</p>
      </div>
    </footer>
  );
}

export default Footer;