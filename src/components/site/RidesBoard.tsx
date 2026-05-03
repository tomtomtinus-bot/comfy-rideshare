import { ArrowRight } from "lucide-react";
import { rides } from "@/data/rides";
import { cn } from "@/lib/utils";

export const RidesBoard = () => {
  return (
    <section id="ritten" className="py-20 md:py-24 px-6 md:px-8 bg-patina/30">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-12">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-brass-gold font-semibold mb-3">
              Logboek
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-brass-deep">
              Komende vertrektijden
            </h2>
            <p className="text-brass-deep/60 mt-3">
              Dagelijks bijgewerkt overzicht van geverifieerde rit-mogelijkheden.
            </p>
          </div>
          <div className="flex gap-2 text-xs font-bold uppercase tracking-tighter">
            <span className="px-3 py-1.5 bg-card shadow-etched">Filter datum</span>
            <span className="px-3 py-1.5 bg-card shadow-etched">Filter regio</span>
          </div>
        </header>

        {/* Header row (desktop) */}
        <div className="hidden lg:grid grid-cols-12 items-center px-8 pb-3 text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold">
          <div className="col-span-2">Datum</div>
          <div className="col-span-4">Route</div>
          <div className="col-span-3">Begeleider</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1 text-right">Boek</div>
        </div>

        <ul className="space-y-px">
          {rides.map((ride) => (
            <li
              key={ride.id}
              className="group grid grid-cols-12 gap-y-4 items-center py-6 px-6 md:px-8 bg-card shadow-etched hover:shadow-elevated hover:bg-parchment transition-all duration-300 cursor-pointer"
            >
              <div className="col-span-6 lg:col-span-2">
                <p className="lg:hidden text-[10px] uppercase tracking-widest text-brass-deep/50 mb-1">Datum</p>
                <p className="font-medium tabular-nums">{ride.date}, {ride.time}</p>
              </div>
              <div className="col-span-12 lg:col-span-4 order-3 lg:order-none">
                <p className="lg:hidden text-[10px] uppercase tracking-widest text-brass-deep/50 mb-1">Route</p>
                <p className="font-medium">{ride.from} <span className="text-brass-gold mx-1">→</span> {ride.to}</p>
                <p className="text-sm text-brass-deep/55 mt-1 line-clamp-1">{ride.note}</p>
              </div>
              <div className="col-span-12 lg:col-span-3 flex items-center gap-3 order-4 lg:order-none">
                <div className="size-10 bg-patina shadow-etched flex items-center justify-center text-xs font-bold text-brass-deep tabular-nums">
                  {ride.escortInitials}
                </div>
                <div>
                  <p className="lg:hidden text-[10px] uppercase tracking-widest text-brass-deep/50 mb-0.5">Begeleider</p>
                  <p className="font-medium">{ride.escortName}</p>
                </div>
              </div>
              <div className="col-span-6 lg:col-span-2">
                <p className="lg:hidden text-[10px] uppercase tracking-widest text-brass-deep/50 mb-1">Status</p>
                <span
                  className={cn(
                    "inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest",
                    ride.status === "available" ? "text-brass-gold" : "text-brass-deep/40"
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      ride.status === "available"
                        ? "bg-brass-gold animate-soft-pulse"
                        : "bg-brass-deep/40"
                    )}
                  />
                  {ride.status === "available" ? "Beschikbaar" : "Gereserveerd"}
                </span>
              </div>
              <div className="col-span-12 lg:col-span-1 lg:text-right order-last">
                <ArrowRight className="size-5 text-brass-deep group-hover:translate-x-2 group-hover:text-brass-gold transition-all inline-block" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
