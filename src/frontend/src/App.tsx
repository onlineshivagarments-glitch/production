import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import { AdditionalWorkTab } from "./components/AdditionalWorkTab";
import { AppHeader } from "./components/AppHeader";
import { BackupRestoreTab } from "./components/BackupRestoreTab";
import { BottomNav } from "./components/BottomNav";
import { DispatchTab } from "./components/DispatchTab";
import { FabricPlannerTab } from "./components/FabricPlannerTab";
import { FinishedStockTab } from "./components/FinishedStockTab";
import { HistoryTab } from "./components/HistoryTab";
import { ItemMasterTab } from "./components/ItemMasterTab";
import { LoginScreen } from "./components/LoginScreen";
import { MasterReportTab } from "./components/MasterReportTab";
import { PaymentTab } from "./components/PaymentTab";
import { QuoteBuilderTab } from "./components/QuoteBuilderTab";
import { SplashScreen } from "./components/SplashScreen";
import { TailorTab } from "./components/TailorTab";
import { useAuth } from "./hooks/useAuth";

export type TabId =
  | "history"
  | "master_report"
  | "item_master"
  | "payment"
  | "tailor"
  | "add_work"
  | "dispatch"
  | "finished_stock"
  | "fabric_planner"
  | "quote_builder"
  | "backup_restore";

const CURRENT_YEAR = new Date().getFullYear();
const HOST = typeof window !== "undefined" ? window.location.hostname : "";
const FOOTER_HREF = `https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(HOST)}`;

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("item_master");
  const { isAuthenticated, loading, login, logout } = useAuth();

  if (showSplash) {
    return (
      <>
        <SplashScreen onDone={() => setShowSplash(false)} />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-3"
        style={{ background: "oklch(var(--background))" }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "oklch(var(--primary))" }}
        />
        <p
          className="text-sm"
          style={{ color: "oklch(var(--muted-foreground))" }}
        >
          Initializing...
        </p>
        <Toaster position="top-center" richColors />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen onLogin={login} />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  return (
    <div className="app-shell">
      <AppHeader activeTab={activeTab} onLogout={logout} />

      <main className="tab-content-area">
        {activeTab === "history" && <HistoryTab />}
        {activeTab === "master_report" && <MasterReportTab />}
        {activeTab === "item_master" && <ItemMasterTab />}
        {activeTab === "payment" && <PaymentTab />}
        {activeTab === "tailor" && <TailorTab />}
        {activeTab === "add_work" && <AdditionalWorkTab />}
        {activeTab === "dispatch" && <DispatchTab />}
        {activeTab === "finished_stock" && <FinishedStockTab />}
        {activeTab === "fabric_planner" && <FabricPlannerTab />}
        {activeTab === "quote_builder" && <QuoteBuilderTab />}
        {activeTab === "backup_restore" && <BackupRestoreTab />}

        <footer className="px-4 py-4 text-center">
          <a
            href={FOOTER_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            © {CURRENT_YEAR}. Built with ♥ using{" "}
            <span style={{ color: "oklch(var(--primary))" }}>caffeine.ai</span>
          </a>
        </footer>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      <Toaster position="top-center" richColors />
    </div>
  );
}
