"use client";

import { Car, Eye, History, Phone, Plus, Settings } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { RentalStatusBadge, VehicleStatusBadge } from "@/components/ops/status";
import { SupplierEditForm, SupplierForm } from "@/components/ops/supplier-forms";
import { ModuleGate } from "@/components/shell/module-gate";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Badge, EmptyState, ErrorNote, Loading, PageHeader, Panel, table } from "@/components/ui/page";
import type { Supplier, SupplierDossier, SupplierStatus } from "@/lib/contract";
import { useSupplier, useSuppliers, useTenantMutation } from "@/lib/queries";
import { useWorkspace } from "@/lib/workspace";

export default function SuppliersPage() {
  return (
    <ModuleGate module="suppliers" permission="suppliers:read">
      <Suspense fallback={<Loading />}>
        <Suppliers />
      </Suspense>
    </ModuleGate>
  );
}

/** Supplier profiles. `?open=<id>` opens one. */
function Suppliers() {
  const { can } = useWorkspace();
  const suppliers = useSuppliers();
  const params = useSearchParams();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const openId = params.get("open");
  const open = (id: string | null) => router.replace(id ? `/suppliers?open=${id}` : "/suppliers", { scroll: false });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Suppliers · ${suppliers.data?.length ?? "…"} profiles`}
        title="Suppliers"
        actions={
          can("suppliers:create") && (
            <Button variant="dark" onClick={() => setAdding(true)}>
              <Plus size={14} /> Register supplier
            </Button>
          )
        }
      />
      <Panel>
        {suppliers.isPending && <Loading />}
        <ErrorNote error={suppliers.error} className="m-4" />
        {suppliers.data?.length === 0 && <EmptyState>No suppliers yet.</EmptyState>}
        {suppliers.data && suppliers.data.length > 0 && (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead className={table.head}>
                <tr>
                  <th className={table.th}>Code</th>
                  <th className={table.th}>Name & contact</th>
                  <th className={table.th}>Phone</th>
                  <th className={table.th}>Status</th>
                  <th className={`${table.th} text-center`}>Vehicles</th>
                  <th className={`${table.th} text-right`} />
                </tr>
              </thead>
              <tbody>
                {suppliers.data.map((s) => (
                  <tr key={s.id} className={table.row}>
                    <td className={`${table.td} font-semibold text-brand`}>{s.profileId}</td>
                    <td className={table.td}>
                      <div className="text-sm font-semibold text-ink">{s.name}</div>
                      {s.contactPerson && <div className="text-xs text-muted">{s.contactPerson}</div>}
                      {s.email && <div className="text-xs text-muted">{s.email}</div>}
                    </td>
                    <td className={table.td}>{s.phone}</td>
                    <td className={table.td}>
                      <SupplierStatusBadge status={s.status} />
                    </td>
                    <td className={`${table.td} text-center text-sm font-semibold`}>{s.vehicleCount}</td>
                    <td className={`${table.td} text-right`}>
                      <Button variant="outline" size="sm" onClick={() => open(s.id)}>
                        <Eye size={12} /> Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {adding && (
        <Dialog open onClose={() => setAdding(false)} title="Register a supplier" eyebrow="Suppliers" width="md">
          <SupplierForm
            onDone={(supplier) => {
              setAdding(false);
              open(supplier.id);
            }}
          />
        </Dialog>
      )}
      {openId && <SupplierDialog supplierId={openId} onClose={() => open(null)} />}
    </div>
  );
}

type DossierTab = "profile" | "vehicles" | "history" | "manage";

function SupplierDialog({ supplierId, onClose }: { supplierId: string; onClose: () => void }) {
  const { data, error, isPending } = useSupplier(supplierId);
  return (
    <Dialog open onClose={onClose} title={data?.name ?? "Supplier"} eyebrow={data ? `Supplier // ${data.profileId}` : "Supplier profile"} width="lg">
      {isPending && <Loading />}
      <ErrorNote error={error} />
      {data && <SupplierDossierView supplier={data} />}
    </Dialog>
  );
}

