import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { DispatchRecord, ItemMaster } from "../backend";
import { useActor } from "../hooks/useActor";
import { getFromCache, saveToCache } from "../utils/offlineCache";
import { cleanErrorMessage, withRetry } from "../utils/retryUtils";
import { enqueuePending } from "../utils/syncQueue";
import { SearchableDropdown } from "./SearchableDropdown";

interface FormState {
  articleNo: string;
  partyName: string;
  dispatchDate: string;
  dispatchPcs: string;
  salePrice: string;
  percentage: string;
  sizeWiseBreakup: string;
  colorWiseBreakup: string;
}

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): FormState => ({
  articleNo: "",
  partyName: "",
  dispatchDate: today(),
  dispatchPcs: "",
  salePrice: "",
  percentage: "",
  sizeWiseBreakup: "",
  colorWiseBreakup: "",
});

export function DispatchTab() {
  const { actor } = useActor();
  const [records, setRecords] = useState<DispatchRecord[]>([]);
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editId, setEditId] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filterArticle, setFilterArticle] = useState("");
  const [availableStockInfo, setAvailableStockInfo] = useState<number | null>(
    null,
  );

  const pcs = Number.parseFloat(form.dispatchPcs) || 0;
  const price = Number.parseFloat(form.salePrice) || 0;
  const pct = Number.parseFloat(form.percentage) || 0;
  const finalPayment = (pcs * price * pct) / 100;

  const loadData = async () => {
    // 1. Load from cache immediately
    const cached = await getFromCache<typeof records>(
      "ProductionMasterCache",
      "cache",
      "dispatch_cache",
    );
    if (cached && cached.length > 0) setRecords(cached);

    if (!actor) return;
    try {
      const [recs, itemList] = await Promise.all([
        actor.getDispatchRecords(),
        actor.getItemMasters().catch(() => []),
      ]);
      setRecords(recs as typeof recs);
      setItems(itemList as typeof itemList);
      saveToCache(
        "ProductionMasterCache",
        "cache",
        "dispatch_cache",
        recs,
      ).catch(() => {});
    } catch {
      if (!cached || cached.length === 0) return;
      import("sonner").then(({ toast }) => {
        toast.info("Showing cached data – server unavailable", {
          id: "dispatch-cached",
        });
      });
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: load on actor ready
  useEffect(() => {
    loadData();
  }, [actor]);

  // Fetch available stock when article changes

  useEffect(() => {
    if (form.articleNo && actor) {
      actor
        .getAvailableStock(form.articleNo)
        .then((v) => setAvailableStockInfo(v))
        .catch(() => setAvailableStockInfo(null));
    } else {
      setAvailableStockInfo(null);
    }
  }, [form.articleNo, actor]);

  const getItemTotalQty = (articleNo: string): number => {
    const item = items.find((i) => i.articleNo === articleNo);
    return item ? item.totalQuantity : 0;
  };

  const getTotalDispatchedForArticle = (articleNo: string): number => {
    return records
      .filter((r) => r.articleNo === articleNo)
      .reduce((sum, r) => sum + r.dispatchPcs, 0);
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
    if (!form.partyName.trim()) {
      toast.error("Party Name required");
      return;
    }
    if (pcs <= 0) {
      toast.error("Dispatch PCS must be greater than 0");
      return;
    }

    // Validate available stock before dispatch
    setLoading(true);
    try {
      const availableStock = await actor.getAvailableStock(form.articleNo);
      let effectiveStock = availableStock;
      if (editId !== null) {
        const currentRec = records.find((r) => r.id === editId);
        if (currentRec) {
          effectiveStock = availableStock + currentRec.dispatchPcs;
        }
      }
      if (pcs > effectiveStock) {
        toast.error("Dispatch quantity exceeds available stock.");
        setLoading(false);
        return;
      }
    } catch {
      // If stock check fails, proceed without blocking
    }

    try {
      if (editId !== null) {
        await withRetry(() =>
          actor.updateDispatchRecord(
            editId,
            form.articleNo,
            form.partyName,
            form.dispatchDate,
            pcs,
            price,
            pct,
            form.sizeWiseBreakup,
            form.colorWiseBreakup,
          ),
        );
        toast.success("Dispatch updated");
      } else {
        await withRetry(() =>
          actor.addDispatchRecord(
            form.articleNo,
            form.partyName,
            form.dispatchDate,
            pcs,
            price,
            pct,
            form.sizeWiseBreakup,
            form.colorWiseBreakup,
          ),
        );
        toast.success("Dispatch saved");
      }
      setForm(emptyForm());
      setEditId(null);
      setShowForm(false);
      await loadData();
    } catch (saveErr) {
      console.error("[DispatchTab] Backend save error:", saveErr);
      if (editId === null) {
        const pendingData = {
          articleNo: form.articleNo,
          partyName: form.partyName,
          dispatchDate: form.dispatchDate,
          dispatchPcs: pcs,
          salePrice: price,
          percentage: pct,
        };
        enqueuePending("dispatch", pendingData);
        toast.warning("Saved offline – will sync when server is available");
      } else {
        toast.error(cleanErrorMessage(saveErr));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (r: DispatchRecord) => {
    setForm({
      articleNo: r.articleNo,
      partyName: r.partyName,
      dispatchDate: r.dispatchDate,
      dispatchPcs: String(r.dispatchPcs),
      salePrice: String(r.salePrice),
      percentage: String(r.percentage),
      sizeWiseBreakup: r.sizeWiseBreakup,
      colorWiseBreakup: r.colorWiseBreakup,
    });
    setEditId(r.id);
    setShowForm(true);
  };

  const handleDelete = async (id: bigint) => {
    if (!actor) return;
    if (!confirm("Delete this dispatch record?")) return;
    try {
      await actor.deleteDispatchRecord(id);
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

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <h2
          className="text-lg font-bold"
          style={{ color: "oklch(var(--foreground))" }}
        >
          Dispatch
        </h2>
        <Button
          data-ocid="dispatch.open_modal_button"
          onClick={() => {
            setForm(emptyForm());
            setEditId(null);
            setShowForm(true);
          }}
          size="sm"
        >
          + New Dispatch
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
          <h3 className="font-semibold text-sm">
            {editId !== null ? "Edit Dispatch" : "New Dispatch Entry"}
          </h3>

          <div>
            <Label>Article No *</Label>
            <select
              className="input-factory w-full"
              value={form.articleNo}
              onChange={(e) =>
                setForm((f) => ({ ...f, articleNo: e.target.value }))
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

          <div>
            <Label>Party Name *</Label>
            <SearchableDropdown
              value={form.partyName}
              onChange={(v) => setForm((f) => ({ ...f, partyName: v }))}
              placeholder="Enter party name..."
              fieldKey="dispatchPartyNames"
            />
          </div>

          <div>
            <Label>Dispatch Date</Label>
            <Input
              type="date"
              value={form.dispatchDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, dispatchDate: e.target.value }))
              }
            />
          </div>

          <div>
            <Label>Dispatch PCS *</Label>
            <Input
              data-ocid="dispatch.pcs_input"
              type="number"
              value={form.dispatchPcs}
              onChange={(e) =>
                setForm((f) => ({ ...f, dispatchPcs: e.target.value }))
              }
              placeholder="0"
            />
            {availableStockInfo !== null && (
              <p
                className="text-xs mt-1"
                style={{
                  color:
                    availableStockInfo <
                    (Number.parseFloat(form.dispatchPcs) || 0)
                      ? "oklch(var(--destructive))"
                      : "oklch(var(--muted-foreground))",
                }}
              >
                Available Stock: {availableStockInfo} pcs
              </p>
            )}
          </div>

          <div>
            <Label>Sale Price (per PCS)</Label>
            <Input
              type="number"
              value={form.salePrice}
              onChange={(e) =>
                setForm((f) => ({ ...f, salePrice: e.target.value }))
              }
              placeholder="0"
            />
          </div>

          <div>
            <Label>Percentage (%)</Label>
            <Input
              type="number"
              value={form.percentage}
              onChange={(e) =>
                setForm((f) => ({ ...f, percentage: e.target.value }))
              }
              placeholder="0"
            />
          </div>

          <div
            className="rounded-lg p-3"
            style={{ background: "oklch(var(--muted))" }}
          >
            <p
              className="text-sm font-semibold"
              style={{ color: "oklch(var(--foreground))" }}
            >
              Final Payment: ₹{finalPayment.toFixed(2)}
            </p>
            <p
              className="text-xs"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              {pcs} × ₹{price} × {pct}% = ₹{finalPayment.toFixed(2)}
            </p>
          </div>

          <div>
            <Label>Size-wise Breakup (optional)</Label>
            <Input
              value={form.sizeWiseBreakup}
              onChange={(e) =>
                setForm((f) => ({ ...f, sizeWiseBreakup: e.target.value }))
              }
              placeholder="e.g. S:10, M:20, L:30"
            />
          </div>

          <div>
            <Label>Color-wise Breakup (optional)</Label>
            <Input
              value={form.colorWiseBreakup}
              onChange={(e) =>
                setForm((f) => ({ ...f, colorWiseBreakup: e.target.value }))
              }
              placeholder="e.g. Red:20, Blue:40"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              data-ocid="dispatch.save_button"
              onClick={handleSave}
              disabled={loading}
              className="flex-1"
            >
              {loading
                ? "Saving..."
                : editId !== null
                  ? "Update"
                  : "Save Dispatch"}
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
              data-ocid="dispatch.empty_state"
              className="text-center py-6"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              No dispatch records yet.
            </div>
          )}
          {filtered.map((r, idx) => {
            const totalQty = getItemTotalQty(r.articleNo);
            const totalDispatched = getTotalDispatchedForArticle(r.articleNo);
            const pending = totalQty - totalDispatched;
            return (
              <div
                key={Number(r.id)}
                data-ocid={`dispatch.item.${idx + 1}`}
                className="rounded-xl border p-3 space-y-1"
                style={{
                  background: "oklch(var(--card))",
                  borderColor: "oklch(var(--border))",
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-sm">{r.articleNo}</p>
                    <p className="text-sm">{r.partyName}</p>
                    <p
                      className="text-xs"
                      style={{ color: "oklch(var(--muted-foreground))" }}
                    >
                      {r.dispatchDate}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "oklch(var(--muted-foreground))" }}
                    >
                      Dispatched: {r.dispatchPcs} pcs | Rate: ₹{r.salePrice} |{" "}
                      {r.percentage}%
                    </p>
                    {r.sizeWiseBreakup && (
                      <p
                        className="text-xs"
                        style={{ color: "oklch(var(--muted-foreground))" }}
                      >
                        Size: {r.sizeWiseBreakup}
                      </p>
                    )}
                    {r.colorWiseBreakup && (
                      <p
                        className="text-xs"
                        style={{ color: "oklch(var(--muted-foreground))" }}
                      >
                        Color: {r.colorWiseBreakup}
                      </p>
                    )}
                    {totalQty > 0 && (
                      <p
                        className="text-xs font-medium mt-1"
                        style={{
                          color:
                            pending >= 0
                              ? "oklch(var(--primary))"
                              : "oklch(var(--destructive))",
                        }}
                      >
                        Pending: {pending} pcs
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-2">
                    <p className="font-semibold text-sm">
                      ₹{r.finalPayment.toFixed(2)}
                    </p>
                    <div className="flex gap-1 mt-2">
                      <Button
                        data-ocid={`dispatch.edit_button.${idx + 1}`}
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(r)}
                      >
                        Edit
                      </Button>
                      <Button
                        data-ocid={`dispatch.delete_button.${idx + 1}`}
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
