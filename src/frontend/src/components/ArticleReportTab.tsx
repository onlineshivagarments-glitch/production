import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Download, Package } from "lucide-react";
import { toast } from "sonner";
import { useGetArticleReport } from "../hooks/useQueries";
import { exportToCSV } from "../utils/csvExport";

export function ArticleReportTab() {
  const { data: articleReport = [], isLoading } = useGetArticleReport();

  const handleExport = () => {
    if (articleReport.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = ["Article Number", "Total Pcs Produced"];
    const rows = articleReport.map(([articleNo, pcs]) => [articleNo, pcs]);
    exportToCSV("article_production_report", headers, rows);
    toast.success("Article report exported");
  };

  const totalPcs = articleReport.reduce((sum, [, pcs]) => sum + pcs, 0);

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Summary */}
      {!isLoading && articleReport.length > 0 && (
        <div
          data-ocid="article_report.total_card"
          className="rounded-lg p-4"
          style={{
            background: "oklch(var(--primary) / 0.08)",
            border: "1.5px solid oklch(var(--primary) / 0.3)",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <div
                className="text-xs font-semibold uppercase tracking-wide mb-1"
                style={{ color: "oklch(var(--primary))" }}
              >
                Total Production
              </div>
              <div
                className="font-heading font-bold text-2xl leading-none"
                style={{ color: "oklch(var(--foreground))" }}
              >
                {totalPcs.toLocaleString()}
                <span
                  className="text-sm font-normal ml-1"
                  style={{ color: "oklch(var(--muted-foreground))" }}
                >
                  pcs
                </span>
              </div>
              <div
                className="text-xs mt-1"
                style={{ color: "oklch(var(--muted-foreground))" }}
              >
                Across all {articleReport.length} article
                {articleReport.length !== 1 ? "s" : ""}
              </div>
            </div>
            <Package
              className="w-10 h-10 shrink-0"
              style={{ color: "oklch(var(--primary) / 0.4)" }}
            />
          </div>
        </div>
      )}

      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package
            className="w-4 h-4"
            style={{ color: "oklch(var(--primary))" }}
          />
          <span
            className="data-label"
            style={{ color: "oklch(var(--foreground))" }}
          >
            {articleReport.length} Article
            {articleReport.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Button
          data-ocid="article_report.export_button"
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
        <div data-ocid="article_report.loading_state" className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border p-4 space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-8 w-1/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && articleReport.length === 0 && (
        <div
          data-ocid="article_report.empty_state"
          className="flex flex-col items-center justify-center py-16 gap-3"
          style={{ color: "oklch(var(--muted-foreground))" }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "oklch(var(--muted))" }}
          >
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="text-center">
            <div
              className="font-heading font-bold text-base"
              style={{ color: "oklch(var(--foreground))" }}
            >
              No Article Data
            </div>
            <div className="text-sm mt-1">
              Save production records to see article reports
            </div>
          </div>
        </div>
      )}

      {/* Article Cards */}
      {!isLoading && articleReport.length > 0 && (
        <div data-ocid="article_report.list" className="space-y-2">
          {articleReport.map(([articleNo, pcs], index) => {
            const ocidSuffix = index < 2 ? `.${index + 1}` : "";
            const pctOfTotal = totalPcs > 0 ? (pcs / totalPcs) * 100 : 0;

            return (
              <div
                key={articleNo}
                data-ocid={`article_report.item${ocidSuffix}`}
                className="rounded-lg border p-4 space-y-3"
                style={{
                  background: "oklch(var(--card))",
                  borderColor: "oklch(var(--border))",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="data-label mb-0.5">Article Number</div>
                    <div
                      className="font-heading font-bold text-lg leading-tight truncate"
                      style={{ color: "oklch(var(--primary))" }}
                    >
                      {articleNo}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="data-label mb-0.5">Total Pcs</div>
                    <div
                      className="font-heading font-bold text-2xl leading-none"
                      style={{ color: "oklch(var(--foreground))" }}
                    >
                      {pcs.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Progress bar showing relative contribution */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span
                      className="text-xs"
                      style={{ color: "oklch(var(--muted-foreground))" }}
                    >
                      Share of Total Production
                    </span>
                    <span
                      className="text-xs font-bold"
                      style={{ color: "oklch(var(--primary))" }}
                    >
                      {pctOfTotal.toFixed(1)}%
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: "oklch(var(--muted))" }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pctOfTotal}%`,
                        background: "oklch(var(--primary))",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
