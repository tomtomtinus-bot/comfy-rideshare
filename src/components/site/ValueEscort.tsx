export const ValueEscort = () => {
  const items = [
    {
      title: "Google Agenda Sync",
      body: "Uw ritten worden automatisch gesynchroniseerd. Uw beschikbaarheid is altijd up-to-date.",
    },
    {
      title: "Eenvoudig beheer",
      body: "Accepteer ritten met één klik en heb alle ritdetails direct bij de hand.",
    },
    {
      title: "Professionele uitstraling",
      body: "Beheer uw administratie en rollen in een beveiligde, professionele omgeving.",
    },
  ];
  return (
    <section className="py-12 md:py-16 px-5 md:px-8 border-b border-brass-deep/10 bg-parchment/40">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8 md:gap-12">
        <div className="col-span-12 lg:col-span-7 order-2 lg:order-1 grid sm:grid-cols-3 gap-px bg-brass-deep/10">
          {items.map((it) => (
            <div key={it.title} className="bg-card p-6 md:p-8">
              <p className="font-display text-xl text-brass-deep italic mb-3">
                {it.title}
              </p>
              <p className="text-sm text-brass-deep/70 leading-relaxed">{it.body}</p>
            </div>
          ))}
        </div>
        <div className="col-span-12 lg:col-span-5 order-1 lg:order-2">
          <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-4">
            Voor begeleiders
          </p>
          <h2 className="font-display text-3xl md:text-5xl text-brass-deep italic leading-tight mb-6">
            Uw agenda altijd op orde, zonder dubbele boekingen.
          </h2>
          <p className="text-brass-deep/75 leading-relaxed max-w-prose">
            Haal het maximale uit uw werkdag. ViaCust is speciaal gebouwd voor de
            zelfstandige begeleider die houdt van overzicht.
          </p>
        </div>
      </div>
    </section>
  );
};
