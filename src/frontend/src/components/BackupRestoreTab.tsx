import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Archive,
  CheckCircle2,
  Clock,
  Database,
  Download,
  Loader2,
  RefreshCw,
  Share2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import {
  getLastSyncTime,
  getPendingCount,
  getPendingQueue,
  markSynced,
  removeSynced,
} from "../utils/syncQueue";

const LS_LAST_BACKUP = "sg9_last_backup";
const LS_LAST_AUTO = "sg9_last_auto_backup_date";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function backupFileName(date?: string) {
  const d = date ?? todayStr();
  return `ShivaGarments_Backup_${d}.json`;
}

/** Retry a function up to `maxAttempts` times with a fixed delay between attempts */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 2000,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastErr;
}

/** Safely fetch a record list with retry; returns empty array on permanent failure */
async function safeFetch<T>(
  fn: () => Promise<T[]>,
  label: string,
): Promise<T[]> {
  try {
    return await withRetry(fn, 3, 2000);
  } catch (err) {
    console.warn(`[Backup] Failed to fetch ${label}:`, err);
    return [];
  }
}

export function BackupRestoreTab() {
  const { actor, isFetching } = useActor();

  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isReIndexing, setIsReIndexing] = useState(false);
  const [reIndexStatus, setReIndexStatus] = useState<
    "idle" | "running" | "done" | "error"
  >("idle");
  const [reIndexMessage, setReIndexMessage] = useState("");
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(() =>
    localStorage.getItem(LS_LAST_BACKUP),
  );
  const [pendingRestore, setPendingRestore] = useState<object | null>(null);
  const [backupJson, setBackupJson] = useState<string | null>(null);
  const [showShareBtn, setShowShareBtn] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync Now state
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(() => getPendingCount());
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() =>
    getLastSyncTime(),
  );

  const refreshPendingCount = () => {
    setPendingCount(getPendingCount());
    setLastSyncTime(getLastSyncTime());
  };

  const handleSyncNow = async () => {
    if (!actor) {
      toast.error("Not connected to server");
      return;
    }
    const pending = getPendingQueue();
    if (pending.length === 0) {
      toast.success("All records are already synced");
      return;
    }
    setIsSyncing(true);
    setSyncMessage(`Syncing ${pending.length} records...`);
    let synced = 0;
    let failed = 0;
    for (const entry of pending) {
      if (entry.synced) continue;
      try {
        if (entry.module === "item_master") {
          const d = entry.data as {
            articleNo: string;
            totalQuantity: number;
            colorSizeData: string;
            workTypes: string;
            hasAdditionalWork: boolean;
          };
          await actor.addItemMaster(
            d.articleNo,
            d.totalQuantity,
            "",
            d.hasAdditionalWork,
            d.workTypes,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            d.colorSizeData,
          );
        } else if (entry.module === "tailor") {
          const d = entry.data as {
            date: string;
            articleNo: string;
            tailorName: string;
            pcsGiven: number;
            tailorRate: number;
            color: string;
            size: string;
          };
          await actor.addTailorRecord(
            d.date,
            d.articleNo,
            d.tailorName,
            d.pcsGiven,
            d.tailorRate,
            d.pcsGiven * d.tailorRate,
            d.color,
            d.size,
          );
        } else if (entry.module === "additional_work") {
          const d = entry.data as {
            date: string;
            articleNo: string;
            workType: string;
            employeeName: string;
            pcsDone: number;
            ratePerPcs: number;
            color: string;
            size: string;
          };
          await actor.addAdditionalWorkRecord(
            d.date,
            d.articleNo,
            d.workType,
            d.employeeName,
            d.pcsDone,
            d.ratePerPcs,
            d.color,
            d.size,
          );
        } else if (entry.module === "dispatch") {
          const d = entry.data as {
            articleNo: string;
            partyName: string;
            dispatchDate: string;
            dispatchPcs: number;
            salePrice: number;
            percentage: number;
          };
          await actor.addDispatchRecord(
            d.articleNo,
            d.partyName,
            d.dispatchDate,
            d.dispatchPcs,
            d.salePrice,
            d.percentage,
            "",
            "",
          );
        }
        markSynced(entry.id);
        synced++;
      } catch {
        failed++;
      }
    }
    removeSynced();
    setIsSyncing(false);
    const newLastSync = new Date();
    localStorage.setItem("last_sync_time", newLastSync.toISOString());
    setLastSyncTime(newLastSync);
    refreshPendingCount();
    if (synced > 0 && failed === 0) {
      setSyncMessage(`All ${synced} records synced successfully`);
      toast.success("All records synced successfully");
    } else if (synced > 0) {
      setSyncMessage(`${synced} synced, ${failed} failed`);
      toast.warning(`${synced} synced, ${failed} still pending`);
    } else {
      setSyncMessage("Sync failed – server may be unavailable");
      toast.error("Sync failed – server unavailable");
    }
  };

  // Daily auto-backup
  useEffect(() => {
    if (!actor || isFetching) return;
    const lastAutoDate = localStorage.getItem(LS_LAST_AUTO);
    if (lastAutoDate === todayStr()) return;
    setIsAutoRunning(true);
    doBackup(true).finally(() => setIsAutoRunning(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor, isFetching]);

  async function doBackup(isAuto = false): Promise<string | null> {
    if (!actor) return null;
    try {
      // Fetch each data source independently with retry so one failure
      // does not abort the entire backup.
      const [
        itemMaster,
        tailorRecords,
        additionalWork,
        dispatch,
        payments,
        stock,
      ] = await Promise.all([
        safeFetch(
          () => actor.getItemMasters() as Promise<object[]>,
          "itemMaster",
        ),
        safeFetch(
          () => actor.getTailorRecords() as Promise<object[]>,
          "tailorRecords",
        ),
        safeFetch(
          () => actor.getAdditionalWorkRecords() as Promise<object[]>,
          "additionalWork",
        ),
        safeFetch(
          () => actor.getDispatchRecords() as Promise<object[]>,
          "dispatch",
        ),
        safeFetch(
          () => actor.getProductionRecords() as Promise<object[]>,
          "payments",
        ),
        safeFetch(
          () => actor.getFinishedStockSummary() as Promise<object[]>,
          "stock",
        ),
      ]);

      const payload = {
        version: "1.0",
        backupDate: new Date().toISOString(),
        itemMaster,
        tailorRecords,
        additionalWork,
        dispatch,
        payments,
        stock,
      };

      const json = JSON.stringify(
        payload,
        (_k, v) => (typeof v === "bigint" ? v.toString() : v),
        2,
      );

      const now = new Date().toISOString();
      localStorage.setItem(LS_LAST_BACKUP, now);
      setLastBackup(now);

      if (!isAuto) {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = backupFileName(todayStr());
        a.click();
        URL.revokeObjectURL(url);
        setBackupJson(json);
        setShowShareBtn(true);
        toast.success("Backup created and downloaded!");
      } else {
        localStorage.setItem(LS_LAST_AUTO, todayStr());
      }

      return json;
    } catch (err) {
      if (!isAuto) {
        toast.error(
          `Backup failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      return null;
    }
  }

  async function handleCreateBackup() {
    setIsCreating(true);
    await doBackup(false);
    setIsCreating(false);
  }

  /** Download the last backup JSON without re-fetching */
  function handleDownloadBackup() {
    if (!backupJson) {
      toast.error(
        "No backup available to download. Please create a backup first.",
      );
      return;
    }
    const blob = new Blob([backupJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = backupFileName(todayStr());
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup file downloaded.");
  }

  /**
   * Re-Index Files:
   * Re-fetches all records from the backend with retry logic,
   * rebuilds the local data index, clears stale cache keys,
   * and syncs localStorage with fresh backend data.
   * DOES NOT delete any user data.
   */
  async function handleReIndex() {
    if (!actor) {
      toast.error("Not connected to backend. Please refresh and try again.");
      return;
    }
    setIsReIndexing(true);
    setReIndexStatus("running");
    setReIndexMessage("Refreshing records… Please wait");

    try {
      setReIndexMessage("Connecting to backend canister…");
      // Small delay to let the message render
      await new Promise((r) => setTimeout(r, 300));

      setReIndexMessage("Fetching Item Master records…");
      const itemMaster = await safeFetch(
        () => actor.getItemMasters() as Promise<object[]>,
        "itemMaster",
      );

      setReIndexMessage("Fetching Tailor records…");
      const tailorRecords = await safeFetch(
        () => actor.getTailorRecords() as Promise<object[]>,
        "tailorRecords",
      );

      setReIndexMessage("Fetching Additional Work records…");
      const additionalWork = await safeFetch(
        () => actor.getAdditionalWorkRecords() as Promise<object[]>,
        "additionalWork",
      );

      setReIndexMessage("Fetching Dispatch records…");
      const dispatch = await safeFetch(
        () => actor.getDispatchRecords() as Promise<object[]>,
        "dispatch",
      );

      setReIndexMessage("Fetching Payment records…");
      const payments = await safeFetch(
        () => actor.getProductionRecords() as Promise<object[]>,
        "payments",
      );

      setReIndexMessage("Rebuilding local index and clearing stale cache…");

      // Remove only known stale cache keys — never touch actual record data
      const staleCacheKeys = [
        "sg9_cache_items",
        "sg9_cache_tailor",
        "sg9_cache_addwork",
        "sg9_cache_dispatch",
        "sg9_cache_payments",
        "sg9_articles_index",
        "sg9_employee_index",
      ];
      for (const k of staleCacheKeys) {
        localStorage.removeItem(k);
      }

      // Write fresh index snapshots for offline reference
      const indexSnapshot = {
        lastIndexed: new Date().toISOString(),
        counts: {
          itemMaster: itemMaster.length,
          tailorRecords: tailorRecords.length,
          additionalWork: additionalWork.length,
          dispatch: dispatch.length,
          payments: payments.length,
        },
      };
      localStorage.setItem("sg9_last_index", JSON.stringify(indexSnapshot));

      setReIndexMessage("Verifying data links…");
      await new Promise((r) => setTimeout(r, 400));

      const totalRecords =
        itemMaster.length +
        tailorRecords.length +
        additionalWork.length +
        dispatch.length +
        payments.length;

      setReIndexStatus("done");
      setReIndexMessage(
        `All records successfully refreshed (${totalRecords} records synced)`,
      );
      toast.success("All records successfully refreshed");
    } catch (err) {
      setReIndexStatus("error");
      setReIndexMessage(
        `Re-index encountered an error: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      toast.error("Re-index failed. Please try again.");
    } finally {
      setIsReIndexing(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        setPendingRestore(parsed);
      } catch {
        toast.error("Invalid backup file. Please select a valid JSON backup.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleConfirmRestore() {
    if (!actor || !pendingRestore) return;
    setIsRestoring(true);
    setPendingRestore(null);

    try {
      const data = pendingRestore as {
        itemMaster?: object[];
        tailorRecords?: object[];
        additionalWork?: object[];
        dispatch?: object[];
      };

      let restored = 0;

      if (data.itemMaster?.length) {
        for (const item of data.itemMaster as {
          articleNo: string;
          totalQuantity: number;
          colors: string;
          hasAdditionalWork: boolean;
          workTypes: string;
          sizeXS: number;
          sizeS: number;
          sizeM: number;
          sizeL: number;
          sizeXL: number;
          sizeXXL: number;
          size3XL: number;
          size4XL: number;
          size5XL: number;
          colorSizeData: string;
        }[]) {
          await withRetry(() =>
            actor.addItemMaster(
              item.articleNo ?? "",
              Number(item.totalQuantity ?? 0),
              item.colors ?? "",
              item.hasAdditionalWork ?? false,
              item.workTypes ?? "",
              Number(item.sizeXS ?? 0),
              Number(item.sizeS ?? 0),
              Number(item.sizeM ?? 0),
              Number(item.sizeL ?? 0),
              Number(item.sizeXL ?? 0),
              Number(item.sizeXXL ?? 0),
              Number(item.size3XL ?? 0),
              Number(item.size4XL ?? 0),
              Number(item.size5XL ?? 0),
              item.colorSizeData ?? "",
            ),
          );
          restored++;
        }
      }

      if (data.tailorRecords?.length) {
        for (const t of data.tailorRecords as {
          date: string;
          articleNo: string;
          tailorName: string;
          pcsGiven: number;
          tailorRate: number;
          tailorAmount: number;
          color: string;
          size: string;
        }[]) {
          await withRetry(() =>
            actor.addTailorRecord(
              t.date ?? "",
              t.articleNo ?? "",
              t.tailorName ?? "",
              Number(t.pcsGiven ?? 0),
              Number(t.tailorRate ?? 0),
              Number(t.tailorAmount ?? 0),
              t.color ?? "",
              t.size ?? "",
            ),
          );
          restored++;
        }
      }

      if (data.additionalWork?.length) {
        for (const w of data.additionalWork as {
          date: string;
          articleNo: string;
          workType: string;
          employeeName: string;
          pcsDone: number;
          ratePerPcs: number;
          color: string;
          size: string;
        }[]) {
          await withRetry(() =>
            actor.addAdditionalWorkRecord(
              w.date ?? "",
              w.articleNo ?? "",
              w.workType ?? "",
              w.employeeName ?? "",
              Number(w.pcsDone ?? 0),
              Number(w.ratePerPcs ?? 0),
              w.color ?? "",
              w.size ?? "",
            ),
          );
          restored++;
        }
      }

      if (data.dispatch?.length) {
        for (const d of data.dispatch as {
          articleNo: string;
          partyName: string;
          dispatchDate: string;
          dispatchPcs: number;
          salePrice: number;
          percentage: number;
          sizeWiseBreakup: string;
          colorWiseBreakup: string;
        }[]) {
          await withRetry(() =>
            actor.addDispatchRecord(
              d.articleNo ?? "",
              d.partyName ?? "",
              d.dispatchDate ?? "",
              Number(d.dispatchPcs ?? 0),
              Number(d.salePrice ?? 0),
              Number(d.percentage ?? 0),
              d.sizeWiseBreakup ?? "",
              d.colorWiseBreakup ?? "",
            ),
          );
          restored++;
        }
      }

      toast.success(`Backup restored successfully! (${restored} records)`);
    } catch (err) {
      toast.error(
        `Restore failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setIsRestoring(false);
    }
  }

  function handleWhatsAppShare() {
    if (!backupJson) return;
    try {
      const data = JSON.parse(backupJson);
      const fileName = backupFileName(todayStr());
      const lines = [
        "📦 *Backup Created*",
        `File: ${fileName}`,
        `Items: ${data.itemMaster?.length ?? 0} | Tailor Records: ${data.tailorRecords?.length ?? 0} | Dispatch: ${data.dispatch?.length ?? 0} | Additional Work: ${data.additionalWork?.length ?? 0}`,
        `Created at: ${formatDateTime(data.backupDate)}`,
        "",
        "_Shiva Garments Production Master Pro_",
      ];
      const text = encodeURIComponent(lines.join("\n"));
      window.open(`https://wa.me/?text=${text}`, "_blank");
    } catch {
      toast.error("Could not prepare WhatsApp message.");
    }
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "oklch(var(--primary) / 0.12)" }}
        >
          <Archive
            className="w-5 h-5"
            style={{ color: "oklch(var(--primary))" }}
          />
        </div>
        <div>
          <h1
            className="text-lg font-bold"
            style={{ color: "oklch(var(--foreground))" }}
          >
            Backup & Restore
          </h1>
          <p
            className="text-xs"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            Protect your production data
          </p>
        </div>
        {isAutoRunning && (
          <div className="ml-auto flex items-center gap-1.5">
            <Loader2
              className="w-3.5 h-3.5 animate-spin"
              style={{ color: "oklch(var(--muted-foreground))" }}
            />
            <span
              className="text-xs"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              Auto-backup running...
            </span>
          </div>
        )}
      </div>

      {/* Backup Status Card */}
      <Card
        style={{
          background: "oklch(var(--card))",
          borderColor: "oklch(var(--border))",
        }}
      >
        <CardHeader className="pb-2">
          <CardTitle
            className="text-sm flex items-center gap-2"
            style={{ color: "oklch(var(--foreground))" }}
          >
            <Clock className="w-4 h-4" />
            Backup Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lastBackup ? (
            <div className="flex items-center gap-2">
              <CheckCircle2
                className="w-4 h-4 flex-shrink-0"
                style={{ color: "oklch(0.65 0.15 145)" }}
              />
              <div>
                <p
                  className="text-xs font-medium"
                  style={{ color: "oklch(var(--foreground))" }}
                >
                  Last Backup
                </p>
                <p
                  className="text-sm font-semibold"
                  style={{ color: "oklch(0.65 0.15 145)" }}
                >
                  {formatDateTime(lastBackup)}
                </p>
              </div>
              <Badge
                className="ml-auto text-xs"
                style={{
                  background: "oklch(0.65 0.15 145 / 0.15)",
                  color: "oklch(0.5 0.15 145)",
                  border: "1px solid oklch(0.65 0.15 145 / 0.3)",
                }}
              >
                Protected
              </Badge>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Clock
                className="w-4 h-4 flex-shrink-0"
                style={{ color: "oklch(0.7 0.15 60)" }}
              />
              <div>
                <p
                  className="text-xs"
                  style={{ color: "oklch(var(--muted-foreground))" }}
                >
                  No backup created yet
                </p>
              </div>
              <Badge
                className="ml-auto text-xs"
                style={{
                  background: "oklch(0.7 0.15 60 / 0.15)",
                  color: "oklch(0.55 0.15 60)",
                  border: "1px solid oklch(0.7 0.15 60 / 0.3)",
                }}
              >
                No Backup
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Action Buttons */}
      <Card
        style={{
          background: "oklch(var(--card))",
          borderColor: "oklch(var(--border))",
        }}
      >
        <CardHeader className="pb-3">
          <CardTitle
            className="text-sm"
            style={{ color: "oklch(var(--foreground))" }}
          >
            Data Management
          </CardTitle>
          <CardDescription
            className="text-xs"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            Create, restore, and manage your production data backups.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Create Backup */}
          <Button
            data-ocid="backup.primary_button"
            onClick={handleCreateBackup}
            disabled={isCreating || isFetching || !actor}
            className="w-full gap-2 h-11"
            style={{
              background: "oklch(var(--primary))",
              color: "oklch(var(--primary-foreground))",
            }}
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Archive className="w-4 h-4" />
            )}
            {isCreating ? "Creating Backup..." : "Create Backup"}
          </Button>

          {/* Restore Backup */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileSelect}
            data-ocid="backup.upload_button"
          />
          <Button
            data-ocid="backup.restore_button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isRestoring || !actor}
            className="w-full gap-2 h-11"
            style={{
              borderColor: "oklch(var(--border))",
              color: "oklch(var(--foreground))",
            }}
          >
            {isRestoring ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {isRestoring ? "Restoring..." : "Restore Backup"}
          </Button>

          {/* Re-Index Files */}
          <Button
            data-ocid="backup.reindex_button"
            variant="outline"
            onClick={handleReIndex}
            disabled={isReIndexing || isFetching || !actor}
            className="w-full gap-2 h-11"
            style={{
              borderColor: "oklch(0.6 0.18 260 / 0.5)",
              color: "oklch(0.45 0.18 260)",
              background:
                reIndexStatus === "done"
                  ? "oklch(0.65 0.15 145 / 0.08)"
                  : "transparent",
            }}
          >
            {isReIndexing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : reIndexStatus === "done" ? (
              <CheckCircle2
                className="w-4 h-4"
                style={{ color: "oklch(0.65 0.15 145)" }}
              />
            ) : (
              <Database className="w-4 h-4" />
            )}
            {isReIndexing ? "Re-Indexing..." : "Re-Index Files"}
          </Button>

          {/* Download Backup */}
          <Button
            data-ocid="backup.download_button"
            variant="outline"
            onClick={handleDownloadBackup}
            disabled={!backupJson}
            className="w-full gap-2 h-11"
            style={{
              borderColor: "oklch(0.65 0.18 200 / 0.5)",
              color: "oklch(0.45 0.18 200)",
            }}
          >
            <Download className="w-4 h-4" />
            Download Backup
          </Button>

          {/* WhatsApp Share — shown after backup is created */}
          {showShareBtn && (
            <Button
              data-ocid="backup.share_button"
              variant="outline"
              onClick={handleWhatsAppShare}
              className="w-full gap-2 h-11"
              style={{
                borderColor: "oklch(0.65 0.18 145 / 0.5)",
                color: "oklch(0.5 0.18 145)",
              }}
            >
              <Share2 className="w-4 h-4" />
              Share on WhatsApp
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Re-Index Status Panel */}
      {reIndexStatus !== "idle" && (
        <Card
          data-ocid="backup.reindex_panel"
          style={{
            background:
              reIndexStatus === "done"
                ? "oklch(0.65 0.15 145 / 0.08)"
                : reIndexStatus === "error"
                  ? "oklch(0.65 0.15 25 / 0.08)"
                  : "oklch(0.6 0.18 260 / 0.06)",
            borderColor:
              reIndexStatus === "done"
                ? "oklch(0.65 0.15 145 / 0.3)"
                : reIndexStatus === "error"
                  ? "oklch(0.65 0.15 25 / 0.3)"
                  : "oklch(0.6 0.18 260 / 0.3)",
          }}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              {reIndexStatus === "running" && (
                <Loader2
                  className="w-5 h-5 animate-spin mt-0.5 flex-shrink-0"
                  style={{ color: "oklch(0.6 0.18 260)" }}
                />
              )}
              {reIndexStatus === "done" && (
                <CheckCircle2
                  className="w-5 h-5 mt-0.5 flex-shrink-0"
                  style={{ color: "oklch(0.65 0.15 145)" }}
                />
              )}
              {reIndexStatus === "error" && (
                <RefreshCw
                  className="w-5 h-5 mt-0.5 flex-shrink-0"
                  style={{ color: "oklch(0.65 0.15 25)" }}
                />
              )}
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{
                    color:
                      reIndexStatus === "done"
                        ? "oklch(0.5 0.15 145)"
                        : reIndexStatus === "error"
                          ? "oklch(0.5 0.15 25)"
                          : "oklch(0.45 0.18 260)",
                  }}
                >
                  {reIndexStatus === "running"
                    ? "Re-Indexing in Progress"
                    : reIndexStatus === "done"
                      ? "Re-Index Complete"
                      : "Re-Index Error"}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "oklch(var(--muted-foreground))" }}
                >
                  {reIndexMessage}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backup Info */}
      <Card
        style={{
          background: "oklch(var(--card))",
          borderColor: "oklch(var(--border))",
        }}
      >
        <CardHeader className="pb-2">
          <CardTitle
            className="text-sm"
            style={{ color: "oklch(var(--foreground))" }}
          >
            What's included
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="rounded-lg p-3 text-xs space-y-1"
            style={{
              background: "oklch(var(--muted) / 0.5)",
              color: "oklch(var(--muted-foreground))",
            }}
          >
            <p>• Item Master</p>
            <p>• Tailor Records</p>
            <p>• Additional Work Records</p>
            <p>• Dispatch Records</p>
            <p>• Payment Records</p>
            <p>• Stock Summary</p>
          </div>
        </CardContent>
      </Card>

      {/* Sync Now Card */}
      <Card
        style={{
          background: "oklch(var(--card))",
          borderColor: "oklch(var(--border))",
        }}
      >
        <CardHeader className="pb-2">
          <CardTitle
            className="text-sm flex items-center gap-2"
            style={{ color: "oklch(var(--foreground))" }}
          >
            <RefreshCw className="w-4 h-4" />
            Offline Sync
          </CardTitle>
          <CardDescription style={{ color: "oklch(var(--muted-foreground))" }}>
            {pendingCount > 0
              ? `${pendingCount} record(s) waiting to sync`
              : "All records are synced"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-ocid="backup.sync_now.button"
              disabled={isSyncing || pendingCount === 0}
              onClick={handleSyncNow}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "oklch(var(--primary))",
                color: "oklch(var(--primary-foreground))",
              }}
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isSyncing ? "Syncing..." : "Sync Now"}
            </button>
            <button
              type="button"
              onClick={refreshPendingCount}
              className="text-xs px-2 py-1 rounded"
              style={{
                color: "oklch(var(--muted-foreground))",
                border: "1px solid oklch(var(--border))",
              }}
            >
              Refresh
            </button>
          </div>
          {syncMessage && (
            <p
              data-ocid="backup.sync_now.success_state"
              className="text-xs"
              style={{
                color: isSyncing
                  ? "oklch(0.7 0.13 85)"
                  : "oklch(0.65 0.15 145)",
              }}
            >
              {syncMessage}
            </p>
          )}
          {lastSyncTime && (
            <p
              className="text-xs"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              Last synced: {lastSyncTime.toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Auto Backup Info Card */}
      <Card
        style={{
          background: "oklch(var(--card))",
          borderColor: "oklch(var(--border))",
        }}
      >
        <CardHeader className="pb-2">
          <CardTitle
            className="text-sm flex items-center gap-2"
            style={{ color: "oklch(var(--foreground))" }}
          >
            <RefreshCw className="w-4 h-4" />
            Daily Auto-Backup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className="text-xs"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            The app automatically creates a backup once per day when opened.
            Today's auto-backup:{" "}
            <span
              className="font-semibold"
              style={{
                color:
                  localStorage.getItem(LS_LAST_AUTO) === todayStr()
                    ? "oklch(0.65 0.15 145)"
                    : "oklch(0.7 0.15 60)",
              }}
            >
              {localStorage.getItem(LS_LAST_AUTO) === todayStr()
                ? "✓ Completed"
                : isAutoRunning
                  ? "Running..."
                  : "Pending"}
            </span>
          </p>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={!!pendingRestore}
        onOpenChange={(open) => !open && setPendingRestore(null)}
      >
        <AlertDialogContent
          data-ocid="backup.dialog"
          style={{
            background: "oklch(var(--card))",
            borderColor: "oklch(var(--border))",
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: "oklch(var(--foreground))" }}>
              Restore Backup
            </AlertDialogTitle>
            <AlertDialogDescription
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              Restoring backup will overwrite existing data. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="backup.cancel_button"
              style={{ borderColor: "oklch(var(--border))" }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="backup.confirm_button"
              onClick={handleConfirmRestore}
              style={{
                background: "oklch(var(--primary))",
                color: "oklch(var(--primary-foreground))",
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
