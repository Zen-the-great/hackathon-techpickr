import Button from "../components/Button";
import HeroBackground from "../components/HeroBackground";
import { useTranslation } from "react-i18next";
import "./Home.css";
import "./HomeSections.css";

const steps = [
  { title: "step1Title", text: "step1Text" },
  { title: "step2Title", text: "step2Text" },
  { title: "step3Title", text: "step3Text" },
];

const features = [
  { tag: "feature1Tag", title: "feature1Title", text: "feature1Text" },
  { tag: "feature2Tag", title: "feature2Title", text: "feature2Text" },
  { tag: "feature3Tag", title: "feature3Title", text: "feature3Text" },
];

function Home() {
  const { t } = useTranslation();
  return (
    <>
      <section className="hero">
        <HeroBackground />

        <div className="container hero-inner">
          <div className="hero-text">
            <span className="badge">{t("home.heroTagline")}</span>
            <h1>{t("home.heroTitle")}</h1>
            <p className="hero-sub">{t("home.heroText")}</p>
            <div className="hero-actions">
              <Button to="/build">{t("home.buildPc")}</Button>
              <Button href="#explore" variant="secondary">
                {t("home.exploreBuilds")}
              </Button>
            </div>
            <p className="hero-note">{t("home.heroNote")}</p>
          </div>
        </div>
      </section>

      <section className="section" id="how-it-works">
        <div className="container">
          <div className="section-head">
            <h2>{t("home.howTitle")}</h2>
            <p>{t("home.howText")}</p>
          </div>
          <div className="steps">
            {steps.map((step, index) => (
              <div className="card" key={step.title}>
                <span className="step-number">{index + 1}</span>
                <h3>{t(`home.${step.title}`)}</h3>
                <p>{t(`home.${step.text}`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="features">
        <div className="container">
          <div className="section-head">
            <h2>{t("home.featuresTitle")}</h2>
            <p>{t("home.featuresText")}</p>
          </div>
          <div className="features">
            {features.map((feature) => (
              <div className="card" key={feature.title}>
                <span className="feature-tag">{t(`home.${feature.tag}`)}</span>
                <h3>{t(`home.${feature.title}`)}</h3>
                <p>{t(`home.${feature.text}`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="build">
        <div className="container">
          <div className="cta">
            <h2>{t("home.ctaTitle")}</h2>
            <p>{t("home.ctaText")}</p>
            <Button to="/build">{t("home.buildPc")}</Button>
          </div>
        </div>
      </section>
    </>
  );
}

export default Home;