"use client";

import { useState } from "react";
import { toast } from "sonner";
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

/** Registers a renter (POST /renters) with their first identity document. The profile code comes from the backend. */
export function RenterForm({ onDone }: { onDone: (renter: Renter) => void }) {
  const { can, config } = useWorkspace();
  const canVerify = can("renters:documents:verify");
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
  const documentOptions = useDocumentOptions(form.residentType);
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
            fullName: form.fullName,
            phone: form.phone,
            ...(form.email ? { email: form.email } : {}),
            residentType: form.residentType,
            ...(form.country ? { country: form.country } : {}),
            ...(form.address ? { address: form.address } : {}),
            ...(form.emergencyName ? { emergencyContact: { name: form.emergencyName, phone: form.emergencyPhone || undefined, relation: form.emergencyRelation || undefined } } : {}),
            documents: form.documentNumber ? [{ type: documentType, number: form.documentNumber, verified: canVerify && form.verified }] : [],
            notes: form.notes,
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
      <Field label="Full legal name" error={issue("fullName")}>
        {(id) => <Input id={id} required value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone / WhatsApp" error={issue("phone")}>
          {(id) => <Input id={id} required type="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />}
        </Field>
        <Field label="Email" error={issue("email")}>
          {(id) => <Input id={id} type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />}
        </Field>
        <Field label="Renter type" error={issue("residentType")}>
          {(id) => (
            <Select id={id} value={form.residentType} onChange={(e) => set({ residentType: e.target.value as ResidentType, documentType: "" })}>
              <option value="local">Resident of {config.locale.country}</option>
              <option value="tourist">Tourist / visitor</option>
            </Select>
          )}
        </Field>
        <Field label="Country" error={issue("country")}>
          {(id) => <Input id={id} value={form.country} onChange={(e) => set({ country: e.target.value })} />}
        </Field>
      </div>
      <Field label={form.residentType === "tourist" ? "Hotel / local address" : "Home address"} error={issue("address")}>
        {(id) => <Input id={id} value={form.address} onChange={(e) => set({ address: e.target.value })} />}
      </Field>
      <div className="grid grid-cols-2 gap-3 border border-line bg-paper p-3">
        <Field label="Identity document" error={issue("documents[0].type")}>
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
      <div className="grid grid-cols-3 gap-3">
        <Field label="Emergency contact">{(id) => <Input id={id} value={form.emergencyName} onChange={(e) => set({ emergencyName: e.target.value })} />}</Field>
        <Field label="Their phone">{(id) => <Input id={id} type="tel" value={form.emergencyPhone} onChange={(e) => set({ emergencyPhone: e.target.value })} />}</Field>
        <Field label="Relationship">{(id) => <Input id={id} value={form.emergencyRelation} onChange={(e) => set({ emergencyRelation: e.target.value })} />}</Field>
      </div>
      <Field label="Notes">{(id) => <Textarea id={id} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />}</Field>
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
