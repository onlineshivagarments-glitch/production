import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { FinishedStockSummary, ProductionMismatch } from "../backend";
import { useActor } from "../hooks/useActor";

export function DashboardAlerts() {
  const { actor } = useActor();
  const [stockData, setStockData] = useState<FinishedStockSummary[]>([]);
  const [mismatches, setMismatches] = useState<ProductionMismatch[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!actor) return;
    Promise.all([
      actor.getFinishedStockSummary().catch(() => []),
      actor.getProductionMismatches().catch(() => []),
    ]).then(([stock, mismatch]) => {
      setStockData(stock as typeof stock);
      setMismatches(mismatch as typeof mismatch);
    });
  }, [actor]);

  const lowStock = stockData.filter((r) => r.available < 50);
  const highPending = mismatches.filter(
    (m) => m.cuttingQty > m.stitchedQty && m.cuttingQty - m.stitchedQty > 100,
  );
  const dispatchReady = mismatches.filter(
    (m) =>
      m.stitchedQty > m.dispatchedQty && m.stitchedQty - m.dispatchedQty > 50,
  );

  const hasAlerts =
    lowStock.length > 0 || highPending.length > 0 || dispatchReady.length > 0;

  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  if (!hasAlerts) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs mb-3"
        style={{
          background: "oklch(0.97 0.05 150 / 0.3)",
          color: "oklch(0.5 0.15 150)",
        }}
      >
        <CheckCircle className="w-4 h-4" />
        All systems OK — No alerts
      </div>
    );
  }

  return (
    <div className="space-y-2 mb-4" data-ocid="dashboard.panel">
      {lowStock.length > 0 && (
        <Card
          style={{
            borderColor: "oklch(var(--destructive) / 0.4)",
            background: "oklch(0.98 0.03 30 / 0.5)",
          }}
        >
          <CardContent className="p-3">
            <button
              type="button"
              className="w-full flex items-center justify-between"
              onClick={() => toggle("low_stock")}
              data-ocid="dashboard.toggle"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className="w-4 h-4"
                  style={{ color: "oklch(var(--destructive))" }}
                />
                <span
                  className="text-xs font-semibold"
                  style={{ color: "oklch(var(--destructive))" }}
                >
                  Low Stock Articles
                </span>
                <Badge
                  variant="outline"
                  style={{
                    fontSize: "10px",
                    color: "oklch(var(--destructive))",
                    borderColor: "oklch(var(--destructive))",
                  }}
                >
                  {lowStock.length}
                </Badge>
              </div>
              {expanded.low_stock ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
            {expanded.low_stock && (
              <div className="mt-2 space-y-1">
                {lowStock.map((s) => (
                  <div
                    key={s.articleNo}
                    className="text-xs flex justify-between"
                    style={{ color: "oklch(var(--foreground))" }}
                  >
                    <span>{s.articleNo}</span>
                    <span style={{ color: "oklch(var(--destructive))" }}>
                      {s.available} pcs left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {highPending.length > 0 && (
        <Card
          style={{
            borderColor: "oklch(0.7 0.15 60 / 0.5)",
            background: "oklch(0.98 0.03 60 / 0.4)",
          }}
        >
          <CardContent className="p-3">
            <button
              type="button"
              className="w-full flex items-center justify-between"
              onClick={() => toggle("pending")}
              data-ocid="dashboard.toggle"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className="w-4 h-4"
                  style={{ color: "oklch(0.65 0.18 60)" }}
                />
                <span
                  className="text-xs font-semibold"
                  style={{ color: "oklch(0.5 0.18 60)" }}
                >
                  High Pending Production
                </span>
                <Badge
                  variant="outline"
                  style={{
                    fontSize: "10px",
                    color: "oklch(0.5 0.18 60)",
                    borderColor: "oklch(0.65 0.18 60)",
                  }}
                >
                  {highPending.length}
                </Badge>
              </div>
              {expanded.pending ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
            {expanded.pending && (
              <div className="mt-2 space-y-1">
                {highPending.map((m) => (
                  <div
                    key={m.articleNo}
                    className="text-xs flex justify-between"
                    style={{ color: "oklch(var(--foreground))" }}
                  >
                    <span>{m.articleNo}</span>
                    <span style={{ color: "oklch(0.5 0.18 60)" }}>
                      {m.cuttingQty - m.stitchedQty} pcs pending
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {dispatchReady.length > 0 && (
        <Card
          style={{
            borderColor: "oklch(0.6 0.15 150 / 0.5)",
            background: "oklch(0.97 0.04 150 / 0.4)",
          }}
        >
          <CardContent className="p-3">
            <button
              type="button"
              className="w-full flex items-center justify-between"
              onClick={() => toggle("dispatch_ready")}
              data-ocid="dashboard.toggle"
            >
              <div className="flex items-center gap-2">
                <CheckCircle
                  className="w-4 h-4"
                  style={{ color: "oklch(0.55 0.15 150)" }}
                />
                <span
                  className="text-xs font-semibold"
                  style={{ color: "oklch(0.45 0.15 150)" }}
                >
                  Dispatch Ready Articles
                </span>
                <Badge
                  variant="outline"
                  style={{
                    fontSize: "10px",
                    color: "oklch(0.45 0.15 150)",
                    borderColor: "oklch(0.55 0.15 150)",
                  }}
                >
                  {dispatchReady.length}
                </Badge>
              </div>
              {expanded.dispatch_ready ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
            {expanded.dispatch_ready && (
              <div className="mt-2 space-y-1">
                {dispatchReady.map((m) => (
                  <div
                    key={m.articleNo}
                    className="text-xs flex justify-between"
                    style={{ color: "oklch(var(--foreground))" }}
                  >
                    <span>{m.articleNo}</span>
                    <span style={{ color: "oklch(0.45 0.15 150)" }}>
                      {m.stitchedQty - m.dispatchedQty} pcs ready
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
