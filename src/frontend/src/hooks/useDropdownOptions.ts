import { useCallback, useState } from "react";

const STORAGE_PREFIX = "dropdown_opts_";

export function useDropdownOptions(
  key: string,
): [string[], (val: string) => void] {
  const storageKey = STORAGE_PREFIX + key;

  const [options, setOptions] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      return [];
    }
  });

  const addOption = useCallback(
    (val: string) => {
      const trimmed = val.trim();
      if (!trimmed) return;
      setOptions((prev) => {
        if (prev.includes(trimmed)) return prev;
        const updated = [trimmed, ...prev].slice(0, 100);
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch {
          /* ignore */
        }
        return updated;
      });
    },
    [storageKey],
  );

  return [options, addOption];
}
