const countries = [
  { flag: "🇳🇱", name: "Nederland" },
  { flag: "🇧🇪", name: "België" },
  { flag: "🇩🇪", name: "Duitsland" },
  { flag: "🇫🇷", name: "Frankrijk" },
];

export const SocialProof = () => {
  return (
    <section className="py-14 md:py-20 px-5 md:px-8 bg-background border-b border-brass-deep/10">
      <div className="max-w-7xl mx-auto text-center">
        <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-[10px] md:text-xs mb-6">
          Al actief op de Europese wegen
        </p>
        <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-5 md:gap-x-16">
          {countries.map((c) => (
            <div key={c.name} className="flex items-center gap-3 text-brass-deep">
              <span className="text-3xl md:text-4xl" aria-hidden>{c.flag}</span>
              <span className="font-display italic text-xl md:text-2xl">{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
