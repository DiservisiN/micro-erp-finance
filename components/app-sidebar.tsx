"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  LayoutDashboard,
  Package,
  Wrench,
  ArrowRightLeft,
  FileText,
  CreditCard,
  TrendingUp,
  Settings,
  Menu,
  Store // <-- Tambahkan kata ini di sini!
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAppContext } from "@/context/AppContext";

// Menambahkan ID dan Ikon pada daftar tautan navigasi
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
  
  // Mengambil pengaturan dari Context
  const { isCompact, menuItems, setIsCompact } = useAppContext();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  // Menyaring menu agar hanya menampilkan yang 'visible: true' di halaman Settings
  const visibleLinks = navLinks.filter((link) => {
    const menuItem = menuItems.find((m) => m.id === link.id);
    return menuItem ? menuItem.visible : true;
  });

  return (
    <aside
      className={cn(
        "hidden shrink-0 border-r bg-sidebar text-sidebar-foreground md:flex flex-col transition-all duration-300",
        isCompact ? "w-20" : "w-64" // Lebar akan mengecil jika isCompact aktif
      )}
    >
      <div className={cn("flex h-16 items-center border-b px-6 font-bold text-orange-500", isCompact ? "justify-center px-0" : "")}>
        {isCompact ? "ERP" : "Finance Dashboard"}
      </div>

      <nav className="space-y-2 p-4 flex-1 overflow-y-auto">
        {visibleLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              title={isCompact ? link.label : undefined} // Menampilkan nama saat disentuh (hover) di mode compact
              className={cn(
                "flex items-center rounded-md px-3 py-2.5 text-sm transition-all duration-200",
                isActive
                  ? "bg-orange-500/10 text-orange-500 font-medium dark:shadow-[0_0_10px_rgba(249,115,22,0.2)]"
                  : "text-sidebar-foreground/80 hover:bg-orange-500/10 hover:text-orange-500 dark:hover:shadow-[0_0_10px_rgba(249,115,22,0.1)]",
                isCompact ? "justify-center px-0" : ""
              )}
            >
              <Icon className={cn("h-5 w-5", isCompact ? "" : "mr-3")} />
              {!isCompact && <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-3">
        {/* Tombol pintasan untuk mengecilkan/membesarkan menu langsung dari Sidebar */}
        <Button
          variant="ghost"
          className={cn("w-full text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground", isCompact ? "justify-center px-0" : "justify-start")}
          onClick={() => setIsCompact(!isCompact)}
          title={isCompact ? "Expand Menu" : "Collapse Menu"}
        >
          <Menu className={cn("h-4 w-4", isCompact ? "" : "mr-2")} />
          {!isCompact && <span>Collapse</span>}
        </Button>

        <Button
          variant="ghost"
          className={cn("w-full text-red-400 hover:bg-red-500/10 hover:text-red-500", isCompact ? "justify-center px-0" : "justify-start")}
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