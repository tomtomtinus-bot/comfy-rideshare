const steps = [
  {
    n: "01",
    title: "Aanvraag",
    body:
      "Geef afmetingen, gewicht, route, vergunningnummer en tijdvenster door. Het systeem berekent het verplichte aantal begeleiders.",
  },
  {
    n: "02",
    title: "Matching",
    body:
      "Wij vinden de dichtstbijzijnde begeleiders met het juiste certificaat, pilotvoertuig en categorie voor uw transport.",
  },
  {
    n: "03",
    title: "Bevestiging",
    body:
      "De begeleider heeft 30 minuten om de opdracht te aanvaarden. U ontvangt automatisch bevestiging zodra dat gebeurt.",
  },
  {
    n: "04",
    title: "Uitvoering & afrekening",
    body:
      "Na afloop registreert de begeleider de uren vanaf vertrek standplaats tot terugkeer. U ziet direct de definitieve kosten.",
  },
];

export const Protocol = () => {
  return (
    <section id="protocol" className="py-16 md:py-32 px-5 md:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8 lg:gap-16">
        <div className="col-span-12 lg:col-span-4">
          <h2 className="font-display text-3xl md:text-5xl text-brass-deep italic leading-tight">
            Van vergunning tot bestemming.
          </h2>
          <p className="mt-4 md:mt-6 text-brass-deep/60 max-w-sm text-sm md:text-base">
            Vier stappen van aanvraag tot afrekening, met certificering op elk niveau.
          </p>
        </div>
        <div className="col-span-12 lg:col-span-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 md:gap-y-16">
            {steps.map((s) => (
              <div key={s.n}>
                <span className="font-display text-4xl italic text-brass-gold block mb-3">{s.n}</span>
                <h3 className="text-base font-semibold uppercase tracking-widest text-brass-deep mb-3">
                  {s.title}
                </h3>
                <p className="text-brass-deep/70 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
