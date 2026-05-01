"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase/client";

// PERHATIAN: Pastikan jalur impor ini sesuai dengan nama file Sidebar-mu yang asli.
// Jika nama file-nya "sidebar.tsx" (huruf kecil), ubah menjadi "./sidebar"
import { AppSidebar, navLinks } from "./app-sidebar"; 

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Menutup menu HP secara otomatis setiap kali kita berpindah halaman
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    // Membungkus seluruh layar dan memastikannya tidak meluber (overflow-hidden)
    <div className="flex h-screen w-full bg-[#020617] text-slate-50 overflow-hidden">
      
      {/* 1. SIDEBAR DESKTOP */}
      {/* Akan disembunyikan di HP, dan dirender secara konsisten di layar md ke atas */}
      <div className="hidden md:flex">
        <AppSidebar />
      </div>

      {/* 2. SIDEBAR HP (MOBILE DRAWER) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Latar Belakang Gelap (Overlay) */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Panel Menu yang melayang dari kiri */}
          <div className="relative flex w-64 max-w-[80%] flex-col bg-slate-900 border-r border-slate-800 shadow-2xl animate-in slide-in-from-left h-full">
            <div className="flex h-16 items-center justify-between border-b border-slate-800 px-6">
              <span className="font-bold text-white">Menu Navigation</span>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsMobileMenuOpen(false)} 
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "block rounded-md px-3 py-3 text-sm transition-colors font-medium",
                      isActive
                        ? "bg-orange-500/10 text-orange-500"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Tombol Logout Khusus Layar HP */}
            <div className="p-4 border-t border-slate-800">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-red-400 hover:bg-red-500/10 hover:text-red-500" 
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. AREA KONTEN UTAMA */}
      {/* min-w-0 adalah kunci rahasia agar tabel yang panjang tidak memecahkan / mendesak tata letak */}
      <div className="flex flex-1 flex-col min-w-0">
        
        {/* HEADER KHUSUS HP (Tombol Hamburger) */}
        <header className="flex md:hidden h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm px-4">
          <span className="font-bold text-white">Finance Dashboard</span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsMobileMenuOpen(true)} 
            className="text-slate-400 hover:text-white"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </header>

        {/* AREA TAMPILAN HALAMAN (Page Render) */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}