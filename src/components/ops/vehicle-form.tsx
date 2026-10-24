"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FUEL_LABELS, TRANSMISSION_LABELS } from "@/components/ops/status";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, numberOrUndefined } from "@/components/ui/field";
import { ErrorNote } from "@/components/ui/page";
import type { FuelType, Transmission, Vehicle } from "@/lib/contract";
import { useTenantMutation } from "@/lib/queries";
import { useWorkspace } from "@/lib/workspace";

/** Adds a vehicle (POST /vehicles) or edits one (PATCH /vehicles/:id). Status changes live in the dossier. */
export function VehicleForm({ vehicle, onDone }: { vehicle?: Vehicle; onDone: (saved: Vehicle) => void }) {
  const { config } = useWorkspace();
  const { currency, secondaryCurrency, distanceUnit } = config.locale;
  const [form, setForm] = useState({
    plateNumber: vehicle?.plateNumber ?? "",
    make: vehicle?.make ?? "",
    model: vehicle?.model ?? "",
    year: String(vehicle?.year ?? new Date().getFullYear()),
    transmission: vehicle?.transmission ?? ("AUTOMATIC" as Transmission),
    fuelType: vehicle?.fuelType ?? ("PETROL" as FuelType),
    dailyRate: vehicle ? String(vehicle.dailyRate) : "",
    secondaryDailyRate: vehicle?.secondaryDailyRate ? String(vehicle.secondaryDailyRate) : "",
    depositAmount: vehicle ? String(vehicle.depositAmount) : "",
    mileage: vehicle ? String(vehicle.mileage) : "",
    thumbnail: vehicle?.thumbnail ?? "",
    notes: vehicle?.notes ?? "",
  });
  const save = useTenantMutation((request, body: unknown) =>
    vehicle ? request<Vehicle>("PATCH", `/vehicles/${vehicle.id}`, body) : request<Vehicle>("POST", "/vehicles", body),
  );
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const issue = (path: string) => save.error?.issueFor(path);

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate(
          {
            plateNumber: form.plateNumber,
            make: form.make,
            model: form.model,
            year: numberOrUndefined(form.year),
            transmission: form.transmission,
            fuelType: form.fuelType,
            dailyRate: numberOrUndefined(form.dailyRate),
            ...(secondaryCurrency ? { secondaryDailyRate: numberOrUndefined(form.secondaryDailyRate) ?? null } : {}),
            ...(form.depositAmount !== "" ? { depositAmount: numberOrUndefined(form.depositAmount) } : {}),
            ...(form.mileage !== "" ? { mileage: numberOrUndefined(form.mileage) } : {}),
            thumbnail: form.thumbnail.trim() || null,
            notes: form.notes,
          },
          {
            onSuccess: (saved) => {
              toast.success(vehicle ? `${saved.plateNumber} updated` : `${saved.plateNumber} added to the fleet`);
              onDone(saved);
            },
          },
        );
      }}
    >
      <Field label="Registration plate" error={issue("plateNumber")}>
        {(id) => <Input id={id} required placeholder="WP CBA-7821" value={form.plateNumber} onChange={(e) => set({ plateNumber: e.target.value.toUpperCase() })} />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Make" error={issue("make")}>
          {(id) => <Input id={id} required placeholder="Toyota" value={form.make} onChange={(e) => set({ make: e.target.value })} />}
        </Field>
        <Field label="Model" error={issue("model")}>
          {(id) => <Input id={id} required placeholder="Raize" value={form.model} onChange={(e) => set({ model: e.target.value })} />}
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Year" error={issue("year")}>
          {(id) => <Input id={id} type="number" required min="1950" max="2100" value={form.year} onChange={(e) => set({ year: e.target.value })} />}
        </Field>
        <Field label="Transmission" error={issue("transmission")}>
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
        <Field label="Fuel" error={issue("fuelType")}>
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
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Daily rate (${currency})`} error={issue("dailyRate")}>
          {(id) => <Input id={id} type="number" required min="1" step="any" value={form.dailyRate} onChange={(e) => set({ dailyRate: e.target.value })} />}
        </Field>
        {secondaryCurrency && (
          <Field label={`Daily rate (${secondaryCurrency})`} hint="Quoted to tourists" error={issue("secondaryDailyRate")}>
            {(id) => <Input id={id} type="number" min="1" step="any" value={form.secondaryDailyRate} onChange={(e) => set({ secondaryDailyRate: e.target.value })} />}
          </Field>
        )}
        <Field label={`Security deposit (${currency})`} hint={vehicle ? undefined : `Defaults to ${config.rules.defaultDepositAmount}`} error={issue("depositAmount")}>
          {(id) => <Input id={id} type="number" min="0" step="any" value={form.depositAmount} onChange={(e) => set({ depositAmount: e.target.value })} />}
        </Field>
        <Field label={`Odometer (${distanceUnit})`} error={issue("mileage")}>
          {(id) => <Input id={id} type="number" min="0" value={form.mileage} onChange={(e) => set({ mileage: e.target.value })} />}
        </Field>
      </div>
      <Field label="Photo URL (https)" error={issue("thumbnail")}>
        {(id) => <Input id={id} type="url" placeholder="https://…" value={form.thumbnail} onChange={(e) => set({ thumbnail: e.target.value })} />}
      </Field>
      <Field label="Notes" error={issue("notes")}>
        {(id) => <Textarea id={id} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />}
      </Field>
      <ErrorNote error={save.error} />
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="submit" variant="primary" disabled={save.isPending}>
          {vehicle ? "Save changes" : "Add vehicle"}
        </Button>
      </div>
    </form>
  );
}
