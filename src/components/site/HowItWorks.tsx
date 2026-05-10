import { useTranslation } from "react-i18next";

export const HowItWorks = () => {
  const { t } = useTranslation();
  const steps = [
    { n: "01", title: t("home.steps.s1Title"), body: t("home.steps.s1Body") },
    { n: "02", title: t("home.steps.s2Title"), body: t("home.steps.s2Body") },
    { n: "03", title: t("home.steps.s3Title"), body: t("home.steps.s3Body") },
  ];
  return (
    <section className="py-12 md:py-16 px-5 md:px-8 border-b border-brass-deep/10 bg-card">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl mb-8 md:mb-10">
          <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-4">
            {t("home.steps.kicker")}
          </p>
          <h2 className="font-display text-3xl md:text-5xl text-brass-deep italic leading-tight">
            {t("home.steps.title")}
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-px bg-brass-deep/10">
          {steps.map((s) => (
            <div key={s.n} className="bg-card p-8 md:p-10">
              <p className="font-display text-5xl md:text-6xl text-brass-gold italic mb-6">{s.n}</p>
              <p className="font-display text-2xl text-brass-deep italic mb-3">{s.title}</p>
              <p className="text-sm text-brass-deep/70 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
