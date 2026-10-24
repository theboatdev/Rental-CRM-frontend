"use client";

import { AlertTriangle, ArrowUpRight, CalendarClock, ChevronRight, ShieldAlert, Wrench } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { VehicleStatusBadge } from "@/components/ops/status";
import { ModuleGate } from "@/components/shell/module-gate";
import { EmptyState, ErrorNote, Loading, Panel, Stat } from "@/components/ui/page";
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
      <div className="flex flex-col justify-between gap-4 border border-ink/15 bg-panel p-5 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <span className="size-2.5 animate-pulse bg-brand" />
          <div>
            <p className="font-mono text-[10px] font-bold tracking-widest text-brand uppercase">Operations pulse</p>
            <h1 className="text-xl font-black tracking-tight sm:text-2xl">Fleet, rentals & {can("financials:view") ? "cashflow" : "workload"}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex border border-ink/15 bg-paper p-0.5 font-mono text-[11px] font-bold">
            {RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRange(r.value)}
                className={`px-2.5 py-1 ${range === r.value ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {can("rentals:create") && (
            <Link href="/rentals?new=1" className="flex items-center gap-1.5 bg-brand px-4 py-2 font-mono text-xs font-bold tracking-wider text-white uppercase hover:brightness-95">
              New booking <ArrowUpRight size={13} />
            </Link>
          )}
        </div>
      </div>

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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="border border-ink/15 bg-panel p-4">
          <p className="font-mono text-[10px] font-bold tracking-wider text-muted uppercase">Fleet utilization</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-black sm:text-3xl">{format.percent(fleet.utilization)}</span>
            <span className="border border-brand/20 bg-brand/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand">
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
              tone={(totals.profit ?? 0) >= 0 ? "brand" : "rose"}
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
                { label: "Revenue", value: totals.revenue ?? 0, color: "#10B981" },
                { label: "Workshop", value: totals.serviceCosts ?? 0, color: "#F59E0B" },
                { label: "Fuel", value: totals.fuelCosts ?? 0, color: "#EF4444" },
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
    <div className="p-5">
      <svg viewBox="0 0 600 190" className="h-48 w-full overflow-visible" role="img" aria-label="Revenue, workshop, fuel and profit">
        <line x1="20" y1="150" x2="590" y2="150" stroke="#0A0A0C" strokeOpacity="0.15" />
        {bars.map((bar, index) => {
          const height = (Math.max(bar.value, 0) / max) * 120;
          const x = 50 + index * 140;
          return (
            <g key={bar.label}>
              <rect x={x} y={150 - height} width="80" height={height} fill={bar.color} />
              <text x={x + 40} y={142 - height} textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="#0A0A0C">
                {format.money(bar.value)}
              </text>
              <text x={x + 40} y="170" textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="#6E7381">
                {bar.label.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function FleetDonut({ fleet }: { fleet: Dashboard["fleet"] }) {
  const circumference = 251.2;
  const parts = [
    { label: "On the road", count: fleet.rented, color: "var(--brand)" },
    { label: "Available", count: fleet.available, color: "#10B981" },
    { label: "In maintenance", count: fleet.maintenance, color: "#F59E0B" },
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
          <span className="font-mono text-2xl font-black">{fleet.total}</span>
          <span className="font-mono text-[9px] text-muted uppercase">Vehicles</span>
        </div>
      </div>
      <ul className="space-y-2 font-mono text-xs">
        {parts.map((part) => (
          <li key={part.label} className="flex items-center justify-between border border-ink/5 bg-paper p-2">
            <span className="flex items-center gap-2">
              <span className="inline-block size-2.5" style={{ background: part.color }} />
              {part.label}
            </span>
            <strong>{part.count}</strong>
          </li>
        ))}
      </ul>
      <Link href="/vehicles" className="flex items-center justify-center gap-1 border border-ink/20 py-2 font-mono text-xs font-bold tracking-wider uppercase hover:border-brand hover:text-brand">
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
              <span className="block font-bold text-ink">{alert.title}</span>
              <span className="block text-muted">{alert.detail}</span>
            </span>
          </>
        );
        return (
          <li key={`${alert.kind}:${alert.title}`}>
            {href ? (
              <Link href={href} className="flex gap-3 px-5 py-3 font-mono text-xs hover:bg-paper">
                {content}
              </Link>
            ) : (
              <div className="flex gap-3 px-5 py-3 font-mono text-xs">{content}</div>
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
                <span className="font-mono text-xs font-bold group-hover:text-brand">{v.plateNumber}</span>
                <VehicleStatusBadge status={v.status} />
              </div>
              <div className="font-mono text-[11px] text-muted">
                {v.make} {v.model}
              </div>
            </div>
            {financial ? (
              <div className="max-w-xl flex-1 space-y-1.5">
                <Bar label="Rev" value={v.revenue ?? 0} max={max} color="bg-emerald-600" text={format.money(v.revenue ?? 0)} />
                <Bar label="Costs" value={v.operatingCosts ?? 0} max={max} color="bg-rose-500" text={format.money(v.operatingCosts ?? 0)} />
              </div>
            ) : (
              <div className="max-w-xl flex-1">
                <Bar label="Trips" value={v.trips} max={max} color="bg-brand" text={String(v.trips)} />
              </div>
            )}
            <div className="w-full shrink-0 font-mono md:w-48 md:text-right">
              {financial ? (
                <>
                  <div className="text-[10px] text-muted uppercase">Net</div>
                  <div className={`text-sm font-bold ${(v.profit ?? 0) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{format.money(v.profit ?? 0)}</div>
                </>
              ) : (
                <div className="text-[11px] text-muted">{format.distance(v.distance)} driven</div>
              )}
              {v.fuelLiters !== undefined && <div className="text-[10px] text-muted">{format.number(v.fuelLiters)} L fuel</div>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Bar({ label, value, max, color, text }: { label: string; value: number; max: number; color: string; text: string }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[10px]">
      <span className="w-12 text-right text-muted uppercase">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden bg-[#EAEAEA]">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(Math.round((Math.max(value, 0) / max) * 100), 100)}%` }} />
      </div>
      <span className="w-24 text-right font-bold">{text}</span>
    </div>
  );
}
