export const HowItWorks = () => {
  const steps = [
    {
      n: "01",
      title: "Aanmelden",
      body: "Maak een account aan en word na controle goedgekeurd door onze admin.",
    },
    {
      n: "02",
      title: "Plannen",
      body: "Opdrachtgevers plaatsen ritten; begeleiders ontvangen direct bericht.",
    },
    {
      n: "03",
      title: "Uitvoeren",
      body: "De rit wordt geaccepteerd, gesynchroniseerd met de agenda en uitgevoerd.",
    },
  ];
  return (
    <section className="py-20 md:py-28 px-5 md:px-8 border-b border-brass-deep/10 bg-card">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl mb-12 md:mb-16">
          <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-4">
            Stappenplan
          </p>
          <h2 className="font-display text-3xl md:text-5xl text-brass-deep italic leading-tight">
            Hoe het werkt.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-px bg-brass-deep/10">
          {steps.map((s) => (
            <div key={s.n} className="bg-card p-8 md:p-10">
              <p className="font-display text-5xl md:text-6xl text-brass-gold italic mb-6">
                {s.n}
              </p>
              <p className="font-display text-2xl text-brass-deep italic mb-3">
                {s.title}
              </p>
              <p className="text-sm text-brass-deep/70 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
