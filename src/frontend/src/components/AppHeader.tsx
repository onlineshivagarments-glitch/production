import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Factory,
  Loader2,
  LogOut,
  Settings,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { TabId } from "../App";
import { useActor } from "../hooks/useActor";
import { SyncStatusIndicator } from "./SyncStatusIndicator";

const TAB_TITLES: Record<TabId, string> = {
  history: "Production History",
  master_report: "Party Head",
  item_master: "Item Master",
  dispatch: "Dispatch",
  payment: "Payment Summary",
  tailor: "Tailor Records",
  add_work: "Additional Work",
  finished_stock: "Finished Stock",
  fabric_planner: "Fabric Planner",
  quote_builder: "Quote Builder",
  backup_restore: "Backup & Restore",
};

interface AppHeaderProps {
  activeTab: TabId;
  onLogout?: () => void;
}

export function AppHeader({ activeTab, onLogout }: AppHeaderProps) {
  const [open, setOpen] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);
  const { actor } = useActor();

  const handleEraseAll = async () => {
    if (!actor) return;
    setErasing(true);
    try {
      const [items, tailorRecords, dispatchRecords, workRecords] =
        await Promise.all([
          actor.getItemMasters(),
          actor.getTailorRecords(),
          actor.getDispatchRecords(),
          actor.getAdditionalWorkRecords(),
        ]);

      await Promise.all([
        ...items.map((r) => actor.deleteItemMaster(r.id)),
        ...tailorRecords.map((r) => actor.deleteTailorRecord(r.id)),
        ...dispatchRecords.map((r) => actor.deleteDispatchRecord(r.id)),
        ...workRecords.map((r) => actor.deleteAdditionalWorkRecord(r.id)),
      ]);

      const keysToRemove = Object.keys(localStorage).filter(
        (k) => k.startsWith("articleRates_") || k.startsWith("fabricUnit_"),
      );
      for (const k of keysToRemove) localStorage.removeItem(k);

      toast.success("All data has been erased");
    } catch {
      toast.error("Failed to erase data");
    } finally {
      setErasing(false);
      setConfirmErase(false);
      setOpen(false);
    }
  };

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) setConfirmErase(false);
  };

  return (
    <header
      className="fixed top-0 left-1/2 -translate-x-1/2 z-40 w-full"
      style={{ maxWidth: "var(--app-max-width)" }}
    >
      <div
        className="flex items-center gap-2 px-4 h-[60px]"
        style={{
          background: "oklch(var(--primary))",
          boxShadow: "0 2px 8px oklch(0.28 0.07 220 / 0.4)",
        }}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded bg-white/15 shrink-0">
          <Factory className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span
            className="text-white/60 leading-none"
            style={{
              fontSize: "10px",
              fontFamily: "Cabinet Grotesk, sans-serif",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Production Master Pro
          </span>
          <span
            className="text-white font-heading font-bold leading-tight truncate"
            style={{ fontSize: "17px", letterSpacing: "-0.02em" }}
          >
            {TAB_TITLES[activeTab]}
          </span>
        </div>

        {/* Sync Status Indicator */}
        <div className="shrink-0">
          <SyncStatusIndicator />
        </div>

        {/* Settings / Profile Dialog */}
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <button
              type="button"
              data-ocid="settings.open_modal_button"
              className="flex items-center justify-center w-8 h-8 rounded bg-white/15 hover:bg-white/25 transition-colors shrink-0"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4 text-white" />
            </button>
          </DialogTrigger>
          <DialogContent
            data-ocid="settings.dialog"
            className="w-[90vw] max-w-sm rounded-xl"
          >
            <DialogHeader>
              <DialogTitle>Account &amp; Settings</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 mt-2">
              {/* Logged-in indicator */}
              <div
                className="flex items-center gap-3 rounded-lg px-4 py-3"
                style={{
                  background: "oklch(var(--primary) / 0.08)",
                  border: "1px solid oklch(var(--primary) / 0.2)",
                }}
              >
                <div
                  className="flex items-center justify-center w-9 h-9 rounded-full shrink-0"
                  style={{ background: "oklch(var(--primary))" }}
                >
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span
                    className="font-semibold text-sm"
                    style={{ color: "oklch(var(--foreground))" }}
                  >
                    Logged In
                  </span>
                  <span
                    className="text-xs truncate"
                    style={{ color: "oklch(var(--muted-foreground))" }}
                  >
                    Internet Identity authenticated
                  </span>
                </div>
              </div>

              {/* Logout button */}
              <Button
                data-ocid="settings.delete_button"
                variant="destructive"
                className="w-full gap-2"
                onClick={() => {
                  setOpen(false);
                  onLogout?.();
                }}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>

              {/* Danger Zone */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className="h-px flex-1"
                    style={{ background: "oklch(var(--destructive) / 0.25)" }}
                  />
                  <span
                    className="text-xs font-semibold uppercase tracking-wider px-1"
                    style={{ color: "oklch(var(--destructive))" }}
                  >
                    Danger Zone
                  </span>
                  <div
                    className="h-px flex-1"
                    style={{ background: "oklch(var(--destructive) / 0.25)" }}
                  />
                </div>

                {!confirmErase ? (
                  <Button
                    data-ocid="settings.open_modal_button"
                    variant="outline"
                    className="w-full gap-2"
                    style={{
                      borderColor: "oklch(var(--destructive) / 0.5)",
                      color: "oklch(var(--destructive))",
                    }}
                    onClick={() => setConfirmErase(true)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Erase All Data
                  </Button>
                ) : (
                  <div
                    className="flex flex-col gap-3 rounded-lg p-3"
                    style={{
                      background: "oklch(var(--destructive) / 0.06)",
                      border: "1px solid oklch(var(--destructive) / 0.3)",
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle
                        className="w-4 h-4 mt-0.5 shrink-0"
                        style={{ color: "oklch(var(--destructive))" }}
                      />
                      <p
                        className="text-xs leading-snug"
                        style={{ color: "oklch(var(--destructive))" }}
                      >
                        This will permanently delete{" "}
                        <strong>ALL records</strong> — items, tailor entries,
                        dispatch, work records. This cannot be undone.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        data-ocid="settings.confirm_button"
                        variant="destructive"
                        size="sm"
                        className="flex-1 gap-1 text-xs"
                        disabled={erasing}
                        onClick={handleEraseAll}
                      >
                        {erasing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        {erasing ? "Erasing..." : "Yes, Erase Everything"}
                      </Button>
                      <Button
                        data-ocid="settings.cancel_button"
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        disabled={erasing}
                        onClick={() => setConfirmErase(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
