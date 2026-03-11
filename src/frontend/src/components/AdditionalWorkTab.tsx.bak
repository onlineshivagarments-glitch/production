import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { AdditionalWorkRecord, ItemMaster } from "../backend";
import { useActor } from "../hooks/useActor";
import { getRateForWorkType, loadArticleRates } from "../utils/articleRates";
import { exportAdditionalWorkPdf } from "../utils/pdfExport";
import { SearchableDropdown } from "./SearchableDropdown";

const DEFAULT_WORK_TYPES = [
  "Overlock",
  "Folding",
  "Press",
  "Packing",
  "Thread Cutting",
  "Kaj",
];

// Work types that support All Colors / All Sizes
const NON_ELIGIBLE_WORK_TYPES = ["Overlock", "Folding"];

const TRACKED_WORK_TYPES = ["Packing", "Press", "Kaj", "Thread Cutting"];

function isEligibleForAllColors(workType: string): boolean {
  if (!workType) return false;
  return !NON_ELIGIBLE_WORK_TYPES.includes(workType);
}

/**
 * Returns the color/size mode for a given work type:
 * - "optional_both": color and size are both optional (Packing, Press, Kaj, custom)
 * - "optional_size": color is required, size is optional (Thread Cutting)
 * - "required_both": both color and size are required (Overlock, Folding)
 */
function getColorSizeMode(
  workType: string,
): "optional_both" | "optional_size" | "required_both" {
  if (!workType) return "required_both";
  if (["Overlock", "Folding"].includes(workType)) return "required_both";
  if (workType === "Thread Cutting") return "optional_size";
  return "optional_both"; // Packing, Press, Kaj, and all custom types
}

const CUSTOM_WORK_TYPES_KEY = "customWorkTypes_v1";

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

