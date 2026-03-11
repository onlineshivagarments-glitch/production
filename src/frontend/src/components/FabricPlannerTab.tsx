import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileDown, Loader2, RefreshCw, Scissors } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { FabricConsumptionReport, ItemMaster } from "../backend";
import { useActor } from "../hooks/useActor";

function getFabricUnit(articleNo: string): string {
  const saved = localStorage.getItem(`fabricUnit_${articleNo}`);
  if (saved === "grams") return "g";
  if (saved === "kg") return "KG";
  return "m";
}

export function FabricPlannerTab() {
  const { actor } = useActor();
  const [fabricData, setFabricData] = useState<FabricConsumptionReport[]>([]);
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form to set fabric per piece
  const [planArticle, setPlanArticle] = useState("");
  const [planFabric, setPlanFabric] = useState("");
  const [planUnit, setPlanUnit] = useState<"meters" | "grams" | "kg">("meters");

  const loadData = async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const [fabric, itemList] = await Promise.all([
        actor.getFabricConsumptionReport().catch(() => []),
        actor.getItemMasters().catch(() => []),
      ]);
      setFabricData(fabric as typeof fabric);
      setItems(itemList as typeof itemList);
    } catch {
      toast.error("Failed to load fabric data");
    } finally {
      setLoading(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: load on actor ready
  useEffect(() => {
    loadData();
  }, [actor]);

  // When article selected in planner form, pre-fill existing fabric value and unit
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (planArticle && actor) {
      actor
        .getFabricPerPiece(planArticle)
        .then((val) => {
          if (val > 0) setPlanFabric(String(val));
          else setPlanFabric("");
        })
        .catch(() => {});
      // Load saved unit
      const savedUnit = localStorage.getItem(`fabricUnit_${planArticle}`) as
        | "meters"
        | "grams"
        | "kg"
        | null;
      setPlanUnit(savedUnit || "meters");
    } else {
      setPlanFabric("");
      setPlanUnit("meters");
    }
  }, [planArticle]);

  const handleSaveFabric = async () => {
    if (!actor) return;
    if (!planArticle) {
      toast.error("Select an article");
      return;
    }
    const val = Number.parseFloat(planFabric);
    if (!val || val <= 0) {
      toast.error("Enter valid fabric per piece");
      return;
    }
    setSaving(true);
    try {
      await actor.setFabricPerPiece(planArticle, val);
      // Persist fabric unit to localStorage
      localStorage.setItem(`fabricUnit_${planArticle}`, planUnit);
      toast.success("Fabric per piece saved");
      setPlanArticle("");
      setPlanFabric("");
      setPlanUnit("meters");
      await loadData();
    } catch {
      toast.error("Failed to save fabric data");
    } finally {
      setSaving(false);
    }
  };

  const totalFabricUsed = fabricData.reduce((s, r) => s + r.totalFabricUsed, 0);

  const articleOptions = items.map((i) => i.articleNo);

  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const html = `<html><head><title>Fabric Consumption Report</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f0f0f0}tfoot td{font-weight:bold;background:#f0f0f0}</style></head><body><h2>Fabric Consumption Report — ${new Date().toLocaleDateString()}</h2><table><thead><tr><th>Article</th><th>Fabric/Piece</th><th>Total Cutting</th><th>Total Fabric Used</th><th>Est. Required</th></tr></thead><tbody>${fabricData
      .map((r) => {
        const u = getFabricUnit(r.articleNo);
        return `<tr><td>${r.articleNo}</td><td>${r.fabricPerPiece.toFixed(u === "g" ? 0 : 2)} ${u}</td><td>${r.totalCutting}</td><td>${r.totalFabricUsed.toFixed(u === "g" ? 0 : 2)} ${u}</td><td>${(r.fabricPerPiece * r.totalCutting).toFixed(u === "g" ? 0 : 2)} ${u}</td></tr>`;
      })
      .join(
        "",
      )}</tbody><tfoot><tr><td colspan="3">TOTAL</td><td>${totalFabricUsed.toFixed(1)}</td><td></td></tr></tfoot></table></body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <p
              className="text-xs"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              Articles Tracked
            </p>
            <p
              className="text-2xl font-bold"
              style={{ color: "oklch(var(--foreground))" }}
            >
              {fabricData.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p
              className="text-xs"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              Total Fabric Used
            </p>
            <p
              className="text-2xl font-bold"
              style={{ color: "oklch(var(--primary))" }}
            >
              {totalFabricUsed.toFixed(1)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          data-ocid="fabric_planner.primary_button"
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
          data-ocid="fabric_planner.secondary_button"
          variant="outline"
          size="sm"
          onClick={handleExportPDF}
        >
          <FileDown className="w-4 h-4 mr-1" />
          Export PDF
        </Button>
      </div>

      {/* Set Fabric Per Piece Form */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Scissors className="w-4 h-4" />
            Set Fabric Per Piece
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Article Number</Label>
            <select
              data-ocid="fabric_planner.select"
              value={planArticle}
              onChange={(e) => setPlanArticle(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
              style={{
                background: "oklch(var(--background))",
                borderColor: "oklch(var(--border))",
                color: "oklch(var(--foreground))",
              }}
            >
              <option value="">Select article...</option>
              {articleOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Fabric Per Piece</Label>
            {/* Unit toggle */}
            <div className="flex gap-2 mt-1 mb-2">
              <button
                type="button"
                onClick={() => setPlanUnit("meters")}
                className="px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors"
                style={{
                  background:
                    planUnit === "meters"
                      ? "oklch(var(--primary))"
                      : "transparent",
                  color:
                    planUnit === "meters"
                      ? "oklch(var(--primary-foreground))"
                      : "oklch(var(--foreground))",
                  borderColor: "oklch(var(--border))",
                }}
              >
                Meters
              </button>
              <button
                type="button"
                onClick={() => setPlanUnit("grams")}
                className="px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors"
                style={{
                  background:
                    planUnit === "grams"
                      ? "oklch(var(--primary))"
                      : "transparent",
                  color:
                    planUnit === "grams"
                      ? "oklch(var(--primary-foreground))"
                      : "oklch(var(--foreground))",
                  borderColor: "oklch(var(--border))",
                }}
              >
                Grams
              </button>
              <button
                type="button"
                onClick={() => setPlanUnit("kg")}
                className="px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors"
                style={{
                  background:
                    planUnit === "kg" ? "oklch(var(--primary))" : "transparent",
                  color:
                    planUnit === "kg"
                      ? "oklch(var(--primary-foreground))"
                      : "oklch(var(--foreground))",
                  borderColor: "oklch(var(--border))",
                }}
              >
                KG
              </button>
            </div>
            <Input
              data-ocid="fabric_planner.input"
              type="number"
              step={planUnit === "meters" || planUnit === "kg" ? "0.01" : "1"}
              value={planFabric}
              onChange={(e) => setPlanFabric(e.target.value)}
              placeholder={
                planUnit === "meters"
                  ? "e.g. 1.5"
                  : planUnit === "kg"
                    ? "e.g. 1.25"
                    : "e.g. 250"
              }
            />
          </div>
          <Button
            data-ocid="fabric_planner.save_button"
            onClick={handleSaveFabric}
            disabled={saving}
            className="w-full"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {saving ? "Saving..." : "Save Fabric Data"}
          </Button>
        </CardContent>
      </Card>

      {/* Fabric Consumption Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Fabric Consumption Report</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {fabricData.length === 0 ? (
            <div
              data-ocid="fabric_planner.empty_state"
              className="text-center py-8"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              No fabric data. Set fabric per piece above to track consumption.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="fabric_planner.table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Article</TableHead>
                    <TableHead className="text-right">Fabric/Pc</TableHead>
                    <TableHead className="text-right">Cutting</TableHead>
                    <TableHead className="text-right">Used</TableHead>
                    <TableHead className="text-right">Required</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fabricData.map((row, idx) => {
                    const unit = getFabricUnit(row.articleNo);
                    const decimals = unit === "g" ? 0 : 2;
                    return (
                      <TableRow
                        key={row.articleNo}
                        data-ocid={`fabric_planner.item.${idx + 1}`}
                      >
                        <TableCell className="font-medium">
                          {row.articleNo}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.fabricPerPiece.toFixed(decimals)}
                          {unit}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.totalCutting}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.totalFabricUsed.toFixed(decimals)}
                          {unit}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {(row.fabricPerPiece * row.totalCutting).toFixed(
                            decimals,
                          )}
                          {unit}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fabric Requirement Planner */}
      {fabricData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Fabric Requirement Planner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {fabricData.map((row) => {
              const unit = getFabricUnit(row.articleNo);
              const decimals = unit === "g" ? 0 : 2;
              return (
                <div
                  key={row.articleNo}
                  className="flex items-center justify-between p-2 rounded"
                  style={{ background: "oklch(var(--muted) / 0.3)" }}
                >
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "oklch(var(--foreground))" }}
                    >
                      {row.articleNo}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "oklch(var(--muted-foreground))" }}
                    >
                      {row.fabricPerPiece.toFixed(decimals)}
                      {unit}/pc × {row.totalCutting} pcs
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    style={{
                      color: "oklch(var(--primary))",
                      borderColor: "oklch(var(--primary))",
                    }}
                  >
                    {(row.fabricPerPiece * row.totalCutting).toFixed(decimals)}
                    {unit}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
