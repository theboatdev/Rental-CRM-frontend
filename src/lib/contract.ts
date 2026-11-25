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
  | "suppliers"
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

/** One vehicle compliance document type configured for this tenant (e.g. insurance, revenue licence). */
export interface VehicleDocumentTypeItem extends ListItem {
  /** Days before expiry to show a document_expiry alert on the dashboard. */
  alertDaysBefore: number;
}

interface Toggle {
  enabled: boolean;
}

export type FieldSection = "vehicles" | "renters" | "rentals" | "payments" | "costs";

/** A built-in field's settings. Core fields (rates, dates, amounts…) are always on, required and in lists. */
export interface BuiltInFieldSettings {
  label: string;
  helpText: string;
  active: boolean;
  required: boolean;
  showInList: boolean;
}

interface CustomFieldBase {
  key: string;
  label: string;
  /** Needed when a record is created; a required yes/no field must be ticked. */
  required: boolean;
  /** Inactive fields are hidden; records keep their values. */
  active: boolean;
  /** Also shown as a column in the section's list. */
  showInList: boolean;
  helpText: string;
}

/** An extra field the tenant's config adds to a kind of record (`fields.<section>.custom`). */
export type CustomField = CustomFieldBase &
  (
    | { type: "text"; maxLength: number }
    | { type: "longText"; maxLength: number }
    | { type: "number"; min: number | null; max: number | null }
    | { type: "date" }
    | { type: "boolean" }
    | { type: "select"; options: ListItem[] }
    /** One uploaded file: `images` (stored as JPEGs at most 2000 px) or `documents` (images or PDF). */
    | { type: "file"; accept: "images" | "documents" }
  );

/** A record's custom field values by key: text, YYYY-MM-DD dates and select option keys as strings, files as `FileView`s. */
export type CustomFieldValues = Record<string, string | number | boolean | FileView>;

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
    vehicles: Toggle & { serviceIntervalKm: number; thirdPartyVehicles: boolean; rateOnVehicle: boolean };
    renters: Toggle;
    rentals: Toggle & {
      inspectionPoints: string[];
      requirePickupInspection: boolean;
      requireDropInspection: boolean;
      /** specificVehicle = plate required; vehicleClass = make/model hold; both = staff choose. */
      reservationMode: "specificVehicle" | "vehicleClass" | "both";
      /** When on, roles without financials:view don't see booking/vehicle rates, totals or deposits. */
      hideBookingPricingWithoutFinancials: boolean;
    };
    calendar: Toggle;
    payments: Toggle;
    costs: Toggle & { requireBillUpload: boolean };
    suppliers: Toggle;
    fuelLogs: Toggle;
    whatsappDigest: Toggle & { cron: string; recipients: string[] };
    guestPortal: Toggle & { residentTypes: ResidentType[]; requireDocumentUpload: boolean };
  };
  navigation: Array<{ module: ModuleKey; label: string }>;
  lists: {
    documentTypes: DocumentTypeItem[];
    paymentMethods: ListItem[];
    costCategories: ListItem[];
    /** Vehicle compliance document types (insurance, revenue licence, etc.). Absent on older published configs until republished. */
    vehicleDocumentTypes?: VehicleDocumentTypeItem[];
  };
  rules: {
    defaultDepositAmount: number;
    minRentalDays: number;
    touristPermitDocumentKeys: string[];
    codePrefixes: { rental: string; booking: string; receipt: string; advance: string; renter: string; supplier: string };
  };
  /** Every field of each kind of record: settings for the built-in ones, and the tenant's custom fields. */
  fields: Record<FieldSection, { builtIn: Record<string, BuiltInFieldSettings>; custom: CustomField[] }>;
  /** The PDFs the app issues. The backend decides what's in them; the app only needs to know they're on. */
  documents: { returnReceipt: { enabled: boolean } };
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
/** Owned fleet vs supplier-sourced. Meaningful when modules.vehicles.thirdPartyVehicles is on. */
export type VehicleOwnership = "OWNED" | "THIRD_PARTY";

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
  /** Present when third-party vehicle tracking is on. */
  supplierCosts?: number;
  /** revenue − supplierCosts; present when third-party vehicle tracking is on. */
  grossProfit?: number;
  operatingCosts?: number;
  profit?: number;
}

/** A compliance document attached to a vehicle (insurance, revenue licence, etc.). */
export interface VehicleDocument {
  id: string;
  /** Key from lists.vehicleDocumentTypes. */
  type: string;
  /** YYYY-MM-DD expiry date, or null if not set. */
  expiresAt: string | null;
  file: FileView | null;
  uploadedAt: string | null;
}

