import { Loader2, WifiOff } from "lucide-react";
import { useSyncStatus } from "../hooks/useSyncStatus";

export function SyncStatusIndicator() {
  const { isOnline, isSyncing, pendingCount } = useSyncStatus();

  if (isSyncing) {
    return (
      <div
        data-ocid="sync.loading_state"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
        style={{
          background: "oklch(0.85 0.12 85 / 0.25)",
          color: "oklch(0.75 0.13 85)",
          border: "1px solid oklch(0.75 0.13 85 / 0.4)",
        }}
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Syncing…</span>
      </div>
    );
  }

  if (!isOnline) {
    if (pendingCount > 0) {
      return (
        <div
          data-ocid="sync.error_state"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{
            background: "oklch(0.4 0.18 25 / 0.25)",
            color: "oklch(0.9 0.12 25)",
            border: "1px solid oklch(0.7 0.15 25 / 0.4)",
          }}
        >
          <WifiOff className="w-3 h-3" />
          <span>Offline · {pendingCount} Pending</span>
        </div>
      );
    }
    return (
      <div
        data-ocid="sync.error_state"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
        style={{
          background: "oklch(0.45 0.12 240 / 0.25)",
          color: "oklch(0.85 0.08 240)",
          border: "1px solid oklch(0.65 0.1 240 / 0.4)",
        }}
      >
        <WifiOff className="w-3 h-3" />
        <span>Offline · Cached</span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div
        data-ocid="sync.loading_state"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
        style={{
          background: "oklch(0.85 0.12 85 / 0.25)",
          color: "oklch(0.75 0.13 85)",
          border: "1px solid oklch(0.75 0.13 85 / 0.4)",
        }}
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>{pendingCount} Pending</span>
      </div>
    );
  }

  return (
    <div
      data-ocid="sync.success_state"
      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{
        background: "oklch(0.45 0.13 150 / 0.25)",
        color: "oklch(0.85 0.1 150)",
        border: "1px solid oklch(0.65 0.1 150 / 0.4)",
      }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ background: "oklch(0.72 0.18 150)" }}
      />
      <span>Online · Synced</span>
    </div>
  );
}
