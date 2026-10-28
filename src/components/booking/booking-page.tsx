"use client";

import { CalendarDays, CarFront, CheckCircle2, Loader2, Plus, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { FilePicker, useUploadsInFlight } from "@/components/ops/files";
import { FUEL_LABELS, TRANSMISSION_LABELS } from "@/components/ops/status";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ErrorNote } from "@/components/ui/page";
import { ApiError } from "@/lib/api";
import type { GuestVehicles, GuestVoucher, PortalProfile, ResidentType, UploadedFile } from "@/lib/contract";
import { addDays, daysBetween } from "@/lib/dates";
import { publicRequest, uploadGuestDocument } from "@/lib/public-api";
import { DOCUMENT_ACCEPT } from "@/lib/uploads";

/**
 * The public booking page at /book/<slug>, on the backend's guest portal API.
 * A renter picks dates and a vehicle, enters their details and documents
 * (with scans), and gets a voucher to send to the company on WhatsApp. The
 * backend applies every rule; this page shows what it says.
 */
export function BookingPage({ slug }: { slug: string }) {
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    publicRequest<PortalProfile>("GET", `/${encodeURIComponent(slug)}`).then(setProfile, setError);
  }, [slug]);
  useEffect(() => {
    if (!profile) return;
    document.documentElement.style.setProperty("--brand", profile.branding.primaryColor);
    document.title = `Book a vehicle · ${profile.branding.displayName}`;
  }, [profile]);

  if (error) {
    return (
      <Page>
        <p className="py-24 text-center text-sm text-muted">{error.status === 404 ? "This booking page isn't available." : error.message}</p>
      </Page>
    );
  }
  if (!profile) {
    return (
      <Page>
        <p className="flex items-center justify-center gap-2 py-24 text-sm text-muted" role="status">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </p>
      </Page>
    );
  }
  return <Booking profile={profile} slug={slug} />;
}

