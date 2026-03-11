import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, TrendingUp, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useGetDispatchRecords,
  useGetTailorRecords,
} from "../hooks/useQueries";
import { exportToCSV } from "../utils/csvExport";

interface ArticleRow {
  articleNo: string;
  totalDispatched: number;
  totalProduced: number;
  balance: number;
}

export function MasterReportTab() {
  const { data: dispatchRecords = [], isLoading: loadingDispatch } =
    useGetDispatchRecords();
  const { data: tailorRecords = [], isLoading: loadingTailor } =
    useGetTailorRecords();
  const isLoading = loadingDispatch || loadingTailor;

  const [selectedParty, setSelectedParty] = useState<string | null>(null);

  // Derive party list from dispatch records
  const partyList = useMemo(() => {
    const names = new Set<string>();
    for (const r of dispatchRecords) {
      if (r.partyName?.trim()) names.add(r.partyName.trim());
    }
    return Array.from(names).sort();
  }, [dispatchRecords]);

  // Summary per party
  const partySummaries = useMemo(() => {
    return partyList.map((partyName) => {
      const partyDispatches = dispatchRecords.filter(
        (r) => r.partyName === partyName,
      );
      const totalDispatched = partyDispatches.reduce(
        (s, r) => s + r.dispatchPcs,
        0,
      );
      const totalPayment = partyDispatches.reduce(
        (s, r) => s + r.finalPayment,
        0,
      );
      return { partyName, totalDispatched, totalPayment };
    });
  }, [partyList, dispatchRecords]);

  // Article-wise breakdown for selected party
  const partyArticleRows = useMemo((): ArticleRow[] => {
    if (!selectedParty) return [];

    // Dispatched articles for this party
    const partyDispatches = dispatchRecords.filter(
      (r) => r.partyName === selectedParty,
    );
    const dispatchByArticle = new Map<string, number>();
    for (const r of partyDispatches) {
      dispatchByArticle.set(
        r.articleNo,
        (dispatchByArticle.get(r.articleNo) ?? 0) + r.dispatchPcs,
      );
    }

    // Produced (tailor) - article level totals (not party-specific)
    const producedByArticle = new Map<string, number>();
    for (const r of tailorRecords) {
      producedByArticle.set(
        r.articleNo,
        (producedByArticle.get(r.articleNo) ?? 0) + r.pcsGiven,
      );
    }

    return Array.from(dispatchByArticle.entries()).map(
      ([articleNo, totalDispatched]) => {
        const totalProduced = producedByArticle.get(articleNo) ?? 0;
        return {
          articleNo,
          totalDispatched,
          totalProduced,
          balance: totalDispatched - totalProduced,
        };
      },
    );
  }, [selectedParty, dispatchRecords, tailorRecords]);

  const partyTotals = useMemo(() => {
    return partyArticleRows.reduce(
      (acc, row) => ({
        totalDispatched: acc.totalDispatched + row.totalDispatched,
        totalProduced: acc.totalProduced + row.totalProduced,
        totalBalance: acc.totalBalance + row.balance,
      }),
      { totalDispatched: 0, totalProduced: 0, totalBalance: 0 },
    );
  }, [partyArticleRows]);

  const summaryTotals = useMemo(() => {
    return partySummaries.reduce(
      (acc, s) => ({
        totalPcs: acc.totalPcs + s.totalDispatched,
        totalAmount: acc.totalAmount + s.totalPayment,
      }),
      { totalPcs: 0, totalAmount: 0 },
    );
  }, [partySummaries]);

  const handleExport = () => {
    if (partySummaries.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = ["Party Name", "Total Dispatched PCS", "Total Payment (₹)"];
    const rows = partySummaries.map((s) => [
      s.partyName,
      s.totalDispatched,
      s.totalPayment.toFixed(2),
    ]);
    exportToCSV("party_head_report", headers, rows);
    toast.success("Party head report exported");
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Summary Totals Card */}
      {!isLoading && partySummaries.length > 0 && (
        <div
          className="rounded-lg p-4 grid grid-cols-2 gap-4"
          style={{
            background: "oklch(var(--primary) / 0.08)",
            border: "1.5px solid oklch(var(--primary) / 0.25)",
          }}
        >
          <div>
            <div className="data-label mb-1">Total Dispatched</div>
            <div
              className="data-value"
              style={{ color: "oklch(var(--primary))" }}
            >
              {summaryTotals.totalPcs.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="data-label mb-1">Total Payment</div>
            <div
              className="data-value"
              style={{ color: "oklch(var(--success))" }}
            >
              ₹ {summaryTotals.totalAmount.toFixed(0)}
            </div>
          </div>
        </div>
      )}

      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp
            className="w-4 h-4"
            style={{ color: "oklch(var(--primary))" }}
          />
          <span
            className="data-label"
            style={{ color: "oklch(var(--foreground))" }}
          >
            {partySummaries.length} Party Head
            {partySummaries.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Button
          data-ocid="party_head.export_button"
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="gap-2 h-9"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div data-ocid="party_head.loading_state" className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border p-4 space-y-2">
              <Skeleton className="h-5 w-1/2" />
              <div className="flex gap-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-8 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && partySummaries.length === 0 && (
        <div
          data-ocid="party_head.empty_state"
          className="flex flex-col items-center justify-center py-16 gap-3"
          style={{ color: "oklch(var(--muted-foreground))" }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "oklch(var(--muted))" }}
          >
            <Users className="w-8 h-8" />
          </div>
          <div className="text-center">
            <div
              className="font-heading font-bold text-base"
              style={{ color: "oklch(var(--foreground))" }}
            >
              No Party Head Data
            </div>
            <div className="text-sm mt-1">
              Add dispatch records with party names to see reports
            </div>
          </div>
        </div>
      )}

      {/* Party Head Cards */}
      {!isLoading && partySummaries.length > 0 && (
        <div data-ocid="party_head.list" className="space-y-2">
          {partySummaries.map((s, index) => {
            const ocidIndex = index + 1;
            const ocid =
              ocidIndex <= 3
                ? `party_head.item.${ocidIndex}`
                : "party_head.item";
            return (
              <button
                key={s.partyName}
                type="button"
                data-ocid={ocid}
                onClick={() => setSelectedParty(s.partyName)}
                className="w-full text-left rounded-lg border p-4 space-y-3 transition-all hover:shadow-md active:scale-[0.99] cursor-pointer"
                style={{
                  background: "oklch(var(--card))",
                  borderColor: "oklch(var(--border))",
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-heading font-bold text-sm"
                      style={{
                        background: "oklch(var(--primary) / 0.12)",
                        color: "oklch(var(--primary))",
                      }}
                    >
                      {s.partyName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-heading font-bold text-base leading-tight truncate">
                        {s.partyName}
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "oklch(var(--muted-foreground))" }}
                      >
                        Party Head • Tap for details
                      </div>
                    </div>
                  </div>
                  <div
                    className="text-xs font-semibold px-2 py-1 rounded"
                    style={{
                      background: "oklch(var(--primary) / 0.1)",
                      color: "oklch(var(--primary))",
                    }}
                  >
                    View
                  </div>
                </div>
                <div
                  className="grid grid-cols-2 gap-3 border-t pt-3"
                  style={{ borderColor: "oklch(var(--border))" }}
                >
                  <div>
                    <div className="data-label mb-0.5">
                      Total Dispatched PCS
                    </div>
                    <div
                      className="font-heading font-bold text-xl leading-none"
                      style={{ color: "oklch(var(--primary))" }}
                    >
                      {s.totalDispatched.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="data-label mb-0.5">Total Payment</div>
                    <div
                      className="font-heading font-bold text-xl leading-none"
                      style={{ color: "oklch(var(--success))" }}
                    >
                      ₹ {s.totalPayment.toFixed(2)}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Party Detail Dialog */}
      <Dialog
        open={!!selectedParty}
        onOpenChange={(open) => {
          if (!open) setSelectedParty(null);
        }}
      >
        <DialogContent
          data-ocid="party_head.detail_dialog"
          className="max-w-sm mx-auto max-h-[85vh] flex flex-col"
        >
          <DialogHeader className="flex-row items-center justify-between space-y-0 pr-0">
            <DialogTitle
              style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
              className="flex items-center gap-2 min-w-0"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-heading font-bold text-sm"
                style={{
                  background: "oklch(var(--primary) / 0.12)",
                  color: "oklch(var(--primary))",
                }}
              >
                {selectedParty?.charAt(0).toUpperCase()}
              </div>
              <span className="truncate">{selectedParty}</span>
            </DialogTitle>
            <Button
              data-ocid="party_head.detail.close_button"
              variant="ghost"
              size="icon"
              className="shrink-0 w-8 h-8"
              onClick={() => setSelectedParty(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogHeader>

          {/* Totals Summary */}
          {partyArticleRows.length > 0 && (
            <div
              className="rounded-lg p-3 grid grid-cols-3 gap-2 shrink-0"
              style={{
                background: "oklch(var(--primary) / 0.06)",
                border: "1.5px solid oklch(var(--primary) / 0.2)",
              }}
            >
              <div>
                <div className="data-label text-xs mb-0.5">Dispatched</div>
                <div
                  className="font-heading font-bold text-base leading-none"
                  style={{ color: "oklch(var(--foreground))" }}
                >
                  {partyTotals.totalDispatched}
                  <span className="text-xs font-normal ml-0.5">PCS</span>
                </div>
              </div>
              <div>
                <div className="data-label text-xs mb-0.5">Produced</div>
                <div
                  className="font-heading font-bold text-base leading-none"
                  style={{ color: "oklch(var(--primary))" }}
                >
                  {partyTotals.totalProduced}
                  <span className="text-xs font-normal ml-0.5">PCS</span>
                </div>
              </div>
              <div>
                <div className="data-label text-xs mb-0.5">Balance</div>
                <div
                  className="font-heading font-bold text-base leading-none"
                  style={{
                    color:
                      partyTotals.totalBalance < 0
                        ? "oklch(var(--destructive))"
                        : "oklch(var(--success))",
                  }}
                >
                  {partyTotals.totalBalance}
                  <span className="text-xs font-normal ml-0.5">PCS</span>
                </div>
              </div>
            </div>
          )}

          {/* Article-wise Table */}
          <div className="overflow-auto flex-1">
            {partyArticleRows.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-10 gap-2"
                style={{ color: "oklch(var(--muted-foreground))" }}
              >
                <div className="text-sm">
                  No dispatch records found for this party
                </div>
              </div>
            ) : (
              <Table data-ocid="party_head.detail.table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-semibold">
                      Article No
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Dispatched
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Produced
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Balance
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partyArticleRows.map((row) => (
                    <TableRow key={row.articleNo}>
                      <TableCell
                        className="font-medium text-sm"
                        style={{ color: "oklch(var(--primary))" }}
                      >
                        {row.articleNo}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {row.totalDispatched}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {row.totalProduced}
                      </TableCell>
                      <TableCell
                        className="text-right text-sm font-semibold"
                        style={{
                          color:
                            row.balance < 0
                              ? "oklch(var(--destructive))"
                              : "oklch(var(--success))",
                        }}
                      >
                        {row.balance}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow
                    style={{
                      background: "oklch(var(--muted))",
                      borderTop: "2px solid oklch(var(--border))",
                    }}
                  >
                    <TableCell className="font-bold text-sm">Total</TableCell>
                    <TableCell className="text-right font-bold text-sm">
                      {partyTotals.totalDispatched}
                    </TableCell>
                    <TableCell className="text-right font-bold text-sm">
                      {partyTotals.totalProduced}
                    </TableCell>
                    <TableCell
                      className="text-right font-bold text-sm"
                      style={{
                        color:
                          partyTotals.totalBalance < 0
                            ? "oklch(var(--destructive))"
                            : "oklch(var(--success))",
                      }}
                    >
                      {partyTotals.totalBalance}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
