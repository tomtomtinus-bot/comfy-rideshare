import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-10 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {/* Informatie */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-foreground tracking-wider uppercase">
              Informatie
            </p>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/hoe-werkt-viacust"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Hoe werkt het
                </Link>
              </li>
              <li>
                <Link
                  to="/wat-kost-viacust"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Tarieven
                </Link>
              </li>
              <li>
                <Link
                  to="/faq"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Veelgestelde vragen
                </Link>
              </li>
            </ul>
          </div>


          {/* Juridisch */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-foreground tracking-wider uppercase">
              Juridisch
            </p>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/voorwaarden"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Algemene voorwaarden
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacyverklaring
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-foreground tracking-wider uppercase">
              Contact
            </p>
            <ul className="space-y-2">
              <li>
                <a
                  href="mailto:info@viacust.com"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  info@viacust.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col md:flex-row gap-2 justify-between items-center text-xs text-muted-foreground">
          <span>© 2026 ViaCust | Digital Escort Solutions. Alle rechten voorbehouden.</span>
          <a
            href="mailto:info@viacust.com"
            className="hover:text-foreground transition-colors"
          >
            info@viacust.com
          </a>
        </div>
      </div>
    </footer>
  );
};
