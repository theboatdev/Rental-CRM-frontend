"use client";

import { Fuel, Settings, Users, Wrench } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CostForm, FuelForm } from "@/components/ops/cost-forms";
import { CustomFieldList, useFields, useHasCustomValues } from "@/components/ops/fields";
import { FUEL_LABELS, RentalStatusBadge, TRANSMISSION_LABELS, VehicleStatusBadge } from "@/components/ops/status";
import { VehicleForm } from "@/components/ops/vehicle-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, ErrorNote, Loading, table } from "@/components/ui/page";
import type { Vehicle, VehicleDossier } from "@/lib/contract";
import { useTenantMutation, useVehicle } from "@/lib/queries";
import { useWorkspace } from "@/lib/workspace";

type Tab = "rentals" | "service" | "fuel" | "manage";

/** A vehicle's dossier: key figures, rental history, service costs, fuel, and (with permission) its settings. */
export function VehicleDossierDialog({ vehicleId, onClose }: { vehicleId: string; onClose: () => void }) {
  const { data, error, isPending } = useVehicle(vehicleId);
  const { builtIn: f } = useFields("vehicles");
  const year = data && f("year").on && data.year !== null ? ` (${data.year})` : "";
  return (
    <Dialog open onClose={onClose} title={data ? `${data.make} ${data.model}${year}` : "Vehicle"} eyebrow={data ? `Vehicle dossier // ${data.plateNumber}` : "Vehicle dossier"} width="lg">
      {isPending && <Loading />}
      <ErrorNote error={error} />
      {data && <Dossier vehicle={data} onClose={onClose} />}
    </Dialog>
  );
}

function Dossier({ vehicle, onClose }: { vehicle: VehicleDossier; onClose: () => void }) {
  const { can, format } = useWorkspace();
  const canManage = can("vehicles:update") || can("vehicles:delete");
  const tabs: Array<{ key: Tab; label: string; icon: ReactNode; show: boolean }> = [
    { key: "rentals", label: `Rentals (${vehicle.rentals?.length ?? 0})`, icon: <Users size={14} />, show: vehicle.rentals !== null },
    { key: "service", label: `Service (${vehicle.costs?.length ?? 0})`, icon: <Wrench size={14} />, show: vehicle.costs !== null },
    { key: "fuel", label: `Fuel (${vehicle.fuelLogs?.length ?? 0})`, icon: <Fuel size={14} />, show: vehicle.fuelLogs !== null },
    { key: "manage", label: "Manage", icon: <Settings size={14} />, show: canManage },
  ];
  const visible = tabs.filter((t) => t.show);
  const [tab, setTab] = useState<Tab | undefined>(visible[0]?.key);
  const { builtIn: f } = useFields("vehicles");
  const hasCustomValues = useHasCustomValues("vehicles", vehicle.customFields);
  const secondary = f("secondaryDailyRate").on && vehicle.secondaryDailyRate !== null ? format.secondaryMoney(vehicle.secondaryDailyRate) : null;
  const details: Array<[string, string]> = [
    ...(f("transmission").on ? [[f("transmission").label, TRANSMISSION_LABELS[vehicle.transmission]] as [string, string]] : []),
    ...(f("fuelType").on ? [[f("fuelType").label, FUEL_LABELS[vehicle.fuelType]] as [string, string]] : []),
    ...(secondary ? [[f("secondaryDailyRate").label, `${secondary}/day`] as [string, string]] : []),
    ...(f("notes").on && vehicle.notes ? [[f("notes").label, vehicle.notes] as [string, string]] : []),
  ];
  const { stats } = vehicle;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <VehicleStatusBadge status={vehicle.status} />
        <span className="text-muted">
          {format.money(vehicle.dailyRate)}/day
          {f("depositAmount").on && ` · ${f("depositAmount").label.toLowerCase()} ${format.money(vehicle.depositAmount)}`}
        </span>
      </div>

      {(details.length > 0 || hasCustomValues) && (
        <dl className="grid gap-x-6 gap-y-2 border border-line bg-paper p-4 sm:grid-cols-3">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold tracking-normal text-muted">{label}</dt>
              <dd className="whitespace-pre-line text-ink">{value}</dd>
            </div>
          ))}
          <CustomFieldList section="vehicles" values={vehicle.customFields} />
        </dl>
      )}

      <div className="grid grid-cols-2 gap-3 border border-line bg-[#F8F8F9] p-4 text-center sm:grid-cols-5">
        <Metric label="Renters" value={`${stats.renters}`} note={`${stats.trips} rentals`} />
        <Metric label="Odometer" value={format.distance(vehicle.mileage)} note={`${format.distance(stats.distance)} by renters`} />
        {stats.serviceCosts !== undefined && <Metric label="Service costs" value={format.money(stats.serviceCosts)} tone="rose" />}
        {stats.fuelCosts !== undefined && <Metric label="Fuel" value={`${format.number(stats.fuelLiters ?? 0)} L`} note={format.money(stats.fuelCosts)} tone="amber" />}
        {stats.profit !== undefined && <Metric label="Net profit" value={format.money(stats.profit)} note={stats.revenue !== undefined ? `on ${format.money(stats.revenue)}` : undefined} tone={stats.profit >= 0 ? "green" : "rose"} />}
      </div>

      <div className="flex flex-wrap border-b border-line text-xs font-semibold tracking-normal">
        {visible.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 transition-colors ${tab === t.key ? "border-brand bg-brand/5 text-brand" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "rentals" && vehicle.rentals && <RentalHistory vehicle={vehicle} />}
      {tab === "service" && vehicle.costs && <ServiceHistory vehicle={vehicle} />}
      {tab === "fuel" && vehicle.fuelLogs && <FuelHistory vehicle={vehicle} />}
      {tab === "manage" && <Manage vehicle={vehicle} onDeleted={onClose} />}
    </div>
  );
}

