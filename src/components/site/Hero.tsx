import { Link } from "react-router-dom";

export const Hero = () => {
  return (
    <section className="relative pt-10 md:pt-20 pb-10 md:pb-16 px-5 md:px-8 border-b border-brass-deep/10 bg-gradient-hero">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6 md:gap-12 items-end">
        <div className="col-span-12 lg:col-span-8 animate-fade-up">
          <p className="text-brass-gold uppercase tracking-[0.25em] md:tracking-[0.3em] font-semibold text-[10px] md:text-xs mb-4 md:mb-6">
            ViaCust — Transportbegeleiding
          </p>
          <h1 className="font-display text-[2.25rem] sm:text-6xl lg:text-8xl text-brass-deep leading-[1] md:leading-[0.95] italic">
            De slimme schakel<br />in transportbegeleiding.
          </h1>
        </div>
        <div className="col-span-12 lg:col-span-4 pb-2 animate-fade-up [animation-delay:120ms]">
          <p className="text-sm md:text-lg text-brass-deep/80 leading-relaxed max-w-[40ch] mb-6 md:mb-8">
            Plan, beheer en synchroniseer begeleidingsritten in één centraal platform.
            Geen gedoe meer met overvolle mailboxen of gemiste updates.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/auth?role=begeleider"
              className="inline-block px-7 py-4 bg-brass-deep text-parchment text-xs uppercase tracking-widest font-semibold hover:bg-brass-gold transition-colors text-center"
            >
              Word begeleider
            </Link>
            <Link
              to="/aanvragen"
              className="inline-block px-7 py-4 border border-brass-deep/30 text-brass-deep text-xs uppercase tracking-widest font-semibold hover:border-brass-gold hover:text-brass-gold transition-colors text-center"
            >
              Rit aanvragen
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
