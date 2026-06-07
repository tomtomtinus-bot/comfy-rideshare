import { useTranslation } from "react-i18next";

export const Protocol = () => {
  const { t } = useTranslation();
  const steps = t("protocol.steps", { returnObjects: true }) as { title: string; body: string }[];
  return (
    <section id="protocol" className="py-16 md:py-32 px-5 md:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8 lg:gap-16">
        <div className="col-span-12 lg:col-span-4">
          <h2 className="font-display text-3xl md:text-5xl text-brass-deep italic leading-tight">
            {t("protocol.heading")}
          </h2>
          <p className="mt-4 md:mt-6 text-brass-deep/80 max-w-sm text-sm md:text-base">
            {t("protocol.sub")}
          </p>
        </div>
        <div className="col-span-12 lg:col-span-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 md:gap-y-16">
            {steps.map((s, i) => (
              <div key={i}>
                <span className="font-display text-4xl italic text-brass-gold block mb-3">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-base font-semibold uppercase tracking-widest text-brass-deep mb-3">
                  {s.title}
                </h3>
                <p className="text-brass-deep/70 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
