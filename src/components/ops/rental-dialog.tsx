"use client";

import { BadgeCheck, FileDown, Loader2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  CustomFieldInputs,
  CustomFieldList,
  customFieldsPayload,
  draftOf,
  useFields,
} from "@/components/ops/fields";
import { PhotoThumb, useUploadsInFlight } from "@/components/ops/files";
import { InspectionChecklist, photosPayload, type InspectionPhotos } from "@/components/ops/inspection-checklist";
import { PaymentForm } from "@/components/ops/payment-form";
import { PAYMENT_TYPE_LABELS, RentalStatusBadge } from "@/components/ops/status";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Select, Textarea, numberOrUndefined } from "@/components/ui/field";
import { Badge, ErrorNote, Loading, table } from "@/components/ui/page";
import { useApiDownload } from "@/lib/api";
import type { Inspection, RentalDetail } from "@/lib/contract";
import { rentalDays } from "@/lib/dates";
import { useAvailability, useRental, useRenters, useTenantMutation } from "@/lib/queries";
import { useWorkspace } from "@/lib/workspace";

type Panel = "checkin" | "return" | "payment" | "details" | "assign" | null;

function vehicleLabel(rental: { vehicle: { plateNumber: string; make: string; model: string } | null; requestedMake: string | null; requestedModel: string | null }) {
  if (rental.vehicle) return `${rental.vehicle.plateNumber} · ${rental.vehicle.make} ${rental.vehicle.model}`;
  if (rental.requestedMake && rental.requestedModel) return `${rental.requestedMake} ${rental.requestedModel} (unassigned)`;
  return "No vehicle";
}

/** A rental's details, inspections and payments, with the actions the member may take for its status. */
export function RentalDialog({ rentalId, onClose }: { rentalId: string; onClose: () => void }) {
  const { data: rental, error, isPending } = useRental(rentalId);
  return (
    <Dialog open onClose={onClose} title={rental ? `${rental.code} · ${vehicleLabel(rental)}` : "Rental"} eyebrow="Rental details" width="lg">
      {isPending && <Loading />}
      <ErrorNote error={error} />
      {rental && <RentalDetails rental={rental} onClose={onClose} />}
    </Dialog>
  );
}

