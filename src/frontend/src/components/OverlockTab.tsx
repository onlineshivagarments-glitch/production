import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CalendarRange,
  ChevronDown,
  ChevronUp,
  Layers,
  LayoutList,
  Loader2,
  MessageCircle,
  Pencil,
  RotateCcw,
  Save,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { OverlockRecord } from "../backend";
import {
  useAddOverlockRecord,
  useDeleteOverlockRecord,
  useGetOverlockRecords,
  useGetOverlockReport,
} from "../hooks/useQueries";
import { SearchableDropdown } from "./SearchableDropdown";

type SubTab = "add" | "view";
type ViewMode = "all" | "artwise";

interface FormState {
  date: string;
  articleNo: string;
  employeeName: string;
  quantity: string;
  pcsRate: string;
  size: string;
  whatsappNo: string;
}

interface FormErrors {
  date?: string;
  articleNo?: string;
  employeeName?: string;
  quantity?: string;
  pcsRate?: string;
  size?: string;
}

interface EditFormState {
  date: string;
  articleNo: string;
  employeeName: string;
  size: string;
  quantity: string;
  pcsRate: string;
}

function shareOnWhatsApp(
  phone: string,
  name: string,
  totalQty: number,
  totalAmount: number,
  dateFrom: string,
  dateTo: string,
  articleBreakdown: Array<{ articleNo: string; qty: number; amount: number }>,
) {
  const period =
    dateFrom && dateTo
      ? `${dateFrom} to ${dateTo}`
      : dateFrom || dateTo || "All time";

  let breakdownText = "";
  if (articleBreakdown.length > 0) {
    breakdownText = `\n\n*Article Wise Details:*\n${articleBreakdown
      .map(
        (a) =>
          `• ${a.articleNo}: ${a.qty.toLocaleString()} pcs — ₨ ${a.amount.toFixed(2)}`,
      )
      .join("\n")}`;
  }

  const msg = `*Production Master Pro*\n\nDear ${name},\n\nYour overlock payment summary:\n\n📅 Period: ${period}\n🧵 Total Pieces: ${totalQty.toLocaleString()} pcs\n💰 Total Amount: ₨ ${totalAmount.toFixed(2)}${breakdownText}\n\nThank you for your work!`;
  const clean = phone.replace(/\D/g, "");
  const url = clean
    ? `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

const INITIAL_FORM: FormState = {
  date: getTodayDate(),
  articleNo: "",
  employeeName: "",
  quantity: "",
  pcsRate: "",
  size: "",
  whatsappNo: "",
};

export function OverlockTab() {
  const [subTab, setSubTab] = useState<SubTab>("add");
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});

  // Article-wise expanded state (keyed by articleNo)
  const [expandedArticles, setExpandedArticles] = useState<
    Record<string, boolean>
  >({});

  // Edit dialog state
  const [editingRecord, setEditingRecord] = useState<OverlockRecord | null>(
    null,
  );
  const [editForm, setEditForm] = useState<EditFormState>({
    date: "",
    articleNo: "",
    employeeName: "",
    size: "",
    quantity: "",
    pcsRate: "",
  });
  const [editSaving, setEditSaving] = useState(false);

  // View filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [articleFilter, setArticleFilter] = useState("");
  const [summaryExpanded, setSummaryExpanded] = useState(true);

  // Store WhatsApp numbers per employee name
  const [employeeWhatsapp, setEmployeeWhatsapp] = useState<
    Record<string, string>
  >(() => {
    try {
      return JSON.parse(localStorage.getItem("overlockWhatsapp") || "{}");
    } catch {
      return {};
    }
  });

  const saveEmployeeWhatsapp = (name: string, phone: string) => {
    const updated = { ...employeeWhatsapp, [name]: phone };
    setEmployeeWhatsapp(updated);
    localStorage.setItem("overlockWhatsapp", JSON.stringify(updated));
  };

  const { data: records = [], isLoading: recordsLoading } =
    useGetOverlockRecords();
  const { data: report = [] } = useGetOverlockReport();
  const addRecord = useAddOverlockRecord();
  const deleteRecord = useDeleteOverlockRecord();

  const finalAmount =
    (Number(form.quantity) || 0) * (Number(form.pcsRate) || 0);
  const editFinalAmount =
    (Number(editForm.quantity) || 0) * (Number(editForm.pcsRate) || 0);

  const handleChange = useCallback(
    (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    [],
  );

  const handleEditChange = useCallback(
    (field: keyof EditFormState) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditForm((prev) => ({ ...prev, [field]: e.target.value }));
      },
    [],
  );

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.date) newErrors.date = "Date is required";
    if (!form.articleNo.trim()) newErrors.articleNo = "Article No. is required";
    if (!form.employeeName.trim())
      newErrors.employeeName = "Employee Name is required";
    if (
      !form.quantity ||
      Number.isNaN(Number(form.quantity)) ||
      Number(form.quantity) <= 0
    )
      newErrors.quantity = "Enter valid quantity";
    if (
      !form.pcsRate ||
      Number.isNaN(Number(form.pcsRate)) ||
      Number(form.pcsRate) <= 0
    )
      newErrors.pcsRate = "Enter valid Pcs Rate";
    if (!form.size.trim()) newErrors.size = "Size is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const qty = Number(form.quantity);
    const pcsRate = Number(form.pcsRate);
    const amt = qty * pcsRate;
    try {
      await addRecord.mutateAsync({
        date: form.date,
        articleNo: form.articleNo.trim(),
        employeeName: form.employeeName.trim(),
        size: form.size.trim(),
        quantity: qty,
        pcsRate,
        finalAmount: amt,
      });
      toast.success("Overlock record saved!", {
        description: `${form.employeeName} — ₨ ${amt.toFixed(2)}`,
      });
      const savedWhatsapp = form.whatsappNo;
      handleClear();
      setForm((prev) => ({ ...prev, whatsappNo: savedWhatsapp }));
    } catch (err) {
      console.error("Save overlock record error:", err);
      toast.error("Failed to save overlock record. Please try again.");
    }
  };

  const handleClear = () => {
    setForm({ ...INITIAL_FORM, date: getTodayDate() });
    setErrors({});
  };

  const handleDelete = async (id: bigint, name: string) => {
    try {
      await deleteRecord.mutateAsync(id);
      toast.success(`Record for ${name} deleted.`);
    } catch {
      toast.error("Failed to delete record.");
    }
  };

  const openEditDialog = (record: OverlockRecord) => {
    setEditingRecord(record);
    setEditForm({
      date: record.date,
      articleNo: record.articleNo,
      employeeName: record.employeeName,
      size: record.size,
      quantity: String(record.quantity),
      pcsRate: String(record.pcsRate),
    });
  };

  const handleEditSave = async () => {
    if (!editingRecord) return;
    const qty = Number(editForm.quantity);
    const rate = Number(editForm.pcsRate);
    if (
      !editForm.date ||
      !editForm.articleNo.trim() ||
      !editForm.employeeName.trim() ||
      !editForm.size.trim() ||
      qty <= 0 ||
      rate <= 0
    ) {
      toast.error("Please fill all required fields correctly.");
      return;
    }
    const amt = qty * rate;
    setEditSaving(true);
    try {
      await deleteRecord.mutateAsync(editingRecord.id);
      await addRecord.mutateAsync({
        date: editForm.date,
        articleNo: editForm.articleNo.trim(),
        employeeName: editForm.employeeName.trim(),
        size: editForm.size.trim(),
        quantity: qty,
        pcsRate: rate,
        finalAmount: amt,
      });
      toast.success("Record updated successfully");
      setEditingRecord(null);
    } catch (err) {
      console.error("Edit overlock record error:", err);
      toast.error("Failed to update record");
    } finally {
      setEditSaving(false);
    }
  };

  const toggleArticle = (articleNo: string) => {
    setExpandedArticles((prev) => ({ ...prev, [articleNo]: !prev[articleNo] }));
  };

  // Filter records
  const filteredRecords = records.filter((r) => {
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    if (
      articleFilter &&
      !r.articleNo.toLowerCase().includes(articleFilter.toLowerCase())
    )
      return false;
    return true;
  });

  // Group records by articleNo
  const articleGroups = filteredRecords.reduce<
    Record<string, OverlockRecord[]>
  >((acc, r) => {
    if (!acc[r.articleNo]) acc[r.articleNo] = [];
    acc[r.articleNo].push(r);
    return acc;
  }, {});
  const sortedArticleKeys = Object.keys(articleGroups).sort((a, b) =>
    a.localeCompare(b),
  );

  const filteredReport = report.filter(([name]) => {
    if (dateFrom || dateTo || articleFilter) {
      const namesInFiltered = new Set(
        filteredRecords.map((r) => r.employeeName),
      );
      return namesInFiltered.has(name);
    }
    return true;
  });

  // Shared record card renderer
  const renderRecordCard = (record: OverlockRecord, idx: number) => (
    <div
      key={String(record.id)}
      data-ocid={`overlock.record.item.${idx + 1}`}
      className="rounded-lg border overflow-hidden"
      style={{
        borderColor: "oklch(var(--border))",
        background: "oklch(var(--card))",
      }}
    >
      {/* Card Header */}
      <div
        className="px-4 py-2.5 flex items-center justify-between border-b"
        style={{
          borderColor: "oklch(var(--border))",
          background: "oklch(var(--muted))",
        }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className="font-bold text-sm truncate"
            style={{
              fontFamily: "Cabinet Grotesk, sans-serif",
              color: "oklch(var(--foreground))",
            }}
          >
            {record.employeeName}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full shrink-0"
            style={{
              background: "oklch(var(--primary) / 0.12)",
              color: "oklch(var(--primary))",
              fontFamily: "Cabinet Grotesk, sans-serif",
              fontWeight: 600,
            }}
          >
            {record.articleNo}
          </span>
        </div>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            data-ocid={`overlock.record.edit_button.${idx + 1}`}
            onClick={() => openEditDialog(record)}
            className="h-7 w-7 p-0"
            style={{ color: "oklch(var(--primary))" }}
            title="Edit record"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            data-ocid={`overlock.record.delete_button.${idx + 1}`}
            onClick={() => handleDelete(record.id, record.employeeName)}
            disabled={deleteRecord.isPending}
            className="h-7 w-7 p-0"
            style={{ color: "oklch(var(--destructive))" }}
            title="Delete record"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Card Body */}
      <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2">
        <div>
          <div className="data-label">Date</div>
          <div className="data-value text-sm">{record.date}</div>
        </div>
        <div>
          <div className="data-label">Size</div>
          <div className="data-value text-sm">{record.size || "—"}</div>
        </div>
        <div>
          <div className="data-label">Quantity</div>
          <div className="data-value text-sm">
            {record.quantity.toLocaleString()} pcs
          </div>
        </div>
        <div>
          <div className="data-label">Pcs Rate</div>
          <div className="data-value text-sm">
            ₨ {record.pcsRate.toFixed(2)}
          </div>
        </div>
      </div>
      <div
        className="px-4 py-2.5 flex items-center justify-between border-t"
        style={{
          borderColor: "oklch(var(--border))",
          background: "oklch(var(--success) / 0.05)",
        }}
      >
        <span className="data-label">Final Amount</span>
        <span
          className="font-bold text-base"
          style={{ color: "oklch(var(--success))" }}
        >
          ₨ {record.finalAmount.toFixed(2)}
        </span>
      </div>
    </div>
  );

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Sub-tab Switcher */}
      <div
        className="flex rounded-lg overflow-hidden border"
        style={{ borderColor: "oklch(var(--border))" }}
      >
        <button
          type="button"
          data-ocid="overlock.add_tab"
          onClick={() => setSubTab("add")}
          className="flex-1 py-2.5 text-sm font-semibold transition-colors"
          style={{
            background:
              subTab === "add"
                ? "oklch(var(--primary))"
                : "oklch(var(--muted))",
            color:
              subTab === "add"
                ? "oklch(var(--primary-foreground))"
                : "oklch(var(--muted-foreground))",
            fontFamily: "Cabinet Grotesk, sans-serif",
          }}
        >
          <Layers className="inline w-4 h-4 mr-1.5 mb-0.5" />
          Add Record
        </button>
        <button
          type="button"
          data-ocid="overlock.view_tab"
          onClick={() => setSubTab("view")}
          className="flex-1 py-2.5 text-sm font-semibold transition-colors"
          style={{
            background:
              subTab === "view"
                ? "oklch(var(--primary))"
                : "oklch(var(--muted))",
            color:
              subTab === "view"
                ? "oklch(var(--primary-foreground))"
                : "oklch(var(--muted-foreground))",
            fontFamily: "Cabinet Grotesk, sans-serif",
          }}
        >
          <Users className="inline w-4 h-4 mr-1.5 mb-0.5" />
          View Records
        </button>
      </div>

      {/* ─── ADD RECORD SUB-TAB ─────────────────────────────────── */}
      {subTab === "add" && (
        <div className="space-y-4">
          {/* Live Result Card */}
          <div
            data-ocid="overlock.result_card"
            className="rounded-lg border-2 overflow-hidden"
            style={{
              borderColor:
                finalAmount > 0
                  ? "oklch(var(--primary))"
                  : "oklch(var(--border))",
              background:
                finalAmount > 0
                  ? "oklch(var(--primary) / 0.06)"
                  : "oklch(var(--muted))",
              transition: "all 0.2s ease",
            }}
          >
            <div
              className="px-4 py-2.5 flex items-center gap-2 border-b"
              style={{
                borderColor:
                  finalAmount > 0
                    ? "oklch(var(--primary) / 0.2)"
                    : "oklch(var(--border))",
              }}
            >
              <TrendingUp
                className="w-4 h-4"
                style={{
                  color:
                    finalAmount > 0
                      ? "oklch(var(--primary))"
                      : "oklch(var(--muted-foreground))",
                }}
              />
              <span
                className="data-label"
                style={{
                  color: finalAmount > 0 ? "oklch(var(--primary))" : undefined,
                }}
              >
                Live Calculation
              </span>
            </div>
            <div className="px-4 py-3 grid grid-cols-3 gap-3">
              <div>
                <div className="data-label mb-1">Quantity</div>
                <div
                  className="data-value"
                  style={{
                    color: form.quantity
                      ? "oklch(var(--foreground))"
                      : "oklch(var(--muted-foreground))",
                  }}
                >
                  {form.quantity ? Number(form.quantity).toLocaleString() : "—"}
                </div>
              </div>
              <div>
                <div className="data-label mb-1">Pcs Rate</div>
                <div
                  className="data-value"
                  style={{
                    color: form.pcsRate
                      ? "oklch(var(--foreground))"
                      : "oklch(var(--muted-foreground))",
                  }}
                >
                  {form.pcsRate ? `₨ ${Number(form.pcsRate).toFixed(2)}` : "—"}
                </div>
              </div>
              <div>
                <div className="data-label mb-1">Final Amount</div>
                <div
                  className="data-value"
                  style={{
                    color:
                      finalAmount > 0
                        ? "oklch(var(--success))"
                        : "oklch(var(--muted-foreground))",
                    fontSize: "1.05rem",
                  }}
                >
                  {finalAmount > 0 ? `₨ ${finalAmount.toFixed(2)}` : "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="overlock-date" className="data-label">
                Date
              </Label>
              <Input
                id="overlock-date"
                data-ocid="overlock.date_input"
                type="date"
                value={form.date}
                onChange={handleChange("date")}
                className="input-factory"
                style={
                  errors.date
                    ? { borderColor: "oklch(var(--destructive))" }
                    : {}
                }
              />
              {errors.date && (
                <p
                  className="text-xs font-medium"
                  style={{ color: "oklch(var(--destructive))" }}
                >
                  {errors.date}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="overlock-article" className="data-label">
                Article No.
              </Label>
              <SearchableDropdown
                id="overlock-article"
                data-ocid="overlock.article_input"
                fieldKey="article_no"
                placeholder="e.g. ART-2024-001"
                value={form.articleNo}
                onChange={(val) => {
                  setForm((prev) => ({ ...prev, articleNo: val }));
                  setErrors((prev) => ({ ...prev, articleNo: undefined }));
                }}
                hasError={!!errors.articleNo}
              />
              {errors.articleNo && (
                <p
                  className="text-xs font-medium"
                  style={{ color: "oklch(var(--destructive))" }}
                >
                  {errors.articleNo}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="overlock-employee" className="data-label">
                Employee Name
              </Label>
              <SearchableDropdown
                id="overlock-employee"
                data-ocid="overlock.employee_input"
                fieldKey="overlock_employee"
                placeholder="Enter employee name"
                value={form.employeeName}
                onChange={(val) => {
                  setForm((prev) => ({ ...prev, employeeName: val }));
                  setErrors((prev) => ({ ...prev, employeeName: undefined }));
                }}
                hasError={!!errors.employeeName}
              />
              {errors.employeeName && (
                <p
                  className="text-xs font-medium"
                  style={{ color: "oklch(var(--destructive))" }}
                >
                  {errors.employeeName}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="overlock-quantity" className="data-label">
                  Quantity (Pcs)
                </Label>
                <Input
                  id="overlock-quantity"
                  data-ocid="overlock.quantity_input"
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={form.quantity}
                  onChange={handleChange("quantity")}
                  className="input-factory"
                  style={
                    errors.quantity
                      ? { borderColor: "oklch(var(--destructive))" }
                      : {}
                  }
                />
                {errors.quantity && (
                  <p
                    className="text-xs font-medium"
                    style={{ color: "oklch(var(--destructive))" }}
                  >
                    {errors.quantity}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="overlock-pcsrate" className="data-label">
                  Pcs Rate (₨)
                </Label>
                <Input
                  id="overlock-pcsrate"
                  data-ocid="overlock.pcsrate_input"
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  step="0.01"
                  value={form.pcsRate}
                  onChange={handleChange("pcsRate")}
                  className="input-factory"
                  style={
                    errors.pcsRate
                      ? { borderColor: "oklch(var(--destructive))" }
                      : {}
                  }
                />
                {errors.pcsRate && (
                  <p
                    className="text-xs font-medium"
                    style={{ color: "oklch(var(--destructive))" }}
                  >
                    {errors.pcsRate}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="overlock-size" className="data-label">
                Size
              </Label>
              <SearchableDropdown
                id="overlock-size"
                data-ocid="overlock.size_input"
                fieldKey="overlock_size"
                placeholder="e.g. S, M, L, XL"
                value={form.size}
                onChange={(val) => {
                  setForm((prev) => ({ ...prev, size: val }));
                  setErrors((prev) => ({ ...prev, size: undefined }));
                }}
                hasError={!!errors.size}
              />
              {errors.size && (
                <p
                  className="text-xs font-medium"
                  style={{ color: "oklch(var(--destructive))" }}
                >
                  {errors.size}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="overlock-whatsapp" className="data-label">
                WhatsApp No. (optional)
              </Label>
              <div className="relative">
                <MessageCircle
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "#25D366" }}
                />
                <Input
                  id="overlock-whatsapp"
                  data-ocid="overlock.whatsapp_input"
                  type="tel"
                  inputMode="tel"
                  placeholder="e.g. 923001234567"
                  value={form.whatsappNo}
                  onChange={handleChange("whatsappNo")}
                  className="input-factory pl-9"
                />
              </div>
              <p
                className="text-xs"
                style={{ color: "oklch(var(--muted-foreground))" }}
              >
                Include country code, e.g. 92 for Pakistan
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <Button
              data-ocid="overlock.save_button"
              onClick={handleSave}
              disabled={addRecord.isPending}
              className="w-full btn-factory"
              size="lg"
              style={{
                background: "oklch(var(--success))",
                color: "oklch(var(--success-foreground))",
              }}
            >
              {addRecord.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save Overlock Record
                </>
              )}
            </Button>
            <Button
              data-ocid="overlock.clear_button"
              onClick={handleClear}
              variant="outline"
              className="w-full btn-factory"
              size="lg"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear Form
            </Button>
          </div>

          <div
            className="rounded-lg p-3 text-xs"
            style={{
              background: "oklch(var(--muted))",
              color: "oklch(var(--muted-foreground))",
            }}
          >
            <div
              className="font-semibold mb-1"
              style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
            >
              Calculation
            </div>
            <div>Final Amount = Quantity × Pcs Rate</div>
          </div>
        </div>
      )}

      {/* ─── VIEW RECORDS SUB-TAB ───────────────────────────────── */}
      {subTab === "view" && (
        <div className="space-y-4">
          {/* Filters */}
          <div
            className="rounded-lg p-3 space-y-3"
            style={{ background: "oklch(var(--muted))" }}
          >
            <div className="flex items-center gap-2">
              <CalendarRange
                className="w-4 h-4"
                style={{ color: "oklch(var(--primary))" }}
              />
              <span
                className="text-sm font-semibold"
                style={{
                  fontFamily: "Cabinet Grotesk, sans-serif",
                  color: "oklch(var(--foreground))",
                }}
              >
                Filter Records
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="data-label">Date From</Label>
                <Input
                  data-ocid="overlock.date_from_input"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="input-factory"
                />
              </div>
              <div className="space-y-1">
                <Label className="data-label">Date To</Label>
                <Input
                  data-ocid="overlock.date_to_input"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="input-factory"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="data-label">Article Filter</Label>
              <Input
                data-ocid="overlock.article_filter_input"
                type="text"
                placeholder="Search article no..."
                value={articleFilter}
                onChange={(e) => setArticleFilter(e.target.value)}
                className="input-factory"
              />
            </div>
          </div>

          {/* View Mode Toggle */}
          <div
            className="flex rounded-lg overflow-hidden border"
            style={{ borderColor: "oklch(var(--border))" }}
          >
            <button
              type="button"
              data-ocid="overlock.all_records_tab"
              onClick={() => setViewMode("all")}
              className="flex-1 py-2 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              style={{
                background:
                  viewMode === "all"
                    ? "oklch(var(--secondary))"
                    : "oklch(var(--muted))",
                color:
                  viewMode === "all"
                    ? "oklch(var(--secondary-foreground))"
                    : "oklch(var(--muted-foreground))",
                borderRight: "1px solid oklch(var(--border))",
                fontFamily: "Cabinet Grotesk, sans-serif",
              }}
            >
              <LayoutList className="w-3.5 h-3.5" />
              All Records
            </button>
            <button
              type="button"
              data-ocid="overlock.artwise_tab"
              onClick={() => setViewMode("artwise")}
              className="flex-1 py-2 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              style={{
                background:
                  viewMode === "artwise"
                    ? "oklch(var(--secondary))"
                    : "oklch(var(--muted))",
                color:
                  viewMode === "artwise"
                    ? "oklch(var(--secondary-foreground))"
                    : "oklch(var(--muted-foreground))",
                fontFamily: "Cabinet Grotesk, sans-serif",
              }}
            >
              <Layers className="w-3.5 h-3.5" />
              Article Wise
            </button>
          </div>

          {/* Employee Summary */}
          {filteredReport.length > 0 && (
            <div
              className="rounded-lg overflow-hidden border"
              style={{ borderColor: "oklch(var(--border))" }}
            >
              <button
                type="button"
                onClick={() => setSummaryExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3"
                style={{ background: "oklch(var(--primary) / 0.08)" }}
              >
                <div className="flex items-center gap-2">
                  <Layers
                    className="w-4 h-4"
                    style={{ color: "oklch(var(--primary))" }}
                  />
                  <span
                    className="text-sm font-bold"
                    style={{
                      fontFamily: "Cabinet Grotesk, sans-serif",
                      color: "oklch(var(--primary))",
                    }}
                  >
                    Employee Summary ({filteredReport.length})
                  </span>
                </div>
                {summaryExpanded ? (
                  <ChevronUp
                    className="w-4 h-4"
                    style={{ color: "oklch(var(--primary))" }}
                  />
                ) : (
                  <ChevronDown
                    className="w-4 h-4"
                    style={{ color: "oklch(var(--primary))" }}
                  />
                )}
              </button>
              {summaryExpanded && (
                <div
                  className="divide-y"
                  style={{ borderColor: "oklch(var(--border))" }}
                >
                  {filteredReport.map(([name, totalQty, totalAmount]) => (
                    <div
                      key={name}
                      className="px-4 py-3 space-y-2"
                      style={{ background: "oklch(var(--card))" }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div
                            className="font-semibold text-sm"
                            style={{
                              fontFamily: "Cabinet Grotesk, sans-serif",
                              color: "oklch(var(--foreground))",
                            }}
                          >
                            {name}
                          </div>
                          <div className="data-label mt-0.5">
                            {totalQty.toLocaleString()} pcs
                          </div>
                        </div>
                        <div
                          className="font-bold text-base"
                          style={{ color: "oklch(var(--success))" }}
                        >
                          ₨ {totalAmount.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        <input
                          type="tel"
                          placeholder="WhatsApp no. (e.g. 923001234567)"
                          value={employeeWhatsapp[name] || ""}
                          onChange={(e) =>
                            saveEmployeeWhatsapp(name, e.target.value)
                          }
                          className="input-factory flex-1 text-xs h-8 px-2"
                          style={{ fontSize: "0.75rem" }}
                          data-ocid="overlock.whatsapp_summary_input"
                        />
                        <Button
                          size="sm"
                          data-ocid="overlock.whatsapp_share_button"
                          onClick={() => {
                            // Build per-article breakdown for this employee
                            const empRecords = filteredRecords.filter(
                              (r) => r.employeeName === name,
                            );
                            const artMap: Record<
                              string,
                              { qty: number; amount: number }
                            > = {};
                            for (const r of empRecords) {
                              if (!artMap[r.articleNo])
                                artMap[r.articleNo] = { qty: 0, amount: 0 };
                              artMap[r.articleNo].qty += r.quantity;
                              artMap[r.articleNo].amount += r.finalAmount;
                            }
                            const breakdown = Object.entries(artMap)
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(([articleNo, v]) => ({
                                articleNo,
                                qty: v.qty,
                                amount: v.amount,
                              }));
                            shareOnWhatsApp(
                              employeeWhatsapp[name] || "",
                              name,
                              totalQty,
                              totalAmount,
                              dateFrom,
                              dateTo,
                              breakdown,
                            );
                          }}
                          className="h-8 px-3 shrink-0 text-white"
                          style={{ background: "#25D366", fontSize: "0.72rem" }}
                        >
                          <MessageCircle className="w-3.5 h-3.5 mr-1" />
                          WhatsApp
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Records List */}
          {recordsLoading ? (
            <div
              data-ocid="overlock.loading_state"
              className="flex items-center justify-center py-12"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span className="text-sm">Loading records...</span>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div
              data-ocid="overlock.empty_state"
              className="flex flex-col items-center justify-center py-14 space-y-2"
            >
              <Layers
                className="w-10 h-10"
                style={{ color: "oklch(var(--muted-foreground))" }}
              />
              <p
                className="text-sm font-medium"
                style={{ color: "oklch(var(--muted-foreground))" }}
              >
                No overlock records found
              </p>
              <p
                className="text-xs"
                style={{ color: "oklch(var(--muted-foreground))" }}
              >
                Add a record or adjust your filters
              </p>
            </div>
          ) : viewMode === "all" ? (
            <div className="space-y-3">
              <div
                className="text-xs font-semibold px-1"
                style={{ color: "oklch(var(--muted-foreground))" }}
              >
                {filteredRecords.length} record
                {filteredRecords.length !== 1 ? "s" : ""}
              </div>
              {filteredRecords.map((record, idx) =>
                renderRecordCard(record, idx),
              )}
            </div>
          ) : (
            /* Article Wise View */
            <div className="space-y-3">
              <div
                className="text-xs font-semibold px-1"
                style={{ color: "oklch(var(--muted-foreground))" }}
              >
                {sortedArticleKeys.length} article
                {sortedArticleKeys.length !== 1 ? "s" : ""} ·{" "}
                {filteredRecords.length} record
                {filteredRecords.length !== 1 ? "s" : ""}
              </div>
              {sortedArticleKeys.map((articleNo, artIdx) => {
                const groupRecords = articleGroups[articleNo];
                const groupQty = groupRecords.reduce(
                  (s, r) => s + r.quantity,
                  0,
                );
                const groupAmt = groupRecords.reduce(
                  (s, r) => s + r.finalAmount,
                  0,
                );
                const isExpanded = expandedArticles[articleNo] !== false; // default expanded

                return (
                  <div
                    key={articleNo}
                    data-ocid={`overlock.article.panel.${artIdx + 1}`}
                    className="rounded-lg border overflow-hidden"
                    style={{ borderColor: "oklch(var(--primary) / 0.3)" }}
                  >
                    {/* Article Group Header */}
                    <button
                      type="button"
                      onClick={() => toggleArticle(articleNo)}
                      className="w-full flex items-center justify-between px-4 py-3"
                      style={{ background: "oklch(var(--primary) / 0.08)" }}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-bold shrink-0"
                          style={{
                            background: "oklch(var(--primary))",
                            color: "oklch(var(--primary-foreground))",
                            fontFamily: "Cabinet Grotesk, sans-serif",
                          }}
                        >
                          {articleNo}
                        </span>
                        <span
                          className="text-xs"
                          style={{ color: "oklch(var(--muted-foreground))" }}
                        >
                          {groupRecords.length} record
                          {groupRecords.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div
                            className="text-xs font-bold"
                            style={{
                              color: "oklch(var(--foreground))",
                              fontFamily: "Cabinet Grotesk, sans-serif",
                            }}
                          >
                            {groupQty.toLocaleString()} pcs
                          </div>
                          <div
                            className="text-xs font-bold"
                            style={{ color: "oklch(var(--success))" }}
                          >
                            ₨ {groupAmt.toFixed(2)}
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp
                            className="w-4 h-4"
                            style={{ color: "oklch(var(--primary))" }}
                          />
                        ) : (
                          <ChevronDown
                            className="w-4 h-4"
                            style={{ color: "oklch(var(--primary))" }}
                          />
                        )}
                      </div>
                    </button>

                    {/* Records inside article group */}
                    {isExpanded && (
                      <div
                        className="divide-y p-3 space-y-2"
                        style={{ background: "oklch(var(--background))" }}
                      >
                        {groupRecords.map((record, recIdx) => (
                          <div
                            key={String(record.id)}
                            className={recIdx > 0 ? "pt-2" : ""}
                          >
                            {renderRecordCard(
                              record,
                              filteredRecords.indexOf(record),
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── EDIT DIALOG ─────────────────────────────────────────── */}
      <Dialog
        open={!!editingRecord}
        onOpenChange={(open) => {
          if (!open) setEditingRecord(null);
        }}
      >
        <DialogContent
          data-ocid="overlock.edit_dialog"
          className="max-w-sm mx-auto"
        >
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
              Edit Overlock Record
            </DialogTitle>
          </DialogHeader>

          {/* Live Amount Preview */}
          {editFinalAmount > 0 && (
            <div
              className="rounded-lg px-4 py-2.5 flex items-center justify-between"
              style={{
                background: "oklch(var(--success) / 0.08)",
                borderLeft: "3px solid oklch(var(--success))",
              }}
            >
              <span className="data-label">Final Amount</span>
              <span
                className="font-bold text-base"
                style={{ color: "oklch(var(--success))" }}
              >
                ₨ {editFinalAmount.toFixed(2)}
              </span>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="data-label">Date</Label>
              <Input
                data-ocid="overlock.edit.date_input"
                type="date"
                value={editForm.date}
                onChange={handleEditChange("date")}
                className="input-factory"
              />
            </div>
            <div className="space-y-1">
              <Label className="data-label">Article No.</Label>
              <Input
                data-ocid="overlock.edit.article_input"
                type="text"
                placeholder="e.g. ART-2024-001"
                value={editForm.articleNo}
                onChange={handleEditChange("articleNo")}
                className="input-factory"
              />
            </div>
            <div className="space-y-1">
              <Label className="data-label">Employee Name</Label>
              <Input
                data-ocid="overlock.edit.name_input"
                type="text"
                placeholder="Enter employee name"
                value={editForm.employeeName}
                onChange={handleEditChange("employeeName")}
                className="input-factory"
              />
            </div>
            <div className="space-y-1">
              <Label className="data-label">Size</Label>
              <Input
                data-ocid="overlock.edit.size_input"
                type="text"
                placeholder="e.g. S, M, L, XL"
                value={editForm.size}
                onChange={handleEditChange("size")}
                className="input-factory"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="data-label">Quantity (Pcs)</Label>
                <Input
                  data-ocid="overlock.edit.quantity_input"
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={editForm.quantity}
                  onChange={handleEditChange("quantity")}
                  className="input-factory"
                />
              </div>
              <div className="space-y-1">
                <Label className="data-label">Pcs Rate (₨)</Label>
                <Input
                  data-ocid="overlock.edit.pcsrate_input"
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  step="0.01"
                  value={editForm.pcsRate}
                  onChange={handleEditChange("pcsRate")}
                  className="input-factory"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 flex-row">
            <Button
              data-ocid="overlock.edit.cancel_button"
              variant="outline"
              onClick={() => setEditingRecord(null)}
              disabled={editSaving}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              data-ocid="overlock.edit.save_button"
              onClick={handleEditSave}
              disabled={editSaving}
              className="flex-1"
              style={{
                background: "oklch(var(--primary))",
                color: "oklch(var(--primary-foreground))",
              }}
            >
              {editSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
