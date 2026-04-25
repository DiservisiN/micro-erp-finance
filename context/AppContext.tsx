"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type AppMode = "business" | "personal";

type AppContextValue = {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AppMode>("business");

  useEffect(() => {
    document.documentElement.classList.remove("business-mode", "personal-mode");
    document.documentElement.classList.add(mode === "business" ? "business-mode" : "personal-mode");
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      toggleMode: () => setMode((current) => (current === "business" ? "personal" : "business")),
    }),
    [mode],
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
