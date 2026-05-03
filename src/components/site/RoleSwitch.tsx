import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const RoleSwitch = () => {
  const { user, role, signOut } = useAuth();
  if (!user) {
    return (
      <Link
        to="/auth"
        className="px-5 md:px-6 py-2.5 bg-brass-deep text-parchment text-xs md:text-sm uppercase tracking-widest hover:bg-brass-gold transition-colors"
      >
        Inloggen
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <Link
        to="/dashboard"
        className="hidden md:inline text-xs uppercase tracking-widest font-semibold text-brass-deep hover:text-brass-gold"
      >
        {role === "begeleider" ? "Mijn opdrachten" : "Mijn ritten"}
      </Link>
      <button
        onClick={signOut}
        className="px-4 py-2 border border-brass-deep/20 text-brass-deep text-xs uppercase tracking-widest hover:bg-brass-deep hover:text-parchment transition-colors"
      >
        Uitloggen
      </button>
    </div>
  );
};
