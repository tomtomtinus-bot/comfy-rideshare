import { useState } from "react";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

const DEMO_PASSWORD = "Demo1234!";

const DEMO_ACCOUNTS = [
  // Opdrachtgevers (3 — NL + BE)
  { email: "opdracht-rotterdam@viacust.demo", label: "Rotterdam Heavy Tr.", sub: "NL · Rotterdam", group: "Opdrachtgevers" },
  { email: "opdracht-amsterdam@viacust.demo", label: "Amsterdam Logistics", sub: "NL · Amsterdam", group: "Opdrachtgevers" },
  { email: "opdracht-antwerpen@viacust.demo", label: "Antwerp Convoy", sub: "BE · Antwerpen", group: "Opdrachtgevers" },

  // Begeleiders (10 — 6 NL + 4 BE)
  { email: "jan-rotterdam@viacust.demo", label: "Jan de Vries", sub: "NL · Rotterdam", group: "Begeleiders" },
  { email: "pieter-utrecht@viacust.demo", label: "Pieter Jansen", sub: "NL · Utrecht", group: "Begeleiders" },
  { email: "mark-eindhoven@viacust.demo", label: "Mark van Dijk", sub: "NL · Eindhoven", group: "Begeleiders" },
  { email: "sander-denhaag@viacust.demo", label: "Sander Bakker", sub: "NL · Den Haag", group: "Begeleiders" },
  { email: "henk-amsterdam@viacust.demo", label: "Henk Visser", sub: "NL · Amsterdam", group: "Begeleiders" },
  { email: "tom-tilburg@viacust.demo", label: "Tom Smit", sub: "NL · Tilburg", group: "Begeleiders" },
  { email: "luc-antwerpen@viacust.demo", label: "Luc Peeters", sub: "BE · Antwerpen", group: "Begeleiders" },
  { email: "bart-gent@viacust.demo", label: "Bart Janssens", sub: "BE · Gent", group: "Begeleiders" },
  { email: "dries-brussel@viacust.demo", label: "Dries De Smet", sub: "BE · Brussel", group: "Begeleiders" },
  { email: "kris-luik@viacust.demo", label: "Kris Maes", sub: "BE · Luik", group: "Begeleiders" },
];

export const DemoSwitcher = () => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const { t } = useTranslation();

  const switchTo = async (email: string) => {
    setBusy(email);
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
    setBusy(null);
    setOpen(false);
    if (error) return toast.error(error.message);
    toast.success(t("demo.loggedInAs", { email }));
    window.location.href = "/dashboard";
  };

  const groups = ["Opdrachtgevers", "Begeleiders"] as const;
  const groupLabel = (g: typeof groups[number]) => g === "Opdrachtgevers" ? t("demo.clients") : t("demo.escorts");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 border border-brass-gold/40 bg-brass-gold/10 text-brass-deep text-[10px] uppercase tracking-widest font-bold hover:bg-brass-gold hover:text-parchment transition-colors"
        title={t("demo.title")}
      >
        <Users className="size-3.5" />
        <span className="hidden sm:inline">{t("demo.label")}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 bg-card border border-brass-deep/15 shadow-etched z-50 max-h-[80vh] overflow-auto">
            <div className="px-4 py-3 border-b border-brass-deep/10 bg-parchment/60">
              <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold">{t("demo.mode")}</p>
              <p className="text-xs text-brass-deep/60 mt-1">{t("demo.sub")}</p>
            </div>
            {groups.map((g) => (
              <div key={g}>
                <p className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold">{groupLabel(g)}</p>
                {DEMO_ACCOUNTS.filter((a) => a.group === g).map((a) => (
                  <button
                    key={a.email}
                    onClick={() => switchTo(a.email)}
                    disabled={!!busy}
                    className="w-full text-left px-4 py-2.5 hover:bg-parchment border-t border-brass-deep/5 disabled:opacity-50"
                  >
                    <p className="text-sm font-semibold text-brass-deep">{a.label}</p>
                    <p className="text-[11px] text-brass-deep/55">{a.sub}</p>
                    {busy === a.email && <p className="text-[10px] text-brass-gold mt-1">{t("demo.signingIn")}</p>}
                  </button>
                ))}
              </div>
            ))}
            <div className="px-4 py-3 border-t border-brass-deep/10 bg-parchment/40">
              <p className="text-[10px] text-brass-deep/55">{t("demo.password")}: <code className="font-mono">{DEMO_PASSWORD}</code></p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
