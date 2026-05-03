const steps = [
  {
    n: "01",
    title: "Oriëntatie",
    body:
      "Geef uw vervoersbehoefte, bestemming en specifieke medische of emotionele ondersteuning aan. Precisie begint bij accurate informatie.",
  },
  {
    n: "02",
    title: "Kalibratie",
    body:
      "Wij koppelen u aan een begeleider wiens discipline en voertuigprofiel exact aansluiten op uw route en temperament.",
  },
  {
    n: "03",
    title: "Vertrek",
    body:
      "Uw begeleider arriveert exact op het afgesproken punt. Wij voorzien in real-time coördinatie zodat de rit een vast gegeven is.",
  },
  {
    n: "04",
    title: "Aankomst",
    body:
      "De missie is pas voltooid wanneer u veilig bij uw bestemming bent. Alle logs worden definitief gemaakt en geverifieerd.",
  },
];

export const Protocol = () => {
  return (
    <section id="protocol" className="py-24 md:py-32 px-6 md:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-12 lg:gap-16">
        <div className="col-span-12 lg:col-span-4">
          <h2 className="font-display text-4xl md:text-5xl text-brass-deep italic leading-tight">
            De methodologie van zekere doorgang.
          </h2>
          <p className="mt-6 text-brass-deep/60 max-w-sm">
            Vier stappen die elke rit voorspelbaar, veilig en menselijk maken.
          </p>
        </div>
        <div className="col-span-12 lg:col-span-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12 md:gap-y-16">
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
