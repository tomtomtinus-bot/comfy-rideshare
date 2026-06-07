import { Navigate } from "react-router-dom";
import { Nav } from "@/components/site/Nav";
import { Hero } from "@/components/site/Hero";
import { ThreePillars } from "@/components/site/ThreePillars";
import { ValueClient } from "@/components/site/ValueClient";
import { ValueEscort } from "@/components/site/ValueEscort";
import { SocialProof } from "@/components/site/SocialProof";
import { Footer } from "@/components/site/Footer";
import { SeoHead } from "@/components/SeoHead";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead
        title="ViaCust | Digital Escort Solutions"
        description="Het alles-in-één platform voor transportbegeleiders en planners. Automatiseer ritten, planningen en vergunningen in heel Europa."
        canonical="https://viacust.com/"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": ["SoftwareApplication", "Organization"],
            "name": "ViaCust",
            "operatingSystem": "All",
            "applicationCategory": "BusinessApplication / Dispatch & Logistics",
            "description": "Geautomatiseerd dispatchsysteem en platform voor transportbegeleiding en uitzonderlijk vervoer."
          },
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
        <Hero />
        <ThreePillars />
        <ValueClient />
        <ValueEscort />
        <SocialProof />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

