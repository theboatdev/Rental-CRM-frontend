"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PAYMENT_TYPE_LABELS } from "@/components/ops/status";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, numberOrUndefined } from "@/components/ui/field";
import { ErrorNote } from "@/components/ui/page";
import type { Payment, PaymentType, Rental } from "@/lib/contract";
import { useTenantMutation } from "@/lib/queries";
import { useWorkspace } from "@/lib/workspace";

/** Payment types that make sense for a rental in each status. */
const TYPES_FOR: Record<Rental["status"], PaymentType[]> = {
  RESERVED: ["ADVANCE", "DEPOSIT", "REFUND"],
  ACTIVE: ["RENTAL", "DEPOSIT", "DAMAGE", "LATE_FEE", "REFUND"],
  COMPLETED: ["RENTAL", "DAMAGE", "LATE_FEE", "REFUND"],
  CANCELLED: ["REFUND"],
};

/** Records a payment against one rental (POST /payments). The backend checks the amount against what's owed or paid. */
export function PaymentForm({ rental, onDone }: { rental: Pick<Rental, "id" | "code" | "status" | "balance" | "paidAmount">; onDone?: (payment: Payment) => void }) {
  const { config, options, format } = useWorkspace();
  const types = TYPES_FOR[rental.status];
  const [form, setForm] = useState({ type: types[0], method: options("paymentMethods")[0]?.key ?? "", amount: "", transactionReference: "" });
  const record = useTenantMutation((request, body: unknown) => request<Payment>("POST", "/payments", body));
  const issue = (path: string) => record.error?.issueFor(path);

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        record.mutate(
          {
            rentalId: rental.id,
            type: form.type,
            method: form.method,
            amount: numberOrUndefined(form.amount),
            ...(form.transactionReference ? { transactionReference: form.transactionReference } : {}),
          },
          {
            onSuccess: (payment) => {
              toast.success(`Receipt ${payment.receiptNumber} recorded`);
              setForm((current) => ({ ...current, amount: "", transactionReference: "" }));
              onDone?.(payment);
            },
          },
        );
      }}
    >
      <Field label="Type" error={issue("type")}>
        {(id) => (
          <Select id={id} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as PaymentType })}>
            {types.map((type) => (
              <option key={type} value={type}>
                {PAYMENT_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Method" error={issue("method")}>
        {(id) => (
          <Select id={id} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            {options("paymentMethods").map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={`Amount (${config.locale.currency})`} error={issue("amount")} hint={form.type === "REFUND" ? `Paid so far: ${format.money(rental.paidAmount)}` : rental.balance > 0 ? `Outstanding: ${format.money(rental.balance)}` : undefined}>
        {(id) => <Input id={id} type="number" min="0" step="any" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />}
      </Field>
      <Field label="Slip / transaction reference" error={issue("transactionReference")}>
        {(id) => <Input id={id} value={form.transactionReference} onChange={(e) => setForm({ ...form, transactionReference: e.target.value })} />}
      </Field>
      <ErrorNote error={record.error} className="sm:col-span-2" />
      <div className="flex justify-end sm:col-span-2">
        <Button type="submit" variant="primary" disabled={record.isPending}>
          Record payment
        </Button>
      </div>
    </form>
  );
}
