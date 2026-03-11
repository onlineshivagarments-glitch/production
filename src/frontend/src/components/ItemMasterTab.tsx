import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ItemMaster } from "../backend";
import { useActor } from "../hooks/useActor";
import {
  type ArticleRates,
  loadArticleRates,
  saveArticleRates,
} from "../utils/articleRates";
import { getFromCache, saveToCache } from "../utils/offlineCache";
import { cleanErrorMessage, withRetry } from "../utils/retryUtils";
import { enqueuePending } from "../utils/syncQueue";
import { DashboardAlerts } from "./DashboardAlerts";

const ALL_SIZES = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "3XL",
  "4XL",
  "5XL",
] as const;
type SizeName = (typeof ALL_SIZES)[number];

const SIZE_KEYS: Record<SizeName, keyof ItemMaster> = {
  XS: "sizeXS",
  S: "sizeS",
  M: "sizeM",
  L: "sizeL",
  XL: "sizeXL",
  XXL: "sizeXXL",
  "3XL": "size3XL",
  "4XL": "size4XL",
  "5XL": "size5XL",
};

const PREDEFINED_WORK_TYPES = [
  "Tailor Stitching",
  "Overlock",
  "Folding",
  "Press",
  "Packing",
  "Thread Cutting",
];

const WORK_TYPE_RATE_KEYS: Record<string, keyof ArticleRates> = {
  "Tailor Stitching": "tailorRate",
  Overlock: "overlockRate",
  Folding: "foldingRate",
  Press: "pressRate",
  Packing: "packingRate",
  "Thread Cutting": "threadCuttingRate",
};

interface ColorEntry {
  color: string;
  sizes: Record<string, number>;
}

interface FormState {
  articleNo: string;
  totalQuantity: string;
  hasAdditionalWork: boolean;
  selectedWorkTypes: string[];
  customWorkType: string;
  colorEntries: ColorEntry[];
}

const emptyForm = (): FormState => ({
  articleNo: "",
  totalQuantity: "",
  hasAdditionalWork: false,
  selectedWorkTypes: [],
  customWorkType: "",
  colorEntries: [],
});

const emptyRates = (): ArticleRates => ({
  tailorRate: 0,
  overlockRate: 0,
  foldingRate: 0,
  pressRate: 0,
  packingRate: 0,
  threadCuttingRate: 0,
  customRates: {},
});

function parseColorSizeData(raw: string): ColorEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(
      (entry: { color: string; sizes: Record<string, number> }) => ({
        color: entry.color || "",
        sizes: entry.sizes || {},
      }),
    );
  } catch {
    return [];
  }
}

