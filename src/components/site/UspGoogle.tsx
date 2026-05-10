import { useTranslation } from "react-i18next";

export const UspGoogle = () => {
  const { t } = useTranslation();
  return (
    <section className="py-14 md:py-20 px-5 md:px-8 border-b border-brass-deep/10 bg-brass-deep text-parchment">
      <div className="max-w-5xl mx-auto text-center">
        <p className="text-brass-gold uppercase tracking-[0.4em] font-semibold text-xs mb-6">
          {t("home.usp.kicker")}
        </p>
        <h2 className="font-display text-4xl md:text-6xl italic leading-tight mb-8">
          {t("home.usp.title")}
        </h2>
        <p className="text-base md:text-lg text-parchment/80 leading-relaxed max-w-3xl mx-auto">
          {t("home.usp.body")}
        </p>
      </div>
    </section>
  );
};
