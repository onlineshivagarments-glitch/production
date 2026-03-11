import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  FileDown,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { FinishedStockSummary, ProductionMismatch } from "../backend";
import { useActor } from "../hooks/useActor";

export function FinishedStockTab() {
  const { actor } = useActor();
  const [stockData, setStockData] = useState<FinishedStockSummary[]>([]);
  const [mismatches, setMismatches] = useState<ProductionMismatch[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const [stock, mismatch] = await Promise.all([
        actor.getFinishedStockSummary().catch(() => []),
        actor.getProductionMismatches().catch(() => []),
      ]);
      setStockData(stock as typeof stock);
      setMismatches(mismatch as typeof mismatch);
    } catch {
      toast.error("Failed to load stock data");
    } finally {
      setLoading(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: load on actor ready
  useEffect(() => {
    loadData();
  }, [actor]);

  const totalProduced = stockData.reduce((s, r) => s + r.totalProduced, 0);
  const totalDispatched = stockData.reduce((s, r) => s + r.totalDispatched, 0);
  const totalAvailable = stockData.reduce((s, r) => s + r.available, 0);

  const pendingProduction = mismatches.filter(
    (m) => m.cuttingQty > m.stitchedQty,
  );
  const readyForDispatch = mismatches.filter(
    (m) => m.stitchedQty > m.dispatchedQty,
  );

  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const tableHtml = `<html><head><title>Finished Stock Report</title><style>body{font-family:sans-serif;padding:20px}h2{margin-bottom:16px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f0f0f0}.low{background:#fef3c7}tfoot td{font-weight:bold;background:#f0f0f0}</style></head><body><h2>Finished Stock Report — ${new Date().toLocaleDateString()}</h2><table><thead><tr><th>Article</th><th>Total Produced</th><th>Total Dispatched</th><th>Available Stock</th><th>Status</th></tr></thead><tbody>${stockData.map((r) => `<tr class="${r.available < 50 ? "low" : ""}"><td>${r.articleNo}</td><td>${r.totalProduced}</td><td>${r.totalDispatched}</td><td>${r.available}</td><td>${r.available < 50 ? "⚠ Low Stock" : "OK"}</td></tr>`).join("")}</tbody><tfoot><tr><td>TOTAL</td><td>${totalProduced}</td><td>${totalDispatched}</td><td>${totalAvailable}</td><td></td></tr></tfoot></table></body></html>`;
    printWindow.document.write(tableHtml);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <p
              className="text-xs"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              Total Articles
            </p>
            <p
              className="text-2xl font-bold"
              style={{ color: "oklch(var(--foreground))" }}
            >
              {stockData.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p
              className="text-xs"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              Total Produced
            </p>
            <p
              className="text-2xl font-bold"
              style={{ color: "oklch(var(--primary))" }}
            >
              {totalProduced}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p
              className="text-xs"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              Total Dispatched
            </p>
            <p
              className="text-2xl font-bold"
              style={{ color: "oklch(var(--foreground))" }}
            >
              {totalDispatched}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p
              className="text-xs"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              Available Stock
            </p>
            <p
              className="text-2xl font-bold"
              style={{
                color:
                  totalAvailable < 100
                    ? "oklch(var(--destructive))"
                    : "oklch(var(--primary))",
              }}
            >
              {totalAvailable}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          data-ocid="finished_stock.primary_button"
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw
            className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
        <Button
          data-ocid="finished_stock.secondary_button"
          variant="outline"
          size="sm"
          onClick={handleExportPDF}
        >
          <FileDown className="w-4 h-4 mr-1" />
          Export PDF
        </Button>
      </div>

      {/* Stock Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Finished Goods Stock
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {stockData.length === 0 ? (
            <div
              data-ocid="finished_stock.empty_state"
              className="text-center py-8"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              No stock data yet. Add tailor and dispatch records to see stock.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="finished_stock.table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Article</TableHead>
                    <TableHead className="text-right">Produced</TableHead>
                    <TableHead className="text-right">Dispatched</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockData.map((row, idx) => (
                    <TableRow
                      key={row.articleNo}
                      data-ocid={`finished_stock.item.${idx + 1}`}
                      style={{
                        background:
                          row.available < 50
                            ? "oklch(0.97 0.05 80 / 0.4)"
                            : undefined,
                      }}
                    >
                      <TableCell className="font-medium">
                        {row.articleNo}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.totalProduced}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.totalDispatched}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {row.available}
                      </TableCell>
                      <TableCell>
                        {row.available < 50 ? (
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: "oklch(var(--destructive))",
                              color: "oklch(var(--destructive))",
                              fontSize: "10px",
                            }}
                          >
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: "oklch(var(--primary))",
                              color: "oklch(var(--primary))",
                              fontSize: "10px",
                            }}
                          >
                            OK
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Production Mismatch Panel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle
              className="w-4 h-4"
              style={{ color: "oklch(var(--destructive))" }}
            />
            Production Mismatch Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingProduction.length === 0 && readyForDispatch.length === 0 ? (
            <div
              className="flex items-center gap-2 text-sm py-2"
              style={{ color: "oklch(var(--primary))" }}
            >
              <CheckCircle className="w-4 h-4" />
              No production mismatches detected
            </div>
          ) : (
            <>
              {pendingProduction.length > 0 && (
                <div>
                  <p
                    className="text-xs font-semibold mb-1"
                    style={{ color: "oklch(var(--destructive))" }}
                  >
                    ⚠ Production Pending ({pendingProduction.length} articles)
                  </p>
                  <div className="space-y-1">
                    {pendingProduction.map((m) => (
                      <div
                        key={m.articleNo}
                        className="text-xs rounded p-2"
                        style={{
                          background: "oklch(0.97 0.05 30 / 0.3)",
                          color: "oklch(var(--foreground))",
                        }}
                      >
                        <span className="font-medium">{m.articleNo}</span> —
                        Cut: {m.cuttingQty} | Stitched: {m.stitchedQty} |
                        Pending:{" "}
                        <span style={{ color: "oklch(var(--destructive))" }}>
                          {m.cuttingQty - m.stitchedQty}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {readyForDispatch.length > 0 && (
                <div>
                  <p
                    className="text-xs font-semibold mb-1"
                    style={{ color: "oklch(0.6 0.15 150)" }}
                  >
                    ✓ Ready for Dispatch ({readyForDispatch.length} articles)
                  </p>
                  <div className="space-y-1">
                    {readyForDispatch.map((m) => (
                      <div
                        key={m.articleNo}
                        className="text-xs rounded p-2"
                        style={{
                          background: "oklch(0.97 0.05 150 / 0.3)",
                          color: "oklch(var(--foreground))",
                        }}
                      >
                        <span className="font-medium">{m.articleNo}</span> —
                        Stitched: {m.stitchedQty} | Dispatched:{" "}
                        {m.dispatchedQty} | Available:{" "}
                        <span style={{ color: "oklch(0.5 0.15 150)" }}>
                          {m.stitchedQty - m.dispatchedQty}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
