import { Calendar, Receipt, Globe2 } from "lucide-react";

const pillars = [
  {
    icon: Calendar,
    title: "Google Agenda Sync",
    body: "Uw agenda is uw planning. Zodra een rit is geaccepteerd, staat deze in uw agenda. Privé-afspraken blokkeren automatisch uw beschikbaarheid. Nooit meer dubbele boekingen.",
  },
  {
    icon: Receipt,
    title: "Wekelijkse Facturatie",
    body: "Geen losse facturen meer. ViaCust genereert wekelijks automatische verzamelfacturen inclusief brandstoftoeslagen op maat en onkosten. Administratie op de automatische piloot.",
  },
  {
    icon: Globe2,
    title: "Europees Netwerk",
    body: "Grensverleggende begeleiding in Nederland, België, Duitsland en Frankrijk. Volledig meertalig ondersteund en gericht op internationale samenwerking.",
  },
];

export const ThreePillars = () => {
  return (
    <section className="py-16 md:py-24 px-5 md:px-8 bg-parchment border-b border-brass-deep/10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14">
        {pillars.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex flex-col gap-4">
            <div className="size-12 flex items-center justify-center bg-brass-deep text-parchment">
              <Icon className="size-6" />
            </div>
            <h3 className="font-display text-2xl md:text-3xl italic text-brass-deep leading-tight">
              {title}
            </h3>
            <p className="text-sm md:text-base text-brass-deep/75 leading-relaxed">
              {body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
