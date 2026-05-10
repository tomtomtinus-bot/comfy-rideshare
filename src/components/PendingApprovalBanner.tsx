import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { AlertCircle, Clock } from "lucide-react";

export const PendingApprovalBanner = () => {
  const { user, approvalStatus, isAdmin } = useAuth();
  const { t } = useTranslation();
  if (!user || isAdmin) return null;
  if (approvalStatus === "approved") return null;

  if (approvalStatus === "rejected") {
    return (
      <div className="bg-red-50 border-b border-red-700/30">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-3 flex items-start gap-3 text-sm text-red-800">
          <AlertCircle className="size-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{t("approval.rejected")}</p>
            <p className="text-red-800/80">{t("approval.rejectedBody")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brass-gold/15 border-b border-brass-gold/40">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-3 flex items-start gap-3 text-sm text-brass-deep">
        <Clock className="size-5 shrink-0 mt-0.5 text-brass-gold" />
        <div>
          <p className="font-semibold">{t("approval.pending")}</p>
          <p className="text-brass-deep/75">{t("approval.pendingBody")}</p>
        </div>
      </div>
    </div>
  );
};
