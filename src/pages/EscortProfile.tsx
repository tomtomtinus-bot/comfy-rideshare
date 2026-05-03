import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, MapPin, Star, X } from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { escorts } from "@/data/escorts";

const EscortProfile = () => {
  const { id } = useParams();
  const escort = escorts.find((e) => e.id === id);

  if (!escort) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Nav />
        <main className="max-w-3xl mx-auto px-6 md:px-8 py-32 text-center">
          <h1 className="font-display text-5xl text-brass-deep italic mb-4">
            Begeleider niet gevonden
          </h1>
          <Link
            to="/begeleiders"
            className="inline-flex items-center gap-2 text-brass-gold uppercase tracking-widest text-sm font-semibold mt-6"
          >
            <ArrowLeft className="size-4" /> Terug naar register
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <section className="px-6 md:px-8 pt-12 pb-20 border-b border-brass-deep/10 bg-gradient-hero">
          <div className="max-w-7xl mx-auto">
            <Link
              to="/begeleiders"
              className="inline-flex items-center gap-2 text-brass-deep/60 hover:text-brass-gold uppercase tracking-widest text-xs font-semibold mb-12 transition-colors"
            >
              <ArrowLeft className="size-4" /> Terug naar register
            </Link>

            <div className="grid grid-cols-12 gap-8 md:gap-12 items-end">
              <div className="col-span-12 lg:col-span-8">
                <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-6">
                  Begeleidersprofiel
                </p>
                <div className="flex items-start gap-6">
                  <div className="size-20 md:size-24 bg-patina shadow-etched flex items-center justify-center text-2xl font-bold text-brass-deep tabular-nums shrink-0">
                    {escort.initials}
                  </div>
                  <div>
                    <h1 className="font-display text-4xl md:text-6xl text-brass-deep italic leading-[0.95]">
                      {escort.name}
                    </h1>
                    <p className="mt-3 text-brass-deep/60 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-3.5" />
                        {escort.city}, {escort.country}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Star className="size-3.5 fill-brass-gold text-brass-gold" />
                        {escort.rating.toFixed(1)} · {escort.ridesCompleted} ritten
                      </span>
                      <span>{escort.yearsActive}+ jaar actief</span>
                    </p>
                  </div>
                </div>
                <p className="mt-8 max-w-2xl text-base md:text-lg text-brass-deep/80 leading-relaxed">
                  {escort.bio}
                </p>
              </div>

              <div className="col-span-12 lg:col-span-4">
                <div className="bg-card shadow-etched p-8">
                  <p className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold mb-2">
                    Uurtarief
                  </p>
                  <p className="font-display text-5xl text-brass-deep tabular-nums">
                    €{escort.hourlyRate}
                    <span className="text-xl text-brass-deep/50">/uur</span>
                  </p>
                  <button className="mt-8 w-full px-6 py-4 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors">
                    Boek deze begeleider
                  </button>
                  <p className="mt-3 text-[11px] text-brass-deep/50 leading-relaxed">
                    Toeslagen worden berekend op basis van rittijd en route.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 md:px-8 py-20 md:py-24 bg-patina/30">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-px bg-brass-deep/10">
            <article className="bg-card p-8 lg:p-10">
              <h2 className="font-display text-3xl text-brass-deep mb-1">Verificaties</h2>
              <p className="text-xs uppercase tracking-widest text-brass-gold font-semibold mb-8">
                Onafhankelijk getoetst
              </p>
              <ul className="space-y-4">
                {escort.verifications.map((v) => (
                  <li key={v.label} className="flex items-center justify-between gap-4 border-b border-brass-deep/10 pb-3 last:border-0">
                    <span className="text-sm">{v.label}</span>
                    {v.verified ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brass-gold uppercase tracking-widest">
                        <Check className="size-3.5" strokeWidth={3} /> Geldig
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brass-deep/40 uppercase tracking-widest">
                        <X className="size-3.5" strokeWidth={3} /> Niet
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </article>

            <article className="bg-card p-8 lg:p-10">
              <h2 className="font-display text-3xl text-brass-deep mb-1">Werkgebied</h2>
              <p className="text-xs uppercase tracking-widest text-brass-gold font-semibold mb-8">
                Mag begeleiden in
              </p>
              <ul className="space-y-3 mb-8">
                {escort.countries.map((c) => (
                  <li key={c} className="flex items-center gap-3 text-sm">
                    <span className="size-1.5 bg-brass-gold rounded-full" />
                    {c}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold mb-3">
                Talen
              </p>
              <div className="flex flex-wrap gap-2">
                {escort.languages.map((l) => (
                  <span
                    key={l}
                    className="px-3 py-1 bg-patina text-xs font-medium text-brass-deep"
                  >
                    {l}
                  </span>
                ))}
              </div>
            </article>

            <article className="bg-card p-8 lg:p-10">
              <h2 className="font-display text-3xl text-brass-deep mb-1">Toeslagen</h2>
              <p className="text-xs uppercase tracking-widest text-brass-gold font-semibold mb-8">
                Transparante prijsopbouw
              </p>
              <ul className="space-y-4">
                {escort.surcharges.map((s) => (
                  <li
                    key={s.label}
                    className="flex items-start justify-between gap-4 border-b border-brass-deep/10 pb-3 last:border-0"
                  >
                    <span className="text-sm">{s.label}</span>
                    <span className="text-sm font-semibold tabular-nums text-brass-deep shrink-0">
                      {s.amount}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default EscortProfile;
