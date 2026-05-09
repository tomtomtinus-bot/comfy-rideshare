import { supabase } from "@/integrations/supabase/client";

// Sommige adblockers (uBlock, AdGuard, Brave Shields) blokkeren navigatie naar
// *.supabase.co met ERR_BLOCKED_BY_CLIENT. Door de PDF eerst te fetchen en als
// blob te openen, omzeilen we dat — de browser navigeert dan naar een blob: URL.
export async function openPermitPdf(path: string | null): Promise<void> {
  if (!path) return;
  const { data, error } = await supabase.storage.from("permits").createSignedUrl(path, 600);
  if (error || !data?.signedUrl) throw error ?? new Error("Geen download-URL");

  try {
    const res = await fetch(data.signedUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const pdfBlob = blob.type === "application/pdf"
      ? blob
      : new Blob([blob], { type: "application/pdf" });
    const url = URL.createObjectURL(pdfBlob);
    const win = window.open(url, "_blank");
    if (!win) {
      // popup geblokkeerd → val terug op directe download
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch {
    // Laatste redmiddel: probeer toch de signed URL (kan door adblocker geblokt worden)
    window.open(data.signedUrl, "_blank");
  }
}
