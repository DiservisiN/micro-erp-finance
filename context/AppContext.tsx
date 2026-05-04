"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type AppMode = "business" | "personal";

// Struktur data untuk setiap menu
type MenuItem = {
  id: string;
  name: string;
  visible: boolean;
};

// Gabungan alat yang akan disediakan oleh Context
type AppContextValue = {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
  isCompact: boolean;
  setIsCompact: (val: boolean) => void;
  menuItems: MenuItem[];
  setMenuItems: (items: MenuItem[]) => void;
  landingPage: string;
  setLandingPage: (page: string) => void;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

// Menu bawaan standar aplikasi
const defaultMenu: MenuItem[] = [
  { id: "dashboard", name: "Dashboard", visible: true },
  { id: "pos", name: "POS / Kasir", visible: true },
  { id: "inventory", name: "Inventory", visible: true },
  { id: "repairs", name: "Repairs", visible: true },
  { id: "transactions", name: "Transactions", visible: true },
  { id: "reports", name: "Reports", visible: true },
  { id: "debts", name: "Debts", visible: true },
  { id: "investments", name: "Investments", visible: true },
  { id: "settings", name: "Settings", visible: true },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AppMode>("business");
  const [isHydrated, setIsHydrated] = useState(false);
  
  // State untuk navigasi
  const [isCompact, setIsCompact] = useState(false);
  const [landingPage, setLandingPage] = useState("Dashboard");
  const [menuItems, setMenuItems] = useState<MenuItem[]>(defaultMenu);

  // Efek untuk mengganti tema (Business/Personal)
  useEffect(() => {
    document.documentElement.classList.remove("business-mode", "personal-mode");
    document.documentElement.classList.add(mode === "business" ? "business-mode" : "personal-mode");
  }, [mode]);

  // Efek untuk MEMBACA pengaturan navigasi dari memori komputer saat dimuat
 // Efek untuk MEMBACA pengaturan navigasi dari memori komputer saat dimuat
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCompact = localStorage.getItem("microerp_isCompact");
      const savedLanding = localStorage.getItem("microerp_landingPage");
      const savedMenu = localStorage.getItem("microerp_menuItems");

      if (savedCompact) setIsCompact(JSON.parse(savedCompact));
      if (savedLanding) setLandingPage(savedLanding);
      
      if (savedMenu) {
        const parsedMenu: MenuItem[] = JSON.parse(savedMenu);
        
        // LOGIKA PINTAR: Gabungkan menu lama di browser dengan menu baru di dalam kode
        const mergedMenu = defaultMenu.map(defaultItem => {
          const existingItem = parsedMenu.find(savedItem => savedItem.id === defaultItem.id);
          // Jika menu sudah pernah disimpan, pertahankan status on/off-nya. 
          // Jika ini menu baru (seperti POS), gunakan pengaturan bawaan (visible: true).
          return existingItem ? existingItem : defaultItem;
        });
        setMenuItems(mergedMenu);
      } else {
        setMenuItems(defaultMenu);
      }

      setIsHydrated(true);
    }
  }, []);

  // Efek untuk MENYIMPAN pengaturan navigasi ke memori komputer secara otomatis
  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem("microerp_isCompact", JSON.stringify(isCompact));
    localStorage.setItem("microerp_landingPage", landingPage);
    localStorage.setItem("microerp_menuItems", JSON.stringify(menuItems));
  }, [isCompact, landingPage, menuItems, isHydrated]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      toggleMode: () => setMode((current) => (current === "business" ? "personal" : "business")),
      isCompact,
      setIsCompact,
      menuItems,
      setMenuItems,
      landingPage,
      setLandingPage
    }),
    [mode, isCompact, menuItems, landingPage],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return context;
}