function RentalHistory({ vehicle }: { vehicle: VehicleDossier }) {
  const { format } = useWorkspace();
  const rentals = vehicle.rentals ?? [];
  if (rentals.length === 0) return <EmptyState>No rentals yet for {vehicle.plateNumber}.</EmptyState>;
  return (
    <div className={`border border-ink/15 ${table.wrap}`}>
      <table className={table.table}>
        <thead className={table.head}>
          <tr>
            <th className={table.th}>Contract</th>
            <th className={table.th}>Renter</th>
            <th className={table.th}>Dates</th>
            <th className={`${table.th} text-right`}>Pickup</th>
            <th className={`${table.th} text-right`}>Return</th>
            <th className={`${table.th} text-right`}>Driven</th>
            <th className={`${table.th} text-center`}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rentals.map((r) => (
            <tr key={r.id} className={table.row}>
              <td className={`${table.td} font-semibold`}>{r.code}</td>
              <td className={table.td}>
                <div className="font-semibold">{r.renter.fullName}</div>
                <div className="text-xs text-brand">
                  {r.renter.profileId} · {r.renter.phone}
                </div>
              </td>
              <td className={table.td}>
                {format.day(r.startDate)} → {format.day(r.endDate)}
              </td>
              <td className={`${table.td} text-right`}>{r.startMileage !== null ? format.distance(r.startMileage) : "—"}</td>
              <td className={`${table.td} text-right`}>{r.endMileage !== null ? format.distance(r.endMileage) : "On the road"}</td>
              <td className={`${table.td} text-right font-semibold text-emerald-700`}>{r.distance !== null ? `+${format.distance(r.distance)}` : "—"}</td>
              <td className={`${table.td} text-center`}>
                <RentalStatusBadge rental={r} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ServiceHistory({ vehicle }: { vehicle: VehicleDossier }) {
  const { can, format, label } = useWorkspace();
  const { builtIn: f } = useFields("costs");
  return (
    <div className="space-y-4">
      {can("costs:create") && (
        <div className="border border-brand/30 bg-brand/5 p-4">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-normal text-brand">
            <Wrench size={13} /> Log a service or cost for {vehicle.plateNumber}
          </p>
          <CostForm vehicle={vehicle} />
        </div>
      )}
      {(vehicle.costs ?? []).length === 0 ? (
        <EmptyState>No costs logged yet for {vehicle.plateNumber}.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {vehicle.costs?.map((c) => (
            <li key={c.id} className="flex flex-col justify-between gap-2 border border-line p-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold text-ink">{c.title}</p>
                <p className="text-xs text-muted">
                  {format.day(c.incurredAt)} · {label("costCategories", c.category)}
                  {f("serviceCenter").on && c.serviceCenter ? ` · ${c.serviceCenter}` : ""}
                  {f("odometer").on && c.odometer !== null ? ` · ${format.distance(c.odometer)}` : ""}
                </p>
              </div>
              <p className="text-sm font-semibold text-rose-700">{format.money(c.amount)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FuelHistory({ vehicle }: { vehicle: VehicleDossier }) {
  const { can, format } = useWorkspace();
  const logs = vehicle.fuelLogs ?? [];
  return (
    <div className="space-y-4">
      {can("fuel:create") && (
        <div className="border border-amber-300 bg-amber-50/40 p-4">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-normal text-amber-900">
            <Fuel size={13} /> Log a fill-up for {vehicle.plateNumber}
          </p>
          <FuelForm vehicle={vehicle} />
        </div>
      )}
      {logs.length === 0 ? (
        <EmptyState>No fill-ups logged yet for {vehicle.plateNumber}.</EmptyState>
      ) : (
        <div className={`border border-ink/15 ${table.wrap}`}>
          <table className={table.table}>
            <thead className={table.head}>
              <tr>
                <th className={table.th}>Date</th>
                <th className={table.th}>Station</th>
                <th className={`${table.th} text-right`}>Liters</th>
                <th className={`${table.th} text-right`}>Price / L</th>
                <th className={`${table.th} text-right`}>Total</th>
                <th className={`${table.th} text-right`}>Odometer</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((f) => (
                <tr key={f.id} className={table.row}>
                  <td className={`${table.td} font-semibold`}>{format.day(f.filledAt)}</td>
                  <td className={table.td}>{f.station ?? "—"}</td>
                  <td className={`${table.td} text-right font-semibold text-amber-700`}>{format.number(f.liters)} L</td>
                  <td className={`${table.td} text-right`}>{f.pricePerLiter !== null ? format.money(f.pricePerLiter) : "—"}</td>
                  <td className={`${table.td} text-right font-semibold`}>{format.money(f.totalCost)}</td>
                  <td className={`${table.td} text-right`}>{f.odometer !== null ? format.distance(f.odometer) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Manage({ vehicle, onDeleted }: { vehicle: Vehicle; onDeleted: () => void }) {
  const { can } = useWorkspace();
  const setStatus = useTenantMutation((request, status: "AVAILABLE" | "MAINTENANCE") => request<Vehicle>("PATCH", `/vehicles/${vehicle.id}`, { status }));
  const remove = useTenantMutation((request) => request<{ deleted: boolean }>("DELETE", `/vehicles/${vehicle.id}`));

  return (
    <div className="space-y-5">
      {can("vehicles:update") && vehicle.status !== "RENTED" && (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-line p-4">
          <p>{vehicle.status === "MAINTENANCE" ? "In maintenance: it can't be booked or handed over." : "Available for bookings."}</p>
          <Button
            variant={vehicle.status === "MAINTENANCE" ? "success" : "outline"}
            disabled={setStatus.isPending}
            onClick={() =>
              setStatus.mutate(vehicle.status === "MAINTENANCE" ? "AVAILABLE" : "MAINTENANCE", {
                onSuccess: (saved) => toast.success(`${saved.plateNumber} is ${saved.status === "MAINTENANCE" ? "in maintenance" : "available"}`),
              })
            }
          >
            {vehicle.status === "MAINTENANCE" ? "Back in service" : "Send to maintenance"}
          </Button>
        </div>
      )}
      <ErrorNote error={setStatus.error} />
      {can("vehicles:update") && <VehicleForm vehicle={vehicle} onDone={() => undefined} />}
      {can("vehicles:delete") && (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-rose-200 p-4">
          <p className="text-rose-800">Only a vehicle without rentals, costs or fuel logs can be deleted.</p>
          <Button
            variant="danger"
            disabled={remove.isPending}
            onClick={() => {
              if (!confirm(`Delete ${vehicle.plateNumber}?`)) return;
              remove.mutate(undefined, {
                onSuccess: () => {
                  toast.success(`${vehicle.plateNumber} deleted`);
                  onDeleted();
                },
              });
            }}
          >
            Delete vehicle
          </Button>
        </div>
      )}
      <ErrorNote error={remove.error} />
    </div>
  );
}

function Metric({ label, value, note, tone = "ink" }: { label: string; value: string; note?: string; tone?: "ink" | "rose" | "amber" | "green" }) {
  const color = { ink: "text-ink", rose: "text-rose-700", amber: "text-amber-700", green: "text-emerald-700" }[tone];
  return (
    <div>
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold ${color}`}>{value}</p>
      {note && <p className="text-xs text-muted">{note}</p>}
    </div>
  );
}
