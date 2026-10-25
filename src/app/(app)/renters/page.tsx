"use client";

import { AlertTriangle, Eye, Plus, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CustomFieldList, CustomFieldsEditor, useFields, useHasCustomValues, useListColumns } from "@/components/ops/fields";
import { AddDocumentForm, RenterForm } from "@/components/ops/renter-forms";
import { RentalStatusBadge } from "@/components/ops/status";
import { ModuleGate } from "@/components/shell/module-gate";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Badge, EmptyState, ErrorNote, Loading, PageHeader, Panel, table } from "@/components/ui/page";
import type { Compliance, Renter, RenterDossier } from "@/lib/contract";
import { useRenter, useRenters, useTenantMutation } from "@/lib/queries";
import { useWorkspace } from "@/lib/workspace";

export default function RentersPage() {
  return (
    <ModuleGate module="renters" permission="renters:read">
      <Suspense fallback={<Loading />}>
        <Renters />
      </Suspense>
    </ModuleGate>
  );
}

/** What a renter lacks, in words, using the config's document labels. */
function useComplianceText() {
  const { label } = useWorkspace();
  return (compliance: Compliance) =>
    [...compliance.missingDocuments.map((key) => label("documentTypes", key)), ...(compliance.needsPermit ? ["a driving permit"] : [])].join(", ");
}

