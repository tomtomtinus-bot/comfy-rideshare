import { useEffect, useState } from "react";
import { Smartphone, X, Share, MoreVertical, Plus } from "lucide-react";
import { Capacitor } from "@capacitor/core";

const DISMISS_KEY = "viacust:install-banner-dismissed";

type Platform = "ios" | "android" | "other";

const detectPlatform = (): Platform => {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
};

const isStandalone = () => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as any).standalone === true
  );
};

export const InstallAppBanner = () => {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [showHow, setShowHow] = useState(false);

  useEffect(() => {
    const isNative = Capacitor?.isNativePlatform?.();
    if (isNative) return;
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    const p = detectPlatform();
    if (p === "other") return;
    setPlatform(p);
    setOpen(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="mb-6 rounded-xl border border-brass-deep/20 bg-parchment/80 backdrop-blur p-4 shadow-etched">
      <div className="flex items-start gap-3">
        <div className="shrink-0 h-10 w-10 rounded-lg bg-brass-deep/10 flex items-center justify-center text-brass-deep">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-brass-deep">
            Voeg ViaCust toe aan je beginscherm
          </p>
          <p className="text-sm text-brass-deep/70 mt-0.5">
            Zo open je ViaCust met één tik en ontvang je straks ook pushmeldingen
            voor nieuwe ritten en updates.
          </p>

          {showHow && platform === "ios" && (
            <ol className="mt-3 space-y-2 text-sm text-brass-deep">
              <li className="flex items-start gap-2">
                <span className="font-semibold">1.</span>
                <span className="flex items-center gap-1 flex-wrap">
                  Tik onderin Safari op het deel-icoon
                  <Share className="h-4 w-4 inline" />
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">2.</span>
                <span className="flex items-center gap-1 flex-wrap">
                  Kies <strong>Zet op beginscherm</strong>
                  <Plus className="h-4 w-4 inline" />
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">3.</span>
                <span>Tik op <strong>Voeg toe</strong> rechtsboven</span>
              </li>
              <li className="text-xs text-brass-deep/60 pl-5">
                Open ViaCust hierna vanaf je beginscherm — pushmeldingen werken
                op iOS alleen vanuit de geïnstalleerde app.
              </li>
            </ol>
          )}

          {showHow && platform === "android" && (
            <ol className="mt-3 space-y-2 text-sm text-brass-deep">
              <li className="flex items-start gap-2">
                <span className="font-semibold">1.</span>
                <span className="flex items-center gap-1 flex-wrap">
                  Tik rechtsboven in Chrome op het menu
                  <MoreVertical className="h-4 w-4 inline" />
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">2.</span>
                <span>
                  Kies <strong>App installeren</strong> of <strong>Toevoegen
                  aan startscherm</strong>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">3.</span>
                <span>Bevestig met <strong>Installeren</strong></span>
              </li>
            </ol>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowHow((v) => !v)}
              className="text-sm font-medium px-3 py-1.5 rounded-md bg-brass-deep text-parchment hover:bg-brass-gold transition-colors"
            >
              {showHow ? "Verberg uitleg" : `Zo doe je dat op ${platform === "ios" ? "iPhone" : "Android"}`}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="text-sm font-medium px-3 py-1.5 rounded-md text-brass-deep/70 hover:text-brass-deep"
            >
              Niet meer tonen
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Sluiten"
          className="shrink-0 text-brass-deep/50 hover:text-brass-deep"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
