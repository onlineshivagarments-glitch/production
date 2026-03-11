import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  ClipboardList,
  Download,
  Loader2,
  Pencil,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { ProductionRecord } from "../backend";
import {
  useAddRecord,
  useDeleteRecord,
  useGetRecords,
} from "../hooks/useQueries";
import { exportToCSV } from "../utils/csvExport";

interface EditFormState {
  date: string;
  articleNo: string;
  masterName: string;
  dispatchedPcs: string;
  cutByMaster: string;
  rate: string;
  percentage: string;
}

function calcEditResults(form: EditFormState) {
  const dispatched = Number.parseFloat(form.dispatchedPcs) || 0;
  const cut = Number.parseFloat(form.cutByMaster) || 0;
  const rate = Number.parseFloat(form.rate) || 0;
  const percentage = Number.parseFloat(form.percentage) || 0;
  const totalPcs = dispatched - cut;
  const finalAmount = (dispatched * rate * percentage) / 100;
  return { totalPcs, finalAmount };
}

export function HistoryTab() {
  const [searchArticle, setSearchArticle] = useState("");
  const [filterDate, setFilterDate] = useState("");

  // Edit state
  const [editingRecord, setEditingRecord] = useState<ProductionRecord | null>(
    null,
  );
  const [editForm, setEditForm] = useState<EditFormState>({
    date: "",
    articleNo: "",
    masterName: "",
    dispatchedPcs: "",
    cutByMaster: "",
    rate: "",
    percentage: "",
  });
  const [editSaving, setEditSaving] = useState(false);

  const { data: records = [], isLoading } = useGetRecords();
  const deleteRecord = useDeleteRecord();
  const addRecord = useAddRecord();

  const filteredRecords = useMemo(() => {
    let result = [...records];
    if (searchArticle.trim()) {
      result = result.filter((r) =>
        r.articleNo.toLowerCase().includes(searchArticle.trim().toLowerCase()),
      );
    }
    if (filterDate) {
      result = result.filter((r) => r.date === filterDate);
    }
    result.sort((a, b) => b.date.localeCompare(a.date));
    return result;
  }, [records, searchArticle, filterDate]);

  const handleDelete = async (id: bigint) => {
    try {
      await deleteRecord.mutateAsync(id);
      toast.success("Record deleted");
    } catch {
      toast.error("Failed to delete record");
    }
  };

  const openEditDialog = (record: ProductionRecord) => {
    setEditingRecord(record);
    setEditForm({
      date: record.date,
      articleNo: record.articleNo,
      masterName: record.partyName,
      dispatchedPcs: String(record.dispatchedPcs),
      cutByMaster: String(record.cutByMaster),
      rate: String(record.rate),
      percentage: String(record.percentage),
    });
  };

  const handleEditSave = async () => {
    if (!editingRecord) return;
    const dispatched = Number(editForm.dispatchedPcs);
    const cut = Number(editForm.cutByMaster);
    const rate = Number(editForm.rate);
    const percentage = Number(editForm.percentage);
    if (
      !editForm.date ||
      !editForm.articleNo.trim() ||
      !editForm.masterName.trim() ||
      Number.isNaN(dispatched) ||
      Number.isNaN(cut) ||
      Number.isNaN(rate) ||
      Number.isNaN(percentage)
    ) {
      toast.error("Please fill all required fields correctly.");
      return;
    }
    const totalPcs = dispatched - cut;
    const finalAmount = (dispatched * rate * percentage) / 100;
    setEditSaving(true);
    try {
      await deleteRecord.mutateAsync(editingRecord.id);
      await addRecord.mutateAsync({
        date: editForm.date,
        articleNo: editForm.articleNo.trim(),
        masterName: editForm.masterName.trim(),
        dispatchedPcs: dispatched,
        cutByMaster: cut,
        rate,
        percentage,
        totalPcs,
        finalAmount,
      });
      toast.success("Record updated successfully");
      setEditingRecord(null);
    } catch (err) {
      console.error("Edit record error:", err);
      toast.error("Failed to update record");
    } finally {
      setEditSaving(false);
    }
  };

  const handleExport = () => {
    if (filteredRecords.length === 0) {
      toast.error("No records to export");
      return;
    }
    const headers = [
      "Date",
      "Article No",
      "Party Name",
      "Dispatched Pcs",
      "Cut by Master",
      "Pending Pcs",
      "Rate",
      "Percentage",
      "Final Amount (₨)",
    ];
    const rows = filteredRecords.map((r) => [
      r.date,
      r.articleNo,
      r.partyName,
      r.dispatchedPcs,
      r.cutByMaster,
      r.totalPcs,
      r.rate,
      r.percentage,
      r.finalAmount.toFixed(2),
    ]);
    exportToCSV("production_history", headers, rows);
    toast.success("CSV exported successfully");
  };

  const editCalc = calcEditResults(editForm);

  return (
    <div className="px-4 py-4 space-y-3">
      {/* Search & Export Row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "oklch(var(--muted-foreground))" }}
          />
          <Input
            data-ocid="history.search_input"
            type="text"
            placeholder="Search article number..."
            value={searchArticle}
            onChange={(e) => setSearchArticle(e.target.value)}
            className="pl-9 input-factory"
          />
        </div>
        <Button
          data-ocid="history.export_button"
          variant="outline"
          size="icon"
          className="shrink-0 w-12 h-12"
          onClick={handleExport}
          title="Export CSV"
        >
          <Download className="w-5 h-5" />
        </Button>
      </div>

      {/* Date Filter */}
      <div className="flex items-center gap-2">
        <Calendar
          className="w-4 h-4 shrink-0"
          style={{ color: "oklch(var(--muted-foreground))" }}
        />
        <Input
          data-ocid="history.date_input"
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="input-factory flex-1"
        />
        {filterDate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilterDate("")}
            className="shrink-0 text-xs h-9 px-3"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Count */}
      {!isLoading && (
        <div
          className="text-xs font-semibold"
          style={{ color: "oklch(var(--muted-foreground))" }}
        >
          {filteredRecords.length} record
          {filteredRecords.length !== 1 ? "s" : ""} found
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div data-ocid="history.loading_state" className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border p-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-6 w-1/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredRecords.length === 0 && (
        <div
          data-ocid="history.empty_state"
          className="flex flex-col items-center justify-center py-16 gap-3"
          style={{ color: "oklch(var(--muted-foreground))" }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "oklch(var(--muted))" }}
          >
            <ClipboardList className="w-8 h-8" />
          </div>
          <div className="text-center">
            <div
              className="font-heading font-bold text-base"
              style={{ color: "oklch(var(--foreground))" }}
            >
              No Records Found
            </div>
            <div className="text-sm mt-1">
              {searchArticle || filterDate
                ? "Try adjusting your search or filters"
                : "Save your first entry to see it here"}
            </div>
          </div>
        </div>
      )}

      {/* Records List */}
      {!isLoading && filteredRecords.length > 0 && (
        <div data-ocid="history.list" className="space-y-2">
          {filteredRecords.map((record, index) => (
            <RecordCard
              key={record.id.toString()}
              record={record}
              index={index + 1}
              onDelete={handleDelete}
              onEdit={openEditDialog}
              isDeleting={deleteRecord.isPending}
            />
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={!!editingRecord}
        onOpenChange={(open) => {
          if (!open) setEditingRecord(null);
        }}
      >
        <DialogContent
          data-ocid="history.edit_dialog"
          className="max-w-sm mx-auto"
        >
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
              Edit Production Record
            </DialogTitle>
          </DialogHeader>

          {/* Live Amount Preview */}
          {(editCalc.finalAmount > 0 || editCalc.totalPcs !== 0) && (
            <div
              className="rounded-lg px-4 py-2.5 grid grid-cols-2 gap-3"
              style={{
                background: "oklch(var(--primary) / 0.06)",
                borderLeft: "3px solid oklch(var(--primary))",
              }}
            >
              <div>
                <div className="data-label text-xs">Pending Pcs</div>
                <div
                  className="font-bold text-base"
                  style={{ color: "oklch(var(--primary))" }}
                >
                  {editCalc.totalPcs.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="data-label text-xs">Final Amount</div>
                <div
                  className="font-bold text-base"
                  style={{ color: "oklch(var(--success))" }}
                >
                  ₨ {editCalc.finalAmount.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="data-label">Date</Label>
              <Input
                data-ocid="history.edit.date_input"
                type="date"
                value={editForm.date}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, date: e.target.value }))
                }
                className="input-factory"
              />
            </div>
            <div className="space-y-1">
              <Label className="data-label">Article No.</Label>
              <Input
                data-ocid="history.edit.article_input"
                type="text"
                placeholder="e.g. ART-2024-001"
                value={editForm.articleNo}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, articleNo: e.target.value }))
                }
                className="input-factory"
              />
            </div>
            <div className="space-y-1">
              <Label className="data-label">Party Name</Label>
              <Input
                data-ocid="history.edit.master_input"
                type="text"
                placeholder="Enter party name"
                value={editForm.masterName}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, masterName: e.target.value }))
                }
                className="input-factory"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="data-label">Pcs Dispatched</Label>
                <Input
                  data-ocid="history.edit.dispatched_input"
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={editForm.dispatchedPcs}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      dispatchedPcs: e.target.value,
                    }))
                  }
                  className="input-factory"
                />
              </div>
              <div className="space-y-1">
                <Label className="data-label">Cut by Master</Label>
                <Input
                  data-ocid="history.edit.cut_input"
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={editForm.cutByMaster}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      cutByMaster: e.target.value,
                    }))
                  }
                  className="input-factory"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="data-label">Rate per Piece (₨)</Label>
                <Input
                  data-ocid="history.edit.rate_input"
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  step="0.01"
                  value={editForm.rate}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, rate: e.target.value }))
                  }
                  className="input-factory"
                />
              </div>
              <div className="space-y-1">
                <Label className="data-label">Percentage (%)</Label>
                <Input
                  data-ocid="history.edit.percentage_input"
                  type="number"
                  inputMode="decimal"
                  placeholder="100"
                  step="0.01"
                  value={editForm.percentage}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, percentage: e.target.value }))
                  }
                  className="input-factory"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 flex-row">
            <Button
              data-ocid="history.edit.cancel_button"
              variant="outline"
              onClick={() => setEditingRecord(null)}
              disabled={editSaving}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              data-ocid="history.edit.save_button"
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