function RentalDetails({ rental, onClose }: { rental: RentalDetail; onClose: () => void }) {
  const { config, can, canSeeBookingPricing, moduleOn, format, label } = useWorkspace();
  const { builtIn: f } = useFields("rentals");
  const [panel, setPanel] = useState<Panel>(null);
  const cancel = useTenantMutation((request) => request<RentalDetail>("POST", `/rentals/${rental.id}/cancel`));
  const confirmPaid = useTenantMutation((request) => request<RentalDetail>("POST", `/rentals/${rental.id}/full-payment`));
  const canPay = moduleOn("payments") && can("payments:record");
  // After the hand-over, the full payment can still be confirmed once nothing is owed (the ledger has to agree when payments are on).
  const canConfirmPaid =
    !rental.fullPayment &&
    (rental.status === "ACTIVE" || rental.status === "COMPLETED") &&
    (can("rentals:checkin") || can("payments:record")) &&
    // When outstanding is hidden, still offer confirm; the API enforces what's owed.
    (!moduleOn("payments") || rental.balance == null || rental.balance <= 0);
  const toggle = (next: Panel) => setPanel((current) => (current === next ? null : next));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <RentalStatusBadge rental={rental} />
        {rental.fullPayment && (
          <Badge tone="green">
            <BadgeCheck size={12} className="mr-1" aria-hidden /> Full amount paid
          </Badge>
        )}
        {rental.bookingCode && <Badge tone="muted">Booked as {rental.bookingCode}</Badge>}
        <Badge tone="muted">{rental.source === "ONLINE" ? "Guest portal" : "Counter"}</Badge>
      </div>

      <dl className="grid gap-x-6 gap-y-2 border border-line bg-paper p-4 sm:grid-cols-2">
        <Item label={f("renter").label}>
          {rental.renter.fullName} ({rental.renter.profileId}) · {rental.renter.phone}
        </Item>
        <Item label={f("vehicle").label}>
          {vehicleLabel(rental)}
          {rental.needsVehicleAssignment && <span className="ml-2 text-xs font-semibold text-amber-700">Assign before handover</span>}
        </Item>
        <Item label="Dates">
          {format.day(rental.startDate)} → {format.day(rental.endDate)} (
          {canSeeBookingPricing && rental.billableDays != null && rental.billableDays !== rental.totalDays
            ? `${rental.totalDays} days on road · charging ${rental.billableDays} days`
            : `${rental.totalDays} days`}
          )
        </Item>
        {/* Rate/total/deposit show when the caller may see booking pricing (even if those booking fields are off in config). */}
        {canSeeBookingPricing && rental.dailyRate != null && <Item label={f("dailyRate").label}>{format.money(rental.dailyRate)} / day</Item>}
        {canSeeBookingPricing && rental.totalAmount != null && <Item label="Rental total">{format.money(rental.totalAmount)}</Item>}
        {canSeeBookingPricing && rental.supplierRentalCost != null && rental.totalAmount != null && (
          <>
            <Item label="Supplier rental cost">{format.money(rental.supplierRentalCost)}</Item>
            <Item label="Gross profit before other expenses">{format.money(rental.totalAmount - rental.supplierRentalCost)}</Item>
          </>
        )}
        {canSeeBookingPricing && rental.depositAmount != null && <Item label={f("depositAmount").label}>{format.money(rental.depositAmount)}</Item>}
        <Item label="Paid">{format.money(rental.paidAmount)}</Item>
        {canSeeBookingPricing && rental.balance != null && (
          <Item label="Outstanding">
            <span className={rental.balance > 0 ? "font-semibold text-rose-700" : "text-emerald-700"}>{format.money(rental.balance)}</span>
          </Item>
        )}
        {rental.fullPayment && (
          <Item label="Full payment">
            <span className="text-emerald-700">
              Confirmed {format.dateTime(rental.fullPayment.at)}
              {rental.fullPayment.by ? ` by ${rental.fullPayment.by.name}` : ""}
            </span>
          </Item>
        )}
        {rental.distance !== null && <Item label="Driven">{format.distance(rental.distance)}</Item>}
        {f("notes").on && rental.notes && <Item label={f("notes").label}>{rental.notes}</Item>}
        <CustomFieldList section="rentals" values={rental.customFields} />
      </dl>

      <div className="grid gap-3 sm:grid-cols-2">
        <InspectionCard title="Pickup inspection" inspection={rental.pickupInspection} />
        <InspectionCard title="Return inspection" inspection={rental.dropInspection} />
      </div>

      <div className="flex flex-wrap gap-2">
        {rental.status === "RESERVED" && can("rentals:create") && (
          <Button variant={rental.needsVehicleAssignment ? "primary" : "outline"} onClick={() => toggle("assign")}>
            {rental.needsVehicleAssignment ? "Assign vehicle" : "Change vehicle"}
          </Button>
        )}
        {rental.status === "RESERVED" && can("rentals:checkin") && !rental.needsVehicleAssignment && (
          <Button variant="primary" onClick={() => toggle("checkin")}>
            Check in &amp; hand over
          </Button>
        )}
        {rental.status === "ACTIVE" && can("rentals:return") && (
          <Button variant="success" onClick={() => toggle("return")}>
            Record return
          </Button>
        )}
        {canPay && (
          <Button variant="outline" onClick={() => toggle("payment")}>
            Record payment
          </Button>
        )}
        {canConfirmPaid && (
          <Button
            variant="outline"
            disabled={confirmPaid.isPending}
            onClick={() => {
              if (!confirm(`Confirm that ${rental.renter.fullName} has paid the full amount for ${rental.code}?`)) return;
              confirmPaid.mutate(undefined, { onSuccess: (updated) => toast.success(`${updated.code} confirmed as paid in full`) });
            }}
          >
            <BadgeCheck size={14} /> Confirm full payment
          </Button>
        )}
        {can("rentals:create") && (rental.status === "RESERVED" || rental.status === "ACTIVE") && (
          <Button variant="outline" onClick={() => toggle("details")}>
            Edit details
          </Button>
        )}
        {rental.status === "COMPLETED" && config.documents?.returnReceipt.enabled && <ReturnReceiptButton rental={rental} />}
        {rental.status === "RESERVED" && can("rentals:cancel") && (
          <Button
            variant="danger"
            disabled={cancel.isPending}
            onClick={() => {
              if (!confirm(`Cancel ${rental.code}? Advances stay in the ledger; refund them with a refund payment.`)) return;
              cancel.mutate(undefined, { onSuccess: (updated) => toast.success(`${updated.code} cancelled`) });
            }}
          >
            Cancel booking
          </Button>
        )}
      </div>
      <ErrorNote error={cancel.error} />
      <ErrorNote error={confirmPaid.error} />

      {panel === "assign" && <AssignVehicleForm rental={rental} onDone={() => setPanel(null)} />}
      {panel === "checkin" && <HandoverForm rental={rental} kind="checkin" onDone={() => setPanel(null)} />}
      {panel === "return" && <HandoverForm rental={rental} kind="return" onDone={() => setPanel(null)} />}
      {panel === "details" && (
        <div className="border border-brand/30 bg-brand/5 p-4">
          <EditRentalForm rental={rental} onDone={() => setPanel(null)} />
        </div>
      )}
      {panel === "payment" && (
        <div className="border border-brand/30 bg-brand/5 p-4">
          <PaymentForm rental={rental} onDone={() => setPanel(null)} />
        </div>
      )}

      {rental.payments && (
        <div>
          <h4 className="mb-2 font-semibold tracking-normal text-ink">Payments</h4>
          {rental.payments.length === 0 ? (
            <p className="text-muted italic">No payments recorded.</p>
          ) : (
            <div className={`border border-ink/15 ${table.wrap}`}>
              <table className={table.table}>
                <thead className={table.head}>
                  <tr>
                    <th className={table.th}>Receipt</th>
                    <th className={table.th}>Date</th>
                    <th className={table.th}>Type</th>
                    <th className={table.th}>Method</th>
                    <th className={`${table.th} text-right`}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rental.payments.map((p) => (
                    <tr key={p.id} className={`${table.row} ${p.voided ? "text-muted line-through" : ""}`}>
                      <td className={table.td}>{p.receiptNumber}</td>
                      <td className={table.td}>{format.dateTime(p.paidAt)}</td>
                      <td className={table.td}>{PAYMENT_TYPE_LABELS[p.type]}</td>
                      <td className={table.td}>{label("paymentMethods", p.method)}</td>
                      <td className={`${table.td} text-right font-semibold`}>{format.money(p.type === "REFUND" ? -p.amount : p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <div className="flex justify-end border-t border-line pt-4">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

/**
 * Edits a rental by status: RESERVED can change dates, renter, rate and deposit;
 * ACTIVE can change rate, notes and custom fields. Vehicle changes stay on Assign.
 */
function EditRentalForm({ rental, onDone }: { rental: RentalDetail; onDone: () => void }) {
  const { config, canSeeBookingPricing, format, today } = useWorkspace();
  const { builtIn: f, custom: customFields } = useFields("rentals");
  const reserved = rental.status === "RESERVED";
  const renters = useRenters();
  const [form, setForm] = useState({
    startDate: rental.startDate,
    endDate: rental.endDate,
    renterId: rental.renter.id,
    dailyRate: rental.dailyRate != null ? String(rental.dailyRate) : "",
    billableDays: rental.billableDays != null ? String(rental.billableDays) : "",
    depositAmount: rental.depositAmount != null ? String(rental.depositAmount) : "",
    notes: rental.notes ?? "",
  });
  const [initialCustom] = useState(() => draftOf(customFields, rental.customFields));
  const [custom, setCustom] = useState(initialCustom);
  const { uploading, onBusy } = useUploadsInFlight();
  const availability = useAvailability(form.startDate, form.endDate, rental.id);
  const save = useTenantMutation((request, body: unknown) => request<RentalDetail>("PATCH", `/rentals/${rental.id}`, body));
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const issue = (path: string) => save.error?.issueFor(path);

  const calendarDays = form.startDate && form.endDate ? rentalDays(form.startDate, form.endDate) : 0;
  const billableOverride = numberOrUndefined(form.billableDays);
  const chargedDays = billableOverride ?? calendarDays;
  const rate = numberOrUndefined(form.dailyRate) ?? rental.dailyRate ?? 0;
  const previewTotal = Math.max(chargedDays, 0) * rate;
  const datesChanged = reserved && (form.startDate !== rental.startDate || form.endDate !== rental.endDate);
  const chosenBusy =
    reserved &&
    rental.vehicle &&
    availability.data?.vehicles.find((a) => a.vehicle.id === rental.vehicle!.id && !a.available);

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        const body: Record<string, unknown> = {};
        if (reserved) {
          if (form.startDate !== rental.startDate) body.startDate = form.startDate;
          if (form.endDate !== rental.endDate) body.endDate = form.endDate;
          if (form.renterId !== rental.renter.id) body.renterId = form.renterId;
          if (canSeeBookingPricing && f("depositAmount").on) {
            const deposit = numberOrUndefined(form.depositAmount);
            if (deposit !== undefined && deposit !== rental.depositAmount) body.depositAmount = deposit;
          }
        }
        if (canSeeBookingPricing && f("dailyRate").on) {
          const dailyRate = numberOrUndefined(form.dailyRate);
          if (dailyRate !== undefined && dailyRate !== rental.dailyRate) body.dailyRate = dailyRate;
        }
        // Dates change clears billableDays on the server; only send an override when dates stay put.
        if (canSeeBookingPricing && !datesChanged) {
          const next = form.billableDays.trim() === "" ? null : numberOrUndefined(form.billableDays) ?? null;
          const current = rental.billableDays ?? null;
          if (next !== current) body.billableDays = next;
        }
        if (f("notes").on && form.notes !== (rental.notes ?? "")) body.notes = form.notes;
        const customPayload = customFieldsPayload(customFields, custom, initialCustom);
        if (Object.keys(customPayload).length) body.customFields = customPayload;
        if (Object.keys(body).length === 0) {
          onDone();
          return;
        }
        save.mutate(body, {
          onSuccess: (updated) => {
            toast.success(`${updated.code} updated`);
            onDone();
          },
        });
      }}
    >
      <h4 className="font-semibold tracking-normal text-ink">Edit details</h4>
      {reserved && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={f("startDate").label} hint={f("startDate").help} error={issue("startDate")}>
              {(id) => (
                <Input id={id} type="date" required min={today()} value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} />
              )}
            </Field>
            <Field label={f("endDate").label} hint={f("endDate").help} error={issue("endDate")}>
              {(id) => (
                <Input
                  id={id}
                  type="date"
                  required
                  min={form.startDate || undefined}
                  value={form.endDate}
                  onChange={(e) => set({ endDate: e.target.value })}
                />
              )}
            </Field>
          </div>
          {calendarDays < 1 && <p className="text-sm text-rose-700">The return date must be on or after the pickup date.</p>}
          {availability.isFetching && <Loading label="Checking availability" />}
          {chosenBusy && (
            <p className="text-sm text-rose-700">
              {rental.vehicle!.plateNumber} is not free for these dates
              {chosenBusy.reason ? `: ${chosenBusy.reason}` : ""}.
            </p>
          )}
          <Field label={f("renter").label} hint={f("renter").help} error={issue("renterId")}>
            {(id) =>
              renters.isPending ? (
                <Loading label="Loading renters" />
              ) : (
                <Select id={id} required value={form.renterId} onChange={(e) => set({ renterId: e.target.value })}>
                  {renters.data?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.profileId} — {r.fullName} ({r.phone})
                    </option>
                  ))}
                </Select>
              )
            }
          </Field>
        </>
      )}

      {canSeeBookingPricing && (f("dailyRate").on || (reserved && f("depositAmount").on)) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {f("dailyRate").on && (
            <Field
              label={`${f("dailyRate").label} (${config.locale.currency})`}
              hint={f("dailyRate").help}
              error={issue("dailyRate")}
            >
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  required={f("dailyRate").required}
                  min="1"
                  step="any"
                  value={form.dailyRate}
                  onChange={(e) => set({ dailyRate: e.target.value })}
                />
              )}
            </Field>
          )}
          {reserved && f("depositAmount").on && (
            <Field
              label={`${f("depositAmount").label} (${config.locale.currency})`}
              hint={f("depositAmount").help}
              error={issue("depositAmount")}
            >
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  required={f("depositAmount").required}
                  min="0"
                  step="any"
                  value={form.depositAmount}
                  onChange={(e) => set({ depositAmount: e.target.value })}
                />
              )}
            </Field>
          )}
        </div>
      )}

      {canSeeBookingPricing && (
        <Field
          label="Chargeable days"
          hint={
            datesChanged
              ? "Changing the dates resets charging to the full booking length."
              : `Defaults to the full booking length (${calendarDays || rental.totalDays} days). Leave blank to charge the calendar span.`
          }
          error={issue("billableDays")}
        >
          {(id) => (
            <Input
              id={id}
              type="number"
              min="1"
              step="1"
              placeholder={String(calendarDays || rental.totalDays)}
              disabled={datesChanged}
              value={datesChanged ? "" : form.billableDays}
              onChange={(e) => set({ billableDays: e.target.value })}
            />
          )}
        </Field>
      )}

      {canSeeBookingPricing && f("dailyRate").on && chargedDays > 0 && (
        <p className="text-sm text-muted">
          {billableOverride != null && billableOverride !== calendarDays && calendarDays > 0
            ? `${calendarDays} days on road · charging ${chargedDays} days`
            : `${chargedDays} ${chargedDays === 1 ? "day" : "days"}`}{" "}
          × {format.money(rate)} = <strong className="text-ink">{format.money(previewTotal)}</strong>
          {rental.paidAmount > 0 ? ` · paid ${format.money(rental.paidAmount)}` : ""}
        </p>
      )}

      {f("notes").on && (
        <Field label={f("notes").label} hint={f("notes").help} error={issue("notes")}>
          {(id) => <Textarea id={id} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />}
        </Field>
      )}

      <CustomFieldInputs section="rentals" fields={customFields} draft={custom} onChange={setCustom} onBusy={onBusy} issue={issue} />
      <ErrorNote error={save.error} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={save.isPending || uploading || Boolean(chosenBusy) || (reserved && calendarDays < 1)}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

