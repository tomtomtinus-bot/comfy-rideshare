export const Hero = () => {
  return (
    <section className="relative pt-20 md:pt-32 pb-20 md:pb-24 px-6 md:px-8 border-b border-brass-deep/10 bg-gradient-hero">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8 md:gap-12 items-end">
        <div className="col-span-12 lg:col-span-8 animate-fade-up">
          <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-6">
            Convoi Exceptionnel · Pilotvoertuigen
          </p>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-8xl text-brass-deep leading-[0.95] italic">
            Begeleiding voor<br />
            uitzonderlijk vervoer.
          </h1>
        </div>
        <div className="col-span-12 lg:col-span-4 pb-2 animate-fade-up [animation-delay:120ms]">
          <p className="text-base md:text-lg text-brass-deep/80 leading-relaxed max-w-[34ch] mb-8">
            Wij koppelen transportbedrijven aan gecertificeerde verkeersregelaars
            met pilotvoertuig voor te brede, te hoge, te lange of te zware ladingen
            in NL, BE, DE en FR.
          </p>
          <a
            href="#ritten"
            className="inline-block px-8 py-4 bg-brass-gold text-parchment font-medium tracking-wide hover:bg-brass-deep transition-colors"
          >
            Bekijk geplande transporten
          </a>
        </div>
      </div>
    </section>
  );
};