interface RecordCardProps {
  record: ProductionRecord;
  index: number;
  onDelete: (id: bigint) => Promise<void>;
  onEdit: (record: ProductionRecord) => void;
  isDeleting: boolean;
}

function RecordCard({
  record,
  index,
  onDelete,
  onEdit,
  isDeleting,
}: RecordCardProps) {
  const ocidSuffix = index <= 3 ? `.${index}` : "";
  const displayDate = record.date;

  return (
    <div
      data-ocid={`history.item${ocidSuffix}`}
      className="rounded-lg border p-4 space-y-3 transition-shadow hover:shadow-card"
      style={{
        background: "oklch(var(--card))",
        borderColor: "oklch(var(--border))",
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div
            className="font-heading font-bold text-base leading-tight truncate"
            style={{ color: "oklch(var(--primary))" }}
          >
            {record.articleNo}
          </div>
          <div
            className="text-sm font-medium truncate mt-0.5"
            style={{ color: "oklch(var(--foreground))" }}
          >
            {record.partyName}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div
            className="text-xs"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            {displayDate}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div
        className="grid grid-cols-3 gap-2 border-t pt-3"
        style={{ borderColor: "oklch(var(--border))" }}
      >
        <div>
          <div className="data-label mb-0.5">Dispatched</div>
          <div
            className="font-heading font-bold text-lg leading-none"
            style={{ color: "oklch(var(--foreground))" }}
          >
            {record.dispatchedPcs.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="data-label mb-0.5">Pending Pcs</div>
          <div
            className="font-heading font-bold text-lg leading-none"
            style={{ color: "oklch(var(--primary))" }}
          >
            {record.totalPcs.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="data-label mb-0.5">Final Amount</div>
          <div
            className="font-heading font-bold text-base leading-none"
            style={{ color: "oklch(var(--success))" }}
          >
            ₨ {record.finalAmount.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Rate detail row */}
      <div
        className="flex items-center gap-3 text-xs"
        style={{ color: "oklch(var(--muted-foreground))" }}
      >
        <span>Rate: ₨{record.rate}/pc</span>
        <span>•</span>
        <span>Cut: {record.cutByMaster}</span>
        <span>•</span>
        <span>{record.percentage}%</span>
      </div>

      {/* Action buttons */}
      <div
        className="flex items-center justify-end gap-2 border-t pt-2"
        style={{ borderColor: "oklch(var(--border))" }}
      >
        <Button
          data-ocid={`history.edit_button${ocidSuffix}`}
          variant="ghost"
          size="sm"
          onClick={() => onEdit(record)}
          className="text-xs h-8 gap-1.5"
          style={{ color: "oklch(var(--primary))" }}
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              data-ocid={`history.delete_button${ocidSuffix}`}
              variant="ghost"
              size="sm"
              disabled={isDeleting}
              className="text-xs h-8 gap-1.5"
              style={{ color: "oklch(var(--destructive))" }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Record?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the record for{" "}
                <strong>{record.articleNo}</strong> — {record.partyName} (
                {record.date}). This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-ocid="history.cancel_button">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                data-ocid="history.confirm_button"
                onClick={() => onDelete(record.id)}
                style={{
                  background: "oklch(var(--destructive))",
                  color: "oklch(var(--destructive-foreground))",
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