/** Assigns (or reassigns) a registration plate to a RESERVED booking. */
function AssignVehicleForm({ rental, onDone }: { rental: RentalDetail; onDone: () => void }) {
  const { format, config, canSeeBookingPricing } = useWorkspace();
  const [vehicleId, setVehicleId] = useState(rental.vehicle?.id ?? "");
  const [supplierRentalCost, setSupplierRentalCost] = useState(
    rental.supplierRentalCost != null ? String(rental.supplierRentalCost) : "",
  );
  const availability = useAvailability(rental.startDate, rental.endDate, rental.id);
  const assign = useTenantMutation((request, body: unknown) =>
    request<RentalDetail>("POST", `/rentals/${rental.id}/assign-vehicle`, body),
  );

  const matchesClass = (make: string, model: string) =>
    !rental.requestedMake ||
    !rental.requestedModel ||
    (make.toLowerCase() === rental.requestedMake.toLowerCase() && model.toLowerCase() === rental.requestedModel.toLowerCase());

  const options = (availability.data?.vehicles ?? []).filter((a) => matchesClass(a.vehicle.make, a.vehicle.model));
  const chosen = options.find((a) => a.vehicle.id === vehicleId);
  const showSupplierCost =
    canSeeBookingPricing && Boolean(config.modules.vehicles.thirdPartyVehicles) && chosen?.ownership === "THIRD_PARTY";

  return (
    <div className="space-y-3 border border-brand/30 bg-brand/5 p-4">
      <h4 className="font-semibold tracking-normal text-ink">
        {rental.needsVehicleAssignment ? "Assign a vehicle" : "Change vehicle"}
      </h4>
      {rental.requestedMake && rental.requestedModel && (
        <p className="text-sm text-muted">
          This reservation is for a <strong className="text-ink">{rental.requestedMake} {rental.requestedModel}</strong>.
        </p>
      )}
      {availability.isFetching && <Loading label="Checking availability" />}
      <ErrorNote error={availability.error} />
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((a) => (
          <label
            key={a.vehicle.id}
            className={`flex items-start gap-3 border bg-panel p-3 ${!a.available ? "opacity-50" : vehicleId === a.vehicle.id ? "border-brand" : "border-ink/15"}`}
          >
            <input
              type="radio"
              name="assignVehicle"
              className="mt-0.5 accent-[var(--brand)]"
              disabled={!a.available && a.vehicle.id !== rental.vehicle?.id}
              checked={vehicleId === a.vehicle.id}
              onChange={() => {
                setVehicleId(a.vehicle.id);
                setSupplierRentalCost("");
              }}
            />
            <span className="text-sm">
              <strong className="text-ink">
                {a.vehicle.make} {a.vehicle.model}
              </strong>
              <br />
              {a.vehicle.plateNumber}
              {canSeeBookingPricing && a.dailyRate != null ? ` · ${format.money(a.dailyRate)}` : ""}
              {config.modules.vehicles.thirdPartyVehicles && a.ownership === "THIRD_PARTY" ? " · Third-party" : ""}
              <br />
              <span className={a.available || a.vehicle.id === rental.vehicle?.id ? "text-emerald-700" : "text-rose-700"}>
                {a.vehicle.id === rental.vehicle?.id ? "Currently assigned" : (a.reason ?? "Available")}
              </span>
            </span>
          </label>
        ))}
      </div>
      {showSupplierCost && (
        <Field
          label={`Supplier rental cost (${config.locale.currency})`}
          hint="Amount payable to the third-party vehicle supplier for this booking."
          error={assign.error?.issueFor("supplierRentalCost")}
        >
          {(id) => (
            <Input
              id={id}
              type="number"
              required
              min="0"
              step="any"
              value={supplierRentalCost}
              onChange={(e) => setSupplierRentalCost(e.target.value)}
            />
          )}
        </Field>
      )}
      {options.length === 0 && !availability.isFetching && <p className="text-sm text-muted">No matching vehicles for these dates.</p>}
      <ErrorNote error={assign.error} />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={!vehicleId || assign.isPending || (vehicleId === rental.vehicle?.id && !showSupplierCost)}
          onClick={() =>
            assign.mutate(
              {
                vehicleId,
                ...(showSupplierCost ? { supplierRentalCost: numberOrUndefined(supplierRentalCost) ?? 0 } : {}),
              },
              {
                onSuccess: (updated) => {
                  toast.success(`${updated.vehicle?.plateNumber ?? "Vehicle"} assigned to ${updated.code}`);
                  onDone();
                },
              },
            )
          }
        >
          Save assignment
        </Button>
      </div>
    </div>
  );
}

