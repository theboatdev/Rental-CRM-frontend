"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CustomFieldInputs, customFieldsPayload, draftOf, useFields, withoutOff } from "@/components/ops/fields";
import { useUploadsInFlight } from "@/components/ops/files";
import { InspectionChecklist, photosPayload, type InspectionPhotos } from "@/components/ops/inspection-checklist";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Select, Textarea, numberOrUndefined } from "@/components/ui/field";
import { ErrorNote, Loading } from "@/components/ui/page";
import type { RentalDetail, ReservationMode } from "@/lib/contract";
import { addDays, daysBetween } from "@/lib/dates";
import { useAvailability, useRenters, useTenantMutation } from "@/lib/queries";
import { useWorkspace } from "@/lib/workspace";

export interface BookingDefaults {
  vehicleId?: string;
  startDate?: string;
}

type PickStyle = "vehicle" | "class";

/**
 * Books a vehicle for a renter (POST /rentals). The backend checks the dates,
 * availability and amounts; this form shows its availability per vehicle and
 * any field issues. Optionally records an advance, and when the booking starts
 * today, hands the vehicle over at once. Labels and which fields show come
 * from the config's `fields.rentals`, and `fields.payments` for the advance.
 *
 * When `modules.rentals.reservationMode` allows class holds, staff can reserve
 * by make/model without picking a registration plate yet.
 */
