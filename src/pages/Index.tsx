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
        title="ViaCust | Platform voor Transportbegeleiding & Uitzonderlijk Vervoer"
        description="Het alles-in-één platform voor transportbegeleiders en planners. Automatiseer ritten, planningen en vergunningen in heel Europa."
        canonical="https://viacust.com/"
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

