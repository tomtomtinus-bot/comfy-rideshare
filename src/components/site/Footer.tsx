import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import logo from "@/assets/viacust-logo.png";

export const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer id="contact" className="bg-brass-deep py-16 md:py-20 px-6 md:px-8 text-parchment/70">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
        <div className="max-w-sm">
          <div className="flex items-center gap-3 mb-2">
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
          <p className="text-[10px] uppercase tracking-widest text-parchment/40 mb-4">
            {" "}
          </p>
          <p className="text-sm leading-relaxed">{t("home.footer.tagline")}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-12 md:gap-16">
          <div className="space-y-4">
            <p className="text-parchment font-bold uppercase tracking-widest text-xs">
              ViaCust
            </p>
            <ul className="text-sm space-y-2">
              <li>
                <Link to="/hoe-werkt-viacust" className="hover:text-brass-gold transition-colors">
                  {t("landing.footerAbout")}
                </Link>
              </li>
              <li>
                <Link to="/hoe-werkt-viacust" className="hover:text-brass-gold transition-colors">
                  {t("landing.footerHow")}
                </Link>
              </li>
              <li>
                <Link to="/wat-kost-viacust" className="hover:text-brass-gold transition-colors">
                  {t("landing.footerPricing")}
                </Link>
              </li>
              <li>
                <Link to="/info/nederland" className="hover:text-brass-gold transition-colors">
                  {t("landing.footerInfoNL")}
                </Link>
              </li>
              <li>
                <Link to="/info/belgie" className="hover:text-brass-gold transition-colors">
                  {t("landing.footerInfoBE")}
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <p className="text-parchment font-bold uppercase tracking-widest text-xs">
              {t("home.footer.legal")}
            </p>
            <ul className="text-sm space-y-2">
              <li>
                <Link to="/voorwaarden" className="hover:text-brass-gold transition-colors">
                  {t("landing.footerTerms")}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-brass-gold transition-colors">
                  {t("landing.footerPrivacy")}
                </Link>
              </li>
              <li>
                <a href="mailto:support@viacust.com" className="hover:text-brass-gold transition-colors">
                  {t("landing.footerContact")}
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-4 col-span-2 md:col-span-1">
            <p className="text-parchment font-bold uppercase tracking-widest text-xs">
              {t("home.footer.activeIn")}
            </p>
            <ul className="text-sm space-y-2 tabular-nums">
              <li>🇳🇱 {t("landing.countryNL")}</li>
              <li>🇧🇪 {t("landing.countryBE")}</li>
              <li>🇩🇪 {t("landing.countryDE")}</li>
              <li>🇫🇷 {t("landing.countryFR")}</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-parchment/10 flex flex-col md:flex-row gap-3 justify-between items-center text-[10px] uppercase tracking-widest">
        <span>{t("home.footer.copyright")}</span>
        <span>NL · BE · DE · FR</span>
      </div>
    </footer>
  );
};
