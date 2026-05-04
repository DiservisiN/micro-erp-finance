"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase/client";

import { AppSidebar, navLinks } from "./app-sidebar"; 
import { useAppContext } from "@/context/AppContext"; // <-- DITAMBAHKAN

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  
  // Mengambil state mode dari Context
  const { mode, setMode } = useAppContext();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-50 overflow-hidden transition-colors duration-300">
      
      <div className="hidden md:flex">
        <AppSidebar />
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm transition-all"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <div className="relative flex w-64 max-w-[80%] flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl animate-in slide-in-from-left h-full transition-colors duration-300">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6">
              <span className="font-bold text-slate-900 dark:text-white">Menu Navigation</span>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsMobileMenuOpen(false)} 
                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* DOKUMENTASI: Tombol Toggle Business/Personal untuk Layar HP */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800/50 p-1">
                <button
                  onClick={() => { setMode("business"); setIsMobileMenuOpen(false); }}
                  className={cn("flex-1 py-2 text-sm font-medium rounded-md transition-all", mode === "business" ? "bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm" : "text-slate-500")}
                >
                  Business
                </button>
                <button
                  onClick={() => { setMode("personal"); setIsMobileMenuOpen(false); }}
                  className={cn("flex-1 py-2 text-sm font-medium rounded-md transition-all", mode === "personal" ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500")}
                >
                  Personal
                </button>
              </div>
            </div>

            <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
              {navLinks
                // LOGIKA PINTAR: Menyaring menu Investments dari HP
                .filter((link) => !(mode === "business" && link.id === "investments"))
                .map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "block rounded-md px-3 py-3 text-sm transition-colors font-medium",
                      isActive
                        ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-500"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-500 transition-colors" 
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex md:hidden h-16 shrink-0 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm px-4 transition-colors duration-300">
          <span className="font-bold text-slate-900 dark:text-white">Finance Dashboard</span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsMobileMenuOpen(true)} 
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}