import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import nl from "./locales/nl";
import en from "./locales/en";
import de from "./locales/de";
import fr from "./locales/fr";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      nl: { translation: nl },
      en: { translation: en },
      de: { translation: de },
      fr: { translation: fr },
    },
    fallbackLng: "nl",
    supportedLngs: ["nl", "en", "de", "fr"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "viacust_lang",
    },
    returnObjects: true,
  });

export default i18n;
