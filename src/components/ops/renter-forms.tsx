"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CustomFieldInputs, customFieldsPayload, draftOf, useFields, withoutOff } from "@/components/ops/fields";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { ErrorNote } from "@/components/ui/page";
import type { Renter, ResidentType } from "@/lib/contract";
import { useTenantMutation } from "@/lib/queries";
import { useWorkspace } from "@/lib/workspace";

/** Document types offered for a resident type: those it requires first, then the rest. */
function useDocumentOptions(residentType: ResidentType) {
  const { config } = useWorkspace();
  const active = config.lists.documentTypes.filter((d) => d.active);
  return [...active.filter((d) => d.requiredFor.includes(residentType)), ...active.filter((d) => !d.requiredFor.includes(residentType))];
}

/**
 * Registers a renter (POST /renters) with their first identity document. The
 * profile code comes from the backend. Labels, help text and which fields
 * show come from the config's `fields.renters`.
 */
export function RenterForm({ onDone }: { onDone: (renter: Renter) => void }) {
  const { can, config } = useWorkspace();
  const canVerify = can("renters:documents:verify");
  const { builtIn: f, custom: customFields } = useFields("renters");
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    residentType: "local" as ResidentType,
    country: "",
    address: "",
    emergencyName: "",
    emergencyPhone: "",
    emergencyRelation: "",
    documentType: "",
    documentNumber: "",
    verified: canVerify,
    notes: "",
  });
  const [custom, setCustom] = useState(() => draftOf(customFields));
  // With the renter type off, every renter is a resident.
  const residentType = f("residentType").on ? form.residentType : "local";
  const documentOptions = useDocumentOptions(residentType);
  const create = useTenantMutation((request, body: unknown) => request<Renter>("POST", "/renters", body));
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const issue = (path: string) => create.error?.issueFor(path);
  const documentType = form.documentType || documentOptions[0]?.key || "";

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate(
          {
            ...withoutOff(f, {
              fullName: form.fullName,
              phone: form.phone,
              ...(form.email ? { email: form.email } : {}),
              residentType: form.residentType,
              ...(form.country ? { country: form.country } : {}),
              ...(form.address ? { address: form.address } : {}),
              ...(form.emergencyName ? { emergencyContact: { name: form.emergencyName, phone: form.emergencyPhone || undefined, relation: form.emergencyRelation || undefined } } : {}),
              notes: form.notes,
            }),
            documents: form.documentNumber ? [{ type: documentType, number: form.documentNumber, verified: canVerify && form.verified }] : [],
            customFields: customFieldsPayload(customFields, custom),
          },
          {
            onSuccess: (renter) => {
              toast.success(`${renter.fullName} registered as ${renter.profileId}`);
              onDone(renter);
            },
          },
        );
      }}
    >
      <Field label={f("fullName").label} hint={f("fullName").help} error={issue("fullName")}>
        {(id) => <Input id={id} required value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={f("phone").label} hint={f("phone").help} error={issue("phone")}>
          {(id) => <Input id={id} required type="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />}
        </Field>
        {f("email").on && (
          <Field label={f("email").label} hint={f("email").help} error={issue("email")}>
            {(id) => <Input id={id} type="email" required={f("email").required} value={form.email} onChange={(e) => set({ email: e.target.value })} />}
          </Field>
        )}
        {f("residentType").on && (
          <Field label={f("residentType").label} hint={f("residentType").help} error={issue("residentType")}>
            {(id) => (
              <Select id={id} value={form.residentType} onChange={(e) => set({ residentType: e.target.value as ResidentType, documentType: "" })}>
                <option value="local">Resident of {config.locale.country}</option>
                <option value="tourist">Tourist / visitor</option>
              </Select>
            )}
          </Field>
        )}
        {f("country").on && (
          <Field label={f("country").label} hint={f("country").help} error={issue("country")}>
            {(id) => <Input id={id} required={f("country").required} value={form.country} onChange={(e) => set({ country: e.target.value })} />}
          </Field>
        )}
      </div>
      {f("address").on && (
        <Field label={f("address").label} hint={f("address").help ?? (residentType === "tourist" ? "Hotel or local address" : undefined)} error={issue("address")}>
          {(id) => <Input id={id} required={f("address").required} value={form.address} onChange={(e) => set({ address: e.target.value })} />}
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3 border border-line bg-paper p-3">
        <Field label={f("documents").label} hint={f("documents").help} error={issue("documents[0].type")}>
          {(id) => (
            <Select id={id} value={documentType} onChange={(e) => set({ documentType: e.target.value })}>
              {documentOptions.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Document number" error={issue("documents[0].number")}>
          {(id) => <Input id={id} value={form.documentNumber} onChange={(e) => set({ documentNumber: e.target.value })} />}
        </Field>
        {canVerify && (
          <div className="col-span-2">
            <Checkbox label="I've checked the original document" checked={form.verified} onChange={(verified) => set({ verified })} />
          </div>
        )}
      </div>
      {f("emergencyContact").on && (
        <div className="grid grid-cols-3 gap-3">
          <Field label={f("emergencyContact").label} hint={f("emergencyContact").help} error={issue("emergencyContact") ?? issue("emergencyContact.name")}>
            {(id) => <Input id={id} required={f("emergencyContact").required} value={form.emergencyName} onChange={(e) => set({ emergencyName: e.target.value })} />}
          </Field>
          <Field label="Their phone">{(id) => <Input id={id} type="tel" value={form.emergencyPhone} onChange={(e) => set({ emergencyPhone: e.target.value })} />}</Field>
          <Field label="Relationship">{(id) => <Input id={id} value={form.emergencyRelation} onChange={(e) => set({ emergencyRelation: e.target.value })} />}</Field>
        </div>
      )}
      {f("notes").on && (
        <Field label={f("notes").label} hint={f("notes").help} error={issue("notes")}>
          {(id) => <Textarea id={id} required={f("notes").required} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />}
        </Field>
      )}
      {customFields.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <CustomFieldInputs fields={customFields} draft={custom} onChange={setCustom} issue={issue} />
        </div>
      )}
      <ErrorNote error={create.error} />
      <div className="flex justify-end border-t border-line pt-4">
        <Button type="submit" variant="primary" disabled={create.isPending}>
          Register renter
        </Button>
      </div>
    </form>
  );
}

/** Adds a document to a renter's profile (POST /renters/:id/documents). */
export function AddDocumentForm({ renter }: { renter: Renter }) {
  const { can } = useWorkspace();
  const canVerify = can("renters:documents:verify");
  const options = useDocumentOptions(renter.residentType);
  const [form, setForm] = useState({ type: "", number: "", verified: canVerify });
  const add = useTenantMutation((request, body: unknown) => request<Renter>("POST", `/renters/${renter.id}/documents`, body));
  const type = form.type || options[0]?.key || "";

  return (
    <form
      className="grid gap-3 sm:grid-cols-3"
      onSubmit={(event) => {
        event.preventDefault();
        add.mutate(
          { type, number: form.number, verified: canVerify && form.verified },
          {
            onSuccess: () => {
              toast.success("Document added");
              setForm({ type: "", number: "", verified: canVerify });
            },
          },
        );
      }}
    >
      <Field label="Document" error={add.error?.issueFor("type")}>
        {(id) => (
          <Select id={id} value={type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {options.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Number" error={add.error?.issueFor("number")}>
        {(id) => <Input id={id} required value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />}
      </Field>
      <div className="flex flex-col justify-end gap-2">
        {canVerify && <Checkbox label="Checked the original" checked={form.verified} onChange={(verified) => setForm({ ...form, verified })} />}
        <Button type="submit" variant="dark" disabled={add.isPending}>
          Add document
        </Button>
      </div>
      <ErrorNote error={add.error} className="sm:col-span-3" />
    </form>
  );
}
