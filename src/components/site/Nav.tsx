import { Menu, X } from "lucide-react";
import logo from "@/assets/viacust-logo.png";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RoleSwitch } from "@/components/site/RoleSwitch";
import { DemoSwitcher } from "@/components/site/DemoSwitcher";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { useAuth } from "@/hooks/useAuth";

export const Nav = () => {
  const [open, setOpen] = useState(false);
  const { user, role, isAdmin, signOut } = useAuth();
  const { t } = useTranslation();

  const close = () => setOpen(false);

  const links: { to: string; label: string; show: boolean }[] = [
    { to: "/", label: t("nav.home"), show: true },
    { to: "/dashboard", label: t("nav.dashboard"), show: !!user },
    { to: "/aanvragen", label: t("nav.request"), show: role !== "begeleider" },
    { to: "/profiel", label: t("nav.profile"), show: !!user && role === "begeleider" },
    { to: "/ontheffingen", label: t("nav.permits"), show: !!user && role !== "begeleider" },
    { to: "/facturen", label: t("nav.invoices"), show: !!user },
    { to: "/geschiedenis", label: t("nav.history"), show: !!user },
    { to: "/facturatiegegevens", label: t("nav.billing"), show: !!user },
    { to: "/brandstofprijzen", label: "Brandstofprijzen", show: !!user && (role === "begeleider" || role === "opdrachtgever") },
    { to: "/admin", label: t("nav.admin"), show: isAdmin },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-parchment/85 backdrop-blur-md border-b border-brass-deep/10">
      <div className="max-w-7xl mx-auto px-6 md:px-8 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3" onClick={close}>
          <img
            src={logo}
            alt="ViaCust"
            width={32}
            height={32}
            className="size-8 object-contain"
          />
          <span className="font-display text-2xl tracking-tight text-brass-deep italic">
            ViaCust
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-10 text-sm font-medium uppercase tracking-widest text-brass-deep/70">
          <Link
            to={user ? "/dashboard" : "/#ritten"}
            className="hover:text-brass-gold transition-colors"
          >
            {t("nav.transports")}
          </Link>
          {role !== "begeleider" && (
            <Link to="/aanvragen" className="hover:text-brass-gold transition-colors">{t("nav.requests")}</Link>
          )}
          {role === "begeleider" && user && (
            <Link to="/profiel" className="hover:text-brass-gold transition-colors">{t("nav.profile")}</Link>
          )}
          <Link to="/facturen" className="hover:text-brass-gold transition-colors">{t("nav.invoices")}</Link>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <DemoSwitcher />
          <RoleSwitch />
          <LanguageSwitcher />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={open}
            className="p-2 border border-brass-deep/20 text-brass-deep hover:bg-brass-deep hover:text-parchment transition-colors"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-brass-deep/10 bg-parchment/95 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 md:px-8 py-6 flex flex-col gap-1">
            {links.filter((l) => l.show).map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={close}
                className="px-3 py-3 text-sm uppercase tracking-widest font-semibold text-brass-deep hover:bg-brass-deep hover:text-parchment transition-colors"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 pt-3 border-t border-brass-deep/10">
              {user ? (
                <button
                  onClick={() => { close(); signOut(); }}
                  className="w-full text-left px-3 py-3 text-sm uppercase tracking-widest font-semibold text-brass-deep hover:bg-brass-gold hover:text-parchment transition-colors"
                >
                  {t("nav.logout")}
                </button>
              ) : (
                <Link
                  to="/auth"
                  onClick={close}
                  className="block px-3 py-3 text-sm uppercase tracking-widest font-semibold text-brass-deep hover:bg-brass-gold hover:text-parchment transition-colors"
                >
                  {t("nav.login")}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
