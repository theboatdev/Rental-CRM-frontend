"use client";

import { useState } from "react";
import { toast } from "sonner";
import { InspectionChecklist } from "@/components/ops/inspection-checklist";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Select, Textarea, numberOrUndefined } from "@/components/ui/field";
import { ErrorNote, Loading } from "@/components/ui/page";
import type { RentalDetail } from "@/lib/contract";
import { addDays, daysBetween } from "@/lib/dates";
import { useAvailability, useRenters, useTenantMutation } from "@/lib/queries";
import { useWorkspace } from "@/lib/workspace";

export interface BookingDefaults {
  vehicleId?: string;
  startDate?: string;
}

/**
 * Books a vehicle for a renter (POST /rentals). The backend checks the dates,
 * availability and amounts; this form shows its availability per vehicle and
 * any field issues. Optionally records an advance, and when the booking starts
 * today, hands the vehicle over at once.
 */
export function BookingDialog({ defaults, onClose, onBooked }: { defaults: BookingDefaults; onClose: () => void; onBooked?: (rental: RentalDetail) => void }) {
  const { config, can, moduleOn, format, options, today } = useWorkspace();
  const renters = useRenters();
  const start = defaults.startDate ?? today();
  const [form, setForm] = useState({
    renterId: "",
    vehicleId: defaults.vehicleId ?? "",
    startDate: start,
    endDate: addDays(start, Math.max(3, config.rules.minRentalDays)),
    dailyRate: "",
    depositAmount: "",
    advance: "",
    method: options("paymentMethods")[0]?.key ?? "",
    notes: "",
  });
  const [handOver, setHandOver] = useState(false);
  const [checkedPoints, setCheckedPoints] = useState<string[]>([]);
  const availability = useAvailability(form.startDate, form.endDate);
  const book = useTenantMutation((request, body: unknown) => request<RentalDetail>("POST", "/rentals", body));

  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const days = form.startDate && form.endDate ? daysBetween(form.startDate, form.endDate) : 0;
  const chosen = availability.data?.find((a) => a.vehicle.id === form.vehicleId);
  const rate = numberOrUndefined(form.dailyRate) ?? chosen?.dailyRate ?? 0;
  const deposit = numberOrUndefined(form.depositAmount) ?? chosen?.depositAmount ?? 0;
  const canAdvance = moduleOn("payments") && can("payments:record");
  const startsToday = form.startDate === today();
  const canHandOver = startsToday && can("rentals:checkin");
  const issue = (path: string) => book.error?.issueFor(path);

  const submit = () => {
    const advance = numberOrUndefined(form.advance);
    book.mutate(
      {
        vehicleId: form.vehicleId,
        renterId: form.renterId,
        startDate: form.startDate,
        endDate: form.endDate,
        dailyRate: numberOrUndefined(form.dailyRate),
        depositAmount: numberOrUndefined(form.depositAmount),
        ...(canAdvance && advance ? { advance: { amount: advance, method: form.method } } : {}),
        notes: form.notes,
        ...(canHandOver && handOver ? { pickup: { checkedPoints } } : {}),
      },
      {
        onSuccess: (rental) => {
          toast.success(rental.status === "ACTIVE" ? `${rental.code} handed over` : `${rental.code} booked`);
          onBooked?.(rental);
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open onClose={onClose} title="New booking" eyebrow="Rentals" width="lg">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Field label="Renter" error={issue("renterId")}>
          {(id) =>
            renters.isPending ? (
              <Loading label="Loading renters" />
            ) : (
              <Select id={id} required value={form.renterId} onChange={(e) => set({ renterId: e.target.value })}>
                <option value="">Choose a renter…</option>
                {renters.data?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.profileId} — {r.fullName} ({r.phone}){r.compliance.ok ? "" : " · missing documents"}
                  </option>
                ))}
              </Select>
            )
          }
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Pickup date" error={issue("startDate")}>
            {(id) => <Input id={id} type="date" required min={today()} value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} />}
          </Field>
          <Field label="Return date" error={issue("endDate")}>
            {(id) => <Input id={id} type="date" required min={form.startDate ? addDays(form.startDate, 1) : undefined} value={form.endDate} onChange={(e) => set({ endDate: e.target.value })} />}
          </Field>
        </div>

        <fieldset>
          <legend className="mb-2 text-[10px] font-bold tracking-wider text-muted uppercase">Vehicle · rate per day</legend>
          {days < 1 && <p className="text-rose-700">The return date must be after the pickup date.</p>}
          {availability.isFetching && <Loading label="Checking availability" />}
          <ErrorNote error={availability.error} />
          <div className="grid gap-2 sm:grid-cols-2">
            {availability.data?.map((a) => (
              <label
                key={a.vehicle.id}
                className={`flex items-start gap-3 border p-3 ${!a.available ? "bg-paper opacity-50" : form.vehicleId === a.vehicle.id ? "border-brand bg-brand/5" : "border-ink/15"}`}
              >
                <input
                  type="radio"
                  name="vehicle"
                  className="mt-0.5 accent-[var(--brand)]"
                  required
                  disabled={!a.available}
                  checked={form.vehicleId === a.vehicle.id}
                  onChange={() => set({ vehicleId: a.vehicle.id, dailyRate: "", depositAmount: "" })}
                />
                <span>
                  <strong className="text-ink">
                    {a.vehicle.make} {a.vehicle.model}
                  </strong>
                  <br />
                  {a.vehicle.plateNumber} · {format.money(a.dailyRate)}
                  <br />
                  <span className={a.available ? "text-emerald-700" : "text-rose-700"}>{a.reason ?? "Available for these dates"}</span>
                </span>
              </label>
            ))}
          </div>
          {issue("vehicleId") && <p className="mt-1 text-[10px] font-bold text-rose-700">{issue("vehicleId")}</p>}
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={`Daily rate (${config.locale.currency})`} hint="Defaults to the vehicle's rate" error={issue("dailyRate")}>
            {(id) => <Input id={id} type="number" min="1" step="any" placeholder={chosen ? String(chosen.dailyRate) : ""} value={form.dailyRate} onChange={(e) => set({ dailyRate: e.target.value })} />}
          </Field>
          <Field label={`Security deposit (${config.locale.currency})`} hint="Defaults to the vehicle's deposit" error={issue("depositAmount")}>
            {(id) => <Input id={id} type="number" min="0" step="any" placeholder={chosen ? String(chosen.depositAmount) : ""} value={form.depositAmount} onChange={(e) => set({ depositAmount: e.target.value })} />}
          </Field>
        </div>

        {canAdvance && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={`Advance collected (${config.locale.currency})`} error={issue("advance.amount")}>
              {(id) => <Input id={id} type="number" min="0" step="any" value={form.advance} onChange={(e) => set({ advance: e.target.value })} />}
            </Field>
            <Field label="Payment method" error={issue("advance.method")}>
              {(id) => (
                <Select id={id} value={form.method} onChange={(e) => set({ method: e.target.value })}>
                  {options("paymentMethods").map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        )}

        <Field label="Notes (flight, delivery, requests)" error={issue("notes")}>
          {(id) => <Textarea id={id} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />}
        </Field>

        {canHandOver && (
          <div className="space-y-2">
            <Checkbox label="Hand the vehicle over now (the renter is here)" checked={handOver} onChange={setHandOver} />
            {handOver && <InspectionChecklist checked={checkedPoints} onChange={setCheckedPoints} required={config.modules.rentals.requirePickupInspection} />}
          </div>
        )}

        <div className="space-y-1 border border-line bg-paper p-3 text-sm">
          <p>
            {Math.max(days, 0)} days × {format.money(rate)} = <strong>{format.money(Math.max(days, 0) * rate)}</strong>
          </p>
          <p className="text-muted">Refundable security deposit: {format.money(deposit)}</p>
        </div>

        <ErrorNote error={book.error} />
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={book.isPending || days < 1 || !chosen?.available}>
            {handOver && canHandOver ? "Book and hand over" : "Confirm booking"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
