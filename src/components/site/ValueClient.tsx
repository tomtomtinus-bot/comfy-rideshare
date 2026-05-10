import { useTranslation } from "react-i18next";

export const ValueClient = () => {
  const { t } = useTranslation();
  const items = [
    { title: t("home.client.i1Title"), body: t("home.client.i1Body") },
    { title: t("home.client.i2Title"), body: t("home.client.i2Body") },
    { title: t("home.client.i3Title"), body: t("home.client.i3Body") },
  ];
  return (
    <section className="py-12 md:py-16 px-5 md:px-8 border-b border-brass-deep/10 bg-card">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8 md:gap-12">
        <div className="col-span-12 lg:col-span-5">
          <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-4">
            {t("home.client.kicker")}
          </p>
          <h2 className="font-display text-3xl md:text-5xl text-brass-deep italic leading-tight mb-6">
            {t("home.client.title")}
          </h2>
          <p className="text-brass-deep/75 leading-relaxed max-w-prose">
            {t("home.client.body")}
          </p>
        </div>
        <div className="col-span-12 lg:col-span-7 grid sm:grid-cols-3 gap-px bg-brass-deep/10">
          {items.map((it) => (
            <div key={it.title} className="bg-card p-6 md:p-8">
              <p className="font-display text-xl text-brass-deep italic mb-3">{it.title}</p>
              <p className="text-sm text-brass-deep/70 leading-relaxed">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
