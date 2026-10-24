"use client";

import { Fuel, Plus, Trash2, Wrench } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CostForm, FuelForm } from "@/components/ops/cost-forms";
import { ModuleGate } from "@/components/shell/module-gate";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, ErrorNote, Loading, PageHeader, Panel, table } from "@/components/ui/page";
import type { Cost } from "@/lib/contract";
import { useCosts, useFuelLogs, useTenantMutation } from "@/lib/queries";
import { useWorkspace } from "@/lib/workspace";

export default function CostsPage() {
  return (
    <ModuleGate module="costs" permission="costs:read">
      <Costs />
    </ModuleGate>
  );
}

function Costs() {
  const { can, moduleOn } = useWorkspace();
  const showFuel = moduleOn("fuelLogs") && can("fuel:read");
  const [tab, setTab] = useState<"costs" | "fuel">("costs");
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Running costs"
        title="Service bills, repairs & fuel"
        actions={
          (tab === "costs" ? can("costs:create") : can("fuel:create")) && (
            <Button variant="dark" onClick={() => setAdding(true)}>
              <Plus size={14} /> {tab === "costs" ? "Log a cost" : "Log a fill-up"}
            </Button>
          )
        }
      />
      {showFuel && (
        <div className="flex border-b border-line text-xs font-bold tracking-wider uppercase">
          {(
            [
              ["costs", "Workshop costs", <Wrench key="w" size={14} />],
              ["fuel", "Fuel logs", <Fuel key="f" size={14} />],
            ] as const
          ).map(([key, label, icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 ${tab === key ? "border-brand bg-brand/5 text-brand" : "border-transparent text-muted hover:text-ink"}`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      )}
      {tab === "costs" ? <CostTable /> : <FuelTable />}

      {adding && (
        <Dialog open onClose={() => setAdding(false)} title={tab === "costs" ? "Log a cost" : "Log a fuel fill-up"} eyebrow="Running costs" width="md">
          {tab === "costs" ? <CostForm onDone={() => setAdding(false)} /> : <FuelForm onDone={() => setAdding(false)} />}
        </Dialog>
      )}
    </div>
  );
}

function CostTable() {
  const { can, format, label } = useWorkspace();
  const costs = useCosts();
  const remove = useTenantMutation((request, cost: Cost) => request<{ deleted: boolean }>("DELETE", `/costs/${cost.id}`));
  const total = costs.data?.reduce((sum, c) => sum + c.amount, 0) ?? 0;

  return (
    <Panel title={`Costs · ${format.money(total)}`}>
      {costs.isPending && <Loading />}
      <ErrorNote error={costs.error ?? remove.error} className="m-4" />
      {costs.data?.length === 0 && <EmptyState>No costs logged yet.</EmptyState>}
      {costs.data && costs.data.length > 0 && (
        <div className={table.wrap}>
          <table className={table.table}>
            <thead className={table.head}>
              <tr>
                <th className={table.th}>Date</th>
                <th className={table.th}>Vehicle</th>
                <th className={table.th}>Item & category</th>
                <th className={table.th}>Workshop</th>
                <th className={table.th}>Invoice</th>
                <th className={`${table.th} text-right`}>Cost</th>
                {can("costs:delete") && <th className={table.th} />}
              </tr>
            </thead>
            <tbody>
              {costs.data.map((c) => (
                <tr key={c.id} className={table.row}>
                  <td className={`${table.td} text-muted`}>{format.day(c.incurredAt)}</td>
                  <td className={`${table.td} font-bold text-brand`}>{c.vehicle.plateNumber}</td>
                  <td className={table.td}>
                    <div className="font-bold text-ink">{c.title}</div>
                    <div className="text-[10px] text-muted">{label("costCategories", c.category)}</div>
                  </td>
                  <td className={table.td}>{c.serviceCenter ?? "—"}</td>
                  <td className={`${table.td} text-muted`}>{c.invoiceNumber ?? "—"}</td>
                  <td className={`${table.td} text-right text-sm font-black text-rose-700`}>{format.money(c.amount)}</td>
                  {can("costs:delete") && (
                    <td className={`${table.td} text-right`}>
                      <button
                        type="button"
                        className="p-1 text-muted hover:text-rose-700"
                        aria-label={`Delete ${c.title}`}
                        disabled={remove.isPending}
                        onClick={() => {
                          if (confirm(`Delete "${c.title}" (${format.money(c.amount)})?`)) remove.mutate(c, { onSuccess: () => toast.success("Cost deleted") });
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function FuelTable() {
  const { format } = useWorkspace();
  const logs = useFuelLogs();
  const liters = logs.data?.reduce((sum, f) => sum + f.liters, 0) ?? 0;
  const total = logs.data?.reduce((sum, f) => sum + f.totalCost, 0) ?? 0;
  return (
    <Panel title={`Fuel · ${format.number(liters)} L · ${format.money(total)}`}>
      {logs.isPending && <Loading />}
      <ErrorNote error={logs.error} className="m-4" />
      {logs.data?.length === 0 && <EmptyState>No fill-ups logged yet.</EmptyState>}
      {logs.data && logs.data.length > 0 && (
        <div className={table.wrap}>
          <table className={table.table}>
            <thead className={table.head}>
              <tr>
                <th className={table.th}>Date</th>
                <th className={table.th}>Vehicle</th>
                <th className={table.th}>Station</th>
                <th className={`${table.th} text-right`}>Liters</th>
                <th className={`${table.th} text-right`}>Price / L</th>
                <th className={`${table.th} text-right`}>Total</th>
                <th className={table.th}>Logged by</th>
              </tr>
            </thead>
            <tbody>
              {logs.data.map((f) => (
                <tr key={f.id} className={table.row}>
                  <td className={`${table.td} text-muted`}>{format.day(f.filledAt)}</td>
                  <td className={`${table.td} font-bold text-brand`}>{f.vehicle.plateNumber}</td>
                  <td className={table.td}>{f.station ?? "—"}</td>
                  <td className={`${table.td} text-right font-bold text-amber-700`}>{format.number(f.liters)} L</td>
                  <td className={`${table.td} text-right`}>{f.pricePerLiter !== null ? format.money(f.pricePerLiter) : "—"}</td>
                  <td className={`${table.td} text-right font-bold`}>{format.money(f.totalCost)}</td>
                  <td className={`${table.td} text-muted`}>{f.createdBy?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