export function BookingDialog({ defaults, onClose, onBooked }: { defaults: BookingDefaults; onClose: () => void; onBooked?: (rental: RentalDetail) => void }) {
  const { config, can, moduleOn, format, options, today } = useWorkspace();
  const renters = useRenters();
  const mode: ReservationMode = config.modules.rentals.reservationMode ?? "specificVehicle";
  const start = defaults.startDate ?? today();
  const initialStyle: PickStyle = defaults.vehicleId || mode === "specificVehicle" ? "vehicle" : mode === "vehicleClass" ? "class" : "vehicle";
  const [pickStyle, setPickStyle] = useState<PickStyle>(initialStyle);
  const [form, setForm] = useState({
    renterId: "",
    vehicleId: defaults.vehicleId ?? "",
    requestedMake: "",
    requestedModel: "",
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
  const [fullyPaid, setFullyPaid] = useState(false);
  const [checkedPoints, setCheckedPoints] = useState<string[]>([]);
  const [photos, setPhotos] = useState<InspectionPhotos>({});
  const { uploading, onBusy } = useUploadsInFlight();
  const availability = useAvailability(form.startDate, form.endDate);
  const book = useTenantMutation((request, body: unknown) => request<RentalDetail>("POST", "/rentals", body));

  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const days = form.startDate && form.endDate ? daysBetween(form.startDate, form.endDate) : 0;
  const showVehiclePicker = mode === "specificVehicle" || (mode === "both" && pickStyle === "vehicle");
  const showClassPicker = mode === "vehicleClass" || (mode === "both" && pickStyle === "class");
  const chosenVehicle = availability.data?.vehicles.find((a) => a.vehicle.id === form.vehicleId);
  const chosenClass = availability.data?.classes.find(
    (c) => c.make === form.requestedMake && c.model === form.requestedModel,
  );
  const chosen = showVehiclePicker ? chosenVehicle : chosenClass;
  // With the rate or deposit field off, bookings take the vehicle's (or class sample).
  const rate = (f("dailyRate").on ? numberOrUndefined(form.dailyRate) : undefined) ?? chosen?.dailyRate ?? 0;
  const deposit = (f("depositAmount").on ? numberOrUndefined(form.depositAmount) : undefined) ?? chosen?.depositAmount ?? 0;
  const canAdvance = moduleOn("payments") && can("payments:record");
  const startsToday = form.startDate === today();
  const canHandOver = startsToday && can("rentals:checkin") && showVehiclePicker;
  const issue = (path: string) => book.error?.issueFor(path);
  const fullAmount = Math.max(days, 0) * rate + deposit;
  // Handing over with the full amount paid: with payments on, the advance collects all of it, so the ledger agrees.
  const paysInFull = canHandOver && handOver && fullyPaid;
  const collectsInFull = paysInFull && canAdvance;
  const offerFullPayment = !moduleOn("payments") || canAdvance;
  const advanceValue = collectsInFull ? String(fullAmount) : form.advance;
  const selectionReady = showVehiclePicker ? Boolean(chosenVehicle?.available) : Boolean(chosenClass?.available);

  const switchStyle = (next: PickStyle) => {
    setPickStyle(next);
    setHandOver(false);
    set({ vehicleId: "", requestedMake: "", requestedModel: "", dailyRate: "", depositAmount: "" });
  };

  const submit = () => {
    const advance = numberOrUndefined(advanceValue);
    book.mutate(
      {
        ...(showVehiclePicker
          ? { vehicleId: form.vehicleId }
          : { requestedMake: form.requestedMake, requestedModel: form.requestedModel }),
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
        ...(canHandOver && handOver ? { pickup: { checkedPoints, photos: photosPayload(photos), confirmFullPayment: paysInFull } } : {}),
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

        {mode === "both" && (
          <fieldset className="flex flex-wrap gap-4">
            <legend className="mb-1 text-xs font-semibold tracking-normal text-muted">How to reserve</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="pickStyle" className="accent-[var(--brand)]" checked={pickStyle === "vehicle"} onChange={() => switchStyle("vehicle")} />
              Specific registration
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="pickStyle" className="accent-[var(--brand)]" checked={pickStyle === "class"} onChange={() => switchStyle("class")} />
              Make &amp; model (assign plate later)
            </label>
          </fieldset>
        )}

        {showVehiclePicker && (
          <fieldset>
            <legend className="mb-2 text-xs font-semibold tracking-normal text-muted">{f("vehicle").label} · rate per day</legend>
            {f("vehicle").help && <p className="mb-2 text-xs text-muted">{f("vehicle").help}</p>}
            {days < 1 && <p className="text-rose-700">The return date must be after the pickup date.</p>}
            {availability.isFetching && <Loading label="Checking availability" />}
            <ErrorNote error={availability.error} />
            <div className="grid gap-2 sm:grid-cols-2">
              {availability.data?.vehicles.map((a) => (
                <label
                  key={a.vehicle.id}
                  className={`flex items-start gap-3 border p-3 ${!a.available ? "bg-paper opacity-50" : form.vehicleId === a.vehicle.id ? "border-brand bg-brand/5" : "border-ink/15"}`}
                >
                  <input
                    type="radio"
                    name="vehicle"
                    className="mt-0.5 accent-[var(--brand)]"
                    required={showVehiclePicker}
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
        )}

        {showClassPicker && (
          <fieldset>
            <legend className="mb-2 text-xs font-semibold tracking-normal text-muted">Vehicle make &amp; model · rate per day</legend>
            <p className="mb-2 text-xs text-muted">Reserve capacity without picking a registration. Assign a plate before handover.</p>
            {days < 1 && <p className="text-rose-700">The return date must be after the pickup date.</p>}
            {availability.isFetching && <Loading label="Checking availability" />}
            <ErrorNote error={availability.error} />
            <div className="grid gap-2 sm:grid-cols-2">
              {availability.data?.classes.map((c) => {
                const selected = form.requestedMake === c.make && form.requestedModel === c.model;
                return (
                  <label
                    key={`${c.make}|${c.model}`}
                    className={`flex items-start gap-3 border p-3 ${!c.available ? "bg-paper opacity-50" : selected ? "border-brand bg-brand/5" : "border-ink/15"}`}
                  >
                    <input
                      type="radio"
                      name="vehicleClass"
                      className="mt-0.5 accent-[var(--brand)]"
                      required={showClassPicker}
                      disabled={!c.available}
                      checked={selected}
                      onChange={() => set({ requestedMake: c.make, requestedModel: c.model, dailyRate: "", depositAmount: "" })}
                    />
                    <span>
                      <strong className="text-ink">
                        {c.make} {c.model}
                      </strong>
                      <br />
                      {c.availableCount} of {c.fleetCount} free · from {format.money(c.dailyRate)}
                      <br />
                      <span className={c.available ? "text-emerald-700" : "text-rose-700"}>{c.reason ?? "Available for these dates"}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            {(issue("requestedMake") || issue("requestedModel")) && (
              <p className="mt-1 text-xs font-semibold text-rose-700">{issue("requestedMake") ?? issue("requestedModel")}</p>
            )}
          </fieldset>
        )}

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
            <Field
              label={`${collectsInFull ? "Collected now" : "Advance collected"} (${config.locale.currency})`}
              hint={collectsInFull ? "The full amount: the rental and the deposit." : undefined}
              error={issue("advance.amount")}
            >
              {(id) => (
                <Input id={id} type="number" min="0" step="any" disabled={collectsInFull} value={advanceValue} onChange={(e) => set({ advance: e.target.value })} />
              )}
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
            {numberOrUndefined(advanceValue) ? (
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
                <CustomFieldInputs section="payments" fields={paymentFields} draft={advanceCustom} onChange={setAdvanceCustom} onBusy={onBusy} issue={issue} path="advance.customFields" />
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
            <CustomFieldInputs section="rentals" fields={rentalFields} draft={custom} onChange={setCustom} onBusy={onBusy} issue={issue} />
          </div>
        )}

        {canHandOver && (
          <div className="space-y-2">
            <Checkbox label="Hand the vehicle over now (the renter is here)" checked={handOver} onChange={setHandOver} />
            {handOver && (
              <InspectionChecklist
                checked={checkedPoints}
                onChange={setCheckedPoints}
                photos={photos}
                onPhotosChange={setPhotos}
                onBusy={onBusy}
                required={config.modules.rentals.requirePickupInspection}
              />
            )}
            {handOver && offerFullPayment && (
              <div>
                <Checkbox
                  label={
                    <>
                      <span className="font-semibold">Full amount paid</span>
                      {canAdvance ? `: collect ${format.money(fullAmount)} now (the rental and the deposit)` : ": the renter has paid everything for this rental"}
                    </>
                  }
                  checked={fullyPaid}
                  onChange={setFullyPaid}
                />
                {issue("pickup.confirmFullPayment") && (
                  <p role="alert" className="mt-1 text-xs font-semibold text-rose-700">
                    {issue("pickup.confirmFullPayment")}
                  </p>
                )}
              </div>
            )}
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
          <Button type="submit" variant="primary" disabled={book.isPending || uploading || days < 1 || !selectionReady}>
            {handOver && canHandOver ? "Book and hand over" : "Confirm booking"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
