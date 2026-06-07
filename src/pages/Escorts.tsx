import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Star, Truck } from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { escorts } from "@/data/escorts";

const Escorts = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <section className="px-6 md:px-8 pt-20 md:pt-28 pb-16 border-b border-brass-deep/10 bg-gradient-hero">
          <div className="max-w-7xl mx-auto">
            <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-6">
              Begeleidersregister · Anoniem
            </p>
            <h1 className="font-display text-5xl md:text-7xl text-brass-deep italic leading-[0.95] max-w-4xl">
              Gecertificeerde convoi-begeleiders.
            </h1>
            <p className="mt-6 text-brass-deep/70 max-w-xl">
              Bekijk uurtarieven, categorieën, werkgebied en pilotvoertuig-specs.
              Begeleiders worden anoniem getoond met een uniek konvooi-ID.
            </p>
          </div>
        </section>

        <section className="px-6 md:px-8 py-16 md:py-20 bg-patina/30">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-brass-deep/10">
            {escorts.map((e) => (
              <Link
                key={e.id}
                to={`/begeleiders/${e.id}`}
                className="group bg-card p-8 hover:bg-parchment hover:shadow-elevated transition-all duration-300 flex flex-col"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="size-14 bg-patina shadow-etched flex items-center justify-center text-xs font-bold text-brass-deep tabular-nums">
                    #{e.anonymousId}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-brass-gold tabular-nums">
                    <Star className="size-3.5 fill-brass-gold" strokeWidth={0} />
                    {e.rating.toFixed(1)}
                    <span className="text-brass-deep/80 font-normal">
                      · {e.ridesCompleted} ritten
                    </span>
                  </div>
                </div>
                <h2 className="font-display text-2xl text-brass-deep leading-tight mb-2">
                  Begeleider #{e.anonymousId}
                </h2>
                <p className="text-sm text-brass-deep/80 flex items-center gap-1.5 mb-2">
                  <MapPin className="size-3.5" />
                  Standplaats {e.city}, {e.country}
                </p>
                <p className="text-xs text-brass-deep/80 flex items-center gap-1.5 mb-6">
                  <Truck className="size-3.5" />
                  {e.pilotVehicle.type}
                </p>

                <div className="space-y-3 text-sm border-t border-brass-deep/10 pt-5 mt-auto">
                  <div className="flex justify-between">
                    <span className="text-brass-deep/80 uppercase tracking-widest text-[10px] font-bold">
                      Uurtarief
                    </span>
                    <span className="font-semibold tabular-nums">€{e.hourlyRate}/uur</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-brass-deep/80 uppercase tracking-widest text-[10px] font-bold shrink-0">
                      Categorieën
                    </span>
                    <span className="font-medium text-right">{e.categories.join(" · ")}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-brass-deep/80 uppercase tracking-widest text-[10px] font-bold shrink-0">
                      Landen
                    </span>
                    <span className="font-medium text-right text-xs">{e.countries.join(" · ")}</span>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between text-xs uppercase tracking-widest font-semibold text-brass-deep group-hover:text-brass-gold transition-colors">
                  Bekijk profiel
                  <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Escorts;
