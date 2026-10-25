"use client";

import { AlertTriangle, ArrowUpRight, CalendarClock, ChevronRight, ShieldAlert, Wrench } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { VehicleStatusBadge } from "@/components/ops/status";
import { ModuleGate } from "@/components/shell/module-gate";
import { EmptyState, ErrorNote, Loading, PageHeader, Panel, Stat } from "@/components/ui/page";
import type { Dashboard, DashboardAlert, DashboardRange } from "@/lib/contract";
import { useDashboard } from "@/lib/queries";
import { useWorkspace } from "@/lib/workspace";

const RANGES: Array<{ value: DashboardRange; label: string }> = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "all", label: "All" },
];

export default function DashboardPage() {
  return (
    <ModuleGate module="dashboard" permission="dashboard:view">
      <DashboardView />
    </ModuleGate>
  );
}

function DashboardView() {
  const { can } = useWorkspace();
  const [range, setRange] = useState<DashboardRange>("30d");
  const dashboard = useDashboard(range);
  const data = dashboard.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your rental operations at a glance"
        title="Overview"
        actions={
          <>
            <div className="inline-flex items-center rounded-md border border-line bg-panel p-1" aria-label="Reporting period">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  aria-pressed={range === r.value}
                  onClick={() => setRange(r.value)}
                  className={`min-h-8 rounded px-3 text-xs font-medium ${range === r.value ? "bg-ink text-white" : "text-muted hover:bg-paper hover:text-ink"}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {can("rentals:create") && (
              <Link href="/rentals?new=1" className="flex min-h-10 items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90">
                New booking <ArrowUpRight size={14} />
              </Link>
            )}
          </>
        }
      />

      {dashboard.isPending && <Loading />}
      <ErrorNote error={dashboard.error} />
      {data && <DashboardBody data={data} />}
    </div>
  );
}

function DashboardBody({ data }: { data: Dashboard }) {
  const { format } = useWorkspace();
  const { fleet, rentals, totals } = data;
  const financial = totals.revenue !== undefined;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0 rounded-lg border border-line bg-panel p-5">
          <p className="text-sm font-medium text-muted">Fleet utilization</p>
          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-3xl font-semibold tracking-tight tabular-nums">{format.percent(fleet.utilization)}</span>
            <span className="text-xs text-muted">
              {fleet.rented}/{fleet.total} on the road
            </span>
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden bg-[#EAEAEA]">
            <div className="h-full bg-brand" style={{ width: format.percent(fleet.utilization) }} />
          </div>
        </div>
        <Stat label="Open rentals" value={rentals.active} note={`${rentals.reserved} booked · ${rentals.overdue} overdue`} tone={rentals.overdue ? "rose" : "ink"} />
        {financial ? (
          <>
            <Stat label="Contract revenue" value={format.money(totals.revenue ?? 0)} note={`${totals.trips} rentals started`} tone="green" />
            <Stat
              label="Net profit"
              value={format.money(totals.profit ?? 0)}
              note={`${format.money(totals.operatingCosts ?? 0)} costs${totals.profitMargin != null ? ` · ${format.percent(totals.profitMargin)} margin` : ""}`}
              tone={(totals.profit ?? 0) >= 0 ? "ink" : "rose"}
            />
          </>
        ) : (
          <>
            <Stat label="Today" value={`${rentals.pickupsToday} out · ${rentals.returnsToday} in`} note="Pickups and returns due" />
            <Stat label="Rentals started" value={totals.trips} note={data.range === "all" ? "All time" : `Last ${data.range.replace("d", " days")}`} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {financial ? (
          <Panel title="Revenue vs running costs" className="lg:col-span-8">
            <CashflowBars
              bars={[
                { label: "Revenue", value: totals.revenue ?? 0, color: "#587565" },
                { label: "Workshop", value: totals.serviceCosts ?? 0, color: "#b28b52" },
                { label: "Fuel", value: totals.fuelCosts ?? 0, color: "#ad6965" },
                { label: "Net profit", value: totals.profit ?? 0, color: "var(--brand)" },
              ]}
            />
          </Panel>
        ) : (
          <Panel title="Attention" className="lg:col-span-8">
            <Alerts alerts={data.alerts} />
          </Panel>
        )}
        <Panel title="Fleet distribution" className="lg:col-span-4">
          <FleetDonut fleet={fleet} />
        </Panel>
      </div>

      {financial && (
        <Panel title={`Attention (${data.alerts.length})`}>
          <Alerts alerts={data.alerts} />
        </Panel>
      )}

      <Panel title={financial ? "Per-vehicle revenue vs running costs" : "Per-vehicle activity"}>
        <VehicleMatrix data={data} financial={financial} />
      </Panel>
    </>
  );
}

function CashflowBars({ bars }: { bars: Array<{ label: string; value: number; color: string }> }) {
  const { format } = useWorkspace();
  const max = Math.max(...bars.map((b) => Math.abs(b.value)), 1);
  return (
    <dl className="space-y-7 p-6" aria-label="Revenue, workshop, fuel and profit">
      {bars.map((bar) => (
        <div key={bar.label}>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <dt className="text-muted">{bar.label}</dt>
            <dd className="font-medium tabular-nums">{format.money(bar.value)}</dd>
          </div>
          <div className="h-3 overflow-hidden rounded-sm bg-paper" aria-hidden="true">
            <div className="h-full rounded-sm" style={{ width: `${(Math.abs(bar.value) / max) * 100}%`, backgroundColor: bar.color }} />
          </div>
        </div>
      ))}
    </dl>
  );
}

function FleetDonut({ fleet }: { fleet: Dashboard["fleet"] }) {
  const circumference = 251.2;
  const parts = [
    { label: "On the road", count: fleet.rented, color: "var(--brand)" },
    { label: "Available", count: fleet.available, color: "#587565" },
    { label: "In maintenance", count: fleet.maintenance, color: "#b28b52" },
  ];
  let offset = 0;
  return (
    <div className="space-y-4 p-5">
      <div className="relative mx-auto size-36">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#EAEAEA" strokeWidth="14" />
          {fleet.total > 0 &&
            parts.map((part) => {
              const length = (part.count / fleet.total) * circumference;
              const circle = (
                <circle key={part.label} cx="50" cy="50" r="40" fill="transparent" stroke={part.color} strokeWidth="14" strokeDasharray={`${length} ${circumference}`} strokeDashoffset={-offset} />
              );
              offset += length;
              return circle;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-sans text-2xl font-semibold">{fleet.total}</span>
          <span className="font-sans text-xs text-muted">Vehicles</span>
        </div>
      </div>
      <ul className="space-y-2 font-sans text-xs">
        {parts.map((part) => (
          <li key={part.label} className="flex items-center justify-between py-1.5">
            <span className="flex items-center gap-2">
              <span className="inline-block size-2 rounded-full" style={{ background: part.color }} />
              {part.label}
            </span>
            <strong>{part.count}</strong>
          </li>
        ))}
      </ul>
      <Link href="/vehicles" className="flex items-center justify-center gap-1 min-h-10 rounded-md border border-line py-2 text-sm font-medium hover:bg-paper">
        See all vehicles <ChevronRight size={13} />
      </Link>
    </div>
  );
}

const ALERT_ICONS: Record<DashboardAlert["kind"], ReactNode> = {
  overdue: <CalendarClock size={14} className="text-rose-700" />,
  compliance: <ShieldAlert size={14} className="text-violet-700" />,
  maintenance: <Wrench size={14} className="text-amber-700" />,
  service_due: <AlertTriangle size={14} className="text-amber-700" />,
};

/** Where an alert leads: its rental, renter or vehicle. */
function alertHref(alert: DashboardAlert) {
  if (alert.rentalId) return `/rentals?open=${alert.rentalId}`;
  if (alert.vehicleId) return `/vehicles?open=${alert.vehicleId}`;
  if (alert.renterId) return `/renters?open=${alert.renterId}`;
  return undefined;
}

function Alerts({ alerts }: { alerts: DashboardAlert[] }) {
  if (alerts.length === 0) return <EmptyState>Nothing needs attention right now.</EmptyState>;
  return (
    <ul className="divide-y divide-line">
      {alerts.map((alert) => {
        const href = alertHref(alert);
        const content = (
          <>
            <span className="mt-0.5">{ALERT_ICONS[alert.kind]}</span>
            <span>
              <span className="block font-semibold text-ink">{alert.title}</span>
              <span className="block text-muted">{alert.detail}</span>
            </span>
          </>
        );
        return (
          <li key={`${alert.kind}:${alert.title}`}>
            {href ? (
              <Link href={href} className="flex gap-3 px-5 py-4 text-sm hover:bg-paper">
                {content}
              </Link>
            ) : (
              <div className="flex gap-3 px-5 py-4 text-sm">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function VehicleMatrix({ data, financial }: { data: Dashboard; financial: boolean }) {
  const { format } = useWorkspace();
  if (data.vehicles.length === 0) return <EmptyState>No vehicles yet.</EmptyState>;
  const max = Math.max(...data.vehicles.map((v) => Math.max(v.revenue ?? 0, v.operatingCosts ?? 0, v.trips)), 1);
  return (
    <ul className="divide-y divide-line">
      {data.vehicles.map((v) => (
        <li key={v.id}>
          <Link href={`/vehicles?open=${v.id}`} className="group flex flex-col gap-2 px-5 py-3.5 hover:bg-paper md:flex-row md:items-center md:justify-between">
            <div className="w-full shrink-0 md:w-56">
              <div className="flex items-center gap-2">
                <span className="font-sans text-xs font-semibold group-hover:text-brand">{v.plateNumber}</span>
                <VehicleStatusBadge status={v.status} />
              </div>
              <div className="font-sans text-xs text-muted">
                {v.make} {v.model}
              </div>
            </div>
            {financial ? (
              <div className="max-w-xl flex-1 space-y-1.5">
                <Bar label="Rev" value={v.revenue ?? 0} max={max} color="bg-[#587565]" text={format.money(v.revenue ?? 0)} />
                <Bar label="Costs" value={v.operatingCosts ?? 0} max={max} color="bg-[#ad6965]" text={format.money(v.operatingCosts ?? 0)} />
              </div>
            ) : (
              <div className="max-w-xl flex-1">
                <Bar label="Trips" value={v.trips} max={max} color="bg-brand" text={String(v.trips)} />
              </div>
            )}
            <div className="w-full shrink-0 font-sans md:w-48 md:text-right">
              {financial ? (
                <>
                  <div className="text-xs text-muted">Net</div>
                  <div className={`text-sm font-semibold ${(v.profit ?? 0) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{format.money(v.profit ?? 0)}</div>
                </>
              ) : (
                <div className="text-xs text-muted">{format.distance(v.distance)} driven</div>
              )}
              {v.fuelLiters !== undefined && <div className="text-xs text-muted">{format.number(v.fuelLiters)} L fuel</div>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Bar({ label, value, max, color, text }: { label: string; value: number; max: number; color: string; text: string }) {
  return (
    <div className="flex items-center gap-2 font-sans text-xs">
      <span className="w-12 text-right text-muted">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#EAEAEA]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(Math.round((Math.max(value, 0) / max) * 100), 100)}%` }} />
      </div>
      <span className="w-24 text-right font-semibold">{text}</span>
    </div>
  );
}
