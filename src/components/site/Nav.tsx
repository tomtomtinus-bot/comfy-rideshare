import { Compass, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { RoleSwitch } from "@/components/site/RoleSwitch";

const links = [
  { to: "/#ritten", label: "Transporten" },
  { to: "/aanvragen", label: "Aanvragen" },
  { to: "/facturen", label: "Facturen" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/profiel", label: "Profiel" },
];

export const Nav = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-parchment/85 backdrop-blur-md border-b border-brass-deep/10">
      <div className="max-w-7xl mx-auto px-6 md:px-8 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <span className="size-8 bg-brass-gold rounded-full flex items-center justify-center">
            <Compass className="size-4 text-parchment" strokeWidth={2.5} />
          </span>
          <span className="font-display text-2xl tracking-tight text-brass-deep italic">
            Konvooi
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-10 text-sm font-medium uppercase tracking-widest text-brass-deep/70">
          {links.slice(0, 3).map((l) => (
            <Link key={l.to} to={l.to} className="hover:text-brass-gold transition-colors">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <RoleSwitch />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Menu sluiten" : "Menu openen"}
            aria-expanded={open}
            className="md:hidden inline-flex items-center justify-center size-10 border border-brass-deep/20 text-brass-deep hover:bg-brass-deep hover:text-parchment transition-colors"
          >
            {open ? <Menu className="size-5" /> : <Menu className="size-5" />}
            {open ? <X className="size-5 -ml-5" /> : null}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-brass-deep/10 bg-parchment">
          <div className="px-6 py-4 flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="py-3 text-sm font-medium uppercase tracking-widest text-brass-deep/80 hover:text-brass-gold border-b border-brass-deep/5 last:border-0"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};