export interface Vehicle extends VehicleRef {
  /** Null when the config turns the year off. */
  year: number | null;
  transmission: Transmission;
  fuelType: FuelType;
  /** Absent when booking pricing is hidden from this caller. */
  dailyRate?: number;
  /** Absent when booking pricing is hidden from this caller. */
  secondaryDailyRate?: number | null;
  /** Absent when booking pricing is hidden from this caller. */
  depositAmount?: number;
  mileage: number;
  status: VehicleStatus;
  ownership: VehicleOwnership;
  /** Linked supplier when ownership is THIRD_PARTY and the suppliers module is on. */
  supplierId?: string | null;
  thumbnail: string | null;
  notes: string;
  customFields: CustomFieldValues;
  /** Compliance documents (insurance, revenue licence, etc.). Empty/absent when none have been added. */
  documents?: VehicleDocument[];
  createdAt: string;
  updatedAt: string;
}

export type SupplierStatus = "ACTIVE" | "INACTIVE";

/** GET /suppliers list item. */
export interface Supplier {
  id: string;
  profileId: string;
  name: string;
  contactPerson: string | null;
  phone: string;
  email: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankAccountHolder: string | null;
  status: SupplierStatus;
  notes: string;
  vehicleCount: number;
  createdAt: string;
  updatedAt: string;
}

/** GET /suppliers/:id — profile plus linked vehicles and hire history. */
export interface SupplierDossier extends Supplier {
  vehicles: Vehicle[];
  hireHistory: Rental[] | null;
  /** Sum of supplierRentalCost across hire history, when history is present. */
  supplierCostsTotal?: number;
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
  ownership: VehicleOwnership;
  /** Absent when booking pricing is hidden from this caller. */
  dailyRate?: number;
  /** Absent when booking pricing is hidden from this caller. */
  depositAmount?: number;
  available: boolean;
  reason: string | null;
}

export interface RenterRef {
  id: string;
  profileId: string;
  fullName: string;
  phone: string;
}

/** A stored file (scan, photo, bill). `url` expires after 10 minutes; it's null when the caller can't read the record. */
export interface FileView {
  url: string | null;
  format: string;
  bytes: number;
  uploadedAt: string | null;
}

export type FileKind = "document" | "inspection" | "bill" | "vehiclePhoto" | "vehicleDocument";

/** POST /uploads: the fields of a signed upload, posted to Cloudinary together with the file. */
export interface UploadSignature {
  kind: FileKind | "logo" | "customField";
  publicId: string;
  uploadUrl: string;
  fields: Record<string, string | number>;
}

/** Cloudinary's response to an upload, in the shape the API takes it back with a record. */
export interface UploadedFile {
  publicId: string;
  version: number;
  signature: string;
  format: string;
  bytes: number;
  resourceType: "image" | "raw";
}

export interface RenterDocument {
  id: string;
  type: string;
  number: string | null;
  /** The scan, when one was uploaded. */
  file: FileView | null;
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
  customFields: CustomFieldValues;
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
  /** The checked inspection points. */
  points: string[];
  /** The points with a photo. */
  photos: Array<{ point: string; file: FileView | null }>;
  notes: string;
}

export type ReservationMode = "specificVehicle" | "vehicleClass" | "both";

export interface VehicleClassAvailability {
  make: string;
  model: string;
  fleetCount: number;
  availableCount: number;
  /** Absent when booking pricing is hidden from this caller. */
  dailyRate?: number;
  /** Absent when booking pricing is hidden from this caller. */
  depositAmount?: number;
  available: boolean;
  reason: string | null;
}

export interface AvailabilityResponse {
  vehicles: Availability[];
  classes: VehicleClassAvailability[];
  reservationMode: ReservationMode;
}

