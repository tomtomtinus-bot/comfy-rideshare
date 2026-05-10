import { useTranslation } from "react-i18next";
import logo from "@/assets/pilotcrew-logo.png";

export const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer id="contact" className="bg-brass-deep py-16 md:py-20 px-6 md:px-8 text-parchment/60">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
        <div className="max-w-sm">
          <div className="flex items-center gap-3 mb-6">
            <img
              src={logo}
              alt="ViaCust"
              width={24}
              height={24}
              loading="lazy"
              className="size-6 object-contain brightness-0 invert"
            />
            <span className="font-display text-xl tracking-tight text-parchment italic">
              ViaCust
            </span>
          </div>
          <p className="text-sm leading-relaxed">{t("footer.intro")}</p>
        </div>
        <div className="grid grid-cols-2 gap-12 md:gap-16">
          <div className="space-y-4">
            <p className="text-parchment font-bold uppercase tracking-widest text-xs">{t("footer.network")}</p>
            <ul className="text-sm space-y-2">
              <li><a href="#" className="hover:text-brass-gold transition-colors">{t("footer.escorts")}</a></li>
              <li><a href="#" className="hover:text-brass-gold transition-colors">{t("footer.categories")}</a></li>
              <li><a href="#" className="hover:text-brass-gold transition-colors">{t("footer.area")}</a></li>
            </ul>
          </div>
          <div className="space-y-4">
            <p className="text-parchment font-bold uppercase tracking-widest text-xs">{t("footer.contact")}</p>
            <ul className="text-sm space-y-2 tabular-nums">
              <li>+31 20 555 0192</li>
              <li>Hornweg 18</li>
              <li>1044 AN Amsterdam</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-parchment/10 flex flex-col md:flex-row gap-3 justify-between items-center text-[10px] uppercase tracking-widest">
        <span>{t("footer.copyright")}</span>
        <span>{t("footer.tagline")}</span>
      </div>
    </footer>
  );
};
