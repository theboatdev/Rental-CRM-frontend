"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CustomFieldInputs, customFieldsPayload, draftOf, useFields, withoutOff } from "@/components/ops/fields";
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
 * today, hands the vehicle over at once. Labels and which fields show come
 * from the config's `fields.rentals`, and `fields.payments` for the advance.
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
    advanceReference: "",
    advanceNotes: "",
    notes: "",
  });
  const { builtIn: f, custom: rentalFields } = useFields("rentals");
  const { builtIn: pf, custom: paymentFields } = useFields("payments");
  const [custom, setCustom] = useState(() => draftOf(rentalFields));
  const [advanceCustom, setAdvanceCustom] = useState(() => draftOf(paymentFields));
  const [handOver, setHandOver] = useState(false);
  const [checkedPoints, setCheckedPoints] = useState<string[]>([]);
  const availability = useAvailability(form.startDate, form.endDate);
  const book = useTenantMutation((request, body: unknown) => request<RentalDetail>("POST", "/rentals", body));

  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const days = form.startDate && form.endDate ? daysBetween(form.startDate, form.endDate) : 0;
  const chosen = availability.data?.find((a) => a.vehicle.id === form.vehicleId);
  // With the rate or deposit field off, bookings take the vehicle's.
  const rate = (f("dailyRate").on ? numberOrUndefined(form.dailyRate) : undefined) ?? chosen?.dailyRate ?? 0;
  const deposit = (f("depositAmount").on ? numberOrUndefined(form.depositAmount) : undefined) ?? chosen?.depositAmount ?? 0;
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
        ...withoutOff(f, { dailyRate: numberOrUndefined(form.dailyRate), depositAmount: numberOrUndefined(form.depositAmount), notes: form.notes }),
        ...(canAdvance && advance
          ? {
              advance: {
                amount: advance,
                method: form.method,
                ...withoutOff(pf, { transactionReference: form.advanceReference || undefined, notes: form.advanceNotes || undefined }),
                customFields: customFieldsPayload(paymentFields, advanceCustom),
              },
            }
          : {}),
        customFields: customFieldsPayload(rentalFields, custom),
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
        <Field label={f("renter").label} hint={f("renter").help} error={issue("renterId")}>
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
          <Field label={f("startDate").label} hint={f("startDate").help} error={issue("startDate")}>
            {(id) => <Input id={id} type="date" required min={today()} value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} />}
          </Field>
          <Field label={f("endDate").label} hint={f("endDate").help} error={issue("endDate")}>
            {(id) => <Input id={id} type="date" required min={form.startDate ? addDays(form.startDate, 1) : undefined} value={form.endDate} onChange={(e) => set({ endDate: e.target.value })} />}
          </Field>
        </div>

        <fieldset>
          <legend className="mb-2 text-xs font-semibold tracking-normal text-muted">{f("vehicle").label} · rate per day</legend>
          {f("vehicle").help && <p className="mb-2 text-xs text-muted">{f("vehicle").help}</p>}
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
          {issue("vehicleId") && <p className="mt-1 text-xs font-semibold text-rose-700">{issue("vehicleId")}</p>}
        </fieldset>

        {(f("dailyRate").on || f("depositAmount").on) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {f("dailyRate").on && (
              <Field label={`${f("dailyRate").label} (${config.locale.currency})`} hint={f("dailyRate").help ?? "Defaults to the vehicle's rate"} error={issue("dailyRate")}>
                {(id) => (
                  <Input
                    id={id}
                    type="number"
                    required={f("dailyRate").required}
                    min="1"
                    step="any"
                    placeholder={chosen ? String(chosen.dailyRate) : ""}
                    value={form.dailyRate}
                    onChange={(e) => set({ dailyRate: e.target.value })}
                  />
                )}
              </Field>
            )}
            {f("depositAmount").on && (
              <Field label={`${f("depositAmount").label} (${config.locale.currency})`} hint={f("depositAmount").help ?? "Defaults to the vehicle's deposit"} error={issue("depositAmount")}>
                {(id) => (
                  <Input
                    id={id}
                    type="number"
                    required={f("depositAmount").required}
                    min="0"
                    step="any"
                    placeholder={chosen ? String(chosen.depositAmount) : ""}
                    value={form.depositAmount}
                    onChange={(e) => set({ depositAmount: e.target.value })}
                  />
                )}
              </Field>
            )}
          </div>
        )}

        {canAdvance && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={`Advance collected (${config.locale.currency})`} error={issue("advance.amount")}>
              {(id) => <Input id={id} type="number" min="0" step="any" value={form.advance} onChange={(e) => set({ advance: e.target.value })} />}
            </Field>
            <Field label={pf("method").label} hint={pf("method").help} error={issue("advance.method")}>
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
            {numberOrUndefined(form.advance) ? (
              <>
                {pf("transactionReference").on && (
                  <Field label={pf("transactionReference").label} hint={pf("transactionReference").help} error={issue("advance.transactionReference")}>
                    {(id) => <Input id={id} required={pf("transactionReference").required} value={form.advanceReference} onChange={(e) => set({ advanceReference: e.target.value })} />}
                  </Field>
                )}
                {/* The booking has notes of its own, so the advance asks for them only when they're required. */}
                {pf("notes").on && pf("notes").required && (
                  <Field label={`${pf("notes").label} (advance)`} hint={pf("notes").help} error={issue("advance.notes")}>
                    {(id) => <Input id={id} required value={form.advanceNotes} onChange={(e) => set({ advanceNotes: e.target.value })} />}
                  </Field>
                )}
                <CustomFieldInputs fields={paymentFields} draft={advanceCustom} onChange={setAdvanceCustom} issue={issue} path="advance.customFields" />
              </>
            ) : null}
          </div>
        )}

        {f("notes").on && (
          <Field label={f("notes").label} hint={f("notes").help} error={issue("notes")}>
            {(id) => <Textarea id={id} required={f("notes").required} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />}
          </Field>
        )}

        {rentalFields.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <CustomFieldInputs fields={rentalFields} draft={custom} onChange={setCustom} issue={issue} />
          </div>
        )}

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