/**
 * Downloads the return receipt: the PDF bill for the renter that confirms
 * the vehicle came back, with everything these details show. The backend
 * makes it, as the tenant's `documents.returnReceipt` config sets it up.
 */
function ReturnReceiptButton({ rental }: { rental: RentalDetail }) {
  const download = useApiDownload();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await download(`/rentals/${rental.id}/return-receipt`, `${rental.code}-return-receipt.pdf`);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Couldn't download the return receipt");
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
      {pending ? "Preparing PDF…" : "Download return receipt"}
    </Button>
  );
}

/**
 * Check-in (pickup inspection, odometer defaults to the vehicle's, and the
 * full payment confirmation) or return (odometer required, drop inspection).
 */
function HandoverForm({ rental, kind, onDone }: { rental: RentalDetail; kind: "checkin" | "return"; onDone: () => void }) {
  const { config } = useWorkspace();
  // The payment block holds a form of its own, so it sits outside this one; the submit button points back at it.
  const formId = useId();
  const [confirmFullPayment, setConfirmFullPayment] = useState(false);
  const required = kind === "checkin" ? config.modules.rentals.requirePickupInspection : config.modules.rentals.requireDropInspection;
  const [checkedPoints, setCheckedPoints] = useState<string[]>([]);
  const [photos, setPhotos] = useState<InspectionPhotos>({});
  const { uploading, onBusy } = useUploadsInFlight();
  const [odometer, setOdometer] = useState("");
  const [notes, setNotes] = useState("");
  const path = kind === "checkin" ? "check-in" : "return";
  const submit = useTenantMutation((request, body: unknown) => request<RentalDetail>("POST", `/rentals/${rental.id}/${path}`, body));

  return (
    <div className="space-y-3 border border-brand/30 bg-brand/5 p-4">
      <form
        id={formId}
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit.mutate(
            { odometer: numberOrUndefined(odometer), checkedPoints, photos: photosPayload(photos), notes, ...(kind === "checkin" ? { confirmFullPayment } : {}) },
            {
              onSuccess: (updated) => {
                toast.success(kind === "checkin" ? `${updated.code} handed over` : `${updated.code} returned`);
                onDone();
              },
            },
          );
        }}
      >
        <InspectionChecklist checked={checkedPoints} onChange={setCheckedPoints} photos={photos} onPhotosChange={setPhotos} onBusy={onBusy} required={required} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label={`Odometer (${config.locale.distanceUnit})`}
            hint={kind === "checkin" ? "Leave empty to use the vehicle's last reading" : rental.startMileage !== null ? `At pickup: ${rental.startMileage}` : undefined}
            error={submit.error?.issueFor("odometer")}
          >
            {(id) => <Input id={id} type="number" min="0" required={kind === "return"} value={odometer} onChange={(e) => setOdometer(e.target.value)} />}
          </Field>
          <Field label="Notes (damage, fuel level)">{(id) => <Textarea id={id} value={notes} onChange={(e) => setNotes(e.target.value)} />}</Field>
        </div>
      </form>
      {kind === "checkin" && (
        <PaymentAtPickup rental={rental} confirmed={confirmFullPayment} onConfirmedChange={setConfirmFullPayment} error={submit.error?.issueFor("confirmFullPayment")} />
      )}
      <ErrorNote error={submit.error} />
      <div className="flex justify-end">
        <Button type="submit" form={formId} variant={kind === "checkin" ? "primary" : "success"} disabled={submit.isPending || uploading}>
          {uploading ? "Uploading photos…" : kind === "checkin" ? "Confirm hand-over" : "Confirm return"}
        </Button>
      </div>
    </div>
  );
}

