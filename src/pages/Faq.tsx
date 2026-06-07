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

  const generalItems = items.slice(0, 11);
  const businessItems = items.slice(11);

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
      <main className="max-w-3xl mx-auto px-5 md:px-8">
        <section className="pt-6 md:pt-8 pb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            {t("faq.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-2 mb-8">
            {t("faq.intro")}
          </p>
        </section>

        <section className="pb-10 md:pb-14">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
            {t("faq.sectionGeneral")}
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {generalItems.map((item, i) => (
              <AccordionItem key={i} value={`general-${i}`}>
                <AccordionTrigger className="text-left text-base font-medium hover:no-underline py-4">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line pb-4">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {businessItems.length > 0 && (
          <section className="pb-10 md:pb-14">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
              {t("faq.sectionBusiness")}
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {businessItems.map((item, i) => (
                <AccordionItem key={i} value={`business-${i}`}>
                  <AccordionTrigger className="text-left text-base font-medium hover:no-underline py-4">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line pb-4">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        )}

        <section className="pb-16 md:pb-20 text-center">
          <p className="text-sm text-muted-foreground">
            Staat je vraag er niet tussen? Neem gerust contact met ons op via{" "}
            <a href="mailto:info@viacust.com" className="underline underline-offset-4 hover:text-foreground transition-colors">
              info@viacust.com
            </a>
            .
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Faq;
