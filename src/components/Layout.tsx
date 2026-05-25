import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  ShoppingCart,
  Coffee,
  Grid3X3,
  Package,
  Truck,
  Users,
  Gift,
  Receipt,
  Clock,
  BarChart3,
  Shield,
  Settings,
  UserCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Menu,
  X,
  UtensilsCrossed,
  Store,
  ClipboardCheck,
  PackageCheck,
  Stars,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/providers/trpc";

const menuItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["owner", "admin", "cashier"] },
  { path: "/pos", label: "POS Kasir", icon: ShoppingCart, roles: ["owner", "admin", "cashier"] },
  { path: "/kitchen", label: "Kitchen Display", icon: UtensilsCrossed, roles: ["owner", "admin", "cashier"] },
  { path: "/products", label: "Produk", icon: Coffee, roles: ["owner", "admin"] },
  { path: "/categories", label: "Kategori", icon: Grid3X3, roles: ["owner", "admin"] },
  { path: "/inventory", label: "Inventory", icon: Package, roles: ["owner", "admin"] },
  { path: "/suppliers", label: "Supplier", icon: Truck, roles: ["owner", "admin"] },
  { path: "/customers", label: "Customer", icon: Users, roles: ["owner", "admin"] },
  { path: "/membership", label: "Membership", icon: Stars, roles: ["owner", "admin"] },
  { path: "/promos", label: "Promo", icon: Gift, roles: ["owner", "admin"] },
  { path: "/purchase-orders", label: "Purchase Order", icon: ClipboardCheck, roles: ["owner", "admin"] },
  { path: "/receiving", label: "Receiving", icon: PackageCheck, roles: ["owner", "admin"] },
  { path: "/transactions", label: "Transaksi", icon: Receipt, roles: ["owner", "admin", "cashier"] },
  { path: "/shifts", label: "Shift Kasir", icon: Clock, roles: ["owner", "admin", "cashier"] },
  { path: "/reports", label: "Laporan", icon: BarChart3, roles: ["owner", "admin"] },
  { path: "/audit", label: "Audit Log", icon: Shield, roles: ["owner"] },
  { path: "/users", label: "User Management", icon: Users, roles: ["owner"] },
  { path: "/notifications", label: "Notification Center", icon: Bell, roles: ["owner", "admin", "cashier"] },
  { path: "/settings", label: "Pengaturan", icon: Settings, roles: ["owner"] },
  { path: "/profile", label: "Profil", icon: UserCircle, roles: ["owner", "admin", "cashier"] },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const location = useLocation();
  const { user, logout, isLoggingOut } = useAuth();
  const heartbeat = trpc.device.heartbeat.useMutation();
  const heartbeatUserId = useRef<number | null>(null);
  const userRole = user?.role || "cashier";

  const filteredMenu = menuItems.filter((item) => item.roles.includes(userRole));

  useEffect(() => {
    if (!user) return;
    if (heartbeatUserId.current === user.id) return;
    heartbeatUserId.current = user.id;
    heartbeat.mutate();
  }, [heartbeat, user]);

  return (
    <div className="app-shell flex h-screen overflow-hidden md:h-screen">
      <TooltipProvider delayDuration={0}>
        {mobileOpen && (
          <button
            aria-label="Tutup sidebar"
            className="fixed inset-0 z-30 bg-black/35 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex h-full flex-col bg-[#1A1A1C] border-r border-white/[0.07] transition-all duration-300 ease-in-out md:relative md:translate-x-0 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          } w-[calc(100vw-2rem)] max-w-[280px] ${
            collapsed ? "md:w-[68px]" : "md:w-[240px]"
          }`}
        >
          {/* Brand */}
          <div className="flex items-center gap-3 px-4 h-[68px] border-b border-white/[0.07]">
            <img src="/logo.png" alt="FOMO" className="w-8 h-8 flex-shrink-0" />
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-[0.08em] uppercase text-[#D4A853]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  FOMO COFFEE
                </span>
                <span className="text-[10px] text-white/45 tracking-widest uppercase">POS System</span>
              </div>
            )}
            <button
              aria-label="Tutup menu"
              onClick={() => setMobileOpen(false)}
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-white/70 md:hidden"
            >
              <X size={16} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-2">
            {filteredMenu.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all duration-200 group ${
                        isActive
                          ? "bg-[#D4A853] text-black font-semibold"
                          : "text-white/60 hover:text-white hover:bg-white/[0.06]"
                      }`}
                    >
                      <Icon size={20} className="flex-shrink-0" />
                      {!collapsed && <span className="text-[13px] font-medium">{item.label}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right" className="bg-[#252527] text-white border-white/[0.07]">
                      {item.label}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-2 border-t border-white/[0.07]">
            <div className={`flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.03] ${collapsed ? "justify-center" : ""}`}>
              <div className="w-8 h-8 rounded-full bg-[#D4A853] flex items-center justify-center text-black font-bold text-xs flex-shrink-0">
                {(user?.name || "U").charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{user?.name || "User"}</p>
                  <p className="text-[10px] text-white/45 capitalize">{userRole}</p>
                </div>
              )}
              <button
                onClick={() => setLogoutConfirmOpen(true)}
                disabled={isLoggingOut}
                className="text-white/45 hover:text-red-400 transition-colors flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>

          {/* Collapse Button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-[82px] w-6 h-6 rounded-full bg-[#252527] border border-white/[0.07] flex items-center justify-center text-white/60 hover:text-white transition-colors z-10"
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Top Bar */}
          <header className="h-[68px] flex items-center justify-between gap-3 px-4 sm:px-6 border-b border-white/[0.07] bg-[#141415] flex-shrink-0">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <button
                aria-label="Buka menu"
                onClick={() => setMobileOpen(true)}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-white/60 md:hidden"
              >
                <Menu size={18} />
              </button>
              <h1 className="truncate text-lg font-semibold text-white/90" style={{ fontFamily: 'Playfair Display, serif' }}>
                {menuItems.find((m) => m.path === location.pathname)?.label || "Dashboard"}
              </h1>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
              <Link
                to="/notifications"
                className="relative w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
              >
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#D4A853] rounded-full" />
              </Link>
              <Link
                to="/pos"
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl btn-primary-gold text-sm font-semibold"
              >
                <Store size={16} />
                <span className="hidden sm:inline">Buka POS</span>
              </Link>
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6">
            {children}
          </div>
        </main>
        <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
          <AlertDialogContent className="border-white/[0.08] bg-[#1E1E20] text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Logout?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/55">
                Apakah Anda yakin ingin logout dari FOMO Coffee?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-white/[0.08] text-white/70 hover:bg-white/[0.06]">
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={logout}
                disabled={isLoggingOut}
                className="btn-primary-gold"
              >
                {isLoggingOut ? "Logout..." : "Ya, Logout"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TooltipProvider>
    </div>
  );
}
