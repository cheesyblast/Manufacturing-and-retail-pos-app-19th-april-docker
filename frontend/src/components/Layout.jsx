import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import {
  House, ShoppingCart, Package, Factory, Truck, ChartBar,
  Gear, Users, SignOut, List, CaretLeft, Scissors
} from "@phosphor-icons/react";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: House, roles: ["admin", "production_staff", "cashier"] },
  { path: "/pos", label: "Point of Sale", icon: ShoppingCart, roles: ["admin", "cashier"] },
  { path: "/products", label: "Products", icon: Package, roles: ["admin", "cashier"] },
  { path: "/inventory", label: "Inventory", icon: Package, roles: ["admin", "production_staff"] },
  { path: "/custom-orders", label: "Custom Orders", icon: Scissors, roles: ["admin", "cashier"] },
  { path: "/purchasing", label: "Purchasing", icon: Truck, roles: ["admin"] },
  { path: "/manufacturing", label: "Manufacturing", icon: Factory, roles: ["admin", "production_staff"] },
  { path: "/accounting", label: "Accounting", icon: ChartBar, roles: ["admin"] },
  { path: "/users", label: "Users", icon: Users, roles: ["admin"] },
  { path: "/settings", label: "Settings", icon: Gear, roles: ["admin"] },
];

const DEFAULT_LOGO = "https://static.prod-images.emergentagent.com/jobs/9efb1b10-3182-4939-931e-3975c608d93e/images/fc3fe8419e8ec531202d0fb5cfb69d923536da9c0eca71d51c578fb78b1ad5ee.png";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [brandName, setBrandName] = useState("TextileERP");
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO);

  useEffect(() => {
    const loadBrand = async () => {
      try {
        const { data } = await api.get("/settings");
        if (data.business_name) setBrandName(data.business_name);
        if (data.logo_url) setLogoUrl(data.logo_url);
      } catch {}
    };
    loadBrand();
  }, []);

  const filteredNav = navItems.filter((item) => item.roles.includes(user?.role));

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const roleLabel = {
    admin: "Administrator",
    production_staff: "Production Staff",
    cashier: "Cashier",
  };

  return (
    <div className="min-h-screen bg-beige-100 flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen z-50 bg-navy-900 text-white flex flex-col transition-all duration-300 ${
          collapsed ? "w-20" : "w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        data-testid="app-sidebar"
      >
        <div className={`flex items-center gap-3 p-5 border-b border-white/10 ${collapsed ? "justify-center" : ""}`}>
          <img src={logoUrl} alt="Logo" className="w-8 h-8 flex-shrink-0 rounded-lg object-contain" />
          {!collapsed && <span className="font-heading font-medium text-lg tracking-tight">{brandName}</span>}
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                data-testid={`nav-${item.path.slice(1)}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm font-medium ${
                  active
                    ? "bg-white/15 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/8"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <Icon size={20} weight={active ? "fill" : "regular"} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={`p-4 border-t border-white/10 ${collapsed ? "px-2" : ""}`}>
          {!collapsed && (
            <div className="mb-3 px-2">
              <p className="text-white/90 text-sm font-medium truncate">{user?.name || user?.email}</p>
              <p className="text-white/50 text-xs">{roleLabel[user?.role] || user?.role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className={`flex items-center gap-2 text-white/60 hover:text-white text-sm px-3 py-2 rounded-xl hover:bg-white/8 transition-colors w-full ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <SignOut size={18} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-navy-700 border border-navy-500 rounded-full items-center justify-center text-white/80 hover:text-white"
        >
          <CaretLeft size={12} weight="bold" className={`transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-beige-100/80 backdrop-blur-xl border-b border-beige-300 px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 text-navy-700 hover:bg-beige-200 rounded-xl"
            data-testid="mobile-menu-button"
          >
            <List size={24} />
          </button>
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-beige-500">
            {filteredNav.find((n) => n.path === location.pathname)?.label || ""}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-navy-800 text-white flex items-center justify-center text-xs font-bold">
              {(user?.name || user?.email || "U")[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
