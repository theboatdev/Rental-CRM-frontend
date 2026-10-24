import { Badge, type Tone } from "@/components/ui/page";
import type { PaymentType, Rental, VehicleStatus } from "@/lib/contract";

const VEHICLE_TONES: Record<VehicleStatus, Tone> = { AVAILABLE: "green", RENTED: "brand", MAINTENANCE: "amber" };
const VEHICLE_LABELS: Record<VehicleStatus, string> = { AVAILABLE: "Available", RENTED: "Rented", MAINTENANCE: "Maintenance" };

export const VehicleStatusBadge = ({ status }: { status: VehicleStatus }) => <Badge tone={VEHICLE_TONES[status]}>{VEHICLE_LABELS[status]}</Badge>;

export function RentalStatusBadge({ rental }: { rental: Pick<Rental, "status" | "overdue"> }) {
  if (rental.overdue) return <Badge tone="rose">Overdue</Badge>;
  const tones: Record<Rental["status"], Tone> = { RESERVED: "amber", ACTIVE: "brand", COMPLETED: "green", CANCELLED: "muted" };
  return <Badge tone={tones[rental.status]}>{rental.status.toLowerCase()}</Badge>;
}

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  ADVANCE: "Booking advance",
  RENTAL: "Rental payment",
  DEPOSIT: "Security deposit",
  DAMAGE: "Damage charge",
  LATE_FEE: "Late fee",
  REFUND: "Refund",
};

export const TRANSMISSION_LABELS = { AUTOMATIC: "Automatic", MANUAL: "Manual" } as const;
export const FUEL_LABELS = { PETROL: "Petrol", DIESEL: "Diesel", HYBRID: "Hybrid", ELECTRIC: "Electric" } as const;
