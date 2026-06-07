import { Nav } from "@/components/site/Nav";
import { SeoHead } from "@/components/SeoHead";
import { Footer } from "@/components/site/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslation } from "react-i18next";

const Faq = () => {
  const { t } = useTranslation();
  const items = (t("faq.items", { returnObjects: true }) as { q: string; a: string }[]) || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead
        title="Veelgestelde vragen | ViaCust"
        description="Antwoorden voor planners en begeleiders: rittenplanning, automatische dispatching, vergunningen en facturatie binnen ViaCust — zonder twijfels aan de slag."
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "Wat is ViaCust?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "ViaCust is een Europees B2B SaaS-platform dat transportplanners en gecertificeerde transportbegeleiders (uitzonderlijk vervoer) efficiënt met elkaar verbindt via geautomatiseerde rittenplanning."
                }
              },
              {
                "@type": "Question",
                "name": "Hoe synchroniseert ViaCust ritten?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "ViaCust integreert naadloos met de Google Calendar API om geaccepteerde transportritten automatisch en in real-time in de persoonlijke agenda van de begeleider te plaatsen."
                }
              },
              {
                "@type": "Question",
                "name": "Is ViaCust AVG-proof?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Ja, ViaCust voldoet volledig aan de AVG (GDPR). Locatiegegevens zijn tijdelijk en strikt opt-in, en Google-gebruikersdata wordt via beveiligde Row Level Security (RLS) geïsoleerd."
                }
              }
            ]
          }
        ]}
      />
      <Nav />
      <main>
        <section className="pt-12 md:pt-20 pb-10 md:pb-16 px-5 md:px-8 border-b border-brass-deep/10 bg-gradient-hero">
          <div className="max-w-4xl mx-auto">
            <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-6">
              {t("faq.kicker")}
            </p>
            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl text-brass-deep leading-[1] italic mb-8">
              {t("faq.title")}
            </h1>
            <p className="text-base md:text-lg text-brass-deep/80 leading-relaxed max-w-3xl">
              {t("faq.intro")}
            </p>
          </div>
        </section>

        <section className="py-14 md:py-20 px-5 md:px-8">
          <div className="max-w-4xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              {items.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="border-b border-brass-deep/15"
                >
                  <AccordionTrigger className="text-left font-display text-lg md:text-xl text-brass-deep italic hover:text-brass-gold py-5">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-brass-deep/80 leading-relaxed text-base pb-6 whitespace-pre-line">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Faq;
