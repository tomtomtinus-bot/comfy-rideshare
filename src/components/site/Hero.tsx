import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const Hero = () => {
  const { t } = useTranslation();
  return (
    <section className="relative pt-10 md:pt-20 pb-10 md:pb-16 px-5 md:px-8 border-b border-brass-deep/10 bg-gradient-hero text-left">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6 md:gap-12 items-end">
        <div className="col-span-12 lg:col-span-8 animate-fade-up text-left">
          <p className="text-brass-gold uppercase tracking-[0.25em] md:tracking-[0.3em] font-semibold text-[10px] md:text-xs mb-4 md:mb-6">
            {t("home.hero.kicker")}
          </p>
          <h1 className="font-display text-[2.25rem] sm:text-6xl lg:text-8xl text-brass-deep leading-[1] md:leading-[0.95] italic text-left">
            {t("home.hero.title_1")}<br />{t("home.hero.title_2")}
          </h1>
        </div>
        <div className="col-span-12 lg:col-span-4 pb-2 animate-fade-up [animation-delay:120ms] text-left">
          <p className="text-sm md:text-lg text-brass-deep/80 leading-relaxed max-w-[40ch] mb-6 md:mb-8">
            {t("home.hero.body")}
          </p>
          <div className="flex">
            <Link
              to="/hoe-werkt-viacust"
              className="inline-block px-7 py-4 bg-brass-deep text-parchment text-xs uppercase tracking-widest font-semibold hover:bg-brass-gold transition-colors text-center"
            >
              Hoe werkt ViaCust?
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