/** Renter profiles. `?open=<id>` opens one (linked from dashboard alerts). */
function Renters() {
  const { can, label } = useWorkspace();
  const renters = useRenters();
  const params = useSearchParams();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const missingText = useComplianceText();
  const { builtIn: f } = useFields("renters");
  // The table shows these built-in fields in its own way; the config decides whether each one shows.
  const { listed, columns } = useListColumns<Renter>("renters", ["fullName", "phone", "email", "residentType", "country", "documents"]);
  const showType = listed("residentType") || listed("country");
  const openId = params.get("open");
  const open = (id: string | null) => router.replace(id ? `/renters?open=${id}` : "/renters", { scroll: false });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Renters // ${renters.data?.length ?? "…"} profiles`}
        title="Renter profiles & document checks"
        actions={
          can("renters:create") && (
            <Button variant="dark" onClick={() => setAdding(true)}>
              <Plus size={14} /> Register renter
            </Button>
          )
        }
      />
      <Panel>
        {renters.isPending && <Loading />}
        <ErrorNote error={renters.error} className="m-4" />
        {renters.data?.length === 0 && <EmptyState>No renters yet.</EmptyState>}
        {renters.data && renters.data.length > 0 && (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead className={table.head}>
                <tr>
                  <th className={table.th}>Profile</th>
                  <th className={table.th}>Name & contact</th>
                  {showType && <th className={table.th}>{listed("residentType") ? f("residentType").label : f("country").label}</th>}
                  <th className={table.th}>{f("documents").label}</th>
                  <th className={`${table.th} text-center`}>Rentals</th>
                  {columns.map((column) => (
                    <th key={column.key} className={table.th}>
                      {column.label}
                    </th>
                  ))}
                  <th className={`${table.th} text-right`} />
                </tr>
              </thead>
              <tbody>
                {renters.data.map((r) => (
                  <tr key={r.id} className={table.row}>
                    <td className={`${table.td} font-bold text-brand`}>{r.profileId}</td>
                    <td className={table.td}>
                      <div className="text-sm font-bold text-ink">{r.fullName}</div>
                      <div className="text-[11px] text-muted">{r.phone}</div>
                      {listed("email") && r.email && <div className="text-[10px] text-muted">{r.email}</div>}
                    </td>
                    {showType && (
                      <td className={table.td}>
                        {listed("residentType") ? (
                          <Badge tone={r.residentType === "tourist" ? "violet" : "neutral"}>
                            {r.residentType === "tourist" ? `Tourist${listed("country") && r.country ? ` · ${r.country}` : ""}` : "Resident"}
                          </Badge>
                        ) : (
                          (r.country ?? "—")
                        )}
                      </td>
                    )}
                    <td className={table.td}>
                      <div className="flex max-w-md flex-wrap gap-1.5">
                        {r.documents.map((d) => (
                          <span key={d.id} className="inline-flex items-center gap-1 border border-ink/15 bg-panel px-2 py-0.5 text-[10px]">
                            <span className={`inline-block size-1.5 ${d.verified ? "bg-emerald-600" : "bg-amber-500"}`} />
                            <strong>{label("documentTypes", d.type)}</strong>
                            {d.number && <span className="text-muted">{d.number}</span>}
                          </span>
                        ))}
                      </div>
                      {!r.compliance.ok && (
                        <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-rose-700">
                          <AlertTriangle size={11} /> Missing {missingText(r.compliance)}
                        </p>
                      )}
                    </td>
                    <td className={`${table.td} text-center text-sm font-bold`}>{r.rentalsCount}</td>
                    {columns.map((column) => (
                      <td key={column.key} className={table.td}>
                        {column.cell(r)}
                      </td>
                    ))}
                    <td className={`${table.td} text-right`}>
                      <Button variant="outline" size="sm" onClick={() => open(r.id)}>
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
        <Dialog open onClose={() => setAdding(false)} title="Register a renter" eyebrow="Renters" width="md">
          <RenterForm
            onDone={(renter) => {
              setAdding(false);
              open(renter.id);
            }}
          />
        </Dialog>
      )}
      {openId && <RenterDialog renterId={openId} onClose={() => open(null)} />}
    </div>
  );
}

function RenterDialog({ renterId, onClose }: { renterId: string; onClose: () => void }) {
  const { data, error, isPending } = useRenter(renterId);
  return (
    <Dialog open onClose={onClose} title={data?.fullName ?? "Renter"} eyebrow={data ? `Renter profile // ${data.profileId}` : "Renter profile"} width="md">
      {isPending && <Loading />}
      <ErrorNote error={error} />
      {data && <RenterDetails renter={data} />}
    </Dialog>
  );
}

function RenterDetails({ renter }: { renter: RenterDossier }) {
  const { can, format, label } = useWorkspace();
  const missingText = useComplianceText();
  const verify = useTenantMutation((request, documentId: string) => request<Renter>("POST", `/renters/${renter.id}/documents/${documentId}/verify`));
  const { builtIn: f, custom: customFields } = useFields("renters");
  const hasCustomValues = useHasCustomValues("renters", renter.customFields);
  const canEdit = can("renters:update") && (customFields.length > 0 || f("notes").on);
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-4">
      <dl className="space-y-1 border border-line bg-paper p-3">
        <Row label={f("phone").label}>{renter.phone}</Row>
        {f("email").on && renter.email && <Row label={f("email").label}>{renter.email}</Row>}
        {f("address").on && renter.address && <Row label={f("address").label}>{renter.address}</Row>}
        {f("residentType").on && <Row label={f("residentType").label}>{renter.residentType === "tourist" ? "Tourist" : "Resident"}</Row>}
        {f("country").on && renter.country && <Row label={f("country").label}>{renter.country}</Row>}
        {f("emergencyContact").on && renter.emergencyContact && (
          <Row label={f("emergencyContact").label}>
            {[renter.emergencyContact.name, renter.emergencyContact.phone, renter.emergencyContact.relation].filter(Boolean).join(" · ")}
          </Row>
        )}
        {f("notes").on && renter.notes && <Row label={f("notes").label}>{renter.notes}</Row>}
        <Row label="Registered">
          {format.dateTime(renter.createdAt)} · {renter.source === "ONLINE" ? "guest portal" : "counter"}
        </Row>
      </dl>

      {(hasCustomValues || canEdit) && (
        <div className="space-y-2 border border-line p-3">
          {hasCustomValues && (
            <dl className="grid gap-2 sm:grid-cols-2">
              <CustomFieldList section="renters" values={renter.customFields} />
            </dl>
          )}
          {canEdit && (
            <>
              <Button size="sm" variant="outline" onClick={() => setEditing((on) => !on)}>
                {editing ? "Close" : "Edit details"}
              </Button>
              {editing && <CustomFieldsEditor section="renters" url={`/renters/${renter.id}`} values={renter.customFields} notes={renter.notes} onDone={() => setEditing(false)} />}
            </>
          )}
        </div>
      )}

      {!renter.compliance.ok && (
        <p className="flex items-center gap-2 border border-rose-300 bg-rose-50 p-3 font-bold text-rose-800">
          <AlertTriangle size={14} /> Missing {missingText(renter.compliance)}. Check before handing over a vehicle.
        </p>
      )}

      <div>
        <h4 className="mb-2 font-bold tracking-wider text-ink uppercase">{f("documents").label}</h4>
        {renter.documents.length === 0 && <p className="text-muted italic">No documents recorded.</p>}
        <ul className="space-y-2">
          {renter.documents.map((d) => (
            <li key={d.id} className={`flex items-center justify-between gap-3 border p-3 ${d.verified ? "border-emerald-300 bg-emerald-50/50" : "border-amber-300 bg-amber-50/50"}`}>
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className={d.verified ? "text-emerald-700" : "text-amber-600"} />
                <div>
                  <p className="font-bold text-ink">{label("documentTypes", d.type)}</p>
                  <p className="text-[10px] text-muted">
                    {d.number ?? "No number"}
                    {d.verified && d.verifiedBy ? ` · checked by ${d.verifiedBy.name}` : ""}
                  </p>
                </div>
              </div>
              {d.verified ? (
                <Badge tone="green">Verified</Badge>
              ) : can("renters:documents:verify") ? (
                <Button size="sm" variant="success" disabled={verify.isPending} onClick={() => verify.mutate(d.id, { onSuccess: () => toast.success("Document verified") })}>
                  Mark verified
                </Button>
              ) : (
                <Badge tone="amber">Not verified</Badge>
              )}
            </li>
          ))}
        </ul>
        <ErrorNote error={verify.error} className="mt-2" />
      </div>

      {can("renters:update") && (
        <div className="border border-brand/30 bg-brand/5 p-3">
          <p className="mb-2 text-[10px] font-bold tracking-wider text-brand uppercase">Add a document</p>
          <AddDocumentForm renter={renter} />
        </div>
      )}

      {renter.rentals && (
        <div>
          <h4 className="mb-2 font-bold tracking-wider text-ink uppercase">Rentals ({renter.rentals.length})</h4>
          {renter.rentals.length === 0 ? (
            <p className="text-muted italic">No rentals yet.</p>
          ) : (
            <ul className="divide-y divide-line border border-line">
              {renter.rentals.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 p-2">
                  <span>
                    <strong>{r.code}</strong> · {r.vehicle.plateNumber} · {format.day(r.startDate)} → {format.day(r.endDate)}
                  </span>
                  <RentalStatusBadge rental={r} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="text-muted">{label}: </span>
      <span className="text-ink">{children}</span>
    </div>
  );
}
