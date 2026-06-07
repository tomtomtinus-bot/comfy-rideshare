import { Calendar, Receipt, Globe2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export const ThreePillars = () => {
  const { t } = useTranslation();
  const pillars = [
    { icon: Calendar, title: t("landing.pillar1Title"), body: t("landing.pillar1Body") },
    { icon: Receipt, title: t("landing.pillar2Title"), body: t("landing.pillar2Body") },
    { icon: Globe2, title: t("landing.pillar3Title"), body: t("landing.pillar3Body") },
  ];
  return (
    <section className="py-16 md:py-24 px-5 md:px-8 bg-parchment border-b border-brass-deep/10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14">
        {pillars.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex flex-col gap-4">
            <div className="size-12 flex items-center justify-center bg-brass-deep text-parchment">
              <Icon className="size-6" />
            </div>
            <h2 className="font-display text-2xl md:text-3xl italic text-brass-deep leading-tight">
              {title}
            </h2>
            <p className="text-sm md:text-base text-brass-deep/75 leading-relaxed">
              {body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
