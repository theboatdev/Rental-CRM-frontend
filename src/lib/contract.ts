/**
 * Types for what the backend's tenant API (/api/v1) returns. The backend owns
 * the rules and validates everything; these types only describe the shapes
 * for the UI. Keep them in step with backend/src/tenant/presenters.js and
 * backend/src/platform/config/schema.js.
 *
 * Fields a caller may not see are optional: profit, margin and revenue figures
 * need financials:view, cost figures costs:read, fuel figures fuel:read.
 */

export type ModuleKey =
  | "dashboard"
  | "vehicles"
  | "renters"
  | "rentals"
  | "calendar"
  | "payments"
  | "costs"
  | "fuelLogs"
  | "whatsappDigest"
  | "guestPortal";

export type ResidentType = "local" | "tourist";

export interface ListItem {
  key: string;
  label: string;
  active: boolean;
}

export interface DocumentTypeItem extends ListItem {
  requiredFor: ResidentType[];
}

interface Toggle {
  enabled: boolean;
}

export interface TenantConfig {
  schemaVersion: number;
  branding: {
    displayName: string;
    shortName: string;
    tagline: string;
    logoUrl: string | null;
    primaryColor: string;
    supportEmail: string | null;
    supportPhone: string | null;
    whatsappNumber: string | null;
  };
  locale: {
    country: string;
    currency: string;
    secondaryCurrency: string | null;
    timezone: string;
    dateLocale: string;
    distanceUnit: "km" | "mi";
  };
  modules: {
    dashboard: Toggle;
    vehicles: Toggle & { serviceIntervalKm: number };
    renters: Toggle;
    rentals: Toggle & { inspectionPoints: string[]; requirePickupInspection: boolean; requireDropInspection: boolean };
    calendar: Toggle;
    payments: Toggle;
    costs: Toggle & { requireBillUpload: boolean };
    fuelLogs: Toggle;
    whatsappDigest: Toggle & { cron: string; recipients: string[] };
    guestPortal: Toggle & { residentTypes: ResidentType[]; requireDocumentUpload: boolean };
  };
  navigation: Array<{ module: ModuleKey; label: string }>;
  lists: {
    documentTypes: DocumentTypeItem[];
    paymentMethods: ListItem[];
    costCategories: ListItem[];
  };
  rules: {
    defaultDepositAmount: number;
    minRentalDays: number;
    touristPermitDocumentKeys: string[];
    codePrefixes: { rental: string; booking: string; receipt: string; advance: string; renter: string };
  };
  limits: { maxVehicles: number; maxUsers: number; storageGb: number };
}

/** GET /config */
export interface ConfigResponse {
  version: number;
  config: TenantConfig;
}

/** GET /me */
export interface Me {
  user: { id: string; clerkUserId: string; name: string | null; email: string };
  tenant: { id: string; name: string; slug: string };
  role: { key: string; name: string; system: boolean };
  permissions: string[];
  configVersion: number;
}

export interface Actor {
  id: string;
  name: string;
}

export type VehicleStatus = "AVAILABLE" | "RENTED" | "MAINTENANCE";
export type Transmission = "AUTOMATIC" | "MANUAL";
export type FuelType = "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC";

export interface VehicleRef {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
}

export interface VehicleStats {
  trips: number;
  renters: number;
  distance: number;
  serviceCosts?: number;
  fuelCosts?: number;
  fuelLiters?: number;
  revenue?: number;
  operatingCosts?: number;
  profit?: number;
}

