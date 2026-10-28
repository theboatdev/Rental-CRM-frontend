"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CustomFieldList, CustomFieldsEditor, useFields } from "@/components/ops/fields";
import { PhotoThumb, useUploadsInFlight } from "@/components/ops/files";
import { InspectionChecklist, photosPayload, type InspectionPhotos } from "@/components/ops/inspection-checklist";
import { PaymentForm } from "@/components/ops/payment-form";
import { PAYMENT_TYPE_LABELS, RentalStatusBadge } from "@/components/ops/status";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea, numberOrUndefined } from "@/components/ui/field";
import { Badge, ErrorNote, Loading, table } from "@/components/ui/page";
import type { Inspection, RentalDetail } from "@/lib/contract";
import { useRental, useTenantMutation } from "@/lib/queries";
import { useWorkspace } from "@/lib/workspace";

type Panel = "checkin" | "return" | "payment" | "details" | null;

/** A rental's details, inspections and payments, with the actions the member may take for its status. */
export function RentalDialog({ rentalId, onClose }: { rentalId: string; onClose: () => void }) {
  const { data: rental, error, isPending } = useRental(rentalId);
  return (
    <Dialog open onClose={onClose} title={rental ? `${rental.code} · ${rental.vehicle.plateNumber}` : "Rental"} eyebrow="Rental details" width="lg">
      {isPending && <Loading />}
      <ErrorNote error={error} />
      {rental && <RentalDetails rental={rental} onClose={onClose} />}
    </Dialog>
  );
}

function RentalDetails({ rental, onClose }: { rental: RentalDetail; onClose: () => void }) {
  const { can, moduleOn, format, label } = useWorkspace();
  const { builtIn: f, custom: customFields } = useFields("rentals");
  const [panel, setPanel] = useState<Panel>(null);
  const cancel =useTenantMutation((request) => request<RentalDetail>("POST", `/rentals/${rental.id}/cancel`));
  const canPay = moduleOn("payments") && can("payments:record");
  const toggle = (next: Panel) => setPanel((current) => (current === next ? null : next));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <RentalStatusBadge rental={rental} />
        {rental.bookingCode && <Badge tone="muted">Booked as {rental.bookingCode}</Badge>}
        <Badge tone="muted">{rental.source === "ONLINE" ? "Guest portal" : "Counter"}</Badge>
      </div>

      <dl className="grid gap-x-6 gap-y-2 border border-line bg-paper p-4 sm:grid-cols-2">
        <Item label={f("renter").label}>
          {rental.renter.fullName} ({rental.renter.profileId}) · {rental.renter.phone}
        </Item>
        <Item label={f("vehicle").label}>
          {rental.vehicle.plateNumber} · {rental.vehicle.make} {rental.vehicle.model}
        </Item>
        <Item label="Dates">
          {format.day(rental.startDate)} → {format.day(rental.endDate)} ({rental.totalDays} days)
        </Item>
        {/* The rate and deposit are part of what's owed, so they show even when their booking fields are off. */}
        <Item label={f("dailyRate").label}>{format.money(rental.dailyRate)} / day</Item>
        <Item label="Rental total">{format.money(rental.totalAmount)}</Item>
        <Item label={f("depositAmount").label}>{format.money(rental.depositAmount)}</Item>
        <Item label="Paid">{format.money(rental.paidAmount)}</Item>
        <Item label="Outstanding">
          <span className={rental.balance > 0 ? "font-semibold text-rose-700" : "text-emerald-700"}>{format.money(rental.balance)}</span>
        </Item>
        {rental.distance !== null && <Item label="Driven">{format.distance(rental.distance)}</Item>}
        {f("notes").on && rental.notes && <Item label={f("notes").label}>{rental.notes}</Item>}
        <CustomFieldList section="rentals" values={rental.customFields} />
      </dl>

      <div className="grid gap-3 sm:grid-cols-2">
        <InspectionCard title="Pickup inspection" inspection={rental.pickupInspection} />
        <InspectionCard title="Return inspection" inspection={rental.dropInspection} />
      </div>

      <div className="flex flex-wrap gap-2">
        {rental.status === "RESERVED" && can("rentals:checkin") && (
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
        {can("rentals:create") && (f("notes").on || customFields.length > 0) && (
          <Button variant="outline" onClick={() => toggle("details")}>
            Edit details
          </Button>
        )}
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

      {panel === "checkin" && <HandoverForm rental={rental} kind="checkin" onDone={() => setPanel(null)} />}
      {panel === "return" && <HandoverForm rental={rental} kind="return" onDone={() => setPanel(null)} />}
      {panel === "details" && (
        <div className="border border-brand/30 bg-brand/5 p-4">
          <CustomFieldsEditor section="rentals" url={`/rentals/${rental.id}`} values={rental.customFields} notes={rental.notes} onDone={() => setPanel(null)} />
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

/** Check-in (pickup inspection, odometer defaults to the vehicle's) or return (odometer required, drop inspection). */
function HandoverForm({ rental, kind, onDone }: { rental: RentalDetail; kind: "checkin" | "return"; onDone: () => void }) {
  const { config } = useWorkspace();
  const required = kind === "checkin" ? config.modules.rentals.requirePickupInspection : config.modules.rentals.requireDropInspection;
  const [checkedPoints, setCheckedPoints] = useState<string[]>([]);
  const [photos, setPhotos] = useState<InspectionPhotos>({});
  const { uploading, onBusy } = useUploadsInFlight();
  const [odometer, setOdometer] = useState("");
  const [notes, setNotes] = useState("");
  const path = kind === "checkin" ? "check-in" : "return";
  const submit = useTenantMutation((request, body: unknown) => request<RentalDetail>("POST", `/rentals/${rental.id}/${path}`, body));

  return (
    <form
      className="space-y-3 border border-brand/30 bg-brand/5 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit.mutate(
          { odometer: numberOrUndefined(odometer), checkedPoints, photos: photosPayload(photos), notes },
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
      <ErrorNote error={submit.error} />
      <div className="flex justify-end">
        <Button type="submit" variant={kind === "checkin" ? "primary" : "success"} disabled={submit.isPending || uploading}>
          {uploading ? "Uploading photos…" : kind === "checkin" ? "Confirm hand-over" : "Confirm return"}
        </Button>
      </div>
    </form>
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
