"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CustomFieldInputs, customFieldsPayload, draftOf, useFields, withoutOff } from "@/components/ops/fields";
import { PAYMENT_TYPE_LABELS } from "@/components/ops/status";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, numberOrUndefined } from "@/components/ui/field";
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

/**
 * Records a payment against one rental (POST /payments). The backend checks
 * the amount against what's owed or paid. Labels and which fields show come
 * from the config's `fields.payments`.
 */
export function PaymentForm({ rental, onDone }: { rental: Pick<Rental, "id" | "code" | "status" | "balance" | "paidAmount">; onDone?: (payment: Payment) => void }) {
  const { config, options, format } = useWorkspace();
  const types = TYPES_FOR[rental.status];
  const [form, setForm] = useState({ type: types[0], method: options("paymentMethods")[0]?.key ?? "", amount: "", transactionReference: "", notes: "" });
  const { builtIn: f, custom: customFields } = useFields("payments");
  const [custom, setCustom] = useState(() => draftOf(customFields));
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
            ...withoutOff(f, { ...(form.transactionReference ? { transactionReference: form.transactionReference } : {}), notes: form.notes }),
            customFields: customFieldsPayload(customFields, custom),
          },
          {
            onSuccess: (payment) => {
              toast.success(`Receipt ${payment.receiptNumber} recorded`);
              setForm((current) => ({ ...current, amount: "", transactionReference: "", notes: "" }));
              setCustom(draftOf(customFields));
              onDone?.(payment);
            },
          },
        );
      }}
    >
      <Field label={f("type").label} hint={f("type").help} error={issue("type")}>
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
      <Field label={f("method").label} hint={f("method").help} error={issue("method")}>
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
      <Field
        label={`${f("amount").label} (${config.locale.currency})`}
        error={issue("amount")}
        hint={form.type === "REFUND" ? `Paid so far: ${format.money(rental.paidAmount)}` : rental.balance > 0 ? `Outstanding: ${format.money(rental.balance)}` : f("amount").help}
      >
        {(id) => <Input id={id} type="number" min="0" step="any" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />}
      </Field>
      {f("transactionReference").on && (
        <Field label={f("transactionReference").label} hint={f("transactionReference").help} error={issue("transactionReference")}>
          {(id) => <Input id={id} required={f("transactionReference").required} value={form.transactionReference} onChange={(e) => setForm({ ...form, transactionReference: e.target.value })} />}
        </Field>
      )}
      {f("notes").on && (
        <Field label={f("notes").label} hint={f("notes").help} error={issue("notes")} className="sm:col-span-2">
          {(id) => <Textarea id={id} required={f("notes").required} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />}
        </Field>
      )}
      <CustomFieldInputs fields={customFields} draft={custom} onChange={setCustom} issue={issue} />
      <ErrorNote error={record.error} className="sm:col-span-2" />
      <div className="flex justify-end sm:col-span-2">
        <Button type="submit" variant="primary" disabled={record.isPending}>
          Record payment
        </Button>
      </div>
    </form>
  );
}
