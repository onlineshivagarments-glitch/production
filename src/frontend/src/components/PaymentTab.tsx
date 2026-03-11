import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { DispatchRecord } from "../backend";
import { useActor } from "../hooks/useActor";

const PAYMENT_PIN = "8807";

export function PaymentTab() {
  const { actor } = useActor();
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [summary, setSummary] = useState<[string, number, number][]>([]);
  const [records, setRecords] = useState<DispatchRecord[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadData = async () => {
    if (!actor) return;
    const [sum, recs] = await Promise.all([
      actor.getPaymentSummary().catch(() => []),
      actor.getDispatchRecords().catch(() => []),
    ]);
    setSummary(sum as typeof sum);
    setRecords(recs as typeof recs);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: load when authenticated
  useEffect(() => {
    if (authenticated && actor) loadData();
  }, [authenticated, actor]);

  const handleUnlock = () => {
    if (pin === PAYMENT_PIN) {
      setAuthenticated(true);
      setPinError("");
    } else {
      setPinError("Incorrect PIN. Please try again.");
    }
  };

  if (!authenticated) {
    return (
      <div className="p-4 pb-24 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div
          className="rounded-2xl border p-6 w-full max-w-xs space-y-4"
          style={{
            background: "oklch(var(--card))",
            borderColor: "oklch(var(--border))",
          }}
        >
          <div className="text-center">
            <p className="text-3xl mb-2">🔒</p>
            <h2 className="text-lg font-bold">Payment Tab</h2>
            <p
              className="text-sm"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              Enter PIN to access
            </p>
          </div>
          <div>
            <Label>PIN</Label>
            <Input
              data-ocid="payment.pin_input"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleUnlock();
              }}
              placeholder="Enter PIN"
              maxLength={6}
            />
            {pinError && (
              <p
                className="text-xs mt-1"
                style={{ color: "oklch(var(--destructive))" }}
              >
                {pinError}
              </p>
            )}
          </div>
          <Button
            data-ocid="payment.submit_button"
            onClick={handleUnlock}
            className="w-full"
          >
            Unlock
          </Button>
        </div>
      </div>
    );
  }

  const filteredRecords = records.filter((r) => {
    if (startDate && r.dispatchDate < startDate) return false;
    if (endDate && r.dispatchDate > endDate) return false;
    return true;
  });

  const totalPayment = filteredRecords.reduce(
    (sum, r) => sum + r.finalPayment,
    0,
  );
  const totalPcs = filteredRecords.reduce((sum, r) => sum + r.dispatchPcs, 0);

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <h2
          className="text-lg font-bold"
          style={{ color: "oklch(var(--foreground))" }}
        >
          Payment
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAuthenticated(false)}
        >
          Lock
        </Button>
      </div>

      <div
        className="rounded-xl border p-3 space-y-2"
        style={{
          background: "oklch(var(--card))",
          borderColor: "oklch(var(--border))",
        }}
      >
        <h3 className="font-semibold text-sm">Summary by Party</h3>
        {summary.length === 0 && (
          <p
            className="text-sm"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            No dispatch records yet.
          </p>
        )}
        {summary.map(([partyName, totalDispPcs, totalAmt]) => (
          <div
            key={partyName}
            className="flex items-center justify-between py-2 border-b last:border-b-0"
            style={{ borderColor: "oklch(var(--border))" }}
          >
            <div>
              <p className="font-medium text-sm">{partyName}</p>
              <p
                className="text-xs"
                style={{ color: "oklch(var(--muted-foreground))" }}
              >
                {totalDispPcs} pcs dispatched
              </p>
            </div>
            <p className="font-bold" style={{ color: "oklch(var(--primary))" }}>
              ₹{totalAmt.toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      <div
        className="rounded-xl border p-3 space-y-3"
        style={{
          background: "oklch(var(--card))",
          borderColor: "oklch(var(--border))",
        }}
      >
        <h3 className="font-semibold text-sm">Filter by Date Range</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <div
          className="rounded-lg p-3"
          style={{ background: "oklch(var(--muted))" }}
        >
          <p className="text-sm font-semibold">
            ₹{totalPayment.toFixed(2)} total
          </p>
          <p
            className="text-xs"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            {totalPcs} pcs | {filteredRecords.length} dispatches
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Dispatch Records</h3>
        {filteredRecords.length === 0 && (
          <div
            data-ocid="payment.empty_state"
            className="text-center py-6"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            No records for selected date range.
          </div>
        )}
        {filteredRecords.map((r, idx) => (
          <div
            key={Number(r.id)}
            data-ocid={`payment.record.${idx + 1}`}
            className="rounded-xl border p-3"
            style={{
              background: "oklch(var(--card))",
              borderColor: "oklch(var(--border))",
            }}
          >
            <div className="flex justify-between items-start">
              <div>
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
                  {r.dispatchPcs} pcs × ₹{r.salePrice} × {r.percentage}%
                </p>
              </div>
              <p
                className="font-bold"
                style={{ color: "oklch(var(--primary))" }}
              >
                ₹{r.finalPayment.toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
