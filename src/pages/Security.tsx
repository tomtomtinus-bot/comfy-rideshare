import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

type Factor = { id: string; status: string; friendly_name?: string | null };

const Security = () => {
  const { t } = useTranslation();
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const forced = params.get("forced") === "1";

  const [factors, setFactors] = useState<Factor[]>([]);
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [aal, setAal] = useState<string | null>(null);

  const refresh = async () => {
    const { data: list } = await supabase.auth.mfa.listFactors();
    const totp = (list?.totp ?? []) as Factor[];
    setFactors(totp);
    const { data: a } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    setAal(a?.currentLevel ?? null);
  };

  useEffect(() => {
    if (user) refresh();
  }, [user]);

  if (!loading && !user) return <Navigate to="/auth" replace />;

  const verified = factors.find((f) => f.status === "verified");

  const startEnroll = async () => {
    setBusy(true);
    for (const f of factors.filter((x) => x.status !== "verified")) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `ViaCust ${new Date().toISOString().slice(0, 10)}`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setEnroll({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const verifyEnroll = async () => {
    if (!enroll) return;
    if (!/^\d{6}$/.test(code)) return toast.error(t("security.errSixDigits"));
    setBusy(true);
    const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({ factorId: enroll.factorId });
    if (cErr) { setBusy(false); return toast.error(cErr.message); }
    const { error } = await supabase.auth.mfa.verify({
      factorId: enroll.factorId,
      challengeId: ch.id,
      code,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("security.okEnabled"));
    setEnroll(null);
    setCode("");
    await refresh();
    if (forced) navigate("/admin", { replace: true });
  };

  const challengeExisting = async () => {
    if (!verified) return;
    if (!/^\d{6}$/.test(code)) return toast.error(t("security.errSixDigits"));
    setBusy(true);
    const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({ factorId: verified.id });
    if (cErr) { setBusy(false); return toast.error(cErr.message); }
    const { error } = await supabase.auth.mfa.verify({
      factorId: verified.id,
      challengeId: ch.id,
      code,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("security.okVerified"));
    setCode("");
    await refresh();
    if (forced) navigate("/admin", { replace: true });
  };

  const disable = async () => {
    if (!verified) return;
    if (isAdmin) return toast.error(t("security.adminNoDisable"));
    if (!confirm(t("security.confirmDisable"))) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: verified.id });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("security.okDisabled"));
    await refresh();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="px-6 md:px-8 py-12 md:py-16">
        <div className="max-w-2xl mx-auto bg-card shadow-etched p-8 md:p-10">
          <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">{t("security.kicker")}</p>
          <h1 className="font-display text-4xl text-brass-deep italic mb-6">{t("security.title")}</h1>

          {forced && (
            <div className="mb-6 p-4 border-l-2 border-brass-gold bg-parchment/60 text-sm text-brass-deep">
              {t("security.forcedNotice")}
            </div>
          )}

          <p className="text-sm text-brass-deep/75 leading-relaxed mb-8">
            {t("security.intro")} {isAdmin ? t("security.requiredAdmin") : t("security.optionalRecommended")}
          </p>

          {verified && !enroll && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-brass-deep/15">
                <div>
                  <div className="text-sm font-semibold text-brass-deep">{t("security.active")}</div>
                  <div className="text-xs text-brass-deep/60">
                    {t("security.sessionStatus")} {aal === "aal2" ? t("security.verifiedAal2") : t("security.notVerifiedSession")}
                  </div>
                </div>
                {!isAdmin && (
                  <button
                    onClick={disable}
                    disabled={busy}
                    className="px-4 py-2 text-xs uppercase tracking-widest text-brass-deep/70 hover:text-brass-deep border border-brass-deep/20 disabled:opacity-50"
                  >
                    {t("security.disable")}
                  </button>
                )}
              </div>

              {aal !== "aal2" && (
                <div className="p-4 border border-brass-gold/40 bg-parchment/60">
                  <p className="text-xs text-brass-deep/75 mb-3">
                    {t("security.enterCodeSession")}
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      inputMode="numeric"
                      className="flex-1 bg-parchment border border-brass-deep/15 px-4 py-3 text-sm tracking-widest focus:outline-none focus:border-brass-gold"
                    />
                    <button
                      onClick={challengeExisting}
                      disabled={busy}
                      className="px-5 py-3 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold disabled:opacity-60"
                    >
                      {t("security.verifyBtn")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!verified && !enroll && (
            <button
              onClick={startEnroll}
              disabled={busy}
              className="w-full px-6 py-4 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors disabled:opacity-60"
            >
              {busy ? t("security.busy") : t("security.enable2fa")}
            </button>
          )}

          {enroll && (
            <div className="space-y-5">
              <div className="text-sm text-brass-deep">
                <p className="mb-3">{t("security.scanQr")}</p>
                <div className="flex justify-center bg-white p-4 border border-brass-deep/15">
                  <img src={enroll.qr} alt={t("security.qrAlt")} className="w-48 h-48" />
                </div>
                <p className="mt-3 text-xs text-brass-deep/65">
                  {t("security.orManual")}{" "}
                  <code className="bg-parchment px-2 py-1 break-all">{enroll.secret}</code>
                </p>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">
                  {t("security.enter6")}
                </label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm tracking-widest focus:outline-none focus:border-brass-gold"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={verifyEnroll}
                  disabled={busy}
                  className="flex-1 px-6 py-4 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold disabled:opacity-60"
                >
                  {t("security.confirm")}
                </button>
                <button
                  onClick={async () => {
                    await supabase.auth.mfa.unenroll({ factorId: enroll.factorId });
                    setEnroll(null);
                    setCode("");
                    await refresh();
                  }}
                  className="px-6 py-4 border border-brass-deep/20 text-xs uppercase tracking-widest text-brass-deep/70"
                >
                  {t("security.cancel")}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Security;
