import {
  Archive,
  BarChart3,
  ClipboardList,
  FileText,
  IndianRupee,
  Package,
  Ruler,
  Scissors,
  Send,
  Users,
  Wrench,
} from "lucide-react";
import type { TabId } from "../App";

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const NAV_ITEMS: Array<{
  id: TabId;
  label: string;
  icon: React.ElementType;
  ocid: string;
}> = [
  {
    id: "item_master",
    label: "Items",
    icon: Package,
    ocid: "nav.item_master_tab",
  },
  {
    id: "tailor",
    label: "Tailors",
    icon: Scissors,
    ocid: "nav.tailor_tab",
  },
  {
    id: "add_work",
    label: "Add Work",
    icon: Wrench,
    ocid: "nav.add_work_tab",
  },
  {
    id: "dispatch",
    label: "Dispatch",
    icon: Send,
    ocid: "nav.dispatch_tab",
  },
  {
    id: "payment",
    label: "Payment",
    icon: IndianRupee,
    ocid: "nav.payment_tab",
  },
  {
    id: "finished_stock",
    label: "Stock",
    icon: BarChart3,
    ocid: "nav.finished_stock_tab",
  },
  {
    id: "fabric_planner",
    label: "Fabric",
    icon: Ruler,
    ocid: "nav.fabric_planner_tab",
  },
  {
    id: "quote_builder",
    label: "Quote",
    icon: FileText,
    ocid: "nav.quote_builder_tab",
  },
  {
    id: "master_report",
    label: "Party Head",
    icon: Users,
    ocid: "nav.master_report_tab",
  },
  {
    id: "history",
    label: "History",
    icon: ClipboardList,
    ocid: "nav.history_tab",
  },
  {
    id: "backup_restore",
    label: "Backup",
    icon: Archive,
    ocid: "nav.backup_restore_tab",
  },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-full border-t"
      style={{
        maxWidth: "var(--app-max-width)",
        height: "var(--nav-height)",
        background: "oklch(var(--card))",
        borderColor: "oklch(var(--border))",
        boxShadow: "0 -2px 12px oklch(0.4 0.05 220 / 0.08)",
      }}
    >
      <div className="flex h-full overflow-x-auto scrollbar-hide">
        {NAV_ITEMS.map(({ id, label, icon: Icon, ocid }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              data-ocid={ocid}
              onClick={() => onTabChange(id)}
              className="flex-shrink-0 flex flex-col items-center justify-center gap-0.5 transition-colors"
              style={{
                minWidth: "56px",
                padding: "0 4px",
                color: isActive
                  ? "oklch(var(--primary))"
                  : "oklch(var(--muted-foreground))",
              }}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              <div
                className="flex items-center justify-center w-7 h-5 rounded-full transition-all"
                style={{
                  background: isActive
                    ? "oklch(var(--primary) / 0.12)"
                    : "transparent",
                }}
              >
                <Icon
                  className="w-4 h-4 transition-all"
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              </div>
              <span
                style={{
                  fontSize: "8px",
                  fontWeight: isActive ? 700 : 500,
                  letterSpacing: "0.01em",
                  fontFamily: "Cabinet Grotesk, sans-serif",
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
