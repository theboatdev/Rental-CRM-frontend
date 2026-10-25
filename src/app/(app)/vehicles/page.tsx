"use client";

import { ArrowUpRight, Car, Fuel, Plus, Users, Wrench } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { useListColumns } from "@/components/ops/fields";
import { VehicleDossierDialog } from "@/components/ops/vehicle-dossier";
import { VehicleForm } from "@/components/ops/vehicle-form";
import { FUEL_LABELS, TRANSMISSION_LABELS, VehicleStatusBadge } from "@/components/ops/status";
import { ModuleGate } from "@/components/shell/module-gate";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, ErrorNote, Loading, PageHeader } from "@/components/ui/page";
import type { VehicleWithStats } from "@/lib/contract";
import { useVehicles } from "@/lib/queries";
import { useWorkspace } from "@/lib/workspace";

export default function VehiclesPage() {
  return (
    <ModuleGate module="vehicles" permission="vehicles:read">
      <Suspense fallback={<Loading />}>
        <Vehicles />
      </Suspense>
    </ModuleGate>
  );
}

/** The fleet. `?open=<id>` opens a vehicle's dossier (linked from the dashboard). */
function Vehicles() {
  const { can, config } = useWorkspace();
  const vehicles = useVehicles();
  const params = useSearchParams();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const openId = params.get("open");
  const open = (id: string | null) => router.replace(id ? `/vehicles?open=${id}` : "/vehicles", { scroll: false });
  const count = vehicles.data?.length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Fleet · ${count} of ${config.limits.maxVehicles} vehicles`}
        title="Vehicles"
        actions={
          can("vehicles:create") && (
            <Button variant="dark" onClick={() => setAdding(true)} disabled={count >= config.limits.maxVehicles} title={count >= config.limits.maxVehicles ? "Your plan's vehicle limit is reached" : undefined}>
              <Plus size={14} /> Add vehicle
            </Button>
          )
        }
      />
      {vehicles.isPending && <Loading />}
      <ErrorNote error={vehicles.error} />
      {vehicles.data?.length === 0 && <EmptyState>No vehicles yet. Add the first one to start taking bookings.</EmptyState>}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {vehicles.data?.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} onOpen={() => open(vehicle.id)} />)}
      </div>

      {adding && (
        <Dialog open onClose={() => setAdding(false)} title="Add a vehicle to the fleet" eyebrow="Fleet" width="sm">
          <VehicleForm
            onDone={(saved) => {
              setAdding(false);
              open(saved.id);
            }}
          />
        </Dialog>
      )}
      {openId && <VehicleDossierDialog vehicleId={openId} onClose={() => open(null)} />}
    </div>
  );
}

const NATIVE_FIELDS = ["plateNumber", "make", "model", "year", "transmission", "fuelType", "dailyRate", "secondaryDailyRate", "depositAmount", "mileage", "thumbnail"];

function VehicleCard({ vehicle, onOpen }: { vehicle: VehicleWithStats; onOpen: () => void }) {
  const { format } = useWorkspace();
  // The card shows these built-in fields in its own way; the config decides whether each one shows.
  const { listed, columns } = useListColumns<VehicleWithStats>("vehicles", NATIVE_FIELDS);
  const { stats } = vehicle;
  const secondary = listed("secondaryDailyRate") && vehicle.secondaryDailyRate !== null ? format.secondaryMoney(vehicle.secondaryDailyRate) : null;
  const specs = [listed("transmission") && TRANSMISSION_LABELS[vehicle.transmission], listed("fuelType") && FUEL_LABELS[vehicle.fuelType]].filter(Boolean);
  const figures = [
    listed("mileage") && format.distance(vehicle.mileage),
    listed("depositAmount") && `deposit ${format.money(vehicle.depositAmount)}`,
    secondary && `${secondary}/day`,
  ].filter(Boolean);
  return (
    <article className="group flex flex-col justify-between overflow-hidden rounded-lg border border-line bg-panel">
      <div>
        <div className="relative h-44 overflow-hidden border-b border-line bg-paper">
          {listed("thumbnail") && vehicle.thumbnail ? (
            // Vehicle photos are arbitrary https URLs entered by staff, so they aren't routed through next/image.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vehicle.thumbnail} alt={`${vehicle.make} ${vehicle.model}`} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-muted/40">
              <Car size={48} />
            </div>
          )}
          <span className="absolute top-3 left-3 rounded bg-panel/95 px-2 py-1 font-mono text-xs font-semibold tracking-normal text-ink">{vehicle.plateNumber}</span>
          <span className="absolute top-3 right-3">
            <VehicleStatusBadge status={vehicle.status} />
          </span>
          {specs.length > 0 && <span className="absolute right-3 bottom-2 bg-black/75 px-1.5 py-0.5 font-sans text-xs text-white/90">{specs.join(" · ")}</span>}
        </div>
        <div className="space-y-3 p-5">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-base font-semibold tracking-tight text-ink">
                {vehicle.make} {vehicle.model}
                {listed("year") && vehicle.year !== null ? ` (${vehicle.year})` : ""}
              </h3>
              <span className="text-sm font-semibold whitespace-nowrap text-ink">
                {format.money(vehicle.dailyRate)}/day
              </span>
            </div>
            {figures.length > 0 && <p className="mt-0.5 font-sans text-xs text-muted">{figures.join(" · ")}</p>}
            {columns.length > 0 && (
              <p className="mt-0.5 font-sans text-xs text-muted">{columns.map((column) => `${column.label}: ${column.cell(vehicle)}`).join(" · ")}</p>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 text-xs">
            <Figure label="Renters" icon={<Users size={12} className="text-muted" />}>
              {stats.renters} ({stats.trips} trips)
            </Figure>
            {stats.serviceCosts !== undefined && (
              <Figure label="Service costs" icon={<Wrench size={12} className="text-muted" />}>
                {format.money(stats.serviceCosts)}
              </Figure>
            )}
            {stats.fuelLiters !== undefined && (
              <Figure label="Fuel" icon={<Fuel size={12} className="text-muted" />}>
                {format.number(stats.fuelLiters)} L
              </Figure>
            )}
            {stats.profit !== undefined && (
              <Figure label="Net profit">
                <span className={stats.profit >= 0 ? "text-emerald-700" : "text-rose-700"}>{format.money(stats.profit)}</span>
              </Figure>
            )}
          </dl>
        </div>
      </div>
      <div className="p-5 pt-0">
        <Button variant="outline" className="w-full py-2.5" onClick={onOpen}>
          View vehicle <ArrowUpRight size={13} />
        </Button>
      </div>
    </article>
  );
}

function Figure({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="flex items-center gap-1 font-semibold text-ink">
        {icon}
        {children}
      </dd>
    </div>
  );
}
