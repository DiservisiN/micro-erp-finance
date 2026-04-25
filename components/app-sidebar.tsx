"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase/client";

export const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/inventory", label: "Inventory" },
  { href: "/repairs", label: "Repairs" },
  { href: "/transactions", label: "Transactions" },
  { href: "/reports", label: "Reports" },
  { href: "/debts", label: "Debts" },
  { href: "/investments", label: "Investments" },
  { href: "/settings", label: "Settings" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = getSupabaseClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground md:flex flex-col">
      <div className="flex h-16 items-center border-b px-6 font-semibold">Finance Dashboard</div>
      <nav className="space-y-1 p-4">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-orange-500/10 text-orange-500 font-medium dark:shadow-[0_0_10px_rgba(249,115,22,0.2)]"
                  : "text-sidebar-foreground/80 hover:bg-orange-500/10 hover:text-orange-500 dark:hover:shadow-[0_0_10px_rgba(249,115,22,0.1)]",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto p-4 border-t border-sidebar-border">
        <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