function SupplierDossierView({ supplier }: { supplier: SupplierDossier }) {
  const { can, format, canSeeBookingPricing } = useWorkspace();
  const canManage = can("suppliers:update");
  const hireCount = supplier.hireHistory?.length ?? 0;
  const tabs: Array<{ key: DossierTab; label: string; icon: ReactNode; show: boolean }> = [
    { key: "profile", label: "Profile", icon: <Phone size={14} />, show: true },
    { key: "vehicles", label: `Vehicles (${supplier.vehicles.length})`, icon: <Car size={14} />, show: true },
    { key: "history", label: `Hire history (${hireCount})`, icon: <History size={14} />, show: supplier.hireHistory !== null },
    { key: "manage", label: "Manage", icon: <Settings size={14} />, show: canManage },
  ];
  const visible = tabs.filter((t) => t.show);
  const [tab, setTab] = useState<DossierTab>(visible[0]?.key ?? "profile");
  const setStatus = useTenantMutation((request, status: SupplierStatus) =>
    request<Supplier>("POST", `/suppliers/${supplier.id}/status`, { status }),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SupplierStatusBadge status={supplier.status} />
          {supplier.contactPerson && <span className="text-sm text-muted">{supplier.contactPerson}</span>}
          <span className="text-sm text-muted">{supplier.phone}</span>
        </div>
        {canManage && (
          <Button
            size="sm"
            variant="outline"
            disabled={setStatus.isPending}
            onClick={() =>
              setStatus.mutate(supplier.status === "ACTIVE" ? "INACTIVE" : "ACTIVE", {
                onSuccess: () => toast.success(supplier.status === "ACTIVE" ? "Marked inactive" : "Marked active"),
              })
            }
          >
            Mark {supplier.status === "ACTIVE" ? "inactive" : "active"}
          </Button>
        )}
      </div>
      <ErrorNote error={setStatus.error} />

      <div className={`grid gap-3 border border-line bg-[#F8F8F9] p-4 text-center ${canSeeBookingPricing && supplier.supplierCostsTotal != null ? "grid-cols-3" : "grid-cols-2"}`}>
        <Metric label="Linked vehicles" value={String(supplier.vehicles.length)} />
        <Metric label="Hire trips" value={String(hireCount)} note={supplier.hireHistory === null ? "No access" : undefined} />
        {canSeeBookingPricing && supplier.supplierCostsTotal != null && (
          <Metric label="Supplier costs" value={format.money(supplier.supplierCostsTotal)} tone="amber" />
        )}
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

      {tab === "profile" && <ProfileTab supplier={supplier} />}
      {tab === "vehicles" && <VehiclesTab supplier={supplier} />}
      {tab === "history" && supplier.hireHistory && <HistoryTab supplier={supplier} />}
      {tab === "manage" && canManage && <ManageTab supplier={supplier} />}
    </div>
  );
}

function ProfileTab({ supplier }: { supplier: SupplierDossier }) {
  const { format } = useWorkspace();
  const contact: Array<[string, string]> = [
    ["Phone", supplier.phone],
    ...(supplier.contactPerson ? [["Contact person", supplier.contactPerson] as [string, string]] : []),
    ...(supplier.email ? [["Email", supplier.email] as [string, string]] : []),
    ["Registered", format.dateTime(supplier.createdAt)],
  ];
  const bank: Array<[string, string]> = [
    ...(supplier.bankName ? [["Bank", supplier.bankName] as [string, string]] : []),
    ...(supplier.bankAccount ? [["Account number", supplier.bankAccount] as [string, string]] : []),
    ...(supplier.bankAccountHolder ? [["Account holder", supplier.bankAccountHolder] as [string, string]] : []),
  ];

  return (
    <div className="space-y-4">
      <section>
        <h4 className="mb-2 text-xs font-semibold tracking-normal text-muted">Contact</h4>
        <dl className="grid gap-x-6 gap-y-3 border border-line bg-paper p-4 sm:grid-cols-2">
          {contact.map(([label, value]) => (
            <Detail key={label} label={label} value={value} />
          ))}
        </dl>
      </section>

      <section>
        <h4 className="mb-2 text-xs font-semibold tracking-normal text-muted">Bank details</h4>
        {bank.length === 0 ? (
          <p className="border border-dashed border-line px-4 py-6 text-center text-sm text-muted italic">No bank details recorded.</p>
        ) : (
          <dl className="grid gap-x-6 gap-y-3 border border-line bg-paper p-4 sm:grid-cols-2">
            {bank.map(([label, value]) => (
              <Detail key={label} label={label} value={value} />
            ))}
          </dl>
        )}
      </section>

      {supplier.notes && (
        <section>
          <h4 className="mb-2 text-xs font-semibold tracking-normal text-muted">Notes</h4>
          <p className="whitespace-pre-line border border-line bg-paper p-4 text-ink">{supplier.notes}</p>
        </section>
      )}
    </div>
  );
}

