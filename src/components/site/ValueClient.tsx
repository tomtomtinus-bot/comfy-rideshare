export const ValueClient = () => {
  const items = [
    {
      title: "Snel schakelen",
      body: "Plaats ritten en ontvang direct reacties van beschikbare begeleiders.",
    },
    {
      title: "Geverifieerde professionals",
      body: "Werk alleen met begeleiders die voldoen aan uw kwaliteitseisen.",
    },
    {
      title: "Real-time overzicht",
      body: "Volg de voortgang van uw opdrachten van aanvraag tot voltooiing.",
    },
  ];
  return (
    <section className="py-20 md:py-28 px-5 md:px-8 border-b border-brass-deep/10 bg-card">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8 md:gap-12">
        <div className="col-span-12 lg:col-span-5">
          <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-4">
            Voor opdrachtgevers
          </p>
          <h2 className="font-display text-3xl md:text-5xl text-brass-deep italic leading-tight mb-6">
            Altijd de juiste begeleiding, precies wanneer u het nodig heeft.
          </h2>
          <p className="text-brass-deep/75 leading-relaxed max-w-prose">
            Als opdrachtgever wilt u zekerheid. ViaCust biedt u een netwerk van
            gescreende begeleiders en directe inzage in de status van uw ritten.
          </p>
        </div>
        <div className="col-span-12 lg:col-span-7 grid sm:grid-cols-3 gap-px bg-brass-deep/10">
          {items.map((it) => (
            <div key={it.title} className="bg-card p-6 md:p-8">
              <p className="font-display text-xl text-brass-deep italic mb-3">
                {it.title}
              </p>
              <p className="text-sm text-brass-deep/70 leading-relaxed">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
