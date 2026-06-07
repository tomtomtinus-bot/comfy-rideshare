import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/components/site/Nav";
import { SeoHead } from "@/components/SeoHead";
import { Footer } from "@/components/site/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

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

  const cancelEnroll = async () => {
    if (!enroll) return;
    await supabase.auth.mfa.unenroll({ factorId: enroll.factorId });
    setEnroll(null);
    setCode("");
    await refresh();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead title="Beveiliging | ViaCust" description="Beheer tweestapsverificatie en accountbeveiligingsinstellingen in ViaCust." />
      <Nav />
      <main className="px-6 md:px-8 py-6 md:py-8">
        <div className="max-w-lg mx-auto space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{t("security.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("security.intro")} {isAdmin ? t("security.requiredAdmin") : t("security.optionalRecommended")}
            </p>
          </div>

          <Card className="border-input">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                {verified ? (
                  <ShieldCheck className="h-5 w-5 text-primary" />
                ) : (
                  <ShieldAlert className="h-5 w-5 text-muted-foreground" />
                )}
                <CardTitle className="text-base font-semibold">
                  {t("security.title")}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {forced && (
                <Alert variant="default" className="bg-muted/50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{t("security.forcedNotice")}</AlertDescription>
                </Alert>
              )}

              {verified && !enroll && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Badge variant="default">{t("security.active")}</Badge>
                      <p className="text-xs text-muted-foreground">
                        {t("security.sessionStatus")}{" "}
                        {aal === "aal2" ? t("security.verifiedAal2") : t("security.notVerifiedSession")}
                      </p>
                    </div>
                    {!isAdmin && (
                      <Button variant="outline" size="sm" onClick={disable} disabled={busy}>
                        {t("security.disable")}
                      </Button>
                    )}
                  </div>

                  {aal !== "aal2" && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">{t("security.enterCodeSession")}</p>
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <InputOTP maxLength={6} value={code} onChange={setCode}>
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                        <Button onClick={challengeExisting} disabled={busy || code.length !== 6}>
                          {t("security.verifyBtn")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!verified && !enroll && (
                <Button className="w-full" onClick={startEnroll} disabled={busy}>
                  {busy ? t("security.busy") : t("security.enable2fa")}
                </Button>
              )}

              {enroll && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <p className="text-sm">{t("security.scanQr")}</p>
                    <div className="flex justify-center p-4 border rounded-md bg-white">
                      <img src={enroll.qr} alt={t("security.qrAlt")} className="w-48 h-48" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("security.orManual")}{" "}
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs break-all">{enroll.secret}</code>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t("security.enter6")}</Label>
                    <InputOTP maxLength={6} value={code} onChange={setCode}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={verifyEnroll} disabled={busy || code.length !== 6}>
                      {t("security.confirm")}
                    </Button>
                    <Button variant="outline" onClick={cancelEnroll} disabled={busy}>
                      {t("security.cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Security;
