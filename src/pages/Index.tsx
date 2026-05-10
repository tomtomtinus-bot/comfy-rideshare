import { Nav } from "@/components/site/Nav";
import { Hero } from "@/components/site/Hero";
import { ValueClient } from "@/components/site/ValueClient";
import { ValueEscort } from "@/components/site/ValueEscort";
import { UspGoogle } from "@/components/site/UspGoogle";
import { HowItWorks } from "@/components/site/HowItWorks";
import { Footer } from "@/components/site/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        <ValueClient />
        <ValueEscort />
        <UspGoogle />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
