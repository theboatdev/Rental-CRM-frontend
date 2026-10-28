"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CustomFieldInputs, customFieldsPayload, draftOf, useFields, withoutOff } from "@/components/ops/fields";
import { FilePicker, useUploadsInFlight } from "@/components/ops/files";
import { FUEL_LABELS, TRANSMISSION_LABELS } from "@/components/ops/status";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, numberOrUndefined } from "@/components/ui/field";
import { ErrorNote } from "@/components/ui/page";
import type { FuelType, Transmission, UploadedFile, Vehicle } from "@/lib/contract";
import { useTenantMutation } from "@/lib/queries";
import { PHOTO_ACCEPT, useFileUpload } from "@/lib/uploads";
import { useWorkspace } from "@/lib/workspace";

/**
 * The vehicle's photo: the saved one, which can be removed, and a picker
 * that uploads a new one. `value` is undefined to keep the saved photo, null
 * to remove it, or the new upload.
 */
function PhotoInput({
  label,
  required,
  hint,
  error,
  saved,
  value,
  onChange,
  onBusy,
}: {
  label: string;
  required: boolean;
  hint?: string;
  error?: string;
  saved: string | null;
  value: UploadedFile | null | undefined;
  onChange: (value: UploadedFile | null | undefined) => void;
  onBusy: (busy: boolean) => void;
}) {
  const upload = useFileUpload("vehiclePhoto");
  const showSaved = Boolean(saved) && value === undefined;
  return (
    <div>
      <p className="mb-1.5 block text-xs font-medium text-ink">
        {label}
        {required && <span className="text-rose-700"> *</span>}
      </p>
      {showSaved && (
        <div className="mb-2 flex items-center gap-3">
          {/* A Cloudinary link, or an https URL typed in before photo uploads, so it isn't routed through next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={saved!} alt="" className="h-16 w-24 shrink-0 rounded border border-line object-cover" />
          <button type="button" onClick={() => onChange(null)} className="flex items-center gap-0.5 text-xs font-semibold text-muted hover:text-ink">
            <X size={12} /> Remove photo
          </button>
        </div>
      )}
      {saved && value === null && (
        <p className="mb-2 text-xs text-muted">
          The photo is removed when you save.{" "}
          <button type="button" onClick={() => onChange(undefined)} className="font-semibold text-ink underline">
            Keep it
          </button>
        </p>
      )}
      <FilePicker
        compact
        photo
        camera={false}
        label={showSaved ? "Replace photo" : "Choose a photo"}
        upload={upload}
        value={value ?? null}
        // Removing a new upload goes back to the saved photo.
        onChange={(file) => onChange(file ?? undefined)}
        onBusy={onBusy}
        accept={PHOTO_ACCEPT}
        hint={hint ?? "Shown in the fleet list and on the booking page."}
        error={error}
      />
    </div>
  );
}

/**
 * Adds a vehicle (POST /vehicles) or edits one (PATCH /vehicles/:id). Status
 * changes live in the dossier. Labels, help text and which fields show come
 * from the config's `fields.vehicles`.
 */
export function VehicleForm({ vehicle, onDone }: { vehicle?: Vehicle; onDone: (saved: Vehicle) => void }) {
  const { config } = useWorkspace();
  const { currency, secondaryCurrency, distanceUnit } = config.locale;
  const { builtIn: f, custom: customFields } = useFields("vehicles");
  const [form, setForm] = useState({
    plateNumber: vehicle?.plateNumber ?? "",
    make: vehicle?.make ?? "",
    model: vehicle?.model ?? "",
    year: vehicle ? (vehicle.year !== null ? String(vehicle.year) : "") : String(new Date().getFullYear()),
    transmission: vehicle?.transmission ?? ("AUTOMATIC" as Transmission),
    fuelType: vehicle?.fuelType ?? ("PETROL" as FuelType),
    dailyRate: vehicle ? String(vehicle.dailyRate) : "",
    secondaryDailyRate: vehicle?.secondaryDailyRate ? String(vehicle.secondaryDailyRate) : "",
    depositAmount: vehicle ? String(vehicle.depositAmount) : "",
    mileage: vehicle ? String(vehicle.mileage) : "",
    notes: vehicle?.notes ?? "",
  });
  const [savedPhoto, setSavedPhoto] = useState(vehicle?.thumbnail ?? null);
  const [photo, setPhoto] = useState<UploadedFile | null | undefined>(undefined);
  const { uploading, onBusy } = useUploadsInFlight();
  const [initialCustom, setInitialCustom] = useState(() => draftOf(customFields, vehicle?.customFields));
  const [custom, setCustom] = useState(initialCustom);
  const save = useTenantMutation((request, body: unknown) =>
    vehicle ? request<Vehicle>("PATCH", `/vehicles/${vehicle.id}`, body) : request<Vehicle>("POST", "/vehicles", body),
  );
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const issue = (path: string) => save.error?.issueFor(path);
  const showSecondary = Boolean(secondaryCurrency) && f("secondaryDailyRate").on;

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate(
          {
            ...withoutOff(f, {
              plateNumber: form.plateNumber,
              make: form.make,
              model: form.model,
              year: numberOrUndefined(form.year),
              transmission: form.transmission,
              fuelType: form.fuelType,
              dailyRate: numberOrUndefined(form.dailyRate),
              ...(form.depositAmount !== "" ? { depositAmount: numberOrUndefined(form.depositAmount) } : {}),
              ...(form.mileage !== "" ? { mileage: numberOrUndefined(form.mileage) } : {}),
              ...(photo !== undefined ? { thumbnail: photo } : {}),
              notes: form.notes,
            }),
            ...(showSecondary ? { secondaryDailyRate: numberOrUndefined(form.secondaryDailyRate) ?? null } : {}),
            customFields: customFieldsPayload(customFields, custom, vehicle ? initialCustom : undefined),
          },
          {
            onSuccess: (saved) => {
              toast.success(vehicle ? `${saved.plateNumber} updated` : `${saved.plateNumber} added to the fleet`);
              // The form stays open in the dossier, so later edits compare against what was saved.
              setInitialCustom(draftOf(customFields, saved.customFields));
              setSavedPhoto(saved.thumbnail);
              setPhoto(undefined);
              onDone(saved);
            },
          },
        );
      }}
    >
      <Field label={f("plateNumber").label} hint={f("plateNumber").help} error={issue("plateNumber")}>
        {(id) => <Input id={id} required placeholder="WP CBA-7821" value={form.plateNumber} onChange={(e) => set({ plateNumber: e.target.value.toUpperCase() })} />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={f("make").label} hint={f("make").help} error={issue("make")}>
          {(id) => <Input id={id} required placeholder="Toyota" value={form.make} onChange={(e) => set({ make: e.target.value })} />}
        </Field>
        <Field label={f("model").label} hint={f("model").help} error={issue("model")}>
          {(id) => <Input id={id} required placeholder="Raize" value={form.model} onChange={(e) => set({ model: e.target.value })} />}
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {f("year").on && (
          <Field label={f("year").label} hint={f("year").help} error={issue("year")}>
            {(id) => <Input id={id} type="number" required={f("year").required} min="1950" max="2100" value={form.year} onChange={(e) => set({ year: e.target.value })} />}
          </Field>
        )}
        {f("transmission").on && (
          <Field label={f("transmission").label} hint={f("transmission").help} error={issue("transmission")}>
            {(id) => (
              <Select id={id} value={form.transmission} onChange={(e) => set({ transmission: e.target.value as Transmission })}>
                {Object.entries(TRANSMISSION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        {f("fuelType").on && (
          <Field label={f("fuelType").label} hint={f("fuelType").help} error={issue("fuelType")}>
            {(id) => (
              <Select id={id} value={form.fuelType} onChange={(e) => set({ fuelType: e.target.value as FuelType })}>
                {Object.entries(FUEL_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`${f("dailyRate").label} (${currency})`} hint={f("dailyRate").help} error={issue("dailyRate")}>
          {(id) => <Input id={id} type="number" required min="1" step="any" value={form.dailyRate} onChange={(e) => set({ dailyRate: e.target.value })} />}
        </Field>
        {showSecondary && (
          <Field label={`${f("secondaryDailyRate").label} (${secondaryCurrency})`} hint={f("secondaryDailyRate").help ?? "Quoted to tourists"} error={issue("secondaryDailyRate")}>
            {(id) => (
              <Input id={id} type="number" required={f("secondaryDailyRate").required} min="1" step="any" value={form.secondaryDailyRate} onChange={(e) => set({ secondaryDailyRate: e.target.value })} />
            )}
          </Field>
        )}
        {f("depositAmount").on && (
          <Field
            label={`${f("depositAmount").label} (${currency})`}
            hint={f("depositAmount").help ?? (vehicle ? undefined : `Defaults to ${config.rules.defaultDepositAmount}`)}
            error={issue("depositAmount")}
          >
            {(id) => <Input id={id} type="number" required={f("depositAmount").required} min="0" step="any" value={form.depositAmount} onChange={(e) => set({ depositAmount: e.target.value })} />}
          </Field>
        )}
        {f("mileage").on && (
          <Field label={`${f("mileage").label} (${distanceUnit})`} hint={f("mileage").help} error={issue("mileage")}>
            {(id) => <Input id={id} type="number" required={f("mileage").required} min="0" value={form.mileage} onChange={(e) => set({ mileage: e.target.value })} />}
          </Field>
        )}
      </div>
      {f("thumbnail").on && (
        <PhotoInput
          label={f("thumbnail").label}
          required={f("thumbnail").required}
          hint={f("thumbnail").help}
          error={issue("thumbnail")}
          saved={savedPhoto}
          value={photo}
          onChange={setPhoto}
          onBusy={onBusy}
        />
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
      <ErrorNote error={save.error} />
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="submit" variant="primary" disabled={save.isPending || uploading}>
          {uploading ? "Uploading…" : vehicle ? "Save changes" : "Add vehicle"}
        </Button>
      </div>
    </form>
  );
}
