"use client";

import { Ban, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useFields, useListColumns } from "@/components/ops/fields";
import { PaymentForm } from "@/components/ops/payment-form";
import { PAYMENT_TYPE_LABELS } from "@/components/ops/status";
import { ModuleGate } from "@/components/shell/module-gate";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge, EmptyState, ErrorNote, Loading, PageHeader, Panel, table } from "@/components/ui/page";
import type { Payment } from "@/lib/contract";
import { usePayments, useRentals, useTenantMutation } from "@/lib/queries";
import { useWorkspace } from "@/lib/workspace";

export default function PaymentsPage() {
  return (
    <ModuleGate module="payments" permission="payments:read">
      <Payments />
    </ModuleGate>
  );
}

function Payments() {
  const { can, format, label } = useWorkspace();
  const payments = usePayments();
  const { builtIn: field } = useFields("payments");
  // The ledger shows these built-in fields in its own way; the config decides whether the reference shows.
  const { listed, columns } = useListColumns<Payment>("payments", ["type", "method", "amount", "transactionReference"]);
  const [recording, setRecording] = useState(false);
  const [voiding, setVoiding] = useState<Payment | null>(null);
  const live = payments.data?.filter((p) => !p.voided) ?? [];
  const received = live.reduce((sum, p) => sum + (p.type === "REFUND" ? -p.amount : p.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Ledger · ${payments.data?.length ?? "…"} entries · net ${format.money(received)}`}
        title="Payments"
        actions={
          can("payments:record") && can("rentals:read") && (
            <Button variant="dark" onClick={() => setRecording(true)}>
              <Plus size={14} /> Record payment
            </Button>
          )
        }
      />
      <Panel>
        {payments.isPending && <Loading />}
        <ErrorNote error={payments.error} className="m-4" />
        {payments.data?.length === 0 && <EmptyState>No payments recorded yet.</EmptyState>}
        {payments.data && payments.data.length > 0 && (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead className={table.head}>
                <tr>
                  <th className={table.th}>Receipt</th>
                  <th className={table.th}>Date</th>
                  <th className={table.th}>Renter / rental</th>
                  <th className={table.th}>{field("method").label}</th>
                  <th className={table.th}>{field("type").label}</th>
                  <th className={table.th}>Received by</th>
                  {columns.map((column) => (
                    <th key={column.key} className={table.th}>
                      {column.label}
                    </th>
                  ))}
                  <th className={`${table.th} text-right`}>{field("amount").label}</th>
                  {can("payments:void") && <th className={table.th} />}
                </tr>
              </thead>
              <tbody>
                {payments.data.map((p) => (
                  <tr key={p.id} className={table.row}>
                    <td className={`${table.td} font-semibold text-ink`}>
                      {p.receiptNumber}
                      {p.voided && (
                        <div className="mt-1">
                          <Badge tone="rose">Void</Badge>
                        </div>
                      )}
                    </td>
                    <td className={`${table.td} text-muted`}>{format.dateTime(p.paidAt)}</td>
                    <td className={table.td}>
                      <div className="font-semibold text-ink">{"fullName" in p.renter ? p.renter.fullName : "—"}</div>
                      <div className="text-xs text-brand">{p.rental.code}</div>
                    </td>
                    <td className={table.td}>
                      {label("paymentMethods", p.method)}
                      {listed("transactionReference") && p.transactionReference && <div className="text-xs text-muted">{p.transactionReference}</div>}
                    </td>
                    <td className={`${table.td} text-muted`}>{PAYMENT_TYPE_LABELS[p.type]}</td>
                    <td className={`${table.td} text-muted`}>{p.receivedBy?.name ?? "—"}</td>
                    {columns.map((column) => (
                      <td key={column.key} className={table.td}>
                        {column.cell(p)}
                      </td>
                    ))}
                    <td className={`${table.td} text-right text-sm font-semibold ${p.voided ? "text-muted line-through" : p.type === "REFUND" ? "text-rose-700" : "text-emerald-700"}`}>
                      {format.money(p.type === "REFUND" ? -p.amount : p.amount)}
                      {p.voided && p.voidReason && <div className="text-xs font-normal text-muted no-underline">{p.voidReason}</div>}
                    </td>
                    {can("payments:void") && (
                      <td className={`${table.td} text-right`}>
                        {!p.voided && (
                          <Button size="sm" variant="ghost" onClick={() => setVoiding(p)} aria-label={`Void ${p.receiptNumber}`}>
                            <Ban size={12} /> Void
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {recording && <RecordPaymentDialog onClose={() => setRecording(false)} />}
      {voiding && <VoidDialog payment={voiding} onClose={() => setVoiding(null)} />}
    </div>
  );
}

function RecordPaymentDialog({ onClose }: { onClose: () => void }) {
  const { format } = useWorkspace();
  const rentals = useRentals();
  const [rentalId, setRentalId] = useState("");
  const rental = rentals.data?.find((r) => r.id === rentalId);
  return (
    <Dialog open onClose={onClose} title="Record a payment" eyebrow="Ledger" width="md">
      <div className="space-y-4">
        <Field label="Rental">
          {(id) => (
            <Select id={id} required value={rentalId} onChange={(e) => setRentalId(e.target.value)}>
              <option value="">Choose a rental…</option>
              {rentals.data?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} — {r.renter.fullName} ({r.vehicle.plateNumber}) · {r.status.toLowerCase()} · owes {format.money(r.balance)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {rentals.isPending && <Loading label="Loading rentals" />}
        {rental && <PaymentForm key={rental.id} rental={rental} onDone={onClose} />}
      </div>
    </Dialog>
  );
}

function VoidDialog({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const { format } = useWorkspace();
  const [reason, setReason] = useState("");
  const voidIt = useTenantMutation((request, body: { reason: string }) => request<Payment>("POST", `/payments/${payment.id}/void`, body));
  return (
    <Dialog open onClose={onClose} title={`Void ${payment.receiptNumber}`} eyebrow="Ledger" width="sm">
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          voidIt.mutate(
            { reason },
            {
              onSuccess: () => {
                toast.success(`${payment.receiptNumber} voided`);
                onClose();
              },
            },
          );
        }}
      >
        <p>
          The entry of {format.money(payment.amount)} stays in the ledger, marked void, and comes off what was paid for {payment.rental.code}.
        </p>
        <Field label="Reason" error={voidIt.error?.issueFor("reason")}>
          {(id) => <Input id={id} required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
        <ErrorNote error={voidIt.error} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Keep it
          </Button>
          <Button type="submit" variant="danger" disabled={voidIt.isPending}>
            Void entry
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
