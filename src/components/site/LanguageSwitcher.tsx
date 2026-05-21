import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const LANGS: { code: "nl" | "en" | "de" | "fr"; label: string; flag: string }[] = [
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
];

export const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const { user } = useAuth();
  const current = LANGS.find((l) => i18n.resolvedLanguage?.startsWith(l.code)) ?? LANGS[0];

  const changeLang = async (code: "nl" | "en" | "de" | "fr") => {
    await i18n.changeLanguage(code);
    try {
      localStorage.setItem("viacust_lang", code);
    } catch {
      // ignore
    }
    if (user) {
      // Persist user-level preference so Walloon planners keep French everywhere.
      await supabase.from("profiles").update({ preferred_language: code }).eq("id", user.id);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("nav.language")}
        className="flex items-center gap-1.5 px-2.5 py-2 border border-brass-deep/20 text-brass-deep hover:bg-brass-deep hover:text-parchment transition-colors text-xs uppercase tracking-widest font-semibold"
      >
        <Globe className="size-4" />
        <span>{current.code.toUpperCase()}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => changeLang(l.code)}
            className={l.code === current.code ? "font-semibold" : ""}
          >
            <span className="mr-2">{l.flag}</span>
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
