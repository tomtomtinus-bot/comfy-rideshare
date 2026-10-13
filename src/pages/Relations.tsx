import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { SeoHead } from "@/components/SeoHead";
import { RequireAuth } from "@/components/site/RequireAuth";
import { RelationsCard } from "@/components/site/RelationsCard";
import { useAuth } from "@/hooks/useAuth";

const Inner = () => {
  const { role } = useAuth();
  const title = role === "begeleider" ? "Relaties" : "Begeleiders";
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead title={`${title} | ViaCust`} description="Beheer je vaste relaties en tariefafspraken in ViaCust." />
      <Nav />
      <main className="px-4 md:px-6 py-4 md:py-6 min-h-[calc(100vh-5rem)]">
        <div className="w-full">
          <RelationsCard pageTitle={title} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

const Relations = () => (
  <RequireAuth>
    <Inner />
  </RequireAuth>
);

export default Relations;