/**
 * The hand-over's payment check: what's still owed, a way to record it on
 * the spot, and the "Full amount paid" confirmation. With the payments
 * module on, the confirmation needs nothing owed (the backend checks too);
 * without it, it's staff's word.
 */
function PaymentAtPickup({
  rental,
  confirmed,
  onConfirmedChange,
  error,
}: {
  rental: RentalDetail;
  confirmed: boolean;
  onConfirmedChange: (confirmed: boolean) => void;
  error?: string;
}) {
  const { format, moduleOn, can, canSeeBookingPricing } = useWorkspace();
  const [collecting, setCollecting] = useState(false);
  const ledger = moduleOn("payments");
  const owed = rental.balance;
  const showOwed = canSeeBookingPricing && owed != null;
  const blocked = ledger && showOwed && owed > 0;

  return (
    <div className="space-y-2 border-t border-brand/20 pt-3">
      <p className="font-semibold tracking-normal text-ink">Payment</p>
      {ledger &&
        (showOwed ? (
          owed > 0 ? (
            <p className="text-xs text-ink">
              <span className="font-semibold text-rose-700">{format.money(owed)}</span> is still to be paid: the rental and deposit, less {format.money(rental.paidAmount)}{" "}
              paid.{" "}
              {can("payments:record") ? (
                <button type="button" className="font-semibold text-brand underline" onClick={() => setCollecting((open) => !open)}>
                  {collecting ? "Not now" : "Record it now"}
                </button>
              ) : (
                "Someone who records payments needs to take it first."
              )}
            </p>
          ) : (
            <p className="text-xs text-emerald-700">Nothing is owed: {format.money(rental.paidAmount)} paid.</p>
          )
        ) : (
          <p className="text-xs text-muted">
            {format.money(rental.paidAmount)} paid so far.
            {can("payments:record") ? (
              <>
                {" "}
                <button type="button" className="font-semibold text-brand underline" onClick={() => setCollecting((open) => !open)}>
                  {collecting ? "Not now" : "Record a payment"}
                </button>
              </>
            ) : null}
          </p>
        ))}
      {collecting && (blocked || (!showOwed && can("payments:record"))) && (
        <div className="border border-line bg-panel p-3">
          <PaymentForm
            rental={rental}
            types={["RENTAL", "DEPOSIT"]}
            defaultAmount={showOwed ? owed : undefined}
            onDone={(payment) => {
              setCollecting(false);
              // Paying off what was owed is the usual reason to record it here.
              if (showOwed && payment.amount >= owed!) onConfirmedChange(true);
            }}
          />
        </div>
      )}
      <Checkbox
        label={
          <>
            <span className="font-semibold">Full amount paid</span>: the renter has paid everything for this rental
          </>
        }
        checked={confirmed && !blocked}
        disabled={blocked}
        onChange={onConfirmedChange}
      />
      {error ? (
        <p role="alert" className="text-xs font-semibold text-rose-700">
          {error}
        </p>
      ) : (
        blocked && <p className="text-xs text-muted">Record what&apos;s still owed to confirm the full amount.</p>
      )}
    </div>
  );
}

