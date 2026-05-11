import { Link } from "react-router-dom";
import { Check } from "lucide-react";

const points = [
  { strong: "Onbeperkt:", text: "Voor een vast laag bedrag van € 2,50 per maand accepteert u onbeperkt ritten." },
  { strong: "Brandstoftoeslag:", text: "Stel uw eigen toeslagen in; het systeem berekent dit automatisch voor u." },
  { strong: "Professioneel:", text: "Facturen worden automatisch namens u opgesteld en verstuurd. U hoeft enkel te rijden." },
];

export const ValueEscort = () => {
  return (
    <section className="py-16 md:py-28 px-5 md:px-8 bg-parchment border-b border-brass-deep/10">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8 md:gap-16 items-start">
        <div className="col-span-12 lg:col-span-5">
          <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-[10px] md:text-xs mb-4">
            Voor de Begeleider
          </p>
          <h2 className="font-display text-3xl md:text-5xl italic text-brass-deep leading-tight">
            Haal meer uit uw werkdag. Laat de techniek de rest doen.
          </h2>
        </div>
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <p className="text-base md:text-lg text-brass-deep/80 leading-relaxed">
            U bent het liefst op de weg, niet achter uw bureau. ViaCust is de backoffice die u altijd al wilde hebben.
          </p>
          <ul className="space-y-3">
            {points.map((p) => (
              <li key={p.strong} className="flex items-start gap-3 text-brass-deep/85">
                <Check className="size-5 mt-0.5 text-brass-gold shrink-0" />
                <span className="text-sm md:text-base"><strong className="text-brass-deep">{p.strong}</strong> {p.text}</span>
              </li>
            ))}
          </ul>
          <Link
            to="/auth?role=begeleider"
            className="inline-block mt-2 px-7 py-4 border-2 border-brass-deep text-brass-deep text-xs uppercase tracking-widest font-semibold hover:bg-brass-deep hover:text-parchment transition-colors"
          >
            Ik ben een begeleider
          </Link>
        </div>
      </div>
    </section>
  );
};
