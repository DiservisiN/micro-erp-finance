"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut, LayoutDashboard, Package, Wrench, ArrowRightLeft, FileText, CreditCard, TrendingUp, Settings, Menu, Store, Briefcase, User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAppContext } from "@/context/AppContext";

export const navLinks = [
  { id: "dashboard", href: "/", label: "Dashboard", icon: LayoutDashboard },
  { id: "pos", href: "/pos", label: "POS / Kasir", icon: Store },
  { id: "inventory", href: "/inventory", label: "Inventory", icon: Package },
  { id: "repairs", href: "/repairs", label: "Repairs", icon: Wrench },
  { id: "transactions", href: "/transactions", label: "Transactions", icon: ArrowRightLeft },
  { id: "reports", href: "/reports", label: "Reports", icon: FileText },
  { id: "debts", href: "/debts", label: "Debts", icon: CreditCard },
  { id: "investments", href: "/investments", label: "Investments", icon: TrendingUp },
  { id: "settings", href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = getSupabaseClient();
  
  const { isCompact, menuItems, setIsCompact, mode, setMode } = useAppContext();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  // LOGIKA PINTAR: Menyaring menu yang tampil
  const visibleLinks = navLinks.filter((link) => {
    // 1. Sembunyikan menu Investments jika sedang di mode Business
    if (mode === "business" && link.id === "investments") return false;
    
    // 2. Cek pengaturan visibilitas dari halaman Settings
    const menuItem = menuItems.find((m) => m.id === link.id);
    return menuItem ? menuItem.visible : true;
  });

  return (
    <aside
      className={cn(
        "hidden shrink-0 border-r bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 md:flex flex-col transition-all duration-300",
        isCompact ? "w-20" : "w-64"
      )}
    >
      <div className={cn("flex h-16 items-center border-b border-slate-200 dark:border-slate-800 px-6 font-bold text-orange-600 dark:text-orange-500", isCompact ? "justify-center px-0" : "")}>
        {isCompact ? "ERP" : "Finance Dashboard"}
      </div>

      <div className={cn("p-4 border-b border-slate-200 dark:border-slate-800", isCompact ? "px-2" : "")}>
        <div className={cn("flex items-center rounded-lg bg-slate-100 dark:bg-slate-800/50 p-1", isCompact ? "flex-col gap-1" : "")}>
          <button
            onClick={() => setMode("business")}
            title="Business Mode"
            className={cn(
              "flex-1 flex items-center justify-center rounded-md text-xs font-medium transition-all duration-300",
              isCompact ? "h-10 w-full" : "py-2 px-3",
              mode === "business"
                ? "bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm"
                : "text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
            )}
          >
            {isCompact ? <Briefcase className="h-4 w-4" /> : "Business"}
          </button>
          <button
            onClick={() => setMode("personal")}
            title="Personal Mode"
            className={cn(
              "flex-1 flex items-center justify-center rounded-md text-xs font-medium transition-all duration-300",
              isCompact ? "h-10 w-full" : "py-2 px-3",
              mode === "personal"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
            )}
          >
            {isCompact ? <User className="h-4 w-4" /> : "Personal"}
          </button>
        </div>
      </div>

      <nav className="space-y-1.5 p-4 flex-1 overflow-y-auto custom-scrollbar">
        {visibleLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              title={isCompact ? link.label : undefined}
              className={cn(
                "flex items-center rounded-md px-3 py-2.5 text-sm transition-all duration-200",
                isActive
                  ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-500 font-medium dark:shadow-[0_0_10px_rgba(249,115,22,0.2)]"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white dark:hover:shadow-[0_0_10px_rgba(249,115,22,0.1)]",
                isCompact ? "justify-center px-0" : ""
              )}
            >
              <Icon className={cn("h-5 w-5", isCompact ? "" : "mr-3")} />
              {!isCompact && <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
        <Button
          variant="ghost"
          className={cn("w-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white", isCompact ? "justify-center px-0" : "justify-start")}
          onClick={() => setIsCompact(!isCompact)}
          title={isCompact ? "Expand Menu" : "Collapse Menu"}
        >
          <Menu className={cn("h-4 w-4", isCompact ? "" : "mr-2")} />
          {!isCompact && <span>Collapse</span>}
        </Button>

        <Button
          variant="ghost"
          className={cn("w-full text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-500", isCompact ? "justify-center px-0" : "justify-start")}
          onClick={handleSignOut}
          title={isCompact ? "Sign Out" : undefined}
        >
          <LogOut className={cn("h-4 w-4", isCompact ? "" : "mr-2")} />
          {!isCompact && <span>Sign Out</span>}
        </Button>
      </div>
    </aside>
  );
}