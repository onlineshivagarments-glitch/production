import { useCallback, useEffect, useRef, useState } from "react";
import { getLastSyncTime, getPendingCount } from "../utils/syncQueue";

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: Date | null;
}

export function useSyncStatus(): SyncStatus & {
  setIsSyncing: (v: boolean) => void;
} {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(() => getPendingCount());
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() =>
    getLastSyncTime(),
  );

  const refreshPending = useCallback(() => {
    setPendingCount(getPendingCount());
    setLastSyncTime(getLastSyncTime());
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleQueueChanged = () => refreshPending();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("syncQueueChanged", handleQueueChanged);

    // Poll every 5 seconds as fallback
    const interval = setInterval(refreshPending, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("syncQueueChanged", handleQueueChanged);
      clearInterval(interval);
    };
  }, [refreshPending]);

  // Expose a stable setIsSyncing ref so consumers can toggle syncing state
  const setIsSyncingRef = useRef(setIsSyncing);
  setIsSyncingRef.current = setIsSyncing;

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    setIsSyncing,
  };
}
