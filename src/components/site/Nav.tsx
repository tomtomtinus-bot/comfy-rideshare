import { Compass, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { RoleSwitch } from "@/components/site/RoleSwitch";
import { DemoSwitcher } from "@/components/site/DemoSwitcher";
import { useAuth } from "@/hooks/useAuth";

export const Nav = () => {
  const [open, setOpen] = useState(false);
  const { user, role, signOut } = useAuth();

  const close = () => setOpen(false);

  const links: { to: string; label: string; show: boolean }[] = [
    { to: "/", label: "Home", show: true },
    { to: "/dashboard", label: "Dashboard", show: !!user },
    { to: "/aanvragen", label: "Rit aanvragen", show: true },
    { to: "/profiel", label: "Profiel", show: !!user && role === "begeleider" },
    { to: "/facturen", label: "Facturen", show: !!user },
    { to: "/facturatiegegevens", label: "Facturatiegegevens", show: !!user },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-parchment/85 backdrop-blur-md border-b border-brass-deep/10">
      <div className="max-w-7xl mx-auto px-6 md:px-8 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3" onClick={close}>
          <span className="size-8 bg-brass-gold rounded-full flex items-center justify-center">
            <Compass className="size-4 text-parchment" strokeWidth={2.5} />
          </span>
          <span className="font-display text-2xl tracking-tight text-brass-deep italic">
            Konvooi
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-10 text-sm font-medium uppercase tracking-widest text-brass-deep/70">
          <Link to="/#ritten" className="hover:text-brass-gold transition-colors">Transporten</Link>
          <Link to="/aanvragen" className="hover:text-brass-gold transition-colors">Aanvragen</Link>
          <Link to="/facturen" className="hover:text-brass-gold transition-colors">Facturen</Link>
        </div>
        <div className="flex items-center gap-3">
          <DemoSwitcher />
          <RoleSwitch />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Menu sluiten" : "Menu openen"}
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
                  Uitloggen
                </button>
              ) : (
                <Link
                  to="/auth"
                  onClick={close}
                  className="block px-3 py-3 text-sm uppercase tracking-widest font-semibold text-brass-deep hover:bg-brass-gold hover:text-parchment transition-colors"
                >
                  Inloggen
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
