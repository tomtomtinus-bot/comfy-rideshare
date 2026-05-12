import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Users, Truck, Receipt, ShieldCheck, Fuel, ArrowLeft, ShieldOff } from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { RequireAdmin } from "@/components/site/RequireAdmin";
import { Link } from "react-router-dom";

const items = [
  { to: "/admin/users", label: "Gebruikers", icon: Users },
  { to: "/admin/rides", label: "Ritten", icon: Truck },
  { to: "/admin/invoices", label: "Facturen", icon: Receipt },
  { to: "/admin/escorts", label: "Begeleiders", icon: ShieldCheck },
  { to: "/admin/excluded", label: "Uitsluitingen", icon: ShieldOff },
  { to: "/admin/fuel", label: "Brandstof", icon: Fuel },
];

const AdminLayoutInner = () => {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Nav />
      <div className="flex-1 bg-gradient-hero">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-10 md:py-14">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">
                Beheer
              </p>
              <h1 className="font-display text-4xl md:text-5xl text-brass-deep italic">
                Admin
              </h1>
            </div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-brass-deep hover:text-brass-gold"
            >
              <ArrowLeft className="size-4" /> Terug naar dashboard
            </Link>
          </header>

          <div className="grid grid-cols-12 gap-6 md:gap-8">
            <aside className="col-span-12 md:col-span-3">
              <nav className="bg-card shadow-etched">
                <ul>
                  {items.map((it) => {
                    const active = pathname === it.to || pathname.startsWith(it.to + "/");
                    return (
                      <li key={it.to}>
                        <NavLink
                          to={it.to}
                          className={`flex items-center gap-3 px-5 py-4 text-sm uppercase tracking-widest font-semibold border-l-2 transition-colors ${
                            active
                              ? "border-brass-gold text-brass-deep bg-parchment"
                              : "border-transparent text-brass-deep/60 hover:text-brass-deep hover:bg-parchment/50"
                          }`}
                        >
                          <it.icon className="size-4" />
                          {it.label}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </aside>
            <section className="col-span-12 md:col-span-9 min-w-0">
              <div className="bg-card shadow-etched p-6 md:p-8">
                <Outlet />
              </div>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

const AdminLayout = () => (
  <RequireAdmin>
    <AdminLayoutInner />
  </RequireAdmin>
);

export default AdminLayout;
