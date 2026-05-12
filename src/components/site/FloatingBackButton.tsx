import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

// Zwevende terug-knop linksonder. Alleen zichtbaar in de native app
// en verborgen op het hoofd-/dashboardscherm en de landingspagina.
const HIDDEN_ROUTES = new Set<string>(["/", "/dashboard", "/auth"]);

export const FloatingBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Alleen tonen in de native app (iOS/Android via Capacitor)
  const isNative = typeof Capacitor !== "undefined" && Capacitor.isNativePlatform?.();
  if (!isNative) return null;
  if (HIDDEN_ROUTES.has(location.pathname)) return null;

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/dashboard");
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Terug"
      className="fixed z-50 left-4 bottom-4 h-14 w-14 rounded-full bg-brass-deep text-parchment shadow-etched flex items-center justify-center hover:bg-brass-gold active:scale-95 transition-all"
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
        left: "calc(env(safe-area-inset-left, 0px) + 1rem)",
      }}
    >
      <ArrowLeft className="h-6 w-6" />
    </button>
  );
};
