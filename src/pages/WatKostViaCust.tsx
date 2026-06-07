import { SeoHead } from "@/components/SeoHead";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Section = ({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="py-14 md:py-20 px-5 md:px-8 border-b border-brass-deep/10">
    <div className="max-w-4xl mx-auto">
      <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-4">
        {kicker}
      </p>
      <h2 className="font-display text-3xl md:text-5xl text-brass-deep italic leading-tight mb-8">
        {title}
      </h2>
      <div className="space-y-5 text-brass-deep/80 leading-relaxed text-base md:text-lg">
        {children}
      </div>
    </div>
  </section>
);

const Bullet = ({ label, value }: { label: string; value: string }) => (
  <div className="border-l-2 border-brass-gold pl-5 py-1">
    <span className="font-semibold text-brass-deep">{label}: </span>
    <span>{value}</span>
  </div>
);

const WatKostViaCust = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead
        title="Tarieven & Prijzen | ViaCust"
        description="Duidelijke en transparante tarieven voor ViaCust. Ontdek onze flexibele abonnementen voor transportplanners en begeleiders van uitzonderlijk vervoer."
      />
      <Nav />
      <main>
        <section className="pt-12 md:pt-20 pb-10 md:pb-16 px-5 md:px-8 border-b border-brass-deep/10 bg-gradient-hero">
          <div className="max-w-4xl mx-auto">
            <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-6">
              {t("pricing.kicker")}
            </p>
            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl text-brass-deep leading-[1] italic mb-8">
              {t("pricing.title")}
            </h1>
            <p className="text-base md:text-lg text-brass-deep/80 leading-relaxed max-w-3xl">
              {t("pricing.intro")}
            </p>
          </div>
        </section>

        <Section kicker={t("pricing.clientKicker")} title={t("pricing.clientTitle")}>
          <Bullet label={t("pricing.subscription")} value={t("pricing.plan50")} />
          <div className="border-l-2 border-brass-gold pl-5 py-1">
            <span className="font-semibold text-brass-deep">{t("pricing.introOfferLabel")}: </span>
            <span>{t("pricing.introOfferBody")}</span>
          </div>
          <Bullet label={t("pricing.commissionLabel")} value={t("pricing.commissionValue")} />
          <p>
            <span className="font-semibold text-brass-deep">{t("pricing.advantageLabel")}: </span>
            {t("pricing.advantageBody")}
          </p>
        </Section>

        <Section kicker={t("pricing.escortKicker")} title={t("pricing.escortTitle")}>
          <Bullet label={t("pricing.subscription")} value={t("pricing.plan250")} />
          <Bullet label={t("pricing.unlimitedLabel")} value={t("pricing.unlimitedValue")} />
          <Bullet label={t("pricing.calendarLabel")} value={t("pricing.calendarValue")} />
        </Section>

        <Section kicker={t("pricing.companyKicker")} title={t("pricing.companyTitle")}>
          <Bullet label={t("pricing.mainAccountLabel")} value={t("pricing.mainAccountValue")} />
          <Bullet label={t("pricing.perSeatLabel")} value={t("pricing.perSeatValue")} />
          <Bullet label={t("pricing.centralLabel")} value={t("pricing.centralValue")} />
          <Bullet label={t("pricing.scalableLabel")} value={t("pricing.scalableValue")} />
        </Section>

        <Section kicker={t("pricing.billingKicker")} title={t("pricing.billingTitle")}>
          <p>{t("pricing.billingIntro")}</p>
          <Bullet label={t("pricing.weeklyLabel")} value={t("pricing.weeklyValue")} />
          <Bullet label={t("pricing.fuelLabel")} value={t("pricing.fuelValue")} />
          <Bullet label={t("pricing.extrasLabel")} value={t("pricing.extrasValue")} />
        </Section>

        <Section kicker={t("pricing.debitKicker")} title={t("pricing.debitTitle")}>
          <p>{t("pricing.debitIntro")}</p>
          <Bullet label={t("pricing.autoLabel")} value={t("pricing.autoValue")} />
          <Bullet label={t("pricing.manualLabel")} value={t("pricing.manualValue")} />
          <p className="font-display italic text-2xl md:text-3xl text-brass-deep pt-4">
            {t("pricing.closing")}
          </p>
        </Section>

        <section className="py-14 md:py-20 px-5 md:px-8">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-4">
            <Link
              to="/auth?role=client"
              className="inline-block px-7 py-4 bg-brass-deep text-parchment text-xs uppercase tracking-widest font-semibold hover:bg-brass-gold transition-colors text-center"
            >
              {t("pricing.ctaClient")}
            </Link>
            <Link
              to="/auth?role=escort"
              className="inline-block px-7 py-4 border-2 border-brass-deep text-brass-deep text-xs uppercase tracking-widest font-semibold hover:bg-brass-deep hover:text-parchment transition-colors text-center"
            >
              {t("pricing.ctaEscort")}
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default WatKostViaCust;