export function ItemMasterTab() {
  const { actor } = useActor();
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [rates, setRates] = useState<ArticleRates>(emptyRates());
  const [editId, setEditId] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [fabricPerPiece, setFabricPerPiece] = useState(0);
  const [fabricUnit, setFabricUnit] = useState<"meters" | "grams" | "kg">(
    "meters",
  );

  // Color add form state
  const [showColorForm, setShowColorForm] = useState(false);
  const [editColorIndex, setEditColorIndex] = useState<number | null>(null);
  const [newColorName, setNewColorName] = useState("");
  const [newColorSizes, setNewColorSizes] = useState<Record<string, string>>(
    {},
  );

  const loadItems = async () => {
    // 1. Load from cache immediately for instant render
    const cached = await getFromCache<typeof items>(
      "ProductionMasterCache",
      "cache",
      "items_cache",
    );
    if (cached && cached.length > 0) {
      setItems(cached);
    }
    // 2. Fetch from backend in background
    if (!actor) return;
    try {
      const data = await actor.getItemMasters();
      setItems(data as typeof data);
      // Save to cache on success (fire-and-forget)
      saveToCache("ProductionMasterCache", "cache", "items_cache", data).catch(
        () => {},
      );
    } catch {
      if (!cached || cached.length === 0) {
        // No cache either — nothing to show
      } else {
        // Show cached data silently (toast only if first time seeing server error)
        import("sonner").then(({ toast }) => {
          toast.info("Showing cached data – server unavailable", {
            id: "items-cached",
          });
        });
      }
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: load on actor ready
  useEffect(() => {
    loadItems();
  }, [actor]);

  // Sum all quantities across all colors and all sizes
  const totalColorSizeSum = form.colorEntries.reduce((total, ce) => {
    return total + Object.values(ce.sizes).reduce((s, v) => s + (v || 0), 0);
  }, 0);

  const totalQtyNum = Number.parseFloat(form.totalQuantity) || 0;
  const sizeMatchesTotal =
    form.colorEntries.length === 0 ||
    Math.abs(totalColorSizeSum - totalQtyNum) < 0.01;

  const handleSave = async () => {
    if (!actor) {
      toast.error("Not connected");
      return;
    }
    if (!form.articleNo.trim()) {
      toast.error("Article Number is required");
      return;
    }
    if (totalQtyNum <= 0) {
      toast.error("Total Quantity must be greater than 0");
      return;
    }
    // Colors and sizes are optional -- no blocking validation

    // Build colorSizeData JSON
    const colorSizeData = JSON.stringify(
      form.colorEntries.map((ce) => ({ color: ce.color, sizes: ce.sizes })),
    );

    // Legacy colors (comma-joined)
    const colorsStr = form.colorEntries.map((ce) => ce.color).join(",");

    // Legacy flat size fields: sum each size across all colors
    const flatSizes: Record<string, number> = {};
    for (const size of ALL_SIZES) {
      flatSizes[size] = form.colorEntries.reduce(
        (sum, ce) => sum + (ce.sizes[size] || 0),
        0,
      );
    }

    const workTypes = form.selectedWorkTypes.join(",");

    setLoading(true);
    try {
      // --- backend call only (isolated so post-save ops don't trigger this catch) ---
      if (editId !== null) {
        const ok = await withRetry(() =>
          actor.updateItemMaster(
            editId,
            form.articleNo.trim(),
            totalQtyNum,
            colorsStr,
            form.hasAdditionalWork,
            workTypes,
            flatSizes.XS ?? 0,
            flatSizes.S ?? 0,
            flatSizes.M ?? 0,
            flatSizes.L ?? 0,
            flatSizes.XL ?? 0,
            flatSizes.XXL ?? 0,
            flatSizes["3XL"] ?? 0,
            flatSizes["4XL"] ?? 0,
            flatSizes["5XL"] ?? 0,
            colorSizeData,
          ),
        );
        if (!ok) {
          toast.error("Item not found — could not update");
          setLoading(false);
          return;
        }
      } else {
        await withRetry(() =>
          actor.addItemMaster(
            form.articleNo.trim(),
            totalQtyNum,
            colorsStr,
            form.hasAdditionalWork,
            workTypes,
            flatSizes.XS ?? 0,
            flatSizes.S ?? 0,
            flatSizes.M ?? 0,
            flatSizes.L ?? 0,
            flatSizes.XL ?? 0,
            flatSizes.XXL ?? 0,
            flatSizes["3XL"] ?? 0,
            flatSizes["4XL"] ?? 0,
            flatSizes["5XL"] ?? 0,
            colorSizeData,
          ),
        );
      }
    } catch (saveErr) {
      console.error("[ItemMaster] Backend save error:", saveErr);
      // Enqueue for offline sync and add to local UI
      if (editId === null) {
        const pendingData = {
          articleNo: form.articleNo.trim(),
          totalQuantity: totalQtyNum,
          colorSizeData: JSON.stringify(
            form.colorEntries.map((ce) => ({
              color: ce.color,
              sizes: ce.sizes,
            })),
          ),
          workTypes: form.selectedWorkTypes.join(","),
          hasAdditionalWork: form.hasAdditionalWork,
        };
        enqueuePending("item_master", pendingData);
        toast.warning("Saved offline – will sync when server is available");
      } else {
        toast.error(cleanErrorMessage(saveErr));
      }
      setLoading(false);
      return;
    }

    // --- post-save operations (errors here do NOT show "Failed to save item") ---
    const isUpdate = editId !== null;
    saveArticleRates(form.articleNo, rates);
    if (fabricPerPiece > 0 && actor) {
      actor.setFabricPerPiece(form.articleNo, fabricPerPiece).catch(() => {});
    }
    // Persist fabric unit to localStorage
    localStorage.setItem(`fabricUnit_${form.articleNo}`, fabricUnit);
    setFabricPerPiece(0);
    setFabricUnit("meters");
    setForm(emptyForm());
    setRates(emptyRates());
    setEditId(null);
    setShowForm(false);
    toast.success(
      isUpdate ? "Item updated successfully" : "Item saved successfully",
    );
    setLoading(false);

    // Refresh list — failure here is non-critical
    await loadItems().catch((e) =>
      console.warn("[ItemMaster] Refresh failed:", e),
    );
  };

  const handleEdit = (item: ItemMaster) => {
    const colorEntries = parseColorSizeData(item.colorSizeData);
    const entries: ColorEntry[] =
      colorEntries.length > 0
        ? colorEntries
        : item.colors
          ? item.colors
              .split(",")
              .filter(Boolean)
              .map((c) => {
                const sizes: Record<string, number> = {};
                for (const s of ALL_SIZES) {
                  sizes[s] = (item[SIZE_KEYS[s]] as number) || 0;
                }
                return { color: c.trim(), sizes };
              })
          : [];

    setForm({
      articleNo: item.articleNo,
      totalQuantity: String(item.totalQuantity),
      hasAdditionalWork: item.hasAdditionalWork,
      selectedWorkTypes: item.workTypes
        ? item.workTypes.split(",").filter(Boolean)
        : [],
      customWorkType: "",
      colorEntries: entries,
    });
    // Load saved rates for this article
    setRates(loadArticleRates(item.articleNo));
    // Load saved fabric unit for this article
    const savedUnit = localStorage.getItem(`fabricUnit_${item.articleNo}`) as
      | "meters"
      | "grams"
      | "kg"
      | null;
    setFabricUnit(savedUnit || "meters");
    if (actor) {
      actor
        .getFabricPerPiece(item.articleNo)
        .then((v) => setFabricPerPiece(v))
        .catch(() => {});
    }
    setEditId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: bigint) => {
    if (!actor) return;
    if (!confirm("Delete this item?")) return;
    try {
      await actor.deleteItemMaster(id);
      toast.success("Deleted");
      await loadItems();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const toggleWorkType = (wt: string) => {
    setForm((f) => ({
      ...f,
      selectedWorkTypes: f.selectedWorkTypes.includes(wt)
        ? f.selectedWorkTypes.filter((x) => x !== wt)
        : [...f.selectedWorkTypes, wt],
    }));
  };

  const addCustomWorkType = () => {
    const wt = form.customWorkType.trim();
    if (!wt) return;
    if (!form.selectedWorkTypes.includes(wt)) {
      setForm((f) => ({
        ...f,
        selectedWorkTypes: [...f.selectedWorkTypes, wt],
        customWorkType: "",
      }));
    } else {
      setForm((f) => ({ ...f, customWorkType: "" }));
    }
  };

  const openAddColorForm = () => {
    setEditColorIndex(null);
    setNewColorName("");
    setNewColorSizes({});
    setShowColorForm(true);
  };

  const openEditColorForm = (idx: number) => {
    const ce = form.colorEntries[idx];
    setEditColorIndex(idx);
    setNewColorName(ce.color);
    setNewColorSizes(
      Object.fromEntries(
        Object.entries(ce.sizes).map(([k, v]) => [k, String(v)]),
      ),
    );
    setShowColorForm(true);
  };

  const saveColorEntry = () => {
    if (!newColorName.trim()) {
      toast.error("Color name is required");
      return;
    }
    const sizesObj: Record<string, number> = {};
    for (const size of ALL_SIZES) {
      const val = Number.parseFloat(newColorSizes[size] || "0") || 0;
      if (val > 0) {
        sizesObj[size] = val;
      }
    }
    // No blocking if no sizes -- sizes are optional
    const newEntry: ColorEntry = {
      color: newColorName.trim(),
      sizes: sizesObj,
    };
    setForm((f) => {
      const entries = [...f.colorEntries];
      if (editColorIndex !== null) {
        entries[editColorIndex] = newEntry;
      } else {
        if (
          entries.some(
            (e) => e.color.toLowerCase() === newEntry.color.toLowerCase(),
          )
        ) {
          toast.error("Color already added");
          return f;
        }
        entries.push(newEntry);
      }
      return { ...f, colorEntries: entries };
    });
    setShowColorForm(false);
    setNewColorName("");
    setNewColorSizes({});
    setEditColorIndex(null);
  };

  const removeColorEntry = (idx: number) => {
    setForm((f) => ({
      ...f,
      colorEntries: f.colorEntries.filter((_, i) => i !== idx),
    }));
  };

  // Get all work types that need rates (predefined selected + custom)
  const workTypesNeedingRates = form.selectedWorkTypes;

  // Get rate for a work type from rates state
  const getRateForWT = (wt: string): string => {
    const key = WORK_TYPE_RATE_KEYS[wt];
    if (key) return String((rates[key] as number) || "");
    return String(rates.customRates[wt] || "");
  };

  const setRateForWT = (wt: string, val: string) => {
    const num = Number.parseFloat(val) || 0;
    const key = WORK_TYPE_RATE_KEYS[wt];
    if (key) {
      setRates((r) => ({ ...r, [key]: num }));
    } else {
      setRates((r) => ({
        ...r,
        customRates: { ...r.customRates, [wt]: num },
      }));
    }
  };

  // Get saved rates display for item list
  const getItemRates = (articleNo: string) => {
    return loadArticleRates(articleNo);
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      <DashboardAlerts />
      <div className="flex items-center justify-between">
        <h2
          className="text-lg font-bold"
          style={{ color: "oklch(var(--foreground))" }}
        >
          Item Master
        </h2>
        <Button
          data-ocid="item_master.open_modal_button"
          onClick={() => {
            setForm(emptyForm());
            setRates(emptyRates());
            setEditId(null);
            setFabricUnit("meters");
            setShowForm(true);
            setShowColorForm(false);
          }}
          size="sm"
        >
          + New Item
        </Button>
      </div>

      {showForm && (
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
            {editId !== null ? "Edit Item" : "New Item"}
          </h3>

          <div>
            <Label>Article Number *</Label>
            <Input
              data-ocid="item_master.article_input"
              value={form.articleNo}
              onChange={(e) =>
                setForm((f) => ({ ...f, articleNo: e.target.value }))
              }
              placeholder="e.g. ART-001"
            />
          </div>

          <div>
            <Label>Total Cutting Quantity *</Label>
            <Input
              data-ocid="item_master.qty_input"
              type="number"
              value={form.totalQuantity}
              onChange={(e) =>
                setForm((f) => ({ ...f, totalQuantity: e.target.value }))
              }
              placeholder="e.g. 500"
            />
          </div>

          <div>
            <Label>Fabric Consumption Per Piece — Optional</Label>
            {/* Unit toggle */}
            <div className="flex gap-2 mt-1 mb-2">
              <button
                type="button"
                onClick={() => setFabricUnit("meters")}
                className="px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors"
                style={{
                  background:
                    fabricUnit === "meters"
                      ? "oklch(var(--primary))"
                      : "transparent",
                  color:
                    fabricUnit === "meters"
                      ? "oklch(var(--primary-foreground))"
                      : "oklch(var(--foreground))",
                  borderColor: "oklch(var(--border))",
                }}
              >
                Meters
              </button>
              <button
                type="button"
                onClick={() => setFabricUnit("grams")}
                className="px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors"
                style={{
                  background:
                    fabricUnit === "grams"
                      ? "oklch(var(--primary))"
                      : "transparent",
                  color:
                    fabricUnit === "grams"
                      ? "oklch(var(--primary-foreground))"
                      : "oklch(var(--foreground))",
                  borderColor: "oklch(var(--border))",
                }}
              >
                Grams
              </button>
              <button
                type="button"
                onClick={() => setFabricUnit("kg")}
                className="px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors"
                style={{
                  background:
                    fabricUnit === "kg"
                      ? "oklch(var(--primary))"
                      : "transparent",
                  color:
                    fabricUnit === "kg"
                      ? "oklch(var(--primary-foreground))"
                      : "oklch(var(--foreground))",
                  borderColor: "oklch(var(--border))",
                }}
              >
                KG
              </button>
            </div>
            <Input
              data-ocid="item_master.input"
              type="number"
              step={
                fabricUnit === "meters" || fabricUnit === "kg" ? "0.01" : "1"
              }
              value={fabricPerPiece > 0 ? String(fabricPerPiece) : ""}
              onChange={(e) =>
                setFabricPerPiece(Number.parseFloat(e.target.value) || 0)
              }
              placeholder={
                fabricUnit === "meters"
                  ? "e.g. 1.5"
                  : fabricUnit === "kg"
                    ? "e.g. 1.25"
                    : "e.g. 250"
              }
            />
          </div>

          {/* Colors Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Colors &amp; Size-wise Quantity (Optional)</Label>
              <Button
                data-ocid="item_master.add_color_button"
                type="button"
                variant="outline"
                size="sm"
                onClick={openAddColorForm}
              >
                + Add Color
              </Button>
            </div>

            {form.colorEntries.length > 0 && form.totalQuantity && (
              <p
                className="text-xs mb-2"
                style={{
                  color: sizeMatchesTotal
                    ? "oklch(var(--primary))"
                    : "oklch(var(--destructive))",
                }}
              >
                Total entered: {totalColorSizeSum} / {totalQtyNum} pcs
                {sizeMatchesTotal ? " ✓" : " — must match total quantity"}
              </p>
            )}

            {form.colorEntries.length === 0 && (
              <p
                className="text-xs"
                style={{ color: "oklch(var(--muted-foreground))" }}
              >
                No colors added (optional). Click "+ Add Color" to add
                color-wise quantities.
              </p>
            )}

            <div className="space-y-2">
              {form.colorEntries.map((ce, idx) => (
                <div
                  key={ce.color}
                  className="rounded-lg border p-2"
                  style={{
                    background: "oklch(var(--muted) / 0.4)",
                    borderColor: "oklch(var(--border))",
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="font-semibold text-sm"
                      style={{ color: "oklch(var(--foreground))" }}
                    >
                      {ce.color}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEditColorForm(idx)}
                        className="h-6 text-xs px-2"
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeColorEntry(idx)}
                        className="h-6 px-2"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(ce.sizes)
                      .filter(([, v]) => v > 0)
                      .map(([size, qty]) => (
                        <span
                          key={size}
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            background: "oklch(var(--primary) / 0.12)",
                            color: "oklch(var(--primary))",
                          }}
                        >
                          {size}: {qty}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Color Form (inline) */}
          {showColorForm && (
            <div
              className="rounded-lg border p-3 space-y-3"
              style={{
                background: "oklch(var(--card))",
                borderColor: "oklch(var(--primary) / 0.4)",
              }}
            >
              <p
                className="font-semibold text-xs"
                style={{ color: "oklch(var(--primary))" }}
              >
                {editColorIndex !== null ? "Edit Color" : "Add Color"}
              </p>
              <div>
                <Label className="text-xs">Color Name *</Label>
                <Input
                  value={newColorName}
                  onChange={(e) => setNewColorName(e.target.value)}
                  placeholder="e.g. Black, Blue, Red"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs mb-2 block">
                  Size-wise Quantity (Optional)
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {ALL_SIZES.map((size) => (
                    <div key={size}>
                      <label
                        htmlFor={`color-size-${size}`}
                        className="text-xs font-medium"
                        style={{ color: "oklch(var(--muted-foreground))" }}
                      >
                        {size}
                      </label>
                      <Input
                        id={`color-size-${size}`}
                        type="number"
                        value={newColorSizes[size] || ""}
                        onChange={(e) =>
                          setNewColorSizes((s) => ({
                            ...s,
                            [size]: e.target.value,
                          }))
                        }
                        placeholder="0"
                        className="text-sm"
                        min="0"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={saveColorEntry}
                  className="flex-1"
                >
                  {editColorIndex !== null ? "Update Color" : "Add Color"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowColorForm(false);
                    setEditColorIndex(null);
                    setNewColorName("");
                    setNewColorSizes({});
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Additional Work */}
          <div>
            <Label className="block mb-2">Additional Work Required?</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, hasAdditionalWork: true }))
                }
                className="px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors"
                style={{
                  background: form.hasAdditionalWork
                    ? "oklch(var(--primary))"
                    : "transparent",
                  color: form.hasAdditionalWork
                    ? "oklch(var(--primary-foreground))"
                    : "oklch(var(--foreground))",
                  borderColor: "oklch(var(--border))",
                }}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    hasAdditionalWork: false,
                    selectedWorkTypes: [],
                  }))
                }
                className="px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors"
                style={{
                  background: !form.hasAdditionalWork
                    ? "oklch(var(--primary))"
                    : "transparent",
                  color: !form.hasAdditionalWork
                    ? "oklch(var(--primary-foreground))"
                    : "oklch(var(--foreground))",
                  borderColor: "oklch(var(--border))",
                }}
              >
                No
              </button>
            </div>
          </div>

          {/* Work Types Selection */}
          {form.hasAdditionalWork && (
            <div>
              <Label className="block mb-2">Work Types</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {PREDEFINED_WORK_TYPES.map((wt) => (
                  <button
                    key={wt}
                    type="button"
                    onClick={() => toggleWorkType(wt)}
                    className="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
                    style={{
                      background: form.selectedWorkTypes.includes(wt)
                        ? "oklch(var(--primary))"
                        : "transparent",
                      color: form.selectedWorkTypes.includes(wt)
                        ? "oklch(var(--primary-foreground))"
                        : "oklch(var(--foreground))",
                      borderColor: "oklch(var(--border))",
                    }}
                  >
                    {wt}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={form.customWorkType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, customWorkType: e.target.value }))
                  }
                  placeholder="Custom work type..."
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
                  Add
                </Button>
              </div>
              {form.selectedWorkTypes.length > 0 && (
                <p
                  className="text-xs mt-1"
                  style={{ color: "oklch(var(--muted-foreground))" }}
                >
                  Selected: {form.selectedWorkTypes.join(", ")}
                </p>
              )}
            </div>
          )}

          {/* ===== WORK TYPE RATES SECTION ===== */}
          <div
            className="rounded-xl border p-3 space-y-3"
            style={{
              background: "oklch(var(--primary) / 0.04)",
              borderColor: "oklch(var(--primary) / 0.2)",
            }}
          >
            <p
              className="font-semibold text-sm"
              style={{ color: "oklch(var(--primary))" }}
            >
              Work Type Rates (₹ per PCS)
            </p>
            <p
              className="text-xs"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              Define rates once here. They will auto-fill when selecting this
              article in Tailor and Additional Work tabs.
            </p>

            {/* Always show Tailor Rate */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tailor Stitching Rate</Label>
                <div className="relative">
                  <span
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-sm"
                    style={{ color: "oklch(var(--muted-foreground))" }}
                  >
                    ₹
                  </span>
                  <Input
                    data-ocid="item_master.tailor_rate_input"
                    type="number"
                    value={rates.tailorRate || ""}
                    onChange={(e) =>
                      setRates((r) => ({
                        ...r,
                        tailorRate: Number.parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder="0"
                    className="pl-6 text-sm"
                    min="0"
                  />
                </div>
              </div>

              {/* Show predefined work type rates */}
              {PREDEFINED_WORK_TYPES.filter(
                (wt) => wt !== "Tailor Stitching",
              ).map((wt) => (
                <div key={wt}>
                  <Label className="text-xs">{wt} Rate</Label>
                  <div className="relative">
                    <span
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-sm"
                      style={{ color: "oklch(var(--muted-foreground))" }}
                    >
                      ₹
                    </span>
                    <Input
                      type="number"
                      value={getRateForWT(wt)}
                      onChange={(e) => setRateForWT(wt, e.target.value)}
                      placeholder="0"
                      className="pl-6 text-sm"
                      min="0"
                    />
                  </div>
                </div>
              ))}

              {/* Custom work types selected */}
              {workTypesNeedingRates
                .filter((wt) => !PREDEFINED_WORK_TYPES.includes(wt))
                .map((wt) => (
                  <div key={wt}>
                    <Label className="text-xs">{wt} Rate</Label>
                    <div className="relative">
                      <span
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-sm"
                        style={{ color: "oklch(var(--muted-foreground))" }}
                      >
                        ₹
                      </span>
                      <Input
                        type="number"
                        value={getRateForWT(wt)}
                        onChange={(e) => setRateForWT(wt, e.target.value)}
                        placeholder="0"
                        className="pl-6 text-sm"
                        min="0"
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              data-ocid="item_master.save_button"
              onClick={handleSave}
              disabled={loading}
              className="flex-1"
            >
              {loading
                ? "Saving..."
                : editId !== null
                  ? "Update Item"
                  : "Save Item"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setShowColorForm(false);
                setForm(emptyForm());
                setRates(emptyRates());
                setEditId(null);
                setFabricUnit("meters");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="space-y-3">
        {items.length === 0 && (
          <div
            data-ocid="item_master.empty_state"
            className="text-center py-8"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            No items yet. Create your first item.
          </div>
        )}
        {items.map((item, idx) => {
          const colorEntries = parseColorSizeData(item.colorSizeData);
          const savedRates = getItemRates(item.articleNo);
          return (
            <div
              key={Number(item.id)}
              data-ocid={`item_master.item.${idx + 1}`}
              className="rounded-xl border p-3 space-y-2"
              style={{
                background: "oklch(var(--card))",
                borderColor: "oklch(var(--border))",
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p
                    className="font-bold"
                    style={{ color: "oklch(var(--foreground))" }}
                  >
                    {item.articleNo}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "oklch(var(--muted-foreground))" }}
                  >
                    Total Qty: {item.totalQuantity}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    data-ocid={`item_master.edit_button.${idx + 1}`}
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(item)}
                  >
                    Edit
                  </Button>
                  <Button
                    data-ocid={`item_master.delete_button.${idx + 1}`}
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                  >
                    Del
                  </Button>
                </div>
              </div>

              {/* Color-wise breakdown */}
              {colorEntries.length > 0 ? (
                <div className="space-y-1">
                  {colorEntries.map((ce) => (
                    <div key={ce.color}>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: "oklch(var(--foreground))" }}
                      >
                        {ce.color}:
                      </span>
                      <span className="ml-1 flex flex-wrap gap-1 inline-flex">
                        {Object.entries(ce.sizes)
                          .filter(([, v]) => v > 0)
                          .map(([size, qty]) => (
                            <span
                              key={size}
                              className="text-xs px-1.5 py-0.5 rounded-full"
                              style={{
                                background: "oklch(var(--muted))",
                                color: "oklch(var(--muted-foreground))",
                              }}
                            >
                              {size}:{qty}
                            </span>
                          ))}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {ALL_SIZES.map((s) => {
                    const val = item[SIZE_KEYS[s]] as number;
                    if (!val || val === 0) return null;
                    return (
                      <span
                        key={s}
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: "oklch(var(--muted))",
                          color: "oklch(var(--muted-foreground))",
                        }}
                      >
                        {s}: {val}
                      </span>
                    );
                  })}
                </div>
              )}

              {item.hasAdditionalWork && item.workTypes && (
                <p
                  className="text-xs"
                  style={{ color: "oklch(var(--primary))" }}
                >
                  Work: {item.workTypes}
                </p>
              )}

              {/* Rates summary */}
              {(savedRates.tailorRate > 0 ||
                savedRates.overlockRate > 0 ||
                savedRates.foldingRate > 0 ||
                savedRates.pressRate > 0 ||
                savedRates.packingRate > 0 ||
                savedRates.threadCuttingRate > 0 ||
                Object.keys(savedRates.customRates).length > 0) && (
                <div
                  className="rounded-lg p-2"
                  style={{ background: "oklch(var(--muted) / 0.5)" }}
                >
                  <p
                    className="text-xs font-semibold mb-1"
                    style={{ color: "oklch(var(--muted-foreground))" }}
                  >
                    Rates:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {savedRates.tailorRate > 0 && (
                      <span
                        className="text-xs"
                        style={{ color: "oklch(var(--foreground))" }}
                      >
                        Tailor: ₹{savedRates.tailorRate}
                      </span>
                    )}
                    {savedRates.overlockRate > 0 && (
                      <span
                        className="text-xs"
                        style={{ color: "oklch(var(--foreground))" }}
                      >
                        Overlock: ₹{savedRates.overlockRate}
                      </span>
                    )}
                    {savedRates.foldingRate > 0 && (
                      <span
                        className="text-xs"
                        style={{ color: "oklch(var(--foreground))" }}
                      >
                        Folding: ₹{savedRates.foldingRate}
                      </span>
                    )}
                    {savedRates.pressRate > 0 && (
                      <span
                        className="text-xs"
                        style={{ color: "oklch(var(--foreground))" }}
                      >
                        Press: ₹{savedRates.pressRate}
                      </span>
                    )}
                    {savedRates.packingRate > 0 && (
                      <span
                        className="text-xs"
                        style={{ color: "oklch(var(--foreground))" }}
                      >
                        Packing: ₹{savedRates.packingRate}
                      </span>
                    )}
                    {savedRates.threadCuttingRate > 0 && (
                      <span
                        className="text-xs"
                        style={{ color: "oklch(var(--foreground))" }}
                      >
                        Thread: ₹{savedRates.threadCuttingRate}
                      </span>
                    )}
                    {Object.entries(savedRates.customRates).map(([k, v]) =>
                      v > 0 ? (
                        <span
                          key={k}
                          className="text-xs"
                          style={{ color: "oklch(var(--foreground))" }}
                        >
                          {k}: ₹{v}
                        </span>
                      ) : null,
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
