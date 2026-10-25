"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CustomFieldInputs, customFieldsPayload, draftOf, useFields, withoutOff } from "@/components/ops/fields";
import { FUEL_LABELS, TRANSMISSION_LABELS } from "@/components/ops/status";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, numberOrUndefined } from "@/components/ui/field";
import { ErrorNote } from "@/components/ui/page";
import type { FuelType, Transmission, Vehicle } from "@/lib/contract";
import { useTenantMutation } from "@/lib/queries";
import { useWorkspace } from "@/lib/workspace";

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
    thumbnail: vehicle?.thumbnail ?? "",
    notes: vehicle?.notes ?? "",
  });
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
              thumbnail: form.thumbnail.trim() || null,
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
        <Field label={f("thumbnail").label} hint={f("thumbnail").help} error={issue("thumbnail")}>
          {(id) => <Input id={id} type="url" required={f("thumbnail").required} placeholder="https://…" value={form.thumbnail} onChange={(e) => set({ thumbnail: e.target.value })} />}
        </Field>
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
        <Button type="submit" variant="primary" disabled={save.isPending}>
          {vehicle ? "Save changes" : "Add vehicle"}
        </Button>
      </div>
    </form>
  );
}
