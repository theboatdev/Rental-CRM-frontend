"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ErrorNote } from "@/components/ui/page";
import type { Supplier, SupplierStatus } from "@/lib/contract";
import { useTenantMutation } from "@/lib/queries";

/**
 * Registers a supplier (POST /suppliers). The profile code comes from the backend.
 */
export function SupplierForm({ onDone }: { onDone: (supplier: Supplier) => void }) {
  const [form, setForm] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    bankName: "",
    bankAccount: "",
    bankAccountHolder: "",
    status: "ACTIVE" as SupplierStatus,
    notes: "",
  });
  const create = useTenantMutation((request, body: unknown) => request<Supplier>("POST", "/suppliers", body));
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const issue = (path: string) => create.error?.issueFor(path);

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate(
          {
            name: form.name,
            phone: form.phone,
            status: form.status,
            notes: form.notes,
            ...(form.contactPerson ? { contactPerson: form.contactPerson } : {}),
            ...(form.email ? { email: form.email } : {}),
            ...(form.bankName ? { bankName: form.bankName } : {}),
            ...(form.bankAccount ? { bankAccount: form.bankAccount } : {}),
            ...(form.bankAccountHolder ? { bankAccountHolder: form.bankAccountHolder } : {}),
          },
          {
            onSuccess: (supplier) => {
              toast.success(`${supplier.name} registered as ${supplier.profileId}`);
              onDone(supplier);
            },
          },
        );
      }}
    >
      <Field label="Company / trade name" error={issue("name")}>
        {(id) => <Input id={id} required value={form.name} onChange={(e) => set({ name: e.target.value })} />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Contact person" error={issue("contactPerson")}>
          {(id) => <Input id={id} value={form.contactPerson} onChange={(e) => set({ contactPerson: e.target.value })} />}
        </Field>
        <Field label="Phone" error={issue("phone")}>
          {(id) => <Input id={id} required type="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />}
        </Field>
        <Field label="Email" error={issue("email")}>
          {(id) => <Input id={id} type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />}
        </Field>
        <Field label="Status" error={issue("status")}>
          {(id) => (
            <Select id={id} value={form.status} onChange={(e) => set({ status: e.target.value as SupplierStatus })}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          )}
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 border border-line bg-paper p-3 sm:grid-cols-3">
        <Field label="Bank name" error={issue("bankName")}>
          {(id) => <Input id={id} value={form.bankName} onChange={(e) => set({ bankName: e.target.value })} />}
        </Field>
        <Field label="Account number" error={issue("bankAccount")}>
          {(id) => <Input id={id} value={form.bankAccount} onChange={(e) => set({ bankAccount: e.target.value })} />}
        </Field>
        <Field label="Account holder" error={issue("bankAccountHolder")}>
          {(id) => <Input id={id} value={form.bankAccountHolder} onChange={(e) => set({ bankAccountHolder: e.target.value })} />}
        </Field>
      </div>
      <Field label="Notes" error={issue("notes")}>
        {(id) => <Textarea id={id} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />}
      </Field>
      <ErrorNote error={create.error} />
      <div className="flex justify-end border-t border-line pt-4">
        <Button type="submit" variant="primary" disabled={create.isPending}>
          Register supplier
        </Button>
      </div>
    </form>
  );
}

/**
 * Edits an existing supplier (PATCH /suppliers/:id), including bank details and notes.
 */
export function SupplierEditForm({ supplier, onDone }: { supplier: Supplier; onDone: () => void }) {
  const [form, setForm] = useState({
    name: supplier.name,
    contactPerson: supplier.contactPerson ?? "",
    phone: supplier.phone,
    email: supplier.email ?? "",
    bankName: supplier.bankName ?? "",
    bankAccount: supplier.bankAccount ?? "",
    bankAccountHolder: supplier.bankAccountHolder ?? "",
    notes: supplier.notes ?? "",
  });
  const save = useTenantMutation((request, body: unknown) => request<Supplier>("PATCH", `/suppliers/${supplier.id}`, body));
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const issue = (path: string) => save.error?.issueFor(path);

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate(
          {
            name: form.name,
            phone: form.phone,
            contactPerson: form.contactPerson || null,
            email: form.email || null,
            bankName: form.bankName || null,
            bankAccount: form.bankAccount || null,
            bankAccountHolder: form.bankAccountHolder || null,
            notes: form.notes,
          },
          {
            onSuccess: () => {
              toast.success("Supplier updated");
              onDone();
            },
          },
        );
      }}
    >
      <Field label="Company / trade name" error={issue("name")}>
        {(id) => <Input id={id} required value={form.name} onChange={(e) => set({ name: e.target.value })} />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Contact person" error={issue("contactPerson")}>
          {(id) => <Input id={id} value={form.contactPerson} onChange={(e) => set({ contactPerson: e.target.value })} />}
        </Field>
        <Field label="Phone" error={issue("phone")}>
          {(id) => <Input id={id} required type="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />}
        </Field>
        <Field label="Email" error={issue("email")} className="col-span-2">
          {(id) => <Input id={id} type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />}
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 border border-line bg-paper p-3 sm:grid-cols-3">
        <Field label="Bank name" error={issue("bankName")}>
          {(id) => <Input id={id} value={form.bankName} onChange={(e) => set({ bankName: e.target.value })} />}
        </Field>
        <Field label="Account number" error={issue("bankAccount")}>
          {(id) => <Input id={id} value={form.bankAccount} onChange={(e) => set({ bankAccount: e.target.value })} />}
        </Field>
        <Field label="Account holder" error={issue("bankAccountHolder")}>
          {(id) => <Input id={id} value={form.bankAccountHolder} onChange={(e) => set({ bankAccountHolder: e.target.value })} />}
        </Field>
      </div>
      <Field label="Notes" error={issue("notes")}>
        {(id) => <Textarea id={id} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />}
      </Field>
      <ErrorNote error={save.error} />
      <div className="flex justify-end border-t border-line pt-4">
        <Button type="submit" variant="primary" disabled={save.isPending}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