function useFormatters(profile: PortalProfile) {
  return useMemo(() => {
    const money = new Intl.NumberFormat(profile.locale.dateLocale, { style: "currency", currency: profile.locale.currency, maximumFractionDigits: 0 });
    // Calendar dates are formatted in UTC so they keep their day.
    const date = new Intl.DateTimeFormat(profile.locale.dateLocale, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
    return { money: (value: number) => money.format(value), day: (value: string) => date.format(new Date(`${value}T00:00:00Z`)) };
  }, [profile]);
}

function Booking({ profile, slug }: { profile: PortalProfile; slug: string }) {
  const minDays = Math.max(1, profile.minRentalDays);
  const [dates, setDates] = useState({ startDate: addDays(profile.today, 1), endDate: addDays(profile.today, 1 + minDays) });
  const [search, setSearch] = useState<{ pending: boolean; data: GuestVehicles | null; error: ApiError | null }>({ pending: false, data: null, error: null });
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [voucher, setVoucher] = useState<GuestVoucher | null>(null);
  const days = daysBetween(dates.startDate, dates.endDate);
  const chosen = search.data?.vehicles.find((v) => v.id === vehicleId) ?? null;
  const format = useFormatters(profile);

  const setDate = (patch: Partial<typeof dates>) => {
    setDates((current) => ({ ...current, ...patch }));
    setSearch({ pending: false, data: null, error: null });
    setVehicleId(null);
  };
  const find = () => {
    setSearch({ pending: true, data: null, error: null });
    publicRequest<GuestVehicles>("GET", `/${encodeURIComponent(slug)}/vehicles?startDate=${dates.startDate}&endDate=${dates.endDate}`).then(
      (data) => setSearch({ pending: false, data, error: null }),
      (error) => setSearch({ pending: false, data: null, error }),
    );
  };

  if (voucher) return <Voucher profile={profile} voucher={voucher} />;

  return (
    <Page profile={profile}>
      <Step number={1} title="Your dates" icon={<CalendarDays size={16} />}>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Pickup">{(id) => <Input id={id} type="date" min={profile.today} value={dates.startDate} onChange={(e) => setDate({ startDate: e.target.value })} />}</Field>
          <Field label="Return">{(id) => <Input id={id} type="date" min={addDays(dates.startDate, minDays)} value={dates.endDate} onChange={(e) => setDate({ endDate: e.target.value })} />}</Field>
          <Button variant="primary" onClick={find} disabled={search.pending || days < minDays}>
            {search.pending ? "Searching…" : "Show vehicles"}
          </Button>
        </div>
        {days < minDays && <p className="mt-2 text-xs text-rose-700">Rentals are at least {minDays} {minDays === 1 ? "day" : "days"}.</p>}
        <ErrorNote error={search.error} className="mt-3" />
      </Step>

      {search.data && (
        <Step number={2} title={`Vehicles for ${search.data.totalDays} ${search.data.totalDays === 1 ? "day" : "days"}`} icon={<CarFront size={16} />}>
          {search.data.vehicles.length === 0 ? (
            <p className="text-sm text-muted">Nothing is free for those dates. Try other dates.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {search.data.vehicles.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVehicleId(v.id)}
                  className={`overflow-hidden rounded-lg border text-left transition-colors ${vehicleId === v.id ? "border-brand ring-2 ring-brand/30" : "border-line hover:border-ink/30"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {v.thumbnail && <img src={v.thumbnail} alt="" className="aspect-[16/9] w-full object-cover" />}
                  <div className="space-y-1 p-3">
                    <p className="font-semibold text-ink">
                      {v.make} {v.model} {v.year ?? ""}
                    </p>
                    <p className="text-xs text-muted">
                      {TRANSMISSION_LABELS[v.transmission]} · {FUEL_LABELS[v.fuelType]}
                    </p>
                    <p className="text-sm">
                      <strong>{format.money(v.totalAmount)}</strong> <span className="text-muted">({format.money(v.dailyRate)} / day)</span>
                    </p>
                    <p className="text-xs text-muted">Refundable deposit {format.money(v.depositAmount)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Step>
      )}

      {chosen && search.data && (
        <Step number={3} title="Your details" icon={<CheckCircle2 size={16} />}>
          <GuestForm profile={profile} slug={slug} booking={{ vehicleId: chosen.id, startDate: search.data.startDate, endDate: search.data.endDate }} onBooked={setVoucher} />
        </Step>
      )}
    </Page>
  );
}

interface DocumentRow {
  key: string;
  type: string;
  number: string;
  file: UploadedFile | null;
  /** Rows for the documents the renter type requires can't be removed. */
  required: boolean;
}

function GuestForm({
  profile,
  slug,
  booking,
  onBooked,
}: {
  profile: PortalProfile;
  slug: string;
  booking: { vehicleId: string; startDate: string; endDate: string };
  onBooked: (voucher: GuestVoucher) => void;
}) {
  const f = profile.fields.renter;
  const notesField = profile.fields.rental.notes;
  const askResidentType = f.residentType.on && profile.residentTypes.length > 1;
  const requiredRows = useCallback(
    (residentType: ResidentType): DocumentRow[] =>
      profile.documentTypes.filter((d) => d.requiredFor.includes(residentType)).map((d) => ({ key: d.key, type: d.key, number: "", file: null, required: true })),
    [profile],
  );
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", residentType: profile.residentTypes[0], country: "", address: "", emergencyName: "", emergencyPhone: "", notes: "" });
  const [documents, setDocuments] = useState<DocumentRow[]>(() => requiredRows(profile.residentTypes[0]));
  const [extraType, setExtraType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const { uploading, onBusy } = useUploadsInFlight();
  const upload = useCallback((file: File) => uploadGuestDocument(slug, file), [slug]);
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const setRow = (key: string, patch: Partial<DocumentRow>) => setDocuments((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const issue = (path: string) => error?.issueFor(path);
  const labelOf = (type: string) => profile.documentTypes.find((d) => d.key === type)?.label ?? type;
  const unused = profile.documentTypes.filter((d) => !documents.some((row) => row.type === d.key));
  // Without file storage, a portal that requires scans can't take bookings.
  const blocked = profile.requireDocumentUpload && !profile.uploads;

  const submit = () => {
    setSubmitting(true);
    setError(null);
    const renter = {
      fullName: form.fullName,
      phone: form.phone,
      ...(f.email.on && form.email ? { email: form.email } : {}),
      ...(f.residentType.on ? { residentType: form.residentType } : {}),
      ...(f.country.on && form.country ? { country: form.country } : {}),
      ...(f.address.on && form.address ? { address: form.address } : {}),
      ...(f.emergencyContact.on && form.emergencyName ? { emergencyContact: { name: form.emergencyName, ...(form.emergencyPhone ? { phone: form.emergencyPhone } : {}) } } : {}),
      documents: documents.map((row) => ({ type: row.type, number: row.number, ...(row.file ? { file: row.file } : {}) })),
    };
    publicRequest<GuestVoucher>("POST", `/${encodeURIComponent(slug)}/bookings`, { renter, ...booking, ...(notesField.on ? { notes: form.notes } : {}) })
      .then(onBooked, (failure) => setError(failure instanceof ApiError ? failure : new ApiError(String(failure), 0, "internal")))
      .finally(() => setSubmitting(false));
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name (as on your ID)" error={issue("renter.fullName")} className="sm:col-span-2">
          {(id) => <Input id={id} required autoComplete="name" value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} />}
        </Field>
        <Field label="Phone / WhatsApp" error={issue("renter.phone")}>
          {(id) => <Input id={id} required type="tel" autoComplete="tel" placeholder="+94 77 123 4567" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />}
        </Field>
        {f.email.on && (
          <Field label={f.email.label} hint={f.email.helpText || undefined} error={issue("renter.email")}>
            {(id) => <Input id={id} type="email" autoComplete="email" required={f.email.required} value={form.email} onChange={(e) => set({ email: e.target.value })} />}
          </Field>
        )}
        {askResidentType && (
          <Field label={f.residentType.label} error={issue("renter.residentType")}>
            {(id) => (
              <Select
                id={id}
                value={form.residentType}
                onChange={(e) => {
                  const residentType = e.target.value as ResidentType;
                  set({ residentType });
                  setDocuments(requiredRows(residentType));
                }}
              >
                {profile.residentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type === "tourist" ? "Visitor / tourist" : `Resident of ${profile.locale.country}`}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        {f.country.on && (
          <Field label={f.country.label} hint={f.country.helpText || undefined} error={issue("renter.country")}>
            {(id) => <Input id={id} autoComplete="country-name" required={f.country.required} value={form.country} onChange={(e) => set({ country: e.target.value })} />}
          </Field>
        )}
        {f.address.on && (
          <Field label={f.address.label} hint={f.address.helpText || (form.residentType === "tourist" ? "Hotel or local address" : undefined)} error={issue("renter.address")} className="sm:col-span-2">
            {(id) => <Input id={id} autoComplete="street-address" required={f.address.required} value={form.address} onChange={(e) => set({ address: e.target.value })} />}
          </Field>
        )}
        {f.emergencyContact.on && (
          <>
            <Field label={f.emergencyContact.label} error={issue("renter.emergencyContact") ?? issue("renter.emergencyContact.name")}>
              {(id) => <Input id={id} required={f.emergencyContact.required} value={form.emergencyName} onChange={(e) => set({ emergencyName: e.target.value })} />}
            </Field>
            <Field label="Their phone">{(id) => <Input id={id} type="tel" value={form.emergencyPhone} onChange={(e) => set({ emergencyPhone: e.target.value })} />}</Field>
          </>
        )}
      </div>

      <fieldset className="space-y-3 rounded-lg border border-line bg-paper p-3">
        <legend className="px-1 text-xs font-semibold text-muted">Identity documents</legend>
        {profile.uploads && (
          <p className="text-xs text-muted">
            Add a clear photo or PDF of each document{profile.requireDocumentUpload ? "" : " if you can"}. Bring the originals when you collect the vehicle.
          </p>
        )}
        {documents.map((row, index) => (
          <div key={row.key} className="grid gap-3 rounded-md border border-line bg-panel p-3 sm:grid-cols-2">
            <div className="flex items-start justify-between gap-2 sm:col-span-2">
              <p className="text-sm font-semibold text-ink">{labelOf(row.type)}</p>
              {!row.required && (
                <button type="button" className="flex items-center gap-1 text-xs text-muted hover:text-rose-700" onClick={() => setDocuments((rows) => rows.filter((r) => r.key !== row.key))}>
                  <Trash2 size={12} /> Remove
                </button>
              )}
            </div>
            <Field label="Document number" error={issue(`renter.documents[${index}].number`)}>
              {(id) => <Input id={id} required value={row.number} onChange={(e) => setRow(row.key, { number: e.target.value })} />}
            </Field>
            {profile.uploads && (
              <FilePicker
                label="Scan or photo"
                required={profile.requireDocumentUpload}
                upload={upload}
                value={row.file}
                onChange={(file) => setRow(row.key, { file })}
                onBusy={onBusy}
                accept={DOCUMENT_ACCEPT}
                error={issue(`renter.documents[${index}].file`) ?? issue(`renter.documents[${index}].file.publicId`)}
              />
            )}
          </div>
        ))}
        {unused.length > 0 && (
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Another document" className="min-w-56 flex-1">
              {(id) => (
                <Select id={id} value={extraType} onChange={(e) => setExtraType(e.target.value)}>
                  <option value="">Choose…</option>
                  {unused.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Button
              variant="outline"
              disabled={!extraType}
              onClick={() => {
                setDocuments((rows) => [...rows, { key: `${extraType}-${rows.length}`, type: extraType, number: "", file: null, required: false }]);
                setExtraType("");
              }}
            >
              <Plus size={14} /> Add
            </Button>
          </div>
        )}
        {issue("renter.documents") && <p className="text-xs font-semibold text-rose-700">{issue("renter.documents")}</p>}
      </fieldset>

      {notesField.on && (
        <Field label={notesField.label} hint={notesField.helpText || "Flight number, delivery address, child seat…"} error={issue("notes")}>
          {(id) => <Textarea id={id} required={notesField.required} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />}
        </Field>
      )}

      {blocked && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Online booking needs document scans, and uploads aren&apos;t available right now. Please contact {profile.branding.displayName} to book.
        </p>
      )}
      <ErrorNote error={error} />
      <div className="flex justify-end border-t border-line pt-4">
        <Button type="submit" variant="primary" disabled={submitting || uploading || blocked}>
          {uploading ? "Uploading…" : submitting ? "Booking…" : "Book now"}
        </Button>
      </div>
    </form>
  );
}

function Voucher({ profile, voucher }: { profile: PortalProfile; voucher: GuestVoucher }) {
  const format = useFormatters(profile);
  const { branding } = profile;
  const vehicle = `${voucher.vehicle.make} ${voucher.vehicle.model}${voucher.vehicle.year ? ` ${voucher.vehicle.year}` : ""}`;
  const message = [
    `Hello ${branding.shortName}, I booked a vehicle online.`,
    `Booking: ${voucher.bookingCode}`,
    `Name: ${voucher.fullName} (${voucher.profileId})`,
    `Vehicle: ${vehicle}`,
    `Dates: ${format.day(voucher.startDate)} → ${format.day(voucher.endDate)} (${voucher.totalDays} days)`,
    `Total: ${format.money(voucher.totalAmount)} + ${format.money(voucher.depositAmount)} refundable deposit`,
  ].join("\n");
  const whatsapp = branding.whatsappNumber ? `https://wa.me/${branding.whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}` : null;

  return (
    <Page profile={profile}>
      <section className="space-y-4 rounded-lg border border-emerald-300 bg-panel p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <CheckCircle2 size={16} /> Your booking is reserved
        </p>
        <p className="text-3xl font-semibold tracking-tight text-ink">{voucher.bookingCode}</p>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Item label="Name">
            {voucher.fullName} ({voucher.profileId})
          </Item>
          <Item label="Vehicle">{vehicle}</Item>
          <Item label="Pickup">{format.day(voucher.startDate)}</Item>
          <Item label="Return">{format.day(voucher.endDate)}</Item>
          <Item label={`Rental (${voucher.totalDays} days)`}>{format.money(voucher.totalAmount)}</Item>
          <Item label="Refundable deposit">{format.money(voucher.depositAmount)}</Item>
        </dl>
        <p className="text-sm text-muted">
          {branding.displayName} will confirm your booking. Bring the original documents and quote {voucher.bookingCode} when you collect the vehicle.
        </p>
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">
            <Send size={14} /> Send to {branding.shortName} on WhatsApp
          </a>
        )}
        {(branding.supportPhone || branding.supportEmail) && (
          <p className="text-xs text-muted">Questions? {[branding.supportPhone, branding.supportEmail].filter(Boolean).join(" · ")}</p>
        )}
      </section>
    </Page>
  );
}

function Page({ profile, children }: { profile?: PortalProfile; children: ReactNode }) {
  const branding = profile?.branding;
  return (
    <div className="min-h-screen bg-paper">
      <div className="h-1.5 bg-brand" />
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:py-10">
        {branding && (
          <header className="flex items-center gap-3">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt="" className="size-12 shrink-0 object-contain" />
            ) : (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-brand text-xl font-black text-white">{branding.shortName.charAt(0).toUpperCase()}</span>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight text-ink">{branding.displayName}</h1>
              <p className="truncate text-sm text-muted">{branding.tagline || "Book a vehicle"}</p>
            </div>
          </header>
        )}
        {children}
      </main>
    </div>
  );
}

function Step({ number, title, icon, children }: { number: number; title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-panel p-4 sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="flex size-6 items-center justify-center rounded-full bg-brand text-xs text-white">{number}</span>
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}
