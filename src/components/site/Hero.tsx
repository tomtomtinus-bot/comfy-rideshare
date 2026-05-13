import { Link } from "react-router-dom";

export const Hero = () => {
  return (
    <section className="relative pt-12 md:pt-24 pb-12 md:pb-20 px-5 md:px-8 border-b border-brass-deep/10 bg-gradient-hero text-left">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6 md:gap-12 items-end">
        <div className="col-span-12 lg:col-span-8 animate-fade-up">
          <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-[10px] md:text-xs mb-4 md:mb-6">
            ViaCust
          </p>
          <h1 className="font-display text-[2.25rem] sm:text-6xl lg:text-7xl text-brass-deep leading-[1.05] italic">
            Slimme Transportbegeleiding.<br />Zonder Administratieve Last.
          </h1>
          <p className="text-brass-gold/70 text-sm tracking-wide mt-3 italic">
            ViaCust Digital Escort Solutions.
          </p>
        </div>
        <div className="col-span-12 lg:col-span-4 pb-2 animate-fade-up [animation-delay:120ms]">
          <p className="text-sm md:text-lg text-brass-deep/80 leading-relaxed max-w-[44ch] mb-6 md:mb-8">
            Het eerste platform dat ritten, agenda's en facturatie volledig automatiseert. Voor de professionele begeleider en de kritische transportondernemer.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/auth?role=opdrachtgever"
              className="inline-block px-7 py-4 bg-brass-deep text-parchment text-xs uppercase tracking-widest font-semibold hover:bg-brass-gold transition-colors text-center"
            >
              Ik zoek een begeleider
            </Link>
            <Link
              to="/auth?role=begeleider"
              className="inline-block px-7 py-4 border-2 border-brass-deep text-brass-deep text-xs uppercase tracking-widest font-semibold hover:bg-brass-deep hover:text-parchment transition-colors text-center"
            >
              Ik ben een begeleider
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
