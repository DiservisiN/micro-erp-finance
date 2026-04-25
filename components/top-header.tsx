"use client";

import { useAppContext } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { navLinks } from "@/components/app-sidebar";
import { usePathname } from "next/navigation";

export function TopHeader() {
  const { mode, setMode } = useAppContext();
  const isBusiness = mode === "business";
  const pathname = usePathname();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col bg-background/80 backdrop-blur-md dark:bg-slate-950/80 w-64 p-0">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
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
                        : "text-foreground/80 hover:bg-orange-500/10 hover:text-orange-500 dark:hover:shadow-[0_0_10px_rgba(249,115,22,0.1)]"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
        <h1 className="text-lg font-semibold hidden md:block">Overview</h1>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-lg border bg-muted/20 p-1">
          <button
            onClick={() => setMode("business")}
            className={cn(
              "rounded-md px-3 py-1.5 md:px-6 md:py-2 text-xs md:text-sm font-medium transition-all duration-300",
              isBusiness
                ? "bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.5)] hover:bg-orange-600"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            Business
          </button>
          <button
            onClick={() => setMode("personal")}
            className={cn(
              "rounded-md px-3 py-1.5 md:px-6 md:py-2 text-xs md:text-sm font-medium transition-all duration-300",
              !isBusiness
                ? "bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.5)] hover:bg-orange-600"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            Personal
          </button>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