function VehiclesTab({ supplier }: { supplier: SupplierDossier }) {
  if (supplier.vehicles.length === 0) {
    return <EmptyState>No vehicles linked to this supplier yet.</EmptyState>;
  }
  return (
    <div className={`border border-ink/15 ${table.wrap}`}>
      <table className={table.table}>
        <thead className={table.head}>
          <tr>
            <th className={table.th}>Plate</th>
            <th className={table.th}>Vehicle</th>
            <th className={`${table.th} text-center`}>Status</th>
          </tr>
        </thead>
        <tbody>
          {supplier.vehicles.map((v) => (
            <tr key={v.id} className={table.row}>
              <td className={`${table.td} font-semibold text-brand`}>{v.plateNumber}</td>
              <td className={table.td}>
                {v.make} {v.model}
                {v.year != null ? ` (${v.year})` : ""}
              </td>
              <td className={`${table.td} text-center`}>
                <VehicleStatusBadge status={v.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryTab({ supplier }: { supplier: SupplierDossier }) {
  const { format, canSeeBookingPricing } = useWorkspace();
  const rentals = supplier.hireHistory ?? [];
  if (rentals.length === 0) return <EmptyState>No hire history yet for this supplier.</EmptyState>;

  return (
    <div className={`border border-ink/15 ${table.wrap}`}>
      <table className={table.table}>
        <thead className={table.head}>
          <tr>
            <th className={table.th}>Booking</th>
            <th className={table.th}>Vehicle</th>
            <th className={table.th}>Renter</th>
            <th className={table.th}>Dates</th>
            {canSeeBookingPricing && <th className={`${table.th} text-right`}>Supplier cost</th>}
            <th className={`${table.th} text-center`}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rentals.map((r) => (
            <tr key={r.id} className={table.row}>
              <td className={`${table.td} font-semibold`}>{r.code}</td>
              <td className={table.td}>{r.vehicle?.plateNumber ?? "—"}</td>
              <td className={table.td}>
                <div className="font-semibold">{r.renter.fullName}</div>
                <div className="text-xs text-muted">{r.renter.profileId}</div>
              </td>
              <td className={table.td}>
                {format.day(r.startDate)} → {format.day(r.endDate)}
              </td>
              {canSeeBookingPricing && (
                <td className={`${table.td} text-right font-semibold`}>
                  {r.supplierRentalCost != null ? format.money(r.supplierRentalCost) : "—"}
                </td>
              )}
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

function ManageTab({ supplier }: { supplier: SupplierDossier }) {
  return (
    <div className="space-y-3 border border-line p-4">
      <p className="text-xs text-muted">Update contact details, bank information, or notes.</p>
      <SupplierEditForm supplier={supplier} onDone={() => toast.success("Supplier updated")} />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-normal text-muted">{label}</dt>
      <dd className="mt-0.5 text-ink">{value}</dd>
    </div>
  );
}

function Metric({ label, value, note, tone = "ink" }: { label: string; value: string; note?: string; tone?: "ink" | "amber" }) {
  const color = { ink: "text-ink", amber: "text-amber-700" }[tone];
  return (
    <div>
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold ${color}`}>{value}</p>
      {note && <p className="text-xs text-muted">{note}</p>}
    </div>
  );
}

function SupplierStatusBadge({ status }: { status: SupplierStatus }) {
  return <Badge tone={status === "ACTIVE" ? "green" : "muted"}>{status === "ACTIVE" ? "Active" : "Inactive"}</Badge>;
}
