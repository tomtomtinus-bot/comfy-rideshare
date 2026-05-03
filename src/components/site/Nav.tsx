import { Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { RoleSwitch } from "@/components/site/RoleSwitch";

export const Nav = () => {
  return (
    <nav className="sticky top-0 z-50 bg-parchment/85 backdrop-blur-md border-b border-brass-deep/10">
      <div className="max-w-7xl mx-auto px-6 md:px-8 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <span className="size-8 bg-brass-gold rounded-full flex items-center justify-center">
            <Compass className="size-4 text-parchment" strokeWidth={2.5} />
          </span>
          <span className="font-display text-2xl tracking-tight text-brass-deep italic">
            Konvooi
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-10 text-sm font-medium uppercase tracking-widest text-brass-deep/70">
          <Link to="/#ritten" className="hover:text-brass-gold transition-colors">Transporten</Link>
          <Link to="/begeleiders" className="hover:text-brass-gold transition-colors">Begeleiders</Link>
          <Link to="/aanvragen" className="hover:text-brass-gold transition-colors">Aanvragen</Link>
        </div>
        <RoleSwitch />
      </div>
    </nav>
  );
};
