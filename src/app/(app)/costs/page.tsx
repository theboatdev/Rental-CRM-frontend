"use client";

import { Fuel, Plus, Trash2, Wrench } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AttachBill, CostForm, FuelForm } from "@/components/ops/cost-forms";
import { useFields, useListColumns } from "@/components/ops/fields";
import { FileLink } from "@/components/ops/files";
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
        title="Running costs"
        actions={
          (tab === "costs" ? can("costs:create") : can("fuel:create")) && (
            <Button variant="dark" onClick={() => setAdding(true)}>
              <Plus size={14} /> {tab === "costs" ? "Log a cost" : "Log a fill-up"}
            </Button>
          )
        }
      />
      {showFuel && (
        <div className="flex border-b border-line text-xs font-semibold tracking-normal">
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
  const { builtIn: field } = useFields("costs");
  // The table shows these built-in fields in its own way; the config decides whether the date, workshop and invoice show.
  const { listed, columns } = useListColumns<Cost>("costs", ["vehicle", "title", "category", "amount", "incurredAt", "serviceCenter", "invoiceNumber"]);
  const remove =useTenantMutation((request, cost: Cost) => request<{ deleted: boolean }>("DELETE", `/costs/${cost.id}`));
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
                {listed("incurredAt") && <th className={table.th}>{field("incurredAt").label}</th>}
                <th className={table.th}>{field("vehicle").label}</th>
                <th className={table.th}>
                  {field("title").label} & {field("category").label.toLowerCase()}
                </th>
                {listed("serviceCenter") && <th className={table.th}>{field("serviceCenter").label}</th>}
                {listed("invoiceNumber") && <th className={table.th}>{field("invoiceNumber").label}</th>}
                {columns.map((column) => (
                  <th key={column.key} className={table.th}>
                    {column.label}
                  </th>
                ))}
                <th className={`${table.th} text-right`}>{field("amount").label}</th>
                <th className={table.th}>Bill</th>
                {can("costs:delete") && <th className={table.th} />}
              </tr>
            </thead>
            <tbody>
              {costs.data.map((c) => (
                <tr key={c.id} className={table.row}>
                  {listed("incurredAt") && <td className={`${table.td} text-muted`}>{format.day(c.incurredAt)}</td>}
                  <td className={`${table.td} font-semibold text-brand`}>{c.vehicle.plateNumber}</td>
                  <td className={table.td}>
                    <div className="font-semibold text-ink">{c.title}</div>
                    <div className="text-xs text-muted">{label("costCategories", c.category)}</div>
                  </td>
                  {listed("serviceCenter") && <td className={table.td}>{c.serviceCenter ?? "—"}</td>}
                  {listed("invoiceNumber") && <td className={`${table.td} text-muted`}>{c.invoiceNumber ?? "—"}</td>}
                  {columns.map((column) => (
                    <td key={column.key} className={table.td}>
                      {column.cell(c)}
                    </td>
                  ))}
                  <td className={`${table.td} text-right text-sm font-semibold text-rose-700`}>{format.money(c.amount)}</td>
                  <td className={table.td}>
                    <div className="flex flex-col items-start gap-1.5">
                      {c.bill ? <FileLink file={c.bill} label="Bill" /> : can("costs:create") ? <AttachBill cost={c} /> : <span className="text-xs text-muted">—</span>}
                    </div>
                  </td>
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
                  <td className={`${table.td} font-semibold text-brand`}>{f.vehicle.plateNumber}</td>
                  <td className={table.td}>{f.station ?? "—"}</td>
                  <td className={`${table.td} text-right font-semibold text-amber-700`}>{format.number(f.liters)} L</td>
                  <td className={`${table.td} text-right`}>{f.pricePerLiter !== null ? format.money(f.pricePerLiter) : "—"}</td>
                  <td className={`${table.td} text-right font-semibold`}>{format.money(f.totalCost)}</td>
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
