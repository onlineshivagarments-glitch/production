import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, FileDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  AdditionalWorkRecord,
  ItemMaster,
  TailorRecord,
} from "../backend";
import { useActor } from "../hooks/useActor";
import { loadArticleRates } from "../utils/articleRates";
import { getFromCache, saveToCache } from "../utils/offlineCache";
import { exportTailorPdf } from "../utils/pdfExport";
import { cleanErrorMessage, withRetry } from "../utils/retryUtils";
import { enqueuePending } from "../utils/syncQueue";
import { SearchableDropdown } from "./SearchableDropdown";

interface ColorEntry {
  color: string;
  sizes: Record<string, number>;
}

function parseColorSizeData(raw: string): ColorEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(
      (e: { color: string; sizes: Record<string, number> }) => ({
        color: e.color || "",
        sizes: e.sizes || {},
      }),
    );
  } catch {
    return [];
  }
}

interface FormState {
  articleNo: string;
  color: string;
  size: string;
  tailorName: string;
  pcsGiven: string;
  tailorRate: string;
  date: string;
}

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): FormState => ({
  articleNo: "",
  color: "",
  size: "",
  tailorName: "",
  pcsGiven: "",
  tailorRate: "",
  date: today(),
});

export function TailorTab() {
  const { actor } = useActor();
  const [records, setRecords] = useState<TailorRecord[]>([]);
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [addWorkRecords, setAddWorkRecords] = useState<AdditionalWorkRecord[]>(
    [],
  );
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editId, setEditId] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filterDate, setFilterDate] = useState(today());
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [showArticleBreakdown, setShowArticleBreakdown] = useState(false);
  const [filterArticle, setFilterArticle] = useState("");
  const [showPdfMenu, setShowPdfMenu] = useState(false);

  const tailorAmount =
    (Number.parseFloat(form.pcsGiven) || 0) *
    (Number.parseFloat(form.tailorRate) || 0);

  const loadData = async () => {
    // 1. Load from cache immediately
    const cached = await getFromCache<typeof records>(
      "ProductionMasterCache",
      "cache",
      "tailor_cache",
    );
    if (cached && cached.length > 0) setRecords(cached);

    if (!actor) return;
    try {
      const [recs, itemList, awRecs] = await Promise.all([
        actor.getTailorRecords(),
        actor.getItemMasters().catch(() => []),
        actor.getAdditionalWorkRecords().catch(() => []),
      ]);
      setRecords(recs as typeof recs);
      setItems(itemList as typeof itemList);
      setAddWorkRecords(awRecs as typeof awRecs);
      saveToCache("ProductionMasterCache", "cache", "tailor_cache", recs).catch(
        () => {},
      );
    } catch {
      if (!cached || cached.length === 0) return;
      import("sonner").then(({ toast }) => {
        toast.info("Showing cached data – server unavailable", {
          id: "tailor-cached",
        });
      });
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: load on actor ready
  useEffect(() => {
    loadData();
  }, [actor]);

  // Auto-fill tailor rate from Item Master rates when articleNo changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (form.articleNo && editId === null) {
      const rates = loadArticleRates(form.articleNo);
      if (rates.tailorRate > 0) {
        setForm((f) => ({ ...f, tailorRate: String(rates.tailorRate) }));
      }
    }
  }, [form.articleNo]);

  // Derived: color entries for selected article
  const selectedArticleColorEntries = useMemo(() => {
    const item = items.find((i) => i.articleNo === form.articleNo);
    if (!item) return [];
    return parseColorSizeData(item.colorSizeData);
  }, [items, form.articleNo]);

  // Available colors for selected article
  const availableColors = useMemo(
    () => selectedArticleColorEntries.map((ce) => ce.color),
    [selectedArticleColorEntries],
  );

  // Available sizes for selected color
  const availableSizes = useMemo(() => {
    if (!form.color) return [];
    const ce = selectedArticleColorEntries.find((c) => c.color === form.color);
    if (!ce) return [];
    return Object.entries(ce.sizes)
      .filter(([, qty]) => qty > 0)
      .map(([size]) => size);
  }, [selectedArticleColorEntries, form.color]);

  // Cutting qty for selected color+size
  const cuttingQtyForColorSize = useMemo(() => {
    if (!form.color || !form.size) return 0;
    const ce = selectedArticleColorEntries.find((c) => c.color === form.color);
    return ce?.sizes[form.size] || 0;
  }, [selectedArticleColorEntries, form.color, form.size]);

  const handleSave = async () => {
    if (!actor) {
      toast.error("Not connected");
      return;
    }
    if (!form.articleNo.trim()) {
      toast.error("Article Number required");
      return;
    }
    if (!form.color) {
      toast.error("Color is required");
      return;
    }
    if (!form.tailorName.trim()) {
      toast.error("Tailor Name required");
      return;
    }
    const pcs = Number.parseFloat(form.pcsGiven) || 0;
    if (pcs <= 0) {
      toast.error("PCS must be greater than 0");
      return;
    }
    const rate = Number.parseFloat(form.tailorRate) || 0;

    setLoading(true);
    try {
      // Article-level master cutting quantity validation
      const selectedItem = items.find((i) => i.articleNo === form.articleNo);
      const masterCuttingQty = selectedItem ? selectedItem.totalQuantity : 0;
      if (masterCuttingQty > 0) {
        const alreadyStitchedTotal = await actor.getTailorQtyByArticle(
          form.articleNo,
        );
        let effectiveTotalStitched = alreadyStitchedTotal;
        if (editId !== null) {
          const currentRec = records.find((r) => r.id === editId);
          if (currentRec) {
            effectiveTotalStitched = Math.max(
              0,
              alreadyStitchedTotal - currentRec.pcsGiven,
            );
          }
        }
        if (effectiveTotalStitched + pcs > masterCuttingQty) {
          toast.error("Production cannot exceed Master Cutting Quantity.");
          setLoading(false);
          return;
        }
      }

      // Get already stitched qty for this color+size from backend
      const alreadyStitched = await actor.getStitchedQtyByColorSize(
        form.articleNo,
        form.color,
        form.size,
      );

      // If editing, subtract current record's pcsGiven from existing stitched qty
      let effectiveStitched = alreadyStitched;
      if (editId !== null) {
        const currentRec = records.find((r) => r.id === editId);
        if (currentRec) {
          effectiveStitched = Math.max(
            0,
            alreadyStitched - currentRec.pcsGiven,
          );
        }
      }

      if (
        form.size !== "All Sizes" &&
        effectiveStitched + pcs > cuttingQtyForColorSize
      ) {
        toast.error(
          "Error: Work quantity cannot exceed cutting quantity for this color and size.",
        );
        setLoading(false);
        return;
      }

      const amount = pcs * rate;
      if (editId !== null) {
        await withRetry(() =>
          actor.updateTailorRecord(
            editId,
            form.date,
            form.articleNo,
            form.tailorName,
            pcs,
            rate,
            amount,
            form.color,
            form.size,
          ),
        );
        toast.success("Record updated");
      } else {
        await withRetry(() =>
          actor.addTailorRecord(
            form.date,
            form.articleNo,
            form.tailorName,
            pcs,
            rate,
            amount,
            form.color,
            form.size,
          ),
        );
        toast.success("Record saved");
      }
      setForm(emptyForm());
      setEditId(null);
      setShowForm(false);
      await loadData();
    } catch (saveErr) {
      console.error("[TailorTab] Backend save error:", saveErr);
      // Enqueue for offline sync
      if (editId === null) {
        const pendingData = {
          date: form.date,
          articleNo: form.articleNo,
          tailorName: form.tailorName,
          pcsGiven: pcs,
          tailorRate: rate,
          color: form.color,
          size: form.size,
        };
        enqueuePending("tailor", pendingData);
        toast.warning("Saved offline – will sync when server is available");
      } else {
        toast.error(cleanErrorMessage(saveErr));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (r: TailorRecord) => {
    setForm({
      articleNo: r.articleNo,
      color: r.color || "",
      size: r.size || "",
      tailorName: r.tailorName,
      pcsGiven: String(r.pcsGiven),
      tailorRate: String(r.tailorRate),
      date: r.date,
    });
    setEditId(r.id);
    setShowForm(true);
  };

  const handleDelete = async (id: bigint) => {
    if (!actor) return;
    if (!confirm("Delete this record?")) return;
    try {
      await actor.deleteTailorRecord(id);
      toast.success("Deleted");
      await loadData();
    } catch {
      toast.error("Failed to delete");
    }
  };

  // Date-filtered records
  const dateFilteredRecords = useMemo(
    () => records.filter((r) => r.date === filterDate),
    [records, filterDate],
  );

  // Summary banner for selected date
  const dateSummary = useMemo(() => {
    const totalPcs = dateFilteredRecords.reduce((s, r) => s + r.pcsGiven, 0);
    const totalAmount = dateFilteredRecords.reduce(
      (s, r) => s + r.tailorAmount,
      0,
    );
    return { count: dateFilteredRecords.length, totalPcs, totalAmount };
  }, [dateFilteredRecords]);

  // Employee-wise grouping for the selected date
  const employeeGroups = useMemo(() => {
    const map = new Map<string, TailorRecord[]>();
    for (const r of dateFilteredRecords) {
      const list = map.get(r.tailorName) ?? [];
      list.push(r);
      map.set(r.tailorName, list);
    }
    return Array.from(map.entries()).map(([name, recs]) => {
      const tailorTotal = recs.reduce((s, r) => s + r.tailorAmount, 0);
      const tailorPcs = recs.reduce((s, r) => s + r.pcsGiven, 0);
      const awForEmployee = addWorkRecords.filter(
        (aw) => aw.employeeName === name && aw.date === filterDate,
      );
      const awTotal = awForEmployee.reduce((s, aw) => s + aw.totalAmount, 0);
      return {
        name,
        recs,
        tailorTotal,
        tailorPcs,
        awForEmployee,
        awTotal,
        netPayment: tailorTotal + awTotal,
      };
    });
  }, [dateFilteredRecords, addWorkRecords, filterDate]);

  // Article-wise breakdown (all time)
  const articleBreakdown = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const r of records) {
      let tailorMap = map.get(r.articleNo);
      if (!tailorMap) {
        tailorMap = new Map();
        map.set(r.articleNo, tailorMap);
      }
      tailorMap.set(
        r.tailorName,
        (tailorMap.get(r.tailorName) ?? 0) + r.pcsGiven,
      );
    }
    return Array.from(map.entries()).map(([articleNo, tailors]) => ({
      articleNo,
      tailors: Array.from(tailors.entries()).map(([name, pcs]) => ({
        name,
        pcs,
      })),
    }));
  }, [records]);

  const filteredAll = filterArticle
    ? records.filter((r) =>
        r.articleNo.toLowerCase().includes(filterArticle.toLowerCase()),
      )
    : records;

  // PDF export helpers
  const handleExportDaily = () => {
    setShowPdfMenu(false);
    exportTailorPdf(
      dateFilteredRecords.map((r) => ({
        date: r.date,
        employeeName: r.tailorName,
        articleNo: r.articleNo,
        color: r.color,
        size: r.size,
        pcsGiven: r.pcsGiven,
        tailorRate: r.tailorRate,
        tailorAmount: r.tailorAmount,
      })),
      "Tailor Daily Report",
      `Date: ${filterDate}`,
    );
  };

  const handleExportMonthly = () => {
    setShowPdfMenu(false);
    const month = filterDate.slice(0, 7);
    const monthRecs = records.filter((r) => r.date.startsWith(month));
    exportTailorPdf(
      monthRecs.map((r) => ({
        date: r.date,
        employeeName: r.tailorName,
        articleNo: r.articleNo,
        color: r.color,
        size: r.size,
        pcsGiven: r.pcsGiven,
        tailorRate: r.tailorRate,
        tailorAmount: r.tailorAmount,
      })),
      "Tailor Monthly Report",
      `Month: ${month}`,
    );
  };

  const handleExportArticle = () => {
    setShowPdfMenu(false);
    const artRecs = filterArticle
      ? records.filter((r) =>
          r.articleNo.toLowerCase().includes(filterArticle.toLowerCase()),
        )
      : records;
    exportTailorPdf(
      artRecs.map((r) => ({
        date: r.date,
        employeeName: r.tailorName,
        articleNo: r.articleNo,
        color: r.color,
        size: r.size,
        pcsGiven: r.pcsGiven,
        tailorRate: r.tailorRate,
        tailorAmount: r.tailorAmount,
      })),
      "Tailor Article-wise Report",
      filterArticle ? `Article: ${filterArticle}` : "All Articles",
    );
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2
          className="text-lg font-bold"
          style={{ color: "oklch(var(--foreground))" }}
        >
          Tailors
        </h2>
        <div className="flex gap-2">
          {/* PDF Export button */}
          <div className="relative">
            <Button
              data-ocid="tailor.pdf_button"
              variant="outline"
              size="sm"
              onClick={() => setShowPdfMenu((v) => !v)}
            >
              <FileDown className="w-4 h-4 mr-1" /> PDF
            </Button>
            {showPdfMenu && (
              <div
                className="absolute right-0 top-8 z-50 rounded-xl border shadow-lg overflow-hidden"
                style={{
                  background: "oklch(var(--card))",
                  borderColor: "oklch(var(--border))",
                  minWidth: "180px",
                }}
              >
                <button
                  type="button"
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                  style={{ color: "oklch(var(--foreground))" }}
                  onClick={handleExportDaily}
                >
                  Export Daily Report
                </button>
                <button
                  type="button"
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors border-t"
                  style={{
                    color: "oklch(var(--foreground))",
                    borderColor: "oklch(var(--border))",
                  }}
                  onClick={handleExportMonthly}
                >
                  Export Monthly Report
                </button>
                <button
                  type="button"
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors border-t"
                  style={{
                    color: "oklch(var(--foreground))",
                    borderColor: "oklch(var(--border))",
                  }}
                  onClick={handleExportArticle}
                >
                  Export Article-wise Report
                </button>
              </div>
            )}
          </div>
          <Button
            data-ocid="tailor.open_modal_button"
            onClick={() => {
              setForm(emptyForm());
              setEditId(null);
              setShowForm(!showForm);
              setShowPdfMenu(false);
            }}
            size="sm"
          >
            + Add Record
          </Button>
        </div>
      </div>

      {/* Entry Form */}
      {showForm && (
        <div
          className="rounded-xl border p-4 space-y-3"
          style={{
            background: "oklch(var(--card))",
            borderColor: "oklch(var(--border))",
          }}
        >
          <h3 className="font-semibold text-sm">
            {editId !== null ? "Edit Record" : "New Tailor Record"}
          </h3>

          {/* Article */}
          <div>
            <Label>Article No *</Label>
            <select
              data-ocid="tailor.article_select"
              className="input-factory w-full"
              value={form.articleNo}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  articleNo: e.target.value,
                  color: "",
                  size: "",
                }))
              }
            >
              <option value="">Select article...</option>
              {items.map((i) => (
                <option key={i.articleNo} value={i.articleNo}>
                  {i.articleNo}
                </option>
              ))}
            </select>
          </div>

          {/* Color - auto-fetched from Item Master */}
          {form.articleNo && (
            <div>
              <Label>Color *</Label>
              {availableColors.length > 0 ? (
                <select
                  data-ocid="tailor.color_select"
                  className="input-factory w-full"
                  value={form.color}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, color: e.target.value, size: "" }))
                  }
                >
                  <option value="">Select color...</option>
                  {availableColors.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                <p
                  className="text-xs mt-1"
                  style={{ color: "oklch(var(--destructive))" }}
                >
                  No colors defined for this article. Update Item Master first.
                </p>
              )}
            </div>
          )}

          {/* Size - auto-fetched based on selected color */}
          {form.color && (
            <div>
              <Label>Size</Label>
              {availableSizes.length > 0 ? (
                <select
                  data-ocid="tailor.size_select"
                  className="input-factory w-full"
                  value={form.size}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, size: e.target.value }))
                  }
                >
                  <option value="">Select size...</option>
                  <option value="All Sizes">📐 All Sizes</option>
                  {availableSizes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <p
                  className="text-xs mt-1"
                  style={{ color: "oklch(var(--destructive))" }}
                >
                  No sizes defined for this color.
                </p>
              )}
            </div>
          )}

          {/* Cutting status for selected color+size */}
          {form.articleNo && form.color && form.size && (
            <div
              className="rounded-lg p-2 text-xs space-y-0.5"
              style={{ background: "oklch(var(--muted))" }}
            >
              <div className="flex justify-between">
                <span>
                  Cutting Qty ({form.color} – {form.size}):
                </span>
                <span className="font-semibold">{cuttingQtyForColorSize}</span>
              </div>
            </div>
          )}

          {/* Tailor Name */}
          <div>
            <Label>Tailor Name *</Label>
            <SearchableDropdown
              value={form.tailorName}
              onChange={(v) => setForm((f) => ({ ...f, tailorName: v }))}
              placeholder="Enter tailor name..."
              fieldKey="tailorNames"
            />
          </div>

          {/* PCS Given */}
          <div>
            <Label>PCS Given *</Label>
            <Input
              data-ocid="tailor.pcs_input"
              type="number"
              value={form.pcsGiven}
              onChange={(e) =>
                setForm((f) => ({ ...f, pcsGiven: e.target.value }))
              }
              placeholder="0"
            />
          </div>

          {/* Rate - auto-filled from Item Master */}
          <div>
            <Label>Tailor Rate (per PCS)</Label>
            <Input
              data-ocid="tailor.rate_input"
              type="number"
              value={form.tailorRate}
              onChange={(e) =>
                setForm((f) => ({ ...f, tailorRate: e.target.value }))
              }
              placeholder="Auto-filled from Item Master"
            />
            {form.articleNo &&
              loadArticleRates(form.articleNo).tailorRate > 0 && (
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "oklch(var(--primary))" }}
                >
                  Rate auto-filled from Item Master (₹
                  {loadArticleRates(form.articleNo).tailorRate})
                </p>
              )}
          </div>

          {/* Amount display */}
          <div
            className="rounded-lg p-3"
            style={{ background: "oklch(var(--muted))" }}
          >
            <p
              className="text-sm font-semibold"
              style={{ color: "oklch(var(--foreground))" }}
            >
              Tailor Amount: ₹{tailorAmount.toFixed(2)}
            </p>
            <p
              className="text-xs"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              {form.pcsGiven || 0} PCS × ₹{form.tailorRate || 0}
            </p>
          </div>

          {/* Date */}
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              data-ocid="tailor.save_button"
              onClick={handleSave}
              disabled={loading}
              className="flex-1"
            >
              {loading
                ? "Saving..."
                : editId !== null
                  ? "Update"
                  : "Save Record"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setForm(emptyForm());
                setEditId(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Date Filter */}
      <div
        className="rounded-xl border p-4 space-y-3"
        style={{
          background: "oklch(var(--card))",
          borderColor: "oklch(var(--border))",
        }}
      >
        <div className="flex items-center gap-3">
          <Label className="shrink-0">Filter by Date</Label>
          <Input
            data-ocid="tailor.date_filter_input"
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="flex-1"
          />
        </div>

        {/* Summary Banner */}
        <div
          className="rounded-lg p-3 text-sm"
          style={{
            background: "oklch(var(--primary) / 0.08)",
            border: "1px solid oklch(var(--primary) / 0.2)",
          }}
        >
          <span
            className="font-semibold"
            style={{ color: "oklch(var(--primary))" }}
          >
            Date: {filterDate}
          </span>
          <span
            className="mx-2"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            —
          </span>
          <span style={{ color: "oklch(var(--foreground))" }}>
            {dateSummary.count} Records, {dateSummary.totalPcs} Pieces, ₹
            {dateSummary.totalAmount.toFixed(2)}
          </span>
        </div>

        {/* Employee-wise grouped cards */}
        {employeeGroups.length === 0 ? (
          <div
            data-ocid="tailor.date_empty_state"
            className="text-center py-4 text-sm"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            No records for this date.
          </div>
        ) : (
          <div className="space-y-3">
            {employeeGroups.map((eg, idx) => (
              <div
                key={eg.name}
                data-ocid={`tailor.employee.card.${idx + 1}`}
                className="rounded-lg border overflow-hidden"
                style={{ borderColor: "oklch(var(--border))" }}
              >
                {/* Employee header */}
                <div
                  className="px-3 py-2 flex items-center justify-between"
                  style={{ background: "oklch(var(--primary) / 0.06)" }}
                >
                  <div>
                    <p
                      className="font-bold text-sm"
                      style={{ color: "oklch(var(--foreground))" }}
                    >
                      {eg.name}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "oklch(var(--muted-foreground))" }}
                    >
                      {eg.tailorPcs} pcs stitched
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className="text-xs"
                      style={{ color: "oklch(var(--muted-foreground))" }}
                    >
                      Net Payment
                    </p>
                    <p
                      className="font-bold text-base"
                      style={{ color: "oklch(var(--success))" }}
                    >
                      ₹{eg.netPayment.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Article-wise sub-rows */}
                <div
                  className="divide-y"
                  style={{ borderColor: "oklch(var(--border))" }}
                >
                  <div
                    className="grid grid-cols-5 px-3 py-1 text-xs font-semibold"
                    style={{
                      color: "oklch(var(--muted-foreground))",
                      background: "oklch(var(--muted) / 0.5)",
                    }}
                  >
                    <span>Article</span>
                    <span>Color/Size</span>
                    <span className="text-center">PCS</span>
                    <span className="text-center">Rate</span>
                    <span className="text-right">Amount</span>
                  </div>
                  {eg.recs.map((r) => (
                    <div
                      key={Number(r.id)}
                      className="grid grid-cols-5 px-3 py-1.5 text-xs"
                    >
                      <span
                        className="font-medium"
                        style={{ color: "oklch(var(--primary))" }}
                      >
                        {r.articleNo}
                      </span>
                      <span style={{ color: "oklch(var(--muted-foreground))" }}>
                        {r.color || "—"}/{r.size || "—"}
                      </span>
                      <span className="text-center">{r.pcsGiven}</span>
                      <span className="text-center">₹{r.tailorRate}</span>
                      <span className="text-right font-semibold">
                        ₹{r.tailorAmount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {/* Tailor subtotal */}
                  <div
                    className="grid grid-cols-5 px-3 py-1.5 text-xs font-semibold"
                    style={{
                      background: "oklch(var(--muted) / 0.4)",
                      color: "oklch(var(--foreground))",
                    }}
                  >
                    <span>Tailor Total</span>
                    <span />
                    <span className="text-center">{eg.tailorPcs}</span>
                    <span />
                    <span className="text-right">
                      ₹{eg.tailorTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Additional Work section */}
                {eg.awForEmployee.length > 0 && (
                  <div
                    className="border-t"
                    style={{ borderColor: "oklch(var(--border))" }}
                  >
                    <div
                      className="px-3 py-1 text-xs font-semibold"
                      style={{
                        background: "oklch(var(--muted))",
                        color: "oklch(var(--muted-foreground))",
                      }}
                    >
                      Additional Work
                    </div>
                    {eg.awForEmployee.map((aw) => (
                      <div
                        key={Number(aw.id)}
                        className="grid grid-cols-4 px-3 py-1.5 text-xs border-t"
                        style={{ borderColor: "oklch(var(--border))" }}
                      >
                        <span className="font-medium">{aw.workType}</span>
                        <span className="text-center">{aw.pcsDone}</span>
                        <span className="text-center">₹{aw.ratePerPcs}</span>
                        <span className="text-right font-semibold">
                          ₹{aw.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div
                      className="grid grid-cols-4 px-3 py-1.5 text-xs font-semibold border-t"
                      style={{
                        background: "oklch(var(--muted) / 0.4)",
                        borderColor: "oklch(var(--border))",
                        color: "oklch(var(--foreground))",
                      }}
                    >
                      <span>Add. Work Total</span>
                      <span />
                      <span />
                      <span className="text-right">
                        ₹{eg.awTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Net Payment footer */}
                <div
                  className="px-3 py-2 flex justify-between items-center border-t"
                  style={{
                    background: "oklch(var(--success) / 0.08)",
                    borderColor: "oklch(var(--border))",
                  }}
                >
                  <span
                    className="text-xs font-bold"
                    style={{ color: "oklch(var(--foreground))" }}
                  >
                    NET PAYMENT
                  </span>
                  <span
                    className="font-bold text-sm"
                    style={{ color: "oklch(var(--success))" }}
                  >
                    ₹{eg.netPayment.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Article-wise Breakdown (All Time) — collapsible */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "oklch(var(--border))" }}
      >
        <button
          type="button"
          data-ocid="tailor.article_breakdown_toggle"
          className="w-full flex items-center justify-between px-4 py-3 font-semibold text-sm"
          style={{
            background: "oklch(var(--card))",
            color: "oklch(var(--foreground))",
          }}
          onClick={() => setShowArticleBreakdown((v) => !v)}
        >
          <span>Article-wise Tailor Breakdown (All Time)</span>
          {showArticleBreakdown ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        {showArticleBreakdown && (
          <div
            className="divide-y"
            style={{ borderColor: "oklch(var(--border))" }}
          >
            {articleBreakdown.length === 0 ? (
              <div
                className="text-center py-4 text-sm"
                style={{ color: "oklch(var(--muted-foreground))" }}
              >
                No records yet.
              </div>
            ) : (
              articleBreakdown.map((ab) => (
                <div key={ab.articleNo} className="p-3">
                  <p
                    className="font-bold text-sm mb-2"
                    style={{ color: "oklch(var(--primary))" }}
                  >
                    {ab.articleNo}
                  </p>
                  <div className="space-y-1">
                    {ab.tailors.map((t) => (
                      <div
                        key={t.name}
                        className="flex justify-between text-xs"
                      >
                        <span style={{ color: "oklch(var(--foreground))" }}>
                          {t.name}
                        </span>
                        <span
                          className="font-semibold"
                          style={{ color: "oklch(var(--muted-foreground))" }}
                        >
                          {t.pcs} pcs
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* All Records Toggle */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "oklch(var(--border))" }}
      >
        <button
          type="button"
          data-ocid="tailor.all_records_toggle"
          className="w-full flex items-center justify-between px-4 py-3 font-semibold text-sm"
          style={{
            background: "oklch(var(--card))",
            color: "oklch(var(--foreground))",
          }}
          onClick={() => setShowAllRecords((v) => !v)}
        >
          <span>View All Records ({records.length})</span>
          {showAllRecords ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        {showAllRecords && (
          <div className="p-3 space-y-3">
            <Input
              placeholder="Filter by article..."
              value={filterArticle}
              onChange={(e) => setFilterArticle(e.target.value)}
              className="mb-2"
            />
            <div className="space-y-2">
              {filteredAll.length === 0 && (
                <div
                  data-ocid="tailor.empty_state"
                  className="text-center py-6"
                  style={{ color: "oklch(var(--muted-foreground))" }}
                >
                  No records found.
                </div>
              )}
              {filteredAll.map((r, idx) => (
                <div
                  key={Number(r.id)}
                  data-ocid={`tailor.item.${idx + 1}`}
                  className="rounded-xl border p-3"
                  style={{
                    background: "oklch(var(--card))",
                    borderColor: "oklch(var(--border))",
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-sm">{r.articleNo}</p>
                      <p className="text-sm">{r.tailorName}</p>
                      {(r.color || r.size) && (
                        <p
                          className="text-xs"
                          style={{ color: "oklch(var(--primary))" }}
                        >
                          {r.color && r.size
                            ? `${r.color} / ${r.size}`
                            : r.color || r.size}
                        </p>
                      )}
                      <p
                        className="text-xs"
                        style={{ color: "oklch(var(--muted-foreground))" }}
                      >
                        {r.date}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">
                        ₹{r.tailorAmount.toFixed(2)}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "oklch(var(--muted-foreground))" }}
                      >
                        {r.pcsGiven} pcs @ ₹{r.tailorRate}
                      </p>
                      <div className="flex gap-1 mt-1">
                        <Button
                          data-ocid={`tailor.edit_button.${idx + 1}`}
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(r)}
                        >
                          Edit
                        </Button>
                        <Button
                          data-ocid={`tailor.delete_button.${idx + 1}`}
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(r.id)}
                        >
                          Del
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
