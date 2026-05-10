import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const Hero = () => {
  const { user } = useAuth();
  return (
    <section className="relative pt-14 md:pt-32 pb-12 md:pb-24 px-5 md:px-8 border-b border-brass-deep/10 bg-gradient-hero">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6 md:gap-12 items-end">
        <div className="col-span-12 lg:col-span-8 animate-fade-up">
          <p className="text-brass-gold uppercase tracking-[0.25em] md:tracking-[0.3em] font-semibold text-[10px] md:text-xs mb-4 md:mb-6">
            Convoi Exceptionnel · Pilotvoertuigen · NL · BE · DE · FR
          </p>
          <h1 className="font-display text-[2.25rem] sm:text-6xl lg:text-8xl text-brass-deep leading-[1] md:leading-[0.95] italic">
            Een begeleider<br />
            binnen enkele momenten.
          </h1>
        </div>
        <div className="col-span-12 lg:col-span-4 pb-2 animate-fade-up [animation-delay:120ms]">
          <p className="text-sm md:text-lg text-brass-deep/80 leading-relaxed max-w-[34ch] mb-6 md:mb-8">
            Plan uw uitzonderlijk transport in één formulier. Wij matchen u direct met
            gecertificeerde verkeersregelaars en pilotvoertuigen die op het juiste moment
            beschikbaar zijn — agenda's gekoppeld, uren automatisch geregistreerd,
            facturatie binnen handbereik.
          </p>
          <Link
            to={user ? "/dashboard" : "/auth"}
            className="inline-block px-8 py-4 bg-brass-gold text-parchment font-medium tracking-wide hover:bg-brass-deep transition-colors"
          >
            {user ? "Naar dashboard" : "Plan een transport"}
          </Link>
        </div>
      </div>
    </section>
  );
};
