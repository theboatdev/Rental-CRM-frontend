"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, numberOrUndefined } from "@/components/ui/field";
import { ErrorNote } from "@/components/ui/page";
import type { Cost, FuelLog, VehicleRef } from "@/lib/contract";
import { useTenantMutation, useVehicles } from "@/lib/queries";
import { useWorkspace } from "@/lib/workspace";

/** A fixed vehicle, or a picker when the form isn't inside a vehicle's dossier. */
function VehiclePicker({ vehicle, value, onChange, error }: { vehicle?: VehicleRef; value: string; onChange: (id: string) => void; error?: string }) {
  const vehicles = useVehicles();
  if (vehicle) return null;
  return (
    <Field label="Vehicle" error={error} className="sm:col-span-full">
      {(id) => (
        <Select id={id} required value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choose a vehicle…</option>
          {vehicles.data?.map((v) => (
            <option key={v.id} value={v.id}>
              {v.plateNumber} — {v.make} {v.model}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

/** Logs a service bill or other operating cost (POST /costs), categories from the config's `lists.costCategories`. */
export function CostForm({ vehicle, onDone }: { vehicle?: VehicleRef; onDone?: (cost: Cost) => void }) {
  const { config, options, today } = useWorkspace();
  const [form, setForm] = useState({
    vehicleId: vehicle?.id ?? "",
    category: options("costCategories")[0]?.key ?? "",
    title: "",
    amount: "",
    incurredAt: today(),
    serviceCenter: "",
    invoiceNumber: "",
    odometer: "",
  });
  const log = useTenantMutation((request, body: unknown) => request<Cost>("POST", "/costs", body));
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const issue = (path: string) => log.error?.issueFor(path);

  return (
    <form
      className="grid gap-3 sm:grid-cols-3"
      onSubmit={(event) => {
        event.preventDefault();
        log.mutate(
          {
            vehicleId: form.vehicleId,
            category: form.category,
            title: form.title,
            amount: numberOrUndefined(form.amount),
            incurredAt: form.incurredAt,
            ...(form.serviceCenter ? { serviceCenter: form.serviceCenter } : {}),
            ...(form.invoiceNumber ? { invoiceNumber: form.invoiceNumber } : {}),
            ...(form.odometer ? { odometer: numberOrUndefined(form.odometer) } : {}),
          },
          {
            onSuccess: (cost) => {
              toast.success(`Cost logged for ${cost.vehicle.plateNumber}`);
              setForm((current) => ({ ...current, title: "", amount: "", invoiceNumber: "", odometer: "" }));
              onDone?.(cost);
            },
          },
        );
      }}
    >
      <VehiclePicker vehicle={vehicle} value={form.vehicleId} onChange={(vehicleId) => set({ vehicleId })} error={issue("vehicleId")} />
      <Field label="What was done" error={issue("title")} className="sm:col-span-2">
        {(id) => <Input id={id} required placeholder="Engine oil, filter & brake pads" value={form.title} onChange={(e) => set({ title: e.target.value })} />}
      </Field>
      <Field label="Category" error={issue("category")}>
        {(id) => (
          <Select id={id} value={form.category} onChange={(e) => set({ category: e.target.value })}>
            {options("costCategories").map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={`Cost (${config.locale.currency})`} error={issue("amount")}>
        {(id) => <Input id={id} type="number" required min="0" step="any" value={form.amount} onChange={(e) => set({ amount: e.target.value })} />}
      </Field>
      <Field label="Date" error={issue("incurredAt")}>
        {(id) => <Input id={id} type="date" required max={today()} value={form.incurredAt} onChange={(e) => set({ incurredAt: e.target.value })} />}
      </Field>
      <Field label={`Odometer (${config.locale.distanceUnit})`} error={issue("odometer")}>
        {(id) => <Input id={id} type="number" min="0" value={form.odometer} onChange={(e) => set({ odometer: e.target.value })} />}
      </Field>
      <Field label="Workshop / supplier" error={issue("serviceCenter")}>
        {(id) => <Input id={id} value={form.serviceCenter} onChange={(e) => set({ serviceCenter: e.target.value })} />}
      </Field>
      <Field label="Invoice number" error={issue("invoiceNumber")}>
        {(id) => <Input id={id} value={form.invoiceNumber} onChange={(e) => set({ invoiceNumber: e.target.value })} />}
      </Field>
      <ErrorNote error={log.error} className="sm:col-span-3" />
      <div className="flex justify-end sm:col-span-3">
        <Button type="submit" variant="primary" disabled={log.isPending}>
          Log cost
        </Button>
      </div>
    </form>
  );
}

/** Logs a fuel fill-up (POST /fuel-logs). The price per liter or the total is enough; the backend works out the other. */
export function FuelForm({ vehicle, onDone }: { vehicle?: VehicleRef; onDone?: (log: FuelLog) => void }) {
  const { config, format, today } = useWorkspace();
  const [form, setForm] = useState({ vehicleId: vehicle?.id ?? "", liters: "", pricePerLiter: "", totalCost: "", station: "", odometer: "", filledAt: today() });
  const log = useTenantMutation((request, body: unknown) => request<FuelLog>("POST", "/fuel-logs", body));
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const issue = (path: string) => log.error?.issueFor(path);
  const liters = Number(form.liters) || 0;
  const estimate = form.totalCost ? Number(form.totalCost) : liters * (Number(form.pricePerLiter) || 0);

  return (
    <form
      className="grid gap-3 sm:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();
        log.mutate(
          {
            vehicleId: form.vehicleId,
            liters: numberOrUndefined(form.liters),
            ...(form.pricePerLiter ? { pricePerLiter: numberOrUndefined(form.pricePerLiter) } : {}),
            ...(form.totalCost ? { totalCost: numberOrUndefined(form.totalCost) } : {}),
            ...(form.station ? { station: form.station } : {}),
            ...(form.odometer ? { odometer: numberOrUndefined(form.odometer) } : {}),
            filledAt: form.filledAt,
          },
          {
            onSuccess: (saved) => {
              toast.success(`${saved.liters} L logged for ${saved.vehicle.plateNumber}`);
              setForm((current) => ({ ...current, liters: "", totalCost: "", odometer: "" }));
              onDone?.(saved);
            },
          },
        );
      }}
    >
      <VehiclePicker vehicle={vehicle} value={form.vehicleId} onChange={(vehicleId) => set({ vehicleId })} error={issue("vehicleId")} />
      <Field label="Liters" error={issue("liters")}>
        {(id) => <Input id={id} type="number" required min="0" step="0.1" value={form.liters} onChange={(e) => set({ liters: e.target.value })} />}
      </Field>
      <Field label={`Price / liter (${config.locale.currency})`} error={issue("pricePerLiter")}>
        {(id) => <Input id={id} type="number" min="0" step="any" value={form.pricePerLiter} onChange={(e) => set({ pricePerLiter: e.target.value })} />}
      </Field>
      <Field label={`Or total (${config.locale.currency})`} error={issue("totalCost")}>
        {(id) => <Input id={id} type="number" min="0" step="any" value={form.totalCost} onChange={(e) => set({ totalCost: e.target.value })} />}
      </Field>
      <Field label="Date" error={issue("filledAt")}>
        {(id) => <Input id={id} type="date" required max={today()} value={form.filledAt} onChange={(e) => set({ filledAt: e.target.value })} />}
      </Field>
      <Field label="Station" error={issue("station")} className="sm:col-span-2">
        {(id) => <Input id={id} value={form.station} onChange={(e) => set({ station: e.target.value })} />}
      </Field>
      <Field label={`Odometer (${config.locale.distanceUnit})`} error={issue("odometer")}>
        {(id) => <Input id={id} type="number" min="0" value={form.odometer} onChange={(e) => set({ odometer: e.target.value })} />}
      </Field>
      <div className="flex items-end justify-between gap-2 sm:col-span-4">
        <span className="font-bold text-ink">Total: {format.money(estimate)}</span>
        <Button type="submit" variant="dark" disabled={log.isPending}>
          Log fill-up
        </Button>
      </div>
      <ErrorNote error={log.error} className="sm:col-span-4" />
    </form>
  );
}
