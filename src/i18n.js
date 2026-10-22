import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en/translation.json";
import hi from "./locales/hi/translation.json";
import es from "./locales/es/translation.json";
import fr from "./locales/fr/translation.json";
import de from "./locales/de/translation.json";
import ja from "./locales/ja/translation.json";

const LANGUAGE_KEY = "techpickr.language";
const supportedLanguages = ["en", "hi", "es", "fr", "de", "ja"];

function getInitialLanguage() {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_KEY);
    return supportedLanguages.includes(saved) ? saved : "en";
  } catch (error) {
    console.warn("Could not read the saved TechPickr language preference.", error);
    return "en";
  }
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    es: { translation: es },
    fr: { translation: fr },
    de: { translation: de },
    ja: { translation: ja },
  },
  lng: getInitialLanguage(),
  fallbackLng: "en",
  supportedLngs: supportedLanguages,
  interpolation: { escapeValue: false },
  returnNull: false,
  initImmediate: false,
});

i18n.on("languageChanged", (language) => {
  document.documentElement.lang = language;
  try {
    window.localStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.warn("Could not save the TechPickr language preference.", error);
  }
});

document.documentElement.lang = i18n.language;

export default i18n;
