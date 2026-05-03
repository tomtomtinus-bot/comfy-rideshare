import { Nav } from "@/components/site/Nav";
import { Hero } from "@/components/site/Hero";
import { RidesBoard } from "@/components/site/RidesBoard";
import { Protocol } from "@/components/site/Protocol";
import { Footer } from "@/components/site/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        <RidesBoard />
        <Protocol />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
