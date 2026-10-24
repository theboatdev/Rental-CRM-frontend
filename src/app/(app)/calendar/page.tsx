"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { BookingDialog, type BookingDefaults } from "@/components/ops/booking-dialog";
import { RentalDialog } from "@/components/ops/rental-dialog";
import { ModuleGate } from "@/components/shell/module-gate";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorNote, Loading, PageHeader, Panel, table } from "@/components/ui/page";
import type { CalendarMonth, Rental } from "@/lib/contract";
import { addDays, shiftMonth } from "@/lib/dates";
import { useCalendar } from "@/lib/queries";
import { useWorkspace } from "@/lib/workspace";

export default function CalendarPage() {
  return (
    <ModuleGate module="calendar" permission="calendar:view">
      <Calendar />
    </ModuleGate>
  );
}

/** The day a rental stops holding its vehicle: its end date, or (still out past it) tomorrow. */
const heldUntil = (rental: Rental, today: string) => (rental.status === "ACTIVE" && rental.endDate <= today ? addDays(today, 1) : rental.endDate);

function Calendar() {
  const { can, format, today, config } = useWorkspace();
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [booking, setBooking] = useState<BookingDefaults | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const calendar = useCalendar(month);
  const canBook = can("rentals:create") && can("vehicles:read") && can("renters:read");
  const monthLabel = new Intl.DateTimeFormat(config.locale.dateLocale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
  const reservations = (calendar.data?.rentals ?? []).filter((r) => r.status === "RESERVED").sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Fleet schedule // ${reservations.length} upcoming bookings`}
        title="Booking calendar"
        actions={
          canBook && (
            <Button variant="primary" onClick={() => setBooking({})}>
              <Plus size={14} /> New booking
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>
          <ChevronLeft size={14} />
        </Button>
        <strong className="min-w-40 text-center">{monthLabel}</strong>
        <Button variant="outline" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>
          <ChevronRight size={14} />
        </Button>
        <Button variant="ghost" onClick={() => setMonth(today().slice(0, 7))}>
          Today
        </Button>
        <div className="ml-auto flex flex-wrap gap-2 font-mono text-[10px]">
          <span className="bg-emerald-100 px-2 py-1">On the road</span>
          <span className="bg-amber-100 px-2 py-1">Reserved</span>
          <span className="bg-slate-200 px-2 py-1">Completed</span>
          <span className="bg-rose-100 px-2 py-1">Maintenance</span>
          <span className="bg-paper px-2 py-1">{canBook ? "Free · click to book" : "Free"}</span>
        </div>
      </div>

      <Panel>
        {calendar.isPending && <Loading />}
        <ErrorNote error={calendar.error} className="m-4" />
        {calendar.data && <Grid data={calendar.data} canBook={canBook} onBook={setBooking} onOpen={setOpenId} />}
      </Panel>

      <Panel title={`Upcoming bookings (${reservations.length})`}>
        {reservations.length === 0 ? (
          <EmptyState>No upcoming bookings this month.</EmptyState>
        ) : (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead className={table.head}>
                <tr>
                  <th className={table.th}>Booking</th>
                  <th className={table.th}>Vehicle / renter</th>
                  <th className={table.th}>Dates</th>
                  <th className={`${table.th} text-right`}>Rental / deposit</th>
                  <th className={`${table.th} text-right`}>Paid</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr key={r.id} className={`${table.row} cursor-pointer`} onClick={() => setOpenId(r.id)}>
                    <td className={`${table.td} font-bold`}>{r.code}</td>
                    <td className={table.td}>
                      {r.vehicle.plateNumber}
                      <br />
                      {r.renter.fullName} · {r.renter.phone}
                    </td>
                    <td className={table.td}>
                      {format.day(r.startDate)} → {format.day(r.endDate)}
                      <br />
                      {r.totalDays} days
                    </td>
                    <td className={`${table.td} text-right`}>
                      {format.money(r.totalAmount)}
                      <br />
                      <span className="text-muted">{format.money(r.depositAmount)}</span>
                    </td>
                    <td className={`${table.td} text-right`}>{format.money(r.paidAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {booking && <BookingDialog defaults={booking} onClose={() => setBooking(null)} onBooked={(rental) => setOpenId(rental.id)} />}
      {openId && <RentalDialog rentalId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function Grid({ data, canBook, onBook, onOpen }: { data: CalendarMonth; canBook: boolean; onBook: (defaults: BookingDefaults) => void; onOpen: (id: string) => void }) {
  const { config } = useWorkspace();
  const weekday = new Intl.DateTimeFormat(config.locale.dateLocale, { weekday: "short", timeZone: "UTC" });
  const days = Array.from({ length: data.days }, (_, i) => `${data.month}-${String(i + 1).padStart(2, "0")}`);
  const onDay = (vehicleId: string, date: string) =>
    data.rentals.find((r) => r.vehicle.id === vehicleId && r.startDate <= date && date < heldUntil(r, data.today));

  if (data.vehicles.length === 0) return <EmptyState>No vehicles yet.</EmptyState>;
  return (
    <div className="max-h-[560px] overflow-auto">
      <table className="w-full border-collapse font-mono text-xs">
        <thead className="sticky top-0 z-20 bg-[#F8F8F9]">
          <tr>
            <th className="sticky left-0 z-30 min-w-[180px] bg-[#F8F8F9] p-3 text-left">Vehicle</th>
            {days.map((date) => (
              <th key={date} className={`min-w-[52px] p-2 text-center ${date === data.today ? "text-brand" : ""}`}>
                {Number(date.slice(8))}
                <br />
                <span className="font-normal text-muted">{weekday.format(new Date(`${date}T00:00:00Z`))}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.vehicles.map((vehicle) => (
            <tr key={vehicle.id}>
              <th className="sticky left-0 z-10 border-t border-line bg-panel p-3 text-left">
                <span className="block">{vehicle.plateNumber}</span>
                <span className="font-normal text-muted">
                  {vehicle.make} {vehicle.model}
                </span>
              </th>
              {days.map((date) => {
                const rental = onDay(vehicle.id, date);
                const blocked = !rental && (vehicle.status === "MAINTENANCE" || date < data.today || !canBook);
                const tone = rental
                  ? rental.status === "ACTIVE"
                    ? "bg-emerald-100 text-emerald-900"
                    : rental.status === "RESERVED"
                      ? "bg-amber-100 text-amber-900"
                      : "bg-slate-200 text-slate-700"
                  : vehicle.status === "MAINTENANCE"
                    ? "bg-rose-100 text-rose-800"
                    : "bg-paper hover:bg-brand/10";
                return (
                  <td key={date} className="border border-line p-0">
                    <button
                      type="button"
                      className={`h-14 w-full px-1 text-[10px] ${tone} disabled:cursor-default`}
                      disabled={blocked}
                      title={rental ? `${rental.code} · ${rental.renter.fullName}` : `${vehicle.plateNumber} · ${date}`}
                      aria-label={rental ? `${rental.code} on ${date}` : `Book ${vehicle.plateNumber} from ${date}`}
                      onClick={() => (rental ? onOpen(rental.id) : onBook({ vehicleId: vehicle.id, startDate: date }))}
                    >
                      {rental ? <span className="block max-w-[70px] truncate">{rental.renter.fullName}</span> : vehicle.status === "MAINTENANCE" ? "Service" : ""}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