export interface Rental {
  id: string;
  code: string;
  bookingCode: string | null;
  status: RentalStatus;
  overdue: boolean;
  source: "COUNTER" | "ONLINE";
  /** Null while a make/model hold has no plate assigned yet. */
  vehicle: VehicleRef | null;
  requestedMake: string | null;
  requestedModel: string | null;
  needsVehicleAssignment: boolean;
  renter: RenterRef;
  /** Calendar dates, YYYY-MM-DD. The rental holds the vehicle up to, not including, the end date. */
  startDate: string;
  endDate: string;
  actualReturnDate: string | null;
  totalDays: number;
  /** Absent when booking pricing is hidden from this caller. */
  dailyRate?: number;
  /** Absent when booking pricing is hidden from this caller. */
  totalAmount?: number;
  /** Absent when booking pricing is hidden from this caller. */
  depositAmount?: number;
  /** Amount payable to a third-party supplier; present when recorded on the booking. */
  supplierRentalCost?: number;
  paidAmount: number;
  /** Absent when booking pricing is hidden from this caller. */
  balance?: number;
  depositRefunded: boolean;
  /** Staff confirmed the renter paid the full amount (usually at pickup). Cleared if a void or refund leaves money owed. */
  fullPayment: { at: string; by: Actor | null } | null;
  startMileage: number | null;
  endMileage: number | null;
  distance: number | null;
  pickupInspection: Inspection | null;
  dropInspection: Inspection | null;
  cancelledAt: string | null;
  createdBy: Actor | null;
  notes: string;
  customFields: CustomFieldValues;
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
  customFields: CustomFieldValues;
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
  /** The scanned bill. */
  bill: FileView | null;
  odometer: number | null;
  createdBy: Actor | null;
  notes: string;
  customFields: CustomFieldValues;
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
  kind: "overdue" | "compliance" | "maintenance" | "service_due" | "document_expiry";
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
    /** Present when third-party vehicle tracking is on. */
    supplierCosts?: number;
    /** revenue − supplierCosts; present when third-party vehicle tracking is on. */
    grossProfit?: number;
    operatingCosts?: number;
    profit?: number;
    profitMargin?: number | null;
  };
  vehicles: Array<VehicleRef & VehicleStats & { status: VehicleStatus; mileage: number }>;
  alerts: DashboardAlert[];
}

/** One sending of the digest, on its schedule or by hand. */
export interface DigestRun {
  id: string;
  trigger: "schedule" | "manual";
  slot: string | null;
  status: "sending" | "sent" | "partial" | "failed";
  mode: "text" | "template" | null;
  includesFinancials: boolean;
  results: Array<{ to: string; ok: boolean; error: string | null }>;
  /** Why nothing was sent, e.g. no WhatsApp connection. */
  error: string | null;
  by: Actor | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface WhatsAppDigest {
  message: string;
  recipients: string[];
  cron: string;
  timezone: string;
  includesFinancials: boolean;
  generatedAt: string;
  /** Whether the workspace's WhatsApp is connected (the platform team sets it up), and the latest runs. */
  delivery: { connected: boolean; mode: "text" | "template" | null; runs: DigestRun[] } | null;
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

// Guest booking portal: /api/public/:slug, used by /book/<slug> without sign-in.

export interface PortalFieldSetting {
  label: string;
  helpText: string;
  on: boolean;
  required: boolean;
}

/** GET /api/public/:slug: what the booking page needs. */
export interface PortalProfile {
  tenant: { name: string; slug: string };
  branding: TenantConfig["branding"];
  locale: Pick<TenantConfig["locale"], "country" | "currency" | "timezone" | "dateLocale" | "distanceUnit">;
  /** Today in the tenant's timezone, YYYY-MM-DD. */
  today: string;
  minRentalDays: number;
  residentTypes: ResidentType[];
  requireDocumentUpload: boolean;
  /** Whether scans can be uploaded at all (the platform's file storage is set up). */
  uploads: boolean;
  documentTypes: Array<{ key: string; label: string; requiredFor: ResidentType[] }>;
  fields: {
    renter: Record<"email" | "residentType" | "country" | "address" | "emergencyContact", PortalFieldSetting>;
    rental: { notes: PortalFieldSetting };
  };
}

export interface GuestVehicle {
  id: string;
  make: string;
  model: string;
  year: number | null;
  transmission: Transmission;
  fuelType: FuelType;
  /** Omitted when the vehicle has no catalog rate (booking-only pricing). */
  dailyRate?: number;
  depositAmount: number;
  /** For the whole stay. Omitted when dailyRate is not set. */
  totalAmount?: number;
  thumbnail: string | null;
}

/** GET /api/public/:slug/vehicles?startDate&endDate */
export interface GuestVehicles {
  startDate: string;
  endDate: string;
  totalDays: number;
  vehicles: GuestVehicle[];
}

/** POST /api/public/:slug/bookings: the voucher. */
export interface GuestVoucher {
  bookingCode: string;
  profileId: string;
  fullName: string;
  vehicle: { make: string; model: string; year: number | null };
  startDate: string;
  endDate: string;
  totalDays: number;
  dailyRate: number;
  totalAmount: number;
  depositAmount: number;
  documents: Array<{ type: string; scanned: boolean }>;
  createdAt: string;
}