function InspectionCard({ title, inspection }: { title: string; inspection: Inspection | null }) {
  const { format } = useWorkspace();
  return (
    <div className="border border-ink/15 p-3">
      <p className="font-semibold tracking-normal text-ink">{title}</p>
      {inspection ? (
        <>
          <p className="mt-1 text-muted">
            {format.dateTime(inspection.at)}
            {inspection.by ? ` · ${inspection.by.name}` : ""}
            {inspection.odometer !== null ? ` · ${format.distance(inspection.odometer)}` : ""}
          </p>
          <ul className="mt-2 space-y-0.5">
            {inspection.points.map((point) => (
              <li key={point} className="text-emerald-700">
                ✓ {point}
              </li>
            ))}
          </ul>
          {inspection.photos.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {inspection.photos.map((photo) => (
                <figure key={photo.point} className="space-y-1">
                  <PhotoThumb file={photo.file} alt={photo.point} />
                  <figcaption className="truncate text-[11px] text-muted">{photo.point}</figcaption>
                </figure>
              ))}
            </div>
          )}
          {inspection.notes && <p className="mt-2">{inspection.notes}</p>}
        </>
      ) : (
        <p className="mt-1 text-muted italic">Not done yet.</p>
      )}
    </div>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-normal text-muted">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}