export interface Vehicle extends VehicleRef {
  year: number;
  transmission: Transmission;
  fuelType: FuelType;
  dailyRate: number;
  secondaryDailyRate: number | null;
  depositAmount: number;
  mileage: number;
  status: VehicleStatus;
  thumbnail: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleWithStats extends Vehicle {
  stats: VehicleStats;
}

/** GET /vehicles/:id. A history list is null when the caller can't read it or its module is off. */
export interface VehicleDossier extends VehicleWithStats {
  rentals: Rental[] | null;
  costs: Cost[] | null;
  fuelLogs: FuelLog[] | null;
}

export interface Availability {
  vehicle: VehicleRef;
  dailyRate: number;
  depositAmount: number;
  available: boolean;
  reason: string | null;
}

export interface RenterRef {
  id: string;
  profileId: string;
  fullName: string;
  phone: string;
}

export interface RenterDocument {
  id: string;
  type: string;
  number: string | null;
  verified: boolean;
  verifiedBy: Actor | null;
  verifiedAt: string | null;
  uploadedAt: string | null;
}

export interface Compliance {
  ok: boolean;
  missingDocuments: string[];
  needsPermit: boolean;
  unverified: string[];
}

export interface Renter extends RenterRef {
  email: string | null;
  residentType: ResidentType;
  country: string | null;
  address: string | null;
  emergencyContact: { name: string; phone: string | null; relation: string | null } | null;
  documents: RenterDocument[];
  compliance: Compliance;
  source: "COUNTER" | "ONLINE";
  notes: string;
  rentalsCount: number;
  createdAt: string;
}

export interface RenterDossier extends Renter {
  rentals: Rental[] | null;
}

export type RentalStatus = "RESERVED" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface Inspection {
  at: string;
  by: Actor | null;
  odometer: number | null;
  points: string[];
  notes: string;
}

export interface Rental {
  id: string;
  code: string;
  bookingCode: string | null;
  status: RentalStatus;
  overdue: boolean;
  source: "COUNTER" | "ONLINE";
  vehicle: VehicleRef;
  renter: RenterRef;
  /** Calendar dates, YYYY-MM-DD. The rental holds the vehicle up to, not including, the end date. */
  startDate: string;
  endDate: string;
  actualReturnDate: string | null;
  totalDays: number;
  dailyRate: number;
  totalAmount: number;
  depositAmount: number;
  paidAmount: number;
  balance: number;
  depositRefunded: boolean;
  startMileage: number | null;
  endMileage: number | null;
  distance: number | null;
  pickupInspection: Inspection | null;
  dropInspection: Inspection | null;
  cancelledAt: string | null;
  createdBy: Actor | null;
  notes: string;
  createdAt: string;
}

/** GET /rentals/:id. `payments` is null without payments:read. */
export interface RentalDetail extends Rental {
  payments: Payment[] | null;
}

export interface CalendarMonth {
  month: string;
  today: string;
  days: number;
  vehicles: Array<VehicleRef & { status: VehicleStatus }>;
  rentals: Rental[];
}

export type PaymentType = "ADVANCE" | "RENTAL" | "DEPOSIT" | "DAMAGE" | "LATE_FEE" | "REFUND";

export interface Payment {
  id: string;
  receiptNumber: string;
  type: PaymentType;
  method: string;
  amount: number;
  rental: { id: string; code?: string };
  renter: RenterRef | { id: string };
  paidAt: string;
  receivedBy: Actor | null;
  transactionReference: string | null;
  notes: string;
  voided: boolean;
  voidedAt: string | null;
  voidedBy: Actor | null;
  voidReason: string | null;
}

export interface Cost {
  id: string;
  vehicle: VehicleRef;
  category: string;
  title: string;
  amount: number;
  incurredAt: string;
  serviceCenter: string | null;
  invoiceNumber: string | null;
  odometer: number | null;
  createdBy: Actor | null;
  notes: string;
  createdAt: string;
}

export interface FuelLog {
  id: string;
  vehicle: VehicleRef;
  filledAt: string;
  liters: number;
  pricePerLiter: number | null;
  totalCost: number;
  station: string | null;
  odometer: number | null;
  createdBy: Actor | null;
  notes: string;
  createdAt: string;
}

export type DashboardRange = "7d" | "30d" | "90d" | "all";

export interface DashboardAlert {
  kind: "overdue" | "compliance" | "maintenance" | "service_due";
  title: string;
  detail: string;
  rentalId?: string;
  renterId?: string;
  vehicleId?: string;
}

export interface Dashboard {
  range: DashboardRange;
  from: string | null;
  to: string;
  fleet: { total: number; available: number; rented: number; maintenance: number; utilization: number };
  rentals: { active: number; reserved: number; overdue: number; returnsToday: number; pickupsToday: number };
  totals: {
    trips: number;
    serviceCosts?: number;
    fuelCosts?: number;
    fuelLiters?: number;
    revenue?: number;
    operatingCosts?: number;
    profit?: number;
    profitMargin?: number | null;
  };
  vehicles: Array<VehicleRef & VehicleStats & { status: VehicleStatus; mileage: number }>;
  alerts: DashboardAlert[];
}

export interface WhatsAppDigest {
  message: string;
  recipients: string[];
  cron: string;
  timezone: string;
  includesFinancials: boolean;
  generatedAt: string;
}

export interface Member {
  id: string;
  clerkUserId: string;
  name: string | null;
  email: string;
  roleKey: string;
  status: "active" | "removed";
  joinedAt: string;
  removedAt: string | null;
}

export interface Invitation {
  id: string;
  email: string;
  roleKey: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface Role {
  key: string;
  name: string;
  description: string;
  permissions: string[];
  system: boolean;
  memberCount: number;
}

export interface PermissionInfo {
  key: string;
  group: string;
  label: string;
  module: ModuleKey | null;
  available: boolean;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: Actor;
  action: string;
  entityType: string | null;
  entityId: string | null;
  summary: string;
}

export interface ApiIssue {
  path: string;
  message: string;
}
