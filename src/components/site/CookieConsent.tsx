import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const STORAGE_KEY = "cookie-consent-v1";

type Choice = "accepted" | "essential";

export function CookieConsent() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const choose = (choice: Choice) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ choice, at: new Date().toISOString() })
      );
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t("cookie.ariaLabel")}
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4"
    >
      <div className="mx-auto max-w-3xl rounded-xl border border-brass-deep/20 bg-card shadow-etched p-5 md:p-6">
        <h2 className="font-display text-lg italic text-brass-deep mb-2">{t("cookie.title")}</h2>
        <p className="text-sm text-brass-deep/75 mb-4">
          {t("cookie.body")}
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="px-5 py-2.5 bg-brass-deep text-parchment uppercase tracking-widest text-[10px] font-semibold hover:bg-brass-gold transition-colors"
          >
            {t("cookie.accept")}
          </button>
          <button
            type="button"
            onClick={() => choose("essential")}
            className="px-5 py-2.5 border border-brass-deep/30 uppercase tracking-widest text-[10px] font-semibold hover:bg-brass-deep/5 transition-colors"
          >
            {t("cookie.essential")}
          </button>
        </div>
      </div>
    </div>
  );
}