function loadCustomWorkTypes(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_WORK_TYPES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function saveCustomWorkTypes(types: string[]) {
  try {
    localStorage.setItem(CUSTOM_WORK_TYPES_KEY, JSON.stringify(types));
  } catch {
    // ignore
  }
}

const ALL_COLORS_VALUE = "__ALL_COLORS__";
const ALL_SIZES_VALUE = "__ALL_SIZES__";

interface FormState {
  articleNo: string;
  color: string;
  size: string;
  workType: string;
  customWorkInput: string;
  employeeName: string;
  pcsDone: string;
  ratePerPcs: string;
  date: string;
}

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): FormState => ({
  articleNo: "",
  color: "",
  size: "",
  workType: "",
  customWorkInput: "",
  employeeName: "",
  pcsDone: "",
  ratePerPcs: "",
  date: today(),
});

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export function AdditionalWorkTab() {
  const { actor } = useActor();
  const [records, setRecords] = useState<AdditionalWorkRecord[]>([]);
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editId, setEditId] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filterArticle, setFilterArticle] = useState("");
  const [customWorkTypes, setCustomWorkTypes] =
    useState<string[]>(loadCustomWorkTypes);
  const [showPdfMenu, setShowPdfMenu] = useState(false);

  // Monthly summary state
  const [summaryEmployee, setSummaryEmployee] = useState("");
  const [summaryMonth, setSummaryMonth] = useState(currentMonth());

  const totalAmount =
    (Number.parseFloat(form.pcsDone) || 0) *
    (Number.parseFloat(form.ratePerPcs) || 0);

  const loadData = async () => {
    if (!actor) return;
    const [recs, itemList] = await Promise.all([
      actor.getAdditionalWorkRecords().catch(() => []),
      actor.getItemMasters().catch(() => []),
    ]);
    setRecords(recs as typeof recs);
    setItems(itemList as typeof itemList);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: load on actor ready
  useEffect(() => {
    loadData();
  }, [actor]);

  // Auto-fill rate when article + workType changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (form.articleNo && form.workType && editId === null) {
      const rate = getRateForWorkType(form.articleNo, form.workType);
      if (rate > 0) {
        setForm((f) => ({ ...f, ratePerPcs: String(rate) }));
      }
    }
  }, [form.articleNo, form.workType]);

  // Reset color/size when workType eligibility changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    const eligible = isEligibleForAllColors(form.workType);
    if (!eligible) {
      // If currently all colors/sizes, reset
      if (form.color === ALL_COLORS_VALUE || form.size === ALL_SIZES_VALUE) {
        setForm((f) => ({ ...f, color: "", size: "" }));
      }
    }
  }, [form.workType]);

  // All available work types (default + custom)
  const allWorkTypes = useMemo(
    () => [
      ...DEFAULT_WORK_TYPES,
      ...customWorkTypes.filter((c) => !DEFAULT_WORK_TYPES.includes(c)),
    ],
    [customWorkTypes],
  );

  const addCustomWorkType = () => {
    const wt = form.customWorkInput.trim();
    if (!wt) return;
    if (!allWorkTypes.includes(wt)) {
      const updated = [...customWorkTypes, wt];
      setCustomWorkTypes(updated);
      saveCustomWorkTypes(updated);
    }
    setForm((f) => ({ ...f, workType: wt, customWorkInput: "" }));
  };

  // Color entries for selected article
  const selectedArticleColorEntries = useMemo(() => {
    const item = items.find((i) => i.articleNo === form.articleNo);
    if (!item) return [];
    return parseColorSizeData(item.colorSizeData);
  }, [items, form.articleNo]);

  const availableColors = useMemo(
    () => selectedArticleColorEntries.map((ce) => ce.color),
    [selectedArticleColorEntries],
  );

  // All sizes across all colors (for All Colors mode)
  const allSizesAcrossColors = useMemo(() => {
    const sizeSet = new Set<string>();
    for (const ce of selectedArticleColorEntries) {
      for (const [size, qty] of Object.entries(ce.sizes)) {
        if (qty > 0) sizeSet.add(size);
      }
    }
    return Array.from(sizeSet);
  }, [selectedArticleColorEntries]);

  const availableSizes = useMemo(() => {
    if (form.color === ALL_COLORS_VALUE) {
      return allSizesAcrossColors;
    }
    if (!form.color) return [];
    const ce = selectedArticleColorEntries.find((c) => c.color === form.color);
    if (!ce) return [];
    return Object.entries(ce.sizes)
      .filter(([, qty]) => qty > 0)
      .map(([size]) => size);
  }, [selectedArticleColorEntries, form.color, allSizesAcrossColors]);

  const cuttingQtyForColorSize = useMemo(() => {
    if (!form.color || !form.size) return 0;
    if (form.color === ALL_COLORS_VALUE || form.size === ALL_SIZES_VALUE)
      return 9999;
    const ce = selectedArticleColorEntries.find((c) => c.color === form.color);
    return ce?.sizes[form.size] || 0;
  }, [selectedArticleColorEntries, form.color, form.size]);

  const eligible = isEligibleForAllColors(form.workType);
  const colorSizeMode = getColorSizeMode(form.workType);

  const uniqueEmployees = useMemo(() => {
    const names = new Set<string>();
    for (const r of records) {
      if (r.employeeName) names.add(r.employeeName);
    }
    return Array.from(names).sort();
  }, [records]);

  // Processed quantity by work type for the selected article
  const processedByWorkType = useMemo(() => {
    if (!form.articleNo) return {} as Record<string, number>;
    const map: Record<string, number> = {};
    for (const r of records) {
      if (r.articleNo === form.articleNo) {
        map[r.workType] = (map[r.workType] || 0) + r.pcsDone;
      }
    }
    return map;
  }, [records, form.articleNo]);

  // Selected article info
  const selectedArticle = useMemo(
    () => items.find((i) => i.articleNo === form.articleNo),
    [items, form.articleNo],
  );

  // Monthly summary - grouped by articleNo + color + size + workType
  const monthlySummary = useMemo(() => {
    if (!summaryEmployee || !summaryMonth) return null;
    const [year, month] = summaryMonth.split("-");
    const prefix = `${year}-${month}`;
    const filtered = records.filter(
      (r) => r.employeeName === summaryEmployee && r.date.startsWith(prefix),
    );
    if (filtered.length === 0) return { rows: [], totalPcs: 0, totalAmount: 0 };

    const groupMap = new Map<
      string,
      {
        articleNo: string;
        color: string;
        size: string;
        workType: string;
        pcsDone: number;
        rate: number;
        totalAmount: number;
      }
    >();
    for (const r of filtered) {
      const key = `${r.articleNo}||${r.color}||${r.size}||${r.workType}`;
      const existing = groupMap.get(key);
      if (existing) {
        existing.pcsDone += r.pcsDone;
        existing.totalAmount += r.totalAmount;
      } else {
        groupMap.set(key, {
          articleNo: r.articleNo,
          color: r.color,
          size: r.size,
          workType: r.workType,
          pcsDone: r.pcsDone,
          rate: r.ratePerPcs,
          totalAmount: r.totalAmount,
        });
      }
    }

    const rows = Array.from(groupMap.values());
    const totalPcs = rows.reduce((s, row) => s + row.pcsDone, 0);
    const totalAmt = rows.reduce((s, row) => s + row.totalAmount, 0);
    return { rows, totalPcs, totalAmount: totalAmt };
  }, [records, summaryEmployee, summaryMonth]);

  const monthLabel = summaryMonth
    ? new Date(`${summaryMonth}-01`).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
      })
    : "";

  /**
   * Build list of color+size combos to save for.
   * Accepts optional overrides so handleSave can pass resolved ALL_COLORS/ALL_SIZES
   * even when the form fields are blank (optional mode).
   */
  const resolveColorSizeCombos = (
    colorOverride?: string,
    sizeOverride?: string,
  ): Array<{ color: string; size: string }> => {
    const pcs = Number.parseFloat(form.pcsDone) || 0;
    if (!pcs) return [];

    const colorVal = colorOverride ?? form.color;
    const sizeVal = sizeOverride ?? form.size;

    if (colorVal === ALL_COLORS_VALUE && sizeVal === ALL_SIZES_VALUE) {
      // All colors, all sizes
      const combos: Array<{ color: string; size: string }> = [];
      for (const ce of selectedArticleColorEntries) {
        for (const [size, qty] of Object.entries(ce.sizes)) {
          if (qty > 0) combos.push({ color: ce.color, size });
        }
      }
      return combos;
    }

    if (colorVal === ALL_COLORS_VALUE && sizeVal !== ALL_SIZES_VALUE) {
      // All colors, specific size
      const combos: Array<{ color: string; size: string }> = [];
      for (const ce of selectedArticleColorEntries) {
        if ((ce.sizes[sizeVal] || 0) > 0) {
          combos.push({ color: ce.color, size: sizeVal });
        }
      }
      return combos;
    }

    if (colorVal !== ALL_COLORS_VALUE && sizeVal === ALL_SIZES_VALUE) {
      // Specific color, all sizes
      const ce = selectedArticleColorEntries.find((c) => c.color === colorVal);
      if (!ce) return [];
      return Object.entries(ce.sizes)
        .filter(([, qty]) => qty > 0)
        .map(([size]) => ({ color: colorVal, size }));
    }

    // Specific color + size
    return [{ color: colorVal, size: sizeVal }];
  };

  const handleSave = async () => {
    if (!actor) {
      toast.error("Not connected");
      return;
    }
    if (!form.articleNo.trim()) {
      toast.error("Article Number required");
      return;
    }
    if (!form.workType.trim()) {
      toast.error("Work Type required");
      return;
    }
    if (!form.employeeName.trim()) {
      toast.error("Employee Name required");
      return;
    }
    const pcs = Number.parseFloat(form.pcsDone) || 0;
    if (pcs <= 0) {
      toast.error("Total Qty must be greater than 0");
      return;
    }

    // Resolve effective color/size based on mode
    let effectiveColor = form.color;
    let effectiveSize = form.size;

    if (colorSizeMode === "required_both") {
      // Both are required
      if (!form.color) {
        toast.error("Color is required");
        return;
      }
      if (!form.size) {
        toast.error("Size is required");
        return;
      }
    } else if (colorSizeMode === "optional_size") {
      // Thread Cutting: color required, size optional
      if (!form.color) {
        toast.error("Color is required for Thread Cutting");
        return;
      }
      if (!form.size) {
        effectiveSize = ALL_SIZES_VALUE;
      }
    } else {
      // optional_both: Packing, Press, Kaj, custom – both optional
      if (!form.color) {
        effectiveColor = ALL_COLORS_VALUE;
      }
      if (!form.size) {
        effectiveSize = ALL_SIZES_VALUE;
      }
    }

    const combos = resolveColorSizeCombos(effectiveColor, effectiveSize);
    if (combos.length === 0) {
      toast.error("No valid color/size combinations found.");
      return;
    }

    const isAllMode =
      effectiveColor === ALL_COLORS_VALUE || effectiveSize === ALL_SIZES_VALUE;
    const rate = Number.parseFloat(form.ratePerPcs) || 0;

    setLoading(true);
    try {
      if (editId !== null && !isAllMode) {
        // Single record update
        const { color, size } = combos[0];
        const cuttingQty =
          selectedArticleColorEntries.find((c) => c.color === color)?.sizes[
            size
          ] || 0;

        if (cuttingQty <= 0) {
          toast.error(
            "No cutting quantity defined for this color and size in Item Master.",
          );
          setLoading(false);
          return;
        }

        // Per-work-type validation: only count same workType for this article/color/size
        const alreadyDone = records
          .filter(
            (r) =>
              r.articleNo === form.articleNo &&
              r.workType === form.workType &&
              r.color === color &&
              r.size === size,
          )
          .reduce((s, r) => s + r.pcsDone, 0);
        const currentRec = records.find((r) => r.id === editId);
        const effectiveDone = currentRec
          ? Math.max(0, alreadyDone - currentRec.pcsDone)
          : alreadyDone;

        if (effectiveDone + pcs > cuttingQty) {
          toast.error(
            "Error: Work quantity cannot exceed cutting quantity for this color and size.",
          );
          setLoading(false);
          return;
        }

        await actor.updateAdditionalWorkRecord(
          editId,
          form.date,
          form.articleNo,
          form.workType,
          form.employeeName,
          pcs,
          rate,
          color,
          size,
        );
        toast.success("Record updated");
      } else {
        // Save one record per color+size combo
        let saved = 0;
        let skipped = 0;
        for (const { color, size } of combos) {
          const cuttingQty =
            selectedArticleColorEntries.find((c) => c.color === color)?.sizes[
              size
            ] || 0;
          if (cuttingQty <= 0) {
            skipped++;
            continue;
          }

          // Per-work-type validation: only count same workType for this article/color/size
          const alreadyDone = records
            .filter(
              (r) =>
                r.articleNo === form.articleNo &&
                r.workType === form.workType &&
                r.color === color &&
                r.size === size,
            )
            .reduce((s, r) => s + r.pcsDone, 0);

          if (alreadyDone + pcs > cuttingQty) {
            skipped++;
            continue;
          }

          await actor.addAdditionalWorkRecord(
            form.date,
            form.articleNo,
            form.workType,
            form.employeeName,
            pcs,
            rate,
            color,
            size,
          );
          saved++;
        }

        if (saved === 0) {
          toast.error(
            "Error: Work quantity cannot exceed cutting quantity for this color and size.",
          );
          setLoading(false);
          return;
        }

        if (skipped > 0) {
          toast.success(
            `Saved ${saved} record(s). ${skipped} skipped (quantity limit reached).`,
          );
        } else {
          toast.success(
            combos.length > 1
              ? `Saved ${saved} records for ${combos.length} color/size combinations.`
              : "Record saved",
          );
        }
      }

      setForm(emptyForm());
      setEditId(null);
      setShowForm(false);
      await loadData();
    } catch {
      toast.error("Failed to save work record");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (r: AdditionalWorkRecord) => {
    setForm({
      articleNo: r.articleNo,
      color: r.color || "",
      size: r.size || "",
      workType: r.workType,
      customWorkInput: "",
      employeeName: r.employeeName,
      pcsDone: String(r.pcsDone),
      ratePerPcs: String(r.ratePerPcs),
      date: r.date,
    });
    setEditId(r.id);
    setShowForm(true);
  };

  const handleDelete = async (id: bigint) => {
    if (!actor) return;
    if (!confirm("Delete this record?")) return;
    try {
      await actor.deleteAdditionalWorkRecord(id);
      toast.success("Deleted");
      await loadData();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const filtered = filterArticle
    ? records.filter((r) =>
        r.articleNo.toLowerCase().includes(filterArticle.toLowerCase()),
      )
    : records;

  // PDF export handlers
  const handleExportEmployeeSummary = () => {
    setShowPdfMenu(false);
    if (!summaryEmployee) {
      toast.error("Select an employee first in the summary panel");
      return;
    }
    const [year, month] = summaryMonth.split("-");
    const prefix = `${year}-${month}`;
    const recs = records.filter(
      (r) => r.employeeName === summaryEmployee && r.date.startsWith(prefix),
    );
    exportAdditionalWorkPdf(
      recs.map((r) => ({
        date: r.date,
        employeeName: r.employeeName,
        articleNo: r.articleNo,
        color: r.color,
        size: r.size,
        workType: r.workType,
        pcsDone: r.pcsDone,
        ratePerPcs: r.ratePerPcs,
        totalAmount: r.totalAmount,
      })),
      `Additional Work – ${summaryEmployee}`,
      `Month: ${monthLabel}`,
    );
  };

  const handleExportDaily = () => {
    setShowPdfMenu(false);
    const d = today();
    const recs = records.filter((r) => r.date === d);
    exportAdditionalWorkPdf(
      recs.map((r) => ({
        date: r.date,
        employeeName: r.employeeName,
        articleNo: r.articleNo,
        color: r.color,
        size: r.size,
        workType: r.workType,
        pcsDone: r.pcsDone,
        ratePerPcs: r.ratePerPcs,
        totalAmount: r.totalAmount,
      })),
      "Additional Work – Daily Report",
      `Date: ${d}`,
    );
  };

  const handleExportArticle = () => {
    setShowPdfMenu(false);
    const artRecs = filterArticle
      ? records.filter((r) =>
          r.articleNo.toLowerCase().includes(filterArticle.toLowerCase()),
        )
      : records;
    exportAdditionalWorkPdf(
      artRecs.map((r) => ({
        date: r.date,
        employeeName: r.employeeName,
        articleNo: r.articleNo,
        color: r.color,
        size: r.size,
        workType: r.workType,
        pcsDone: r.pcsDone,
        ratePerPcs: r.ratePerPcs,
        totalAmount: r.totalAmount,
      })),
      "Additional Work – Article-wise Report",
      filterArticle ? `Article: ${filterArticle}` : "All Articles",
    );
  };

  // Compute combos for preview using effective color/size (respecting optional mode)
  const previewEffectiveColor =
    colorSizeMode === "optional_both" && !form.color
      ? ALL_COLORS_VALUE
      : form.color;
  const previewEffectiveSize =
    (colorSizeMode === "optional_both" || colorSizeMode === "optional_size") &&
    !form.size
      ? ALL_SIZES_VALUE
      : form.size;

  const previewCombos = resolveColorSizeCombos(
    previewEffectiveColor,
    previewEffectiveSize,
  );

  // Remaining qty for selected article + work type
  const totalProductionQty = selectedArticle?.totalQuantity || 0;
  const processedQty = form.workType
    ? processedByWorkType[form.workType] || 0
    : 0;
  const remainingQty = totalProductionQty - processedQty;

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <h2
          className="text-lg font-bold"
          style={{ color: "oklch(var(--foreground))" }}
        >
          Additional Work
        </h2>
        <div className="flex gap-2">
          {/* PDF Export */}
          <div className="relative">
            <Button
              data-ocid="add_work.pdf_button"
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
                  minWidth: "210px",
                }}
              >
                <button
                  type="button"
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                  style={{ color: "oklch(var(--foreground))" }}
                  onClick={handleExportEmployeeSummary}
                >
                  Export Employee Monthly Report
                </button>
                <button
                  type="button"
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors border-t"
                  style={{
                    color: "oklch(var(--foreground))",
                    borderColor: "oklch(var(--border))",
                  }}
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
                  onClick={handleExportArticle}
                >
                  Export Article-wise Report
                </button>
              </div>
            )}
          </div>
          <Button
            data-ocid="add_work.open_modal_button"
            onClick={() => {
              setForm(emptyForm());
              setEditId(null);
              setShowForm(true);
              setShowPdfMenu(false);
            }}
            size="sm"
          >
            + Add Record
          </Button>
        </div>
      </div>

      {/* Employee Monthly Summary Panel */}
      <div
        className="rounded-xl border p-4 space-y-3"
        style={{
          background: "oklch(var(--card))",
          borderColor: "oklch(var(--border))",
        }}
      >
        <h3
          className="font-semibold text-sm"
          style={{ color: "oklch(var(--foreground))" }}
        >
          Employee Monthly Summary
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs mb-1 block">Employee</Label>
            <select
              data-ocid="add_work.summary_employee_select"
              className="input-factory w-full text-sm"
              value={summaryEmployee}
              onChange={(e) => setSummaryEmployee(e.target.value)}
            >
              <option value="">Select employee...</option>
              {uniqueEmployees.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Month</Label>
            <input
              data-ocid="add_work.summary_month_input"
              type="month"
              className="input-factory w-full text-sm"
              value={summaryMonth}
              onChange={(e) => setSummaryMonth(e.target.value)}
            />
          </div>
        </div>

        {summaryEmployee && summaryMonth && (
          <div>
            {monthlySummary && monthlySummary.rows.length === 0 ? (
              <div
                data-ocid="add_work.summary_empty_state"
                className="text-center py-3 text-sm rounded-lg"
                style={{
                  color: "oklch(var(--muted-foreground))",
                  background: "oklch(var(--muted))",
                }}
              >
                No records found for this employee in the selected month.
              </div>
            ) : monthlySummary ? (
              <div
                className="rounded-lg border overflow-hidden"
                style={{ borderColor: "oklch(var(--primary) / 0.25)" }}
              >
                <div
                  className="px-3 py-2"
                  style={{ background: "oklch(var(--primary) / 0.08)" }}
                >
                  <p
                    className="font-bold text-sm"
                    style={{ color: "oklch(var(--primary))" }}
                  >
                    Employee: {summaryEmployee}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "oklch(var(--muted-foreground))" }}
                  >
                    {monthLabel}
                  </p>
                </div>

                {/* Column headers */}
                <div
                  className="grid px-3 py-1.5 text-xs font-semibold"
                  style={{
                    gridTemplateColumns: "1fr 1fr 1fr 1fr 80px 70px",
                    color: "oklch(var(--muted-foreground))",
                    background: "oklch(var(--muted) / 0.5)",
                    borderBottom: "1px solid oklch(var(--border))",
                  }}
                >
                  <span>Article</span>
                  <span>Color</span>
                  <span>Size</span>
                  <span>Work Type</span>
                  <span className="text-center">PCS</span>
                  <span className="text-right">Amount</span>
                </div>

                <div
                  className="divide-y"
                  style={{ borderColor: "oklch(var(--border))" }}
                >
                  {monthlySummary.rows.map((row, i) => (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: stable summary order
                      key={i}
                      className="grid px-3 py-2 text-sm"
                      style={{
                        gridTemplateColumns: "1fr 1fr 1fr 1fr 80px 70px",
                      }}
                    >
                      <span
                        className="font-medium"
                        style={{ color: "oklch(var(--primary))" }}
                      >
                        {row.articleNo}
                      </span>
                      <span style={{ color: "oklch(var(--foreground))" }}>
                        {row.color || "—"}
                      </span>
                      <span style={{ color: "oklch(var(--foreground))" }}>
                        {row.size || "—"}
                      </span>
                      <span style={{ color: "oklch(var(--muted-foreground))" }}>
                        {row.workType}
                      </span>
                      <span
                        className="text-center"
                        style={{ color: "oklch(var(--foreground))" }}
                      >
                        {row.pcsDone}
                        <span
                          className="ml-0.5 text-xs"
                          style={{ color: "oklch(var(--muted-foreground))" }}
                        >
                          ×₹{row.rate}
                        </span>
                      </span>
                      <span
                        className="text-right font-semibold"
                        style={{ color: "oklch(var(--success))" }}
                      >
                        ₹{row.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div
                  className="px-3 py-2 border-t flex justify-between items-center"
                  style={{
                    background: "oklch(var(--muted))",
                    borderColor: "oklch(var(--border))",
                  }}
                >
                  <div
                    className="text-xs"
                    style={{ color: "oklch(var(--foreground))" }}
                  >
                    <span className="font-semibold">Total Pieces: </span>
                    <span>{monthlySummary.totalPcs}</span>
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "oklch(var(--foreground))" }}
                  >
                    <span className="font-semibold">Total Net Payment: </span>
                    <span
                      className="font-bold"
                      style={{ color: "oklch(var(--success))" }}
                    >
                      ₹{monthlySummary.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
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
            {editId !== null ? "Edit Record" : "New Work Record"}
          </h3>

          {/* Article */}
          <div>
            <Label>Article No *</Label>
            <select
              data-ocid="add_work.article_select"
              className="input-factory w-full"
              value={form.articleNo}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  articleNo: e.target.value,
                  color: "",
                  size: "",
                  workType: "",
                  ratePerPcs: "",
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

          {/* Article Processing Summary – shown when article is selected */}
          {form.articleNo && selectedArticle && (
            <div
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: "oklch(var(--primary) / 0.3)" }}
            >
              <div
                className="px-3 py-2"
                style={{ background: "oklch(var(--primary) / 0.08)" }}
              >
                <p
                  className="font-bold text-sm"
                  style={{ color: "oklch(var(--primary))" }}
                >
                  📊 Article Processing Summary
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "oklch(var(--muted-foreground))" }}
                >
                  Total Production:{" "}
                  <span
                    className="font-semibold"
                    style={{ color: "oklch(var(--foreground))" }}
                  >
                    {totalProductionQty} pcs
                  </span>
                </p>
              </div>
              <div
                className="divide-y"
                style={{ borderColor: "oklch(var(--border))" }}
              >
                {TRACKED_WORK_TYPES.map((wt) => {
                  const done = processedByWorkType[wt] || 0;
                  const rem = totalProductionQty - done;
                  return (
                    <div
                      key={wt}
                      className="grid px-3 py-2 text-xs"
                      style={{ gridTemplateColumns: "1fr 60px 70px" }}
                    >
                      <span
                        className="font-medium"
                        style={{ color: "oklch(var(--foreground))" }}
                      >
                        {wt}
                      </span>
                      <span
                        className="text-center"
                        style={{ color: "oklch(var(--muted-foreground))" }}
                      >
                        Done: {done}
                      </span>
                      <span
                        className="text-right font-semibold"
                        style={{
                          color:
                            rem <= 0
                              ? "oklch(var(--destructive))"
                              : "oklch(var(--success))",
                        }}
                      >
                        Rem: {rem}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Work Type */}
          <div>
            <Label>Work Type *</Label>
            <div className="flex flex-wrap gap-2 mt-1 mb-2">
              {allWorkTypes.map((wt) => (
                <button
                  key={wt}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      workType: wt,
                      color: "",
                      size: "",
                    }))
                  }
                  className="px-3 py-1.5 rounded-lg text-sm border transition-colors"
                  style={{
                    background:
                      form.workType === wt
                        ? "oklch(var(--primary))"
                        : "transparent",
                    color:
                      form.workType === wt
                        ? "oklch(var(--primary-foreground))"
                        : "oklch(var(--foreground))",
                    borderColor: "oklch(var(--border))",
                  }}
                >
                  {wt}
                </button>
              ))}
            </div>
            {/* Custom work type input */}
            <div className="flex gap-2">
              <Input
                placeholder="Custom work type..."
                value={form.customWorkInput}
                onChange={(e) =>
                  setForm((f) => ({ ...f, customWorkInput: e.target.value }))
                }
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomWorkType();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCustomWorkType}
              >
                + Add
              </Button>
            </div>

            {/* Mode indicator */}
            {form.workType && (
              <p
                className="text-xs mt-1.5 px-2 py-1 rounded-md inline-block"
                style={{
                  background:
                    colorSizeMode === "required_both"
                      ? "oklch(var(--muted))"
                      : "oklch(var(--primary) / 0.1)",
                  color:
                    colorSizeMode === "required_both"
                      ? "oklch(var(--muted-foreground))"
                      : "oklch(var(--primary))",
                }}
              >
                {colorSizeMode === "required_both" &&
                  "Specific color & size required"}
                {colorSizeMode === "optional_size" &&
                  "Color required · Size optional (blank = All Sizes)"}
                {colorSizeMode === "optional_both" &&
                  "Color & Size optional (blank = All Colors & All Sizes)"}
              </p>
            )}
          </div>

          {/* ── COLOR FIELD ── */}
          {form.articleNo && form.workType && (
            <div>
              {/* Optional hint for optional_both mode */}
              {colorSizeMode === "optional_both" && !form.color && (
                <p
                  className="text-xs mb-1.5 px-2 py-1 rounded-md"
                  style={{
                    background: "oklch(var(--primary) / 0.08)",
                    color: "oklch(var(--primary))",
                  }}
                >
                  Leave blank to apply to All Colors &amp; All Sizes
                </p>
              )}

              <Label>
                {colorSizeMode === "required_both"
                  ? "Color *"
                  : colorSizeMode === "optional_size"
                    ? "Color *"
                    : "Color (Optional)"}
              </Label>

              {availableColors.length > 0 ? (
                <select
                  data-ocid="add_work.color_select"
                  className="input-factory w-full"
                  value={form.color}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, color: e.target.value, size: "" }))
                  }
                >
                  <option value="">
                    {colorSizeMode === "optional_both"
                      ? "All Colors (leave blank)"
                      : "Select color..."}
                  </option>
                  {eligible && (
                    <option value={ALL_COLORS_VALUE}>🎨 All Colors</option>
                  )}
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
              {form.color === ALL_COLORS_VALUE && (
                <p
                  className="text-xs mt-1"
                  style={{ color: "oklch(var(--primary))" }}
                >
                  Entry will be applied to all {availableColors.length} color(s)
                </p>
              )}

              {/* "All Colors – All Sizes" info box shown when color is blank in optional_both mode */}
              {colorSizeMode === "optional_both" && !form.color && (
                <div
                  className="mt-2 rounded-lg px-3 py-2 text-sm font-medium"
                  style={{
                    background: "oklch(var(--primary) / 0.12)",
                    color: "oklch(var(--primary))",
                    border: "1px solid oklch(var(--primary) / 0.3)",
                  }}
                >
                  📋 This article – All Colors – All Sizes
                </div>
              )}
            </div>
          )}

          {/* ── SIZE FIELD ── */}
          {/* For optional_both: show size only if color is selected */}
          {/* For optional_size (Thread Cutting): show size when color is selected */}
          {/* For required_both: show size when color is selected */}
          {form.articleNo &&
            form.workType &&
            (colorSizeMode === "optional_both"
              ? form.color && form.color !== ""
              : form.color && form.color !== "") && (
              <div>
                {/* Hint for optional size */}
                {(colorSizeMode === "optional_size" ||
                  colorSizeMode === "optional_both") &&
                  !form.size && (
                    <p
                      className="text-xs mb-1.5 px-2 py-1 rounded-md"
                      style={{
                        background: "oklch(var(--primary) / 0.08)",
                        color: "oklch(var(--primary))",
                      }}
                    >
                      Leave blank to apply to All Sizes
                    </p>
                  )}

                <Label>
                  {colorSizeMode === "required_both"
                    ? "Size *"
                    : "Size (Optional)"}
                </Label>

                {availableSizes.length > 0 ? (
                  <select
                    data-ocid="add_work.size_select"
                    className="input-factory w-full"
                    value={form.size}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, size: e.target.value }))
                    }
                  >
                    <option value="">
                      {colorSizeMode === "required_both"
                        ? "Select size..."
                        : "All Sizes (leave blank)"}
                    </option>
                    {eligible && (
                      <option value={ALL_SIZES_VALUE}>📐 All Sizes</option>
                    )}
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
                {form.size === ALL_SIZES_VALUE && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: "oklch(var(--primary))" }}
                  >
                    Entry will be applied to all available sizes
                  </p>
                )}
              </div>
            )}

          {/* All Colors/Sizes preview */}
          {form.articleNo && form.workType && previewCombos.length > 1 && (
            <div
              className="rounded-lg p-2 text-xs space-y-1"
              style={{ background: "oklch(var(--primary) / 0.08)" }}
            >
              <p
                className="font-semibold"
                style={{ color: "oklch(var(--primary))" }}
              >
                Will save records for:
              </p>
              {previewCombos.map(({ color, size }) => (
                <span
                  key={`${color}-${size}`}
                  className="inline-block mr-2 mb-1 px-2 py-0.5 rounded-full border"
                  style={{
                    borderColor: "oklch(var(--primary) / 0.4)",
                    color: "oklch(var(--foreground))",
                  }}
                >
                  {color} / {size}
                </span>
              ))}
            </div>
          )}

          {/* Cutting qty indicator (single color+size only) */}
          {form.articleNo &&
            form.color &&
            form.size &&
            form.color !== ALL_COLORS_VALUE &&
            form.size !== ALL_SIZES_VALUE && (
              <div
                className="rounded-lg p-2 text-xs"
                style={{ background: "oklch(var(--muted))" }}
              >
                <span>
                  Cutting Qty ({form.color} – {form.size}):{" "}
                </span>
                <span className="font-semibold">
                  {cuttingQtyForColorSize} pcs
                </span>
              </div>
            )}

          {/* ── REMAINING QUANTITY PANEL ── */}
          {form.articleNo && form.workType && (
            <div
              className="rounded-xl border p-3 space-y-1.5"
              style={{
                background: "oklch(var(--card))",
                borderColor: "oklch(var(--primary) / 0.25)",
              }}
            >
              <p
                className="text-xs font-bold uppercase tracking-wide"
                style={{ color: "oklch(var(--primary))" }}
              >
                Quantity Tracker – {form.workType}
              </p>
              <div className="flex justify-between text-sm">
                <span style={{ color: "oklch(var(--muted-foreground))" }}>
                  📦 Total Qty:
                </span>
                <span
                  className="font-semibold"
                  style={{ color: "oklch(var(--foreground))" }}
                >
                  {totalProductionQty} pcs
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: "oklch(var(--muted-foreground))" }}>
                  ✂️ Processed in {form.workType}:
                </span>
                <span
                  className="font-semibold"
                  style={{ color: "oklch(var(--foreground))" }}
                >
                  {processedQty} pcs
                </span>
              </div>
              <div
                className="flex justify-between text-sm pt-1 border-t"
                style={{ borderColor: "oklch(var(--border))" }}
              >
                <span
                  className="font-semibold"
                  style={{ color: "oklch(var(--foreground))" }}
                >
                  ✅ Remaining:
                </span>
                <span
                  className="font-bold text-base"
                  style={{
                    color:
                      remainingQty <= 0
                        ? "oklch(var(--destructive))"
                        : "oklch(var(--success))",
                  }}
                >
                  {remainingQty} pcs
                </span>
              </div>
            </div>
          )}

          {/* Employee Name */}
          <div>
            <Label>Employee Name *</Label>
            <SearchableDropdown
              value={form.employeeName}
              onChange={(v) => setForm((f) => ({ ...f, employeeName: v }))}
              placeholder="Enter employee name..."
              fieldKey="workEmployeeNames"
            />
          </div>

          {/* PCS Done */}
          <div>
            <Label>Total Qty *</Label>
            <Input
              data-ocid="add_work.pcs_input"
              type="number"
              value={form.pcsDone}
              onChange={(e) =>
                setForm((f) => ({ ...f, pcsDone: e.target.value }))
              }
              placeholder="0"
            />
          </div>

          {/* Rate - auto-filled from Item Master */}
          <div>
            <Label>Rate per PCS</Label>
            <Input
              data-ocid="add_work.rate_input"
              type="number"
              value={form.ratePerPcs}
              onChange={(e) =>
                setForm((f) => ({ ...f, ratePerPcs: e.target.value }))
              }
              placeholder="Auto-filled from Item Master"
            />
            {form.articleNo &&
              form.workType &&
              (() => {
                const autoRate = getRateForWorkType(
                  form.articleNo,
                  form.workType,
                );
                return autoRate > 0 ? (
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "oklch(var(--primary))" }}
                  >
                    Rate auto-filled from Item Master (₹{autoRate})
                  </p>
                ) : null;
              })()}
          </div>

          {/* Total Amount display – prominent */}
          <div
            className="rounded-xl p-4 border"
            style={{
              background: "oklch(var(--primary) / 0.08)",
              borderColor: "oklch(var(--primary) / 0.3)",
            }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wide mb-1"
              style={{ color: "oklch(var(--primary))" }}
            >
              💰 Payment
            </p>
            <p
              className="text-2xl font-bold"
              style={{ color: "oklch(var(--primary))" }}
            >
              ₹{totalAmount.toFixed(2)}
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              {form.pcsDone || 0} pcs × ₹{form.ratePerPcs || 0}
              {previewCombos.length > 1 && form.color !== "__ALL_COLORS__" && (
                <span className="ml-1">
                  (×{previewCombos.length} combinations = ₹
                  {(totalAmount * previewCombos.length).toFixed(2)} total)
                </span>
              )}
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
              data-ocid="add_work.save_button"
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

      {/* Records list */}
      <div>
        <Input
          placeholder="Filter by article..."
          value={filterArticle}
          onChange={(e) => setFilterArticle(e.target.value)}
          className="mb-3"
        />
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div
              data-ocid="add_work.empty_state"
              className="text-center py-6"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              No records found.
            </div>
          )}
          {filtered.map((r, idx) => (
            <div
              key={Number(r.id)}
              data-ocid={`add_work.item.${idx + 1}`}
              className="rounded-xl border p-3"
              style={{
                background: "oklch(var(--card))",
                borderColor: "oklch(var(--border))",
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-sm">{r.articleNo}</p>
                  <p className="text-sm">
                    {r.workType} - {r.employeeName}
                  </p>
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
                  <p
                    className="text-xs"
                    style={{ color: "oklch(var(--muted-foreground))" }}
                  >
                    {r.pcsDone} pcs @ ₹{r.ratePerPcs}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">
                    ₹{r.totalAmount.toFixed(2)}
                  </p>
                  <div className="flex gap-1 mt-1">
                    <Button
                      data-ocid={`add_work.edit_button.${idx + 1}`}
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(r)}
                    >
                      Edit
                    </Button>
                    <Button
                      data-ocid={`add_work.delete_button.${idx + 1}`}
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
    </div>
  );
}
