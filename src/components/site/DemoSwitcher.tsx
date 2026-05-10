import { useState } from "react";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

const DEMO_PASSWORD = "Demo1234!";

const DEMO_ACCOUNTS = [
  { email: "demo-opdracht1@demo.nl", label: "Opdrachtgever 1", sub: "Havenlogistiek RTM", group: "Opdrachtgevers" },
  { email: "demo-opdracht2@demo.nl", label: "Opdrachtgever 2", sub: "Antwerp Heavy Tr.", group: "Opdrachtgevers" },
  { email: "demo-begeleider1@demo.nl", label: "Begeleider 1", sub: "Jan · Rotterdam", group: "Begeleiders" },
  { email: "demo-begeleider2@demo.nl", label: "Begeleider 2", sub: "Pieter · Antwerpen", group: "Begeleiders" },
  { email: "demo-begeleider3@demo.nl", label: "Begeleider 3", sub: "Mark · Eindhoven", group: "Begeleiders" },
  { email: "demo-begeleider4@demo.nl", label: "Begeleider 4", sub: "Sander · Utrecht", group: "Begeleiders" },
  { email: "demo-begeleider5@demo.nl", label: "Begeleider 5", sub: "Henk · Den Haag", group: "Begeleiders" },
  { email: "demo-begeleider6@demo.nl", label: "Begeleider 6", sub: "Tom · Tilburg", group: "Begeleiders" },
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
