import { AppSidebar } from "@/components/app-sidebar";
import { TopHeader } from "@/components/top-header";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopHeader />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
