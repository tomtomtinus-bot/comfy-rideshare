export const Hero = () => {
  return (
    <section className="relative pt-20 md:pt-32 pb-20 md:pb-24 px-6 md:px-8 border-b border-brass-deep/10 bg-gradient-hero">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8 md:gap-12 items-end">
        <div className="col-span-12 lg:col-span-8 animate-fade-up">
          <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-6">
            Geverifieerde transportbegeleiding
          </p>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-8xl text-brass-deep leading-[0.95] italic">
            Een vaste hand voor<br />
            de ritten van het leven.
          </h1>
        </div>
        <div className="col-span-12 lg:col-span-4 pb-2 animate-fade-up [animation-delay:120ms]">
          <p className="text-base md:text-lg text-brass-deep/80 leading-relaxed max-w-[34ch] mb-8">
            Wij verbinden mensen die medisch of persoonlijk vervoer nodig hebben
            met gedisciplineerde, professionele begeleiders. Waardigheid en precisie staan voorop.
          </p>
          <a
            href="#ritten"
            className="inline-block px-8 py-4 bg-brass-gold text-parchment font-medium tracking-wide hover:bg-brass-deep transition-colors"
          >
            Bekijk geplande ritten
          </a>
        </div>
      </div>
    </section>
  );
};
