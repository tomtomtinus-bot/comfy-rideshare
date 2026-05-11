import { Link } from "react-router-dom";
import { Check } from "lucide-react";

const points = [
  { strong: "Transparant:", text: "Slechts 1,5% commissie per voltooide rit." },
  { strong: "Overzichtelijk:", text: "Ontvang wekelijks één verzamelfactuur per begeleider." },
  { strong: "Geverifieerd:", text: "Alleen begeleiders met de juiste papieren en instelling." },
];

export const ValueClient = () => {
  return (
    <section className="py-16 md:py-28 px-5 md:px-8 bg-background border-b border-brass-deep/10">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8 md:gap-16 items-start">
        <div className="col-span-12 lg:col-span-5">
          <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-[10px] md:text-xs mb-4">
            Voor de Opdrachtgever
          </p>
          <h2 className="font-display text-3xl md:text-5xl italic text-brass-deep leading-tight">
            De juiste begeleiding, precies wanneer u die nodig heeft.
          </h2>
        </div>
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <p className="text-base md:text-lg text-brass-deep/80 leading-relaxed">
            Als opdrachtgever zoekt u zekerheid. ViaCust biedt u direct toegang tot een netwerk van geverifieerde professionals. Plaats uw ritten in enkele seconden en zie direct welke begeleiders beschikbaar zijn.
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
            to="/auth?role=opdrachtgever"
            className="inline-block mt-2 px-7 py-4 bg-brass-deep text-parchment text-xs uppercase tracking-widest font-semibold hover:bg-brass-gold transition-colors"
          >
            Ik zoek een begeleider
          </Link>
        </div>
      </div>
    </section>
  );
};
