const steps = [
  {
    n: "01",
    title: "Aanvraag in 1 minuut",
    body:
      "Voer afmetingen, gewicht, route, vergunning en tijdvenster in. Het systeem berekent automatisch het verplichte aantal begeleiders en pilotvoertuigen volgens NL-, BE-, DE- en FR-richtlijnen.",
  },
  {
    n: "02",
    title: "Slimme matching",
    body:
      "Alleen begeleiders met het juiste certificaat, de juiste categorie en een vrije agenda krijgen een uitnodiging. Google Agenda-koppeling voorkomt dubbele boekingen.",
  },
  {
    n: "03",
    title: "Bevestiging binnen enkele momenten",
    body:
      "Begeleiders accepteren via app of pushmelding. U ziet live wie bevestigt en ontvangt automatisch de definitieve bemanning, contactgegevens en routedetails.",
  },
  {
    n: "04",
    title: "Uitvoering & facturatie",
    body:
      "Uren lopen automatisch vanaf vertrek standplaats tot terugkeer. Na afloop staat de factuur klaar — transparant per begeleider, per kilometer en per uur.",
  },
];

export const Protocol = () => {
  return (
    <section id="protocol" className="py-16 md:py-32 px-5 md:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8 lg:gap-16">
        <div className="col-span-12 lg:col-span-4">
          <h2 className="font-display text-3xl md:text-5xl text-brass-deep italic leading-tight">
            Van vergunning tot factuur — in één platform.
          </h2>
          <p className="mt-4 md:mt-6 text-brass-deep/60 max-w-sm text-sm md:text-base">
            Geen telefooncirkels, geen losse Excels. Vier stappen, volledig digitaal,
            met certificering en agenda-controle op elk niveau.
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
