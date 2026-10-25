"use client";

import { Camera, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { BookingDialog } from "@/components/ops/booking-dialog";
import { useFields, useListColumns } from "@/components/ops/fields";
import { RentalDialog } from "@/components/ops/rental-dialog";
import { RentalStatusBadge } from "@/components/ops/status";
import { ModuleGate } from "@/components/shell/module-gate";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorNote, Loading, PageHeader, Panel, table } from "@/components/ui/page";
import type { Rental, RentalStatus } from "@/lib/contract";
import { useRentals } from "@/lib/queries";
import { useWorkspace } from "@/lib/workspace";

const FILTERS: Array<{ value: RentalStatus | "open" | undefined; label: string }> = [
  { value: undefined, label: "All" },
  { value: "open", label: "Open" },
  { value: "RESERVED", label: "Reserved" },
  { value: "ACTIVE", label: "On the road" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function RentalsPage() {
  return (
    <ModuleGate module="rentals" permission="rentals:read">
      <Suspense fallback={<Loading />}>
        <Rentals />
      </Suspense>
    </ModuleGate>
  );
}

/** Rentals and bookings. `?open=<id>` opens one, `?new=1` starts a booking (links from the dashboard and calendar). */
function Rentals() {
  const { can, format } = useWorkspace();
  const params = useSearchParams();
  const router = useRouter();
  const [filter, setFilter] = useState<RentalStatus | "open" | undefined>(undefined);
  const [booking, setBooking] = useState(params.get("new") === "1");
  const openId = params.get("open");
  const rentals = useRentals(filter);
  const { builtIn: field } = useFields("rentals");
  // The table shows these built-in fields in its own way; the config decides whether the rate shows.
  const { listed, columns } = useListColumns<Rental>("rentals", ["renter", "vehicle", "startDate", "endDate", "dailyRate"]);

  const openRental = (id: string | null) => router.replace(id ? `/rentals?open=${id}` : "/rentals", { scroll: false });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Contracts · ${rentals.data?.length ?? "…"} shown`}
        title="Rentals"
        actions={
          can("rentals:create") && (
            <Button variant="primary" onClick={() => setBooking(true)}>
              <Plus size={14} /> New booking
            </Button>
          )
        }
      />

      <div className="flex flex-wrap gap-1 font-sans text-xs font-semibold">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => setFilter(f.value)}
            aria-pressed={filter === f.value}
            className={`min-h-10 rounded-md border px-3 py-2 ${filter === f.value ? "border-ink bg-ink text-white" : "border-ink/15 bg-panel text-muted hover:text-ink"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Panel>
        {rentals.isPending && <Loading />}
        <ErrorNote error={rentals.error} className="m-4" />
        {rentals.data?.length === 0 && <EmptyState>No rentals here yet.</EmptyState>}
        {rentals.data && rentals.data.length > 0 && (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead className={table.head}>
                <tr>
                  <th className={table.th}>Code</th>
                  <th className={table.th}>{field("vehicle").label}</th>
                  <th className={table.th}>{field("renter").label}</th>
                  <th className={table.th}>Dates</th>
                  <th className={`${table.th} text-right`}>Total</th>
                  <th className={`${table.th} text-right`}>Outstanding</th>
                  <th className={`${table.th} text-center`}>Inspection</th>
                  {columns.map((column) => (
                    <th key={column.key} className={table.th}>
                      {column.label}
                    </th>
                  ))}
                  <th className={`${table.th} text-center`}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rentals.data.map((r) => (
                  <tr key={r.id} className={`${table.row} cursor-pointer`} onClick={() => openRental(r.id)}>
                    <td className={`${table.td} font-semibold text-ink`}>{r.code}</td>
                    <td className={`${table.td} font-semibold text-brand`}>{r.vehicle.plateNumber}</td>
                    <td className={table.td}>
                      <div className="font-semibold text-ink">{r.renter.fullName}</div>
                      <div className="text-xs text-muted">{r.renter.profileId}</div>
                    </td>
                    <td className={table.td}>
                      <div className="font-semibold text-ink">
                        {format.day(r.startDate)} → {format.day(r.endDate)}
                      </div>
                      <div className="text-xs text-muted">
                        {r.totalDays} days{listed("dailyRate") ? ` @ ${format.money(r.dailyRate)}` : ""}
                      </div>
                    </td>
                    <td className={`${table.td} text-right font-semibold text-ink`}>{format.money(r.totalAmount)}</td>
                    <td className={`${table.td} text-right ${r.balance > 0 && r.status !== "CANCELLED" ? "font-semibold text-rose-700" : "text-muted"}`}>{format.money(r.balance)}</td>
                    <td className={`${table.td} text-center`}>
                      {r.pickupInspection ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold">
                          <Camera size={12} />
                          {r.dropInspection ? "Pickup + return" : "Pickup"}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">Awaiting hand-over</span>
                      )}
                    </td>
                    {columns.map((column) => (
                      <td key={column.key} className={table.td}>
                        {column.cell(r)}
                      </td>
                    ))}
                    <td className={`${table.td} text-center`}>
                      <RentalStatusBadge rental={r} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {booking && <BookingDialog defaults={{}} onClose={() => setBooking(false)} onBooked={(rental) => openRental(rental.id)} />}
      {openId && <RentalDialog rentalId={openId} onClose={() => openRental(null)} />}
    </div>
  );
}
