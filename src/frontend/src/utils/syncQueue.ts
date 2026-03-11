/**
 * Pending sync queue — stored in localStorage for simplicity.
 * Manages offline entries that need to be synced when backend is available.
 */

const LS_KEY = "pending_sync_queue";
const LS_LAST_SYNC = "last_sync_time";

export interface PendingEntry {
  id: string;
  module: "item_master" | "tailor" | "additional_work" | "dispatch";
  data: unknown;
  timestamp: number;
  synced: boolean;
  attempts: number;
}

function readQueue(): PendingEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PendingEntry[];
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingEntry[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(queue));
    // Dispatch a custom event so React hooks can react
    window.dispatchEvent(new CustomEvent("syncQueueChanged"));
  } catch {
    // Storage quota exceeded — silently ignore
  }
}

export function enqueuePending(
  module: PendingEntry["module"],
  data: unknown,
): string {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const entry: PendingEntry = {
    id,
    module,
    data,
    timestamp: Date.now(),
    synced: false,
    attempts: 0,
  };
  const queue = readQueue();
  queue.push(entry);
  writeQueue(queue);
  return id;
}

export function getPendingQueue(): PendingEntry[] {
  return readQueue().filter((e) => !e.synced);
}

export function markSynced(id: string): void {
  const queue = readQueue().map((e) =>
    e.id === id ? { ...e, synced: true } : e,
  );
  writeQueue(queue);
}

export function removeSynced(): void {
  writeQueue(readQueue().filter((e) => !e.synced));
}

export function hasPending(): boolean {
  return readQueue().some((e) => !e.synced);
}

export function getPendingCount(): number {
  return readQueue().filter((e) => !e.synced).length;
}

export function getLastSyncTime(): Date | null {
  const raw = localStorage.getItem(LS_LAST_SYNC);
  if (!raw) return null;
  try {
    return new Date(raw);
  } catch {
    return null;
  }
}

function setLastSyncTime(): void {
  localStorage.setItem(LS_LAST_SYNC, new Date().toISOString());
}

// ---------------------------------------------------------------------------
// Sync Engine
// ---------------------------------------------------------------------------

type BackendFunctions = {
  addItemMaster?: (data: unknown) => Promise<unknown>;
  addTailorRecord?: (data: unknown) => Promise<unknown>;
  addAdditionalWork?: (data: unknown) => Promise<unknown>;
  addDispatch?: (data: unknown) => Promise<unknown>;
};

async function flushQueue(backend: BackendFunctions): Promise<number> {
  const pending = getPendingQueue();
  if (pending.length === 0) return 0;

  let synced = 0;
  for (const entry of pending) {
    // Skip already-synced (guard against duplicates)
    if (entry.synced) continue;

    try {
      if (entry.module === "item_master" && backend.addItemMaster) {
        await backend.addItemMaster(entry.data);
      } else if (entry.module === "tailor" && backend.addTailorRecord) {
        await backend.addTailorRecord(entry.data);
      } else if (
        entry.module === "additional_work" &&
        backend.addAdditionalWork
      ) {
        await backend.addAdditionalWork(entry.data);
      } else if (entry.module === "dispatch" && backend.addDispatch) {
        await backend.addDispatch(entry.data);
      } else {
        // No handler for this module — skip but don't mark as synced
        continue;
      }
      markSynced(entry.id);
      synced++;
    } catch {
      // Increment attempts counter but keep in queue
      const queue = readQueue().map((e) =>
        e.id === entry.id ? { ...e, attempts: e.attempts + 1 } : e,
      );
      writeQueue(queue);
    }
  }

  if (synced > 0) {
    removeSynced();
    setLastSyncTime();
  }
  return synced;
}

let _flushHandler: (() => void) | null = null;

export const syncEngine = {
  start(backend: BackendFunctions): void {
    // Remove any previous listener
    if (_flushHandler) {
      window.removeEventListener("online", _flushHandler);
    }
    _flushHandler = () => {
      flushQueue(backend).catch(() => {});
    };
    window.addEventListener("online", _flushHandler);
  },

  async flush(backend: BackendFunctions): Promise<number> {
    return flushQueue(backend);
  },

  stop(): void {
    if (_flushHandler) {
      window.removeEventListener("online", _flushHandler);
      _flushHandler = null;
    }
  },
};
