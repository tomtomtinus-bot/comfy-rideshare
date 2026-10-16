import { supabase } from "@/integrations/supabase/client";

/**
 * Facturatiepakket van een account: ZZP-begeleider, Planner of Vloot-bedrijf.
 *
 * Dit is uitsluitend een betaalkeuze. Rechten komen altijd uit public.user_roles
 * (opdrachtgever / begeleider / admin); het pakket bepaalt alleen welk tarief
 * op de platformfactuur komt en welk dashboard-pad logisch is.
 */
export type AccountPackage = "zzp" | "planner" | "vloot";

const INTENT_KEY = "viacust_package";

const isPackage = (v: unknown): v is AccountPackage =>
  v === "zzp" || v === "planner" || v === "vloot";

/** Oude links (?role=client / ?role=escort) en nieuwe (?package=...) naar één pakket. */
export function packageFromParams(params: URLSearchParams): AccountPackage | null {
  const p = params.get("package");
  if (isPackage(p)) return p;
  const r = params.get("role");
  if (r === "client") return "planner";
  if (r === "escort") return "zzp";
  return null;
}

/** Rol die bij een pakket hoort (bepaalt welk dashboard de gebruiker krijgt). */
export function roleForPackage(p: AccountPackage): "opdrachtgever" | "begeleider" {
  return p === "planner" ? "opdrachtgever" : "begeleider";
}

/** Bewaar de keuze van de Tarieven-/homepage tot de gebruiker is ingelogd. */
export function rememberPackage(p: AccountPackage) {
  try {
    localStorage.setItem(INTENT_KEY, p);
  } catch {
    /* privémodes: intent gaat gewoon verloren */
  }
}

export function pendingPackage(): AccountPackage | null {
  try {
    const v = localStorage.getItem(INTENT_KEY);
    return isPackage(v) ? v : null;
  } catch {
    return null;
  }
}

export function clearPendingPackage() {
  try {
    localStorage.removeItem(INTENT_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Zet het pakket van het ingelogde account.
 * Beveiligd: de database vult alleen auth.uid() in, dus een gebruiker kan nooit
 * het pakket van iemand anders wijzigen.
 */
export async function saveAccountPackage(p: AccountPackage, source = "signup") {
  const { error } = await supabase.rpc("set_account_package", { _package: p, _source: source });
  if (!error) clearPendingPackage();
  return error;
}

/** Eenmaal de sessie staat: maak de bewaarde pakketkeuze definitief. */
export async function flushPendingPackage() {
  const p = pendingPackage();
  if (!p) return;
  const error = await saveAccountPackage(p, "signup");
  if (error) {
    // Houd de intent vast zodat een volgende paginabezoek het opnieuw probeert.
    rememberPackage(p);
  }
}

/** Welk pakket staat er op dit account? (null als de keuze nog nooit is vastgelegd) */
export async function fetchAccountPackage(): Promise<AccountPackage | null> {
  const { data } = await supabase.from("account_packages").select("package").maybeSingle();
  const v = (data as { package?: string } | null)?.package;
  return isPackage(v) ? v : null;
}
