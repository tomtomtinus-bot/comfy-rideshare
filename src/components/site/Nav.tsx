import { Compass } from "lucide-react";

export const Nav = () => {
  return (
    <nav className="sticky top-0 z-50 bg-parchment/85 backdrop-blur-md border-b border-brass-deep/10">
      <div className="max-w-7xl mx-auto px-6 md:px-8 h-20 flex items-center justify-between">
        <a href="#" className="flex items-center gap-3">
          <span className="size-8 bg-brass-gold rounded-full flex items-center justify-center">
            <Compass className="size-4 text-parchment" strokeWidth={2.5} />
          </span>
          <span className="font-display text-2xl tracking-tight text-brass-deep italic">
            Compass &amp; Care
          </span>
        </a>
        <div className="hidden md:flex items-center gap-10 text-sm font-medium uppercase tracking-widest text-brass-deep/70">
          <a href="#ritten" className="hover:text-brass-gold transition-colors">Ritten</a>
          <a href="#protocol" className="hover:text-brass-gold transition-colors">Protocol</a>
          <a href="#contact" className="hover:text-brass-gold transition-colors">Contact</a>
        </div>
        <button className="px-5 md:px-6 py-2.5 bg-brass-deep text-parchment text-xs md:text-sm uppercase tracking-widest hover:bg-brass-gold transition-colors duration-300">
          Bied rit aan
        </button>
      </div>
    </nav>
  );
};
