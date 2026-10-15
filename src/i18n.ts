import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import nl from "./locales/nl";
import en from "./locales/en";
import de from "./locales/de";
import fr from "./locales/fr";

// Dutch-only for now: language detection and switcher are hidden until the
// other locales are re-reviewed.
i18n.use(initReactI18next).init({
  resources: {
    nl: { translation: nl },
    en: { translation: en },
    de: { translation: de },
    fr: { translation: fr },
  },
  lng: "nl",
  fallbackLng: "nl",
  supportedLngs: ["nl", "en", "de", "fr"],
  interpolation: { escapeValue: false },
  returnObjects: true,
});

export default i18n;

