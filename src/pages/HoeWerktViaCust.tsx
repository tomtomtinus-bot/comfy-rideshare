import { Nav } from "@/components/site/Nav";
import { SeoHead } from "@/components/SeoHead";
import { Footer } from "@/components/site/Footer";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const HoeWerktViaCust = () => {
  const { t } = useTranslation();

  const clientSteps = [
    { n: 1, title: t("howItWorks.c1t"), body: t("howItWorks.c1b") },
    { n: 2, title: t("howItWorks.c2t"), body: t("howItWorks.c2b") },
    { n: 3, title: t("howItWorks.c3t"), body: t("howItWorks.c3b") },
  ];
  const escortSteps = [
    { n: 1, title: t("howItWorks.e1t"), body: t("howItWorks.e1b") },
    { n: 2, title: t("howItWorks.e2t"), body: t("howItWorks.e2b") },
    { n: 3, title: t("howItWorks.e3t"), body: t("howItWorks.e3b") },
  ];
  const why = [
    [t("howItWorks.w1t"), t("howItWorks.w1b")],
    [t("howItWorks.w2t"), t("howItWorks.w2b")],
    [t("howItWorks.w3t"), t("howItWorks.w3b")],
    [t("howItWorks.w4t"), t("howItWorks.w4b")],
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <section className="pt-12 md:pt-20 pb-10 md:pb-16 px-5 md:px-8 border-b border-brass-deep/10 bg-gradient-hero">
          <div className="max-w-4xl mx-auto">
            <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-6">
              {t("howItWorks.kicker")}
            </p>
            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl text-brass-deep leading-[1] italic mb-8">
              {t("howItWorks.title")}
            </h1>
            <p className="text-base md:text-lg text-brass-deep/80 leading-relaxed max-w-3xl">
              {t("howItWorks.intro")}
            </p>
          </div>
        </section>

        <section className="py-14 md:py-20 px-5 md:px-8 border-b border-brass-deep/10">
          <div className="max-w-4xl mx-auto">
            <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-4">
              {t("howItWorks.clientKicker")}
            </p>
            <h2 className="font-display text-3xl md:text-5xl text-brass-deep italic leading-tight mb-10">
              {t("howItWorks.clientTitle")}
            </h2>
            <div className="space-y-8">
              {clientSteps.map((s) => (
                <div key={s.n} className="border-l-2 border-brass-gold pl-6 py-2">
                  <div className="text-brass-gold uppercase tracking-[0.25em] text-xs font-semibold mb-2">
                    {t("howItWorks.step")} {s.n}
                  </div>
                  <h3 className="font-display text-2xl md:text-3xl text-brass-deep italic mb-3">
                    {s.title}
                  </h3>
                  <p className="text-brass-deep/80 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20 px-5 md:px-8 border-b border-brass-deep/10 bg-brass-deep text-parchment">
          <div className="max-w-4xl mx-auto">
            <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-4">
              {t("howItWorks.escortKicker")}
            </p>
            <h2 className="font-display text-3xl md:text-5xl italic leading-tight mb-10">
              {t("howItWorks.escortTitle")}
            </h2>
            <div className="space-y-8">
              {escortSteps.map((s) => (
                <div key={s.n} className="border-l-2 border-brass-gold pl-6 py-2">
                  <div className="text-brass-gold uppercase tracking-[0.25em] text-xs font-semibold mb-2">
                    {t("howItWorks.step")} {s.n}
                  </div>
                  <h3 className="font-display text-2xl md:text-3xl italic mb-3">{s.title}</h3>
                  <p className="text-parchment/80 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20 px-5 md:px-8 border-b border-brass-deep/10">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-3xl md:text-5xl text-brass-deep italic leading-tight mb-10">
              {t("howItWorks.whyTitle")}
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {why.map(([title, body]) => (
                <div key={title} className="p-6 border border-brass-deep/15 bg-parchment/40">
                  <h3 className="font-display text-xl text-brass-deep italic mb-2">{title}</h3>
                  <p className="text-brass-deep/80 leading-relaxed text-sm">{body}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 flex flex-col sm:flex-row gap-3">
              <Link
                to="/auth?role=escort"
                className="inline-block px-7 py-4 bg-brass-deep text-parchment text-xs uppercase tracking-widest font-semibold hover:bg-brass-gold transition-colors text-center"
              >
                {t("howItWorks.ctaEscort")}
              </Link>
              <Link
                to="/auth?role=client"
                className="inline-block px-7 py-4 border border-brass-deep/30 text-brass-deep text-xs uppercase tracking-widest font-semibold hover:border-brass-gold hover:text-brass-gold transition-colors text-center"
              >
                {t("howItWorks.ctaClient")}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default HoeWerktViaCust;
