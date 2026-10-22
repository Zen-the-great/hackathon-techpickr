import { useState } from "react";
import Button from "../components/Button";
import Reveal from "../components/Reveal";
import { useTranslation } from "react-i18next";
import "./WhyUs.css";

const reasons = [
  {
    id: "personal",
    label: "madeForYou",
    title: "personalTitle",
    text: "personalText",
    points: ["personalPoint1", "personalPoint2", "personalPoint3"],
  },
  {
    id: "honest",
    label: "honestData",
    title: "honestTitle",
    text: "honestText",
    points: ["honestPoint1", "honestPoint2", "honestPoint3"],
  },
  {
    id: "clear",
    label: "plainLanguage",
    title: "plainTitle",
    text: "plainText",
    points: ["plainPoint1", "plainPoint2", "plainPoint3"],
  },
  {
    id: "compare",
    label: "easyCompare",
    title: "compareTitle",
    text: "compareText",
    points: ["comparePoint1", "comparePoint2", "comparePoint3"],
  },
];

const compare = [
  { without: "without1", with: "with1" },
  { without: "without2", with: "with2" },
  { without: "without3", with: "with3" },
  { without: "without4", with: "with4" },
];

const faqs = [
  { q: "faq1q", a: "faq1a" },
  { q: "faq2q", a: "faq2a" },
  { q: "faq3q", a: "faq3a" },
  { q: "faq4q", a: "faq4a" },
];

function WhyUs() {
  const { t } = useTranslation();
  const [active, setActive] = useState(reasons[0].id);
  const [openFaq, setOpenFaq] = useState(0);
  const current = reasons.find((r) => r.id === active);

  return (
    <main className="why">
      <section className="why-hero">
        <div className="container why-hero-inner">
          <Reveal>
            <h1>{t("why.title")}</h1>
            <p className="why-lead">{t("why.lead")}</p>
            <div className="why-actions">
              <Button to="/build" arrow>
                {t("nav.buildPc")}
              </Button>
              <Button href="#reasons" variant="secondary">
                {t("why.seeReasons")}
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section" id="reasons">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <h2>{t("why.different")}</h2>
              <p>{t("why.tapTopic")}</p>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="tabs" role="tablist">
              {reasons.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="tab"
                  aria-selected={active === r.id}
                  className={`tab ${active === r.id ? "active" : ""}`}
                  onClick={() => setActive(r.id)}
                >
                  {t(`why.${r.label}`)}
                </button>
              ))}
            </div>

            <div className="tab-panel" key={current.id} role="tabpanel">
              <div>
                <h3>{t(`why.${current.title}`)}</h3>
                <p>{t(`why.${current.text}`)}</p>
              </div>
              <ul className="points">
                {current.points.map((p) => (
                  <li key={p}>
                    <span className="tick" aria-hidden="true">✓</span>
                    {t(`why.${p}`)}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <h2>{t("why.withoutTitle")}</h2>
            </div>
          </Reveal>

          <div className="compare">
            {compare.map((row, i) => (
              <Reveal key={row.without} delay={i * 80}>
                <div className="compare-row">
                  <div className="compare-cell no">
                    <span className="mark" aria-hidden="true">✕</span>
                    {t(`why.${row.without}`)}
                  </div>
                  <div className="compare-cell yes">
                    <span className="mark" aria-hidden="true">✓</span>
                    {t(`why.${row.with}`)}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container faq-wrap">
          <Reveal>
            <div className="section-head">
              <h2>{t("why.questions")}</h2>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="faq">
              {faqs.map((f, i) => (
                <div
                  key={f.q}
                  className={`faq-item ${openFaq === i ? "open" : ""}`}
                >
                  <button
                    type="button"
                    className="faq-q"
                    aria-expanded={openFaq === i}
                    onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  >
                    <span>{t(`why.${f.q}`)}</span>
                    <span className="faq-icon" aria-hidden="true">+</span>
                  </button>
                  <div className="faq-a">
                    <div>
                      <p>{t(`why.${f.a}`)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Reveal>
            <div className="cta">
              <h2>{t("home.ctaTitle")}</h2>
              <p>{t("why.finalText")}</p>
              <Button to="/build" arrow>
                {t("nav.buildPc")}
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}

export default WhyUs;