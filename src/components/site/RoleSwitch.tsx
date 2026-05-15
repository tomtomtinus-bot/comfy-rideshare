import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";

export const RoleSwitch = () => {
  const { user, role, signOut } = useAuth();
  const { t } = useTranslation();
  if (!user) {
    return (
      <Link
        to="/auth"
        className="px-5 md:px-6 py-2.5 bg-brass-deep text-parchment text-xs md:text-sm uppercase tracking-widest hover:bg-brass-gold transition-colors"
      >
        {t("nav.login")}
      </Link>
    );
  }
  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
  const displayName = meta.full_name || meta.name || user.email || "";
  const profilePath = role === "begeleider" ? "/profiel" : "/facturatiegegevens";
  return (
    <div className="flex items-center gap-3">
      <Link
        to={profilePath}
        title="Profielinstellingen"
        className="hidden md:inline-block max-w-[180px] truncate text-xs uppercase tracking-widest font-semibold text-brass-deep hover:text-brass-gold"
      >
        {displayName}
      </Link>
      <button
        onClick={signOut}
        className="px-4 py-2 border border-brass-deep/20 text-brass-deep text-xs uppercase tracking-widest hover:bg-brass-deep hover:text-parchment transition-colors"
      >
        {t("nav.logout")}
      </button>
    </div>
  );
};
