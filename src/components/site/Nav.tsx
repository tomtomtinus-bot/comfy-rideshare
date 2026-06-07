import { Menu, LogOut, User as UserIcon } from "lucide-react";
import logo from "@/assets/viacust-logo-full.png";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RoleSwitch } from "@/components/site/RoleSwitch";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { NotificationBell } from "@/components/site/NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const Nav = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, role, isAdmin, signOut } = useAuth();
  const { isPlanner, isDriver, isBusinessEscort } = useCompany();
  const { t } = useTranslation();
  const { pathname } = useLocation();

  const showFinance = !!user && !isDriver;
  const showPlannerOnly = !!user && role === "begeleider" && !isDriver;
  const showTeam = showPlannerOnly && (isBusinessEscort || isPlanner);

  // Primary nav: keep slim and Title Case
  const primary: { to: string; label: string; show: boolean }[] = [
    { to: "/dashboard", label: "Dashboard", show: !!user },
    { to: "/aanvragen", label: "Rit aanvragen", show: !!user && role !== "begeleider" },
    { to: "/facturen", label: "Facturen", show: showFinance },
  ];

  const myViacust: { to: string; label: string; show: boolean }[] = [
    { to: "/geschiedenis", label: "Geschiedenis", show: !!user },
    { to: "/brandstofprijzen", label: "Brandstofprijzen", show: !!user && ((role === "begeleider" && !isDriver) || role === "opdrachtgever") },
    { to: "/uitgesloten-begeleiders", label: "Mijn begeleiders-pool", show: !!user && role === "opdrachtgever" },
    { to: "/voorkeursopdrachtgevers", label: "Voorkeursopdrachtgevers", show: showPlannerOnly },
    { to: "/team", label: "Mijn team", show: showTeam },
  ];

  const settings: { to: string; label: string; show: boolean }[] = [
    { to: "/profiel", label: "Profielinstellingen", show: !!user && role === "begeleider" },
    { to: "/facturatiegegevens", label: "Facturatiegegevens", show: showFinance },
    { to: "/abonnement", label: "Abonnement", show: showFinance && (role === "begeleider" || role === "opdrachtgever") },
    { to: "/beveiliging", label: "Beveiliging", show: !!user },
  ];

  const info: { to: string; label: string }[] = [
    { to: "/hoe-werkt-viacust", label: "Hoe werkt ViaCust" },
    { to: "/wat-kost-viacust", label: "Wat kost ViaCust" },
    { to: "/faq", label: "FAQ" },
  ];

  const displayName =
    (user?.user_metadata as { full_name?: string; name?: string } | null)?.full_name ||
    (user?.user_metadata as { full_name?: string; name?: string } | null)?.name ||
    user?.email ||
    "";

  const initials = displayName
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "U";

  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");

  const visiblePrimary = primary.filter((l) => l.show);
  const visibleMy = myViacust.filter((l) => l.show);
  const visibleSettings = settings.filter((l) => l.show);

  return (
    <nav className="sticky top-0 z-50 bg-background/85 backdrop-blur-md border-b border-border pt-[env(safe-area-inset-top)]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to={user ? "/dashboard" : "/"} className="flex items-center shrink-0 mr-6">
          <img
            src={logo}
            alt="ViaCust - Digital Escort Solutions logo"
            width={1658}
            height={624}
            fetchPriority="high"
            className="h-[64px] w-auto object-contain"
          />
        </Link>

        {/* Center: primary nav (desktop) */}
        <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {visiblePrimary.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                isActive(l.to)
                  ? "text-foreground bg-muted"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          
          {user && <NotificationBell />}
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 px-2 h-9">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
                    {initials}
                  </span>
                  <span className="hidden lg:inline text-sm font-medium max-w-[160px] truncate">
                    {displayName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium truncate">{displayName}</p>
                  {user.email && displayName !== user.email && (
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  )}
                </div>
                <DropdownMenuSeparator />

                {visibleMy.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                      Mijn ViaCust
                    </DropdownMenuLabel>
                    {visibleMy.map((l) => (
                      <DropdownMenuItem key={l.to} asChild>
                        <Link to={l.to}>{l.label}</Link>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}

                {visibleSettings.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                      Instellingen
                    </DropdownMenuLabel>
                    {visibleSettings.map((l) => (
                      <DropdownMenuItem key={l.to} asChild>
                        <Link to={l.to}>{l.label}</Link>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Informatie
                </DropdownMenuLabel>
                {info.map((l) => (
                  <DropdownMenuItem key={l.to} asChild>
                    <Link to={l.to}>{l.label}</Link>
                  </DropdownMenuItem>
                ))}

                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                      Beheer
                    </DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link to="/admin">Admin Dashboard</Link>
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => signOut()}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Uitloggen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" variant="default" className="h-9">
              <Link to="/auth">
                <UserIcon className="h-4 w-4 mr-1.5" />
                Inloggen
              </Link>
            </Button>
          )}

          {/* Mobile menu trigger */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={t("nav.openMenu", { defaultValue: "Menu" })}
            className="md:hidden h-9 w-9"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile drawer: primary links only (secondary lives in profile dropdown) */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="px-4 py-3 flex flex-col gap-1">
            {visiblePrimary.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-md",
                  isActive(l.to)
                    ? "text-foreground bg-muted"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-2 mt-2 border-t border-border">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
