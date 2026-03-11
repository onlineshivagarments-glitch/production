import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useAddRecord } from "../hooks/useQueries";
import { SearchableDropdown } from "./SearchableDropdown";

interface FormState {
  date: string;
  articleNo: string;
  masterName: string;
  dispatchedPcs: string;
  cutByMaster: string;
  rate: string;
  percentage: string;
}

interface FormErrors {
  date?: string;
  articleNo?: string;
  masterName?: string;
  dispatchedPcs?: string;
  cutByMaster?: string;
  rate?: string;
  percentage?: string;
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function calcResults(form: FormState) {
  const dispatched = Number.parseFloat(form.dispatchedPcs) || 0;
  const cut = Number.parseFloat(form.cutByMaster) || 0;
  const rate = Number.parseFloat(form.rate) || 0;
  const percentage = Number.parseFloat(form.percentage) || 0;

  const totalPcs = dispatched - cut;
  const finalAmount = (dispatched * rate * percentage) / 100;

  return { totalPcs, finalAmount };
}

export function EntryTab() {
  const [form, setForm] = useState<FormState>({
    date: getTodayDate(),
    articleNo: "",
    masterName: "",
    dispatchedPcs: "",
    cutByMaster: "",
    rate: "",
    percentage: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const addRecord = useAddRecord();

  const handleChange = useCallback(
    (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    [],
  );

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.date) newErrors.date = "Date is required";
    if (!form.articleNo.trim()) newErrors.articleNo = "Article No. is required";
    if (!form.masterName.trim())
      newErrors.masterName = "Party Name is required";
    if (!form.dispatchedPcs || Number.isNaN(Number(form.dispatchedPcs)))
      newErrors.dispatchedPcs = "Enter valid dispatched pieces";
    if (!form.cutByMaster || Number.isNaN(Number(form.cutByMaster)))
      newErrors.cutByMaster = "Enter valid quantity";
    if (!form.rate || Number.isNaN(Number(form.rate)))
      newErrors.rate = "Enter valid rate";
    if (!form.percentage || Number.isNaN(Number(form.percentage)))
      newErrors.percentage = "Enter valid percentage";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const { totalPcs, finalAmount } = calcResults(form);

    try {
      await addRecord.mutateAsync({
        date: form.date,
        articleNo: form.articleNo.trim(),
        masterName: form.masterName.trim(),
        dispatchedPcs: Number(form.dispatchedPcs),
        cutByMaster: Number(form.cutByMaster),
        rate: Number(form.rate),
        percentage: Number(form.percentage),
        totalPcs,
        finalAmount,
      });
      toast.success("Record saved successfully!", {
        description: `${form.masterName} — ₨ ${finalAmount.toFixed(2)}`,
      });
      handleClear();
    } catch {
      toast.error("Failed to save record. Please try again.");
    }
  };

  const handleClear = () => {
    setForm({
      date: getTodayDate(),
      articleNo: "",
      masterName: "",
      dispatchedPcs: "",
      cutByMaster: "",
      rate: "",
      percentage: "",
    });
    setErrors({});
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Form */}
      <div className="space-y-3">
        {/* Date */}
        <div className="space-y-1">
          <Label htmlFor="entry-date" className="data-label">
            Date
          </Label>
          <Input
            id="entry-date"
            data-ocid="entry.date_input"
            type="date"
            value={form.date}
            onChange={handleChange("date")}
            className="input-factory"
            style={
              errors.date ? { borderColor: "oklch(var(--destructive))" } : {}
            }
          />
          {errors.date && (
            <p
              data-ocid="entry.error_state"
              className="text-xs font-medium"
              style={{ color: "oklch(var(--destructive))" }}
            >
              {errors.date}
            </p>
          )}
        </div>

        {/* Article Number */}
        <div className="space-y-1">
          <Label htmlFor="entry-article" className="data-label">
            Article Number
          </Label>
          <SearchableDropdown
            id="entry-article"
            data-ocid="entry.article_input"
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

        {/* Party Name */}
        <div className="space-y-1">
          <Label htmlFor="entry-master" className="data-label">
            Party Name
          </Label>
          <SearchableDropdown
            id="entry-master"
            data-ocid="entry.master_input"
            fieldKey="party_name"
            placeholder="Type or select party name"
            value={form.masterName}
            onChange={(val) => {
              setForm((prev) => ({ ...prev, masterName: val }));
              setErrors((prev) => ({ ...prev, masterName: undefined }));
            }}
            hasError={!!errors.masterName}
          />
          {errors.masterName && (
            <p
              className="text-xs font-medium"
              style={{ color: "oklch(var(--destructive))" }}
            >
              {errors.masterName}
            </p>
          )}
        </div>

        {/* Pcs Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="entry-dispatched" className="data-label">
              Pcs Dispatched
            </Label>
            <Input
              id="entry-dispatched"
              data-ocid="entry.dispatched_input"
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={form.dispatchedPcs}
              onChange={handleChange("dispatchedPcs")}
              className="input-factory"
              style={
                errors.dispatchedPcs
                  ? { borderColor: "oklch(var(--destructive))" }
                  : {}
              }
            />
            {errors.dispatchedPcs && (
              <p
                className="text-xs font-medium"
                style={{ color: "oklch(var(--destructive))" }}
              >
                {errors.dispatchedPcs}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="entry-cut" className="data-label">
              Total Quantity
            </Label>
            <Input
              id="entry-cut"
              data-ocid="entry.cut_input"
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={form.cutByMaster}
              onChange={handleChange("cutByMaster")}
              className="input-factory"
              style={
                errors.cutByMaster
                  ? { borderColor: "oklch(var(--destructive))" }
                  : {}
              }
            />
            {errors.cutByMaster && (
              <p
                className="text-xs font-medium"
                style={{ color: "oklch(var(--destructive))" }}
              >
                {errors.cutByMaster}
              </p>
            )}
          </div>
        </div>

        {/* Rate & Percentage Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="entry-rate" className="data-label">
              Rate per Piece (₨)
            </Label>
            <Input
              id="entry-rate"
              data-ocid="entry.rate_input"
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              step="0.01"
              value={form.rate}
              onChange={handleChange("rate")}
              className="input-factory"
              style={
                errors.rate ? { borderColor: "oklch(var(--destructive))" } : {}
              }
            />
            {errors.rate && (
              <p
                className="text-xs font-medium"
                style={{ color: "oklch(var(--destructive))" }}
              >
                {errors.rate}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="entry-percentage" className="data-label">
              Percentage (%)
            </Label>
            <Input
              id="entry-percentage"
              data-ocid="entry.percentage_input"
              type="number"
              inputMode="decimal"
              placeholder="100"
              step="0.01"
              value={form.percentage}
              onChange={handleChange("percentage")}
              className="input-factory"
              style={
                errors.percentage
                  ? { borderColor: "oklch(var(--destructive))" }
                  : {}
              }
            />
            {errors.percentage && (
              <p
                className="text-xs font-medium"
                style={{ color: "oklch(var(--destructive))" }}
              >
                {errors.percentage}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="space-y-2 pt-1">
        <Button
          data-ocid="entry.save_button"
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
              Save Record
            </>
          )}
        </Button>

        <Button
          data-ocid="entry.clear_button"
          onClick={handleClear}
          variant="outline"
          className="w-full btn-factory"
          size="lg"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Clear Form
        </Button>

        {addRecord.isError && (
          <div
            data-ocid="entry.error_state"
            className="rounded-md p-3 text-sm font-medium"
            style={{
              background: "oklch(var(--destructive) / 0.1)",
              color: "oklch(var(--destructive))",
            }}
          >
            Failed to save record. Please try again.
          </div>
        )}
        {addRecord.isSuccess && (
          <div
            data-ocid="entry.success_state"
            className="rounded-md p-3 text-sm font-medium"
            style={{
              background: "oklch(var(--success) / 0.1)",
              color: "oklch(var(--success))",
            }}
          >
            Record saved successfully!
          </div>
        )}
      </div>

      {/* Formula Info */}
      <div
        className="rounded-lg p-3 text-xs space-y-1"
        style={{
          background: "oklch(var(--muted))",
          color: "oklch(var(--muted-foreground))",
        }}
      >
        <div
          className="font-semibold mb-1.5"
          style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
        >
          Calculation Formula
        </div>
        <div>Pending Pcs = Dispatched − Total Quantity</div>
        <div>Final Amount = Pcs Dispatched × Rate × Percentage ÷ 100</div>
      </div>
    </div>
  );
}
