import type { TenantConfig, VehicleDocument, VehicleDocumentTypeItem } from "./contract";
import { daysBetween } from "./dates";

export type DocumentExpiryTone = "ok" | "warn" | "expired" | "none";

/** Expiry state for one document, using the type's configured alert lead days (default 7). */
export function documentExpiryStatus(
  expiresAt: string | null | undefined,
  today: string,
  alertDaysBefore = 7,
): { label: string; tone: DocumentExpiryTone } {
  if (!expiresAt) return { label: "No expiry set", tone: "none" };
  if (expiresAt < today) return { label: `Expired ${expiresAt}`, tone: "expired" };
  const days = daysBetween(today, expiresAt);
  if (days <= alertDaysBefore) return { label: `Expires ${expiresAt} (${days}d)`, tone: "warn" };
  return { label: `Expires ${expiresAt}`, tone: "ok" };
}

/** Worst document expiry on a vehicle: expired > due soon. Used on fleet cards. */
export function vehicleDocumentAlert(
  documents: VehicleDocument[] | undefined,
  config: TenantConfig,
  today: string,
): { tone: "warn" | "expired"; title: string } | null {
  const types = new Map((config.lists.vehicleDocumentTypes ?? []).map((t: VehicleDocumentTypeItem) => [t.key, t]));
  let worst: { tone: "warn" | "expired"; title: string } | null = null;
  for (const doc of documents ?? []) {
    const lead = types.get(doc.type)?.alertDaysBefore ?? 7;
    const { tone } = documentExpiryStatus(doc.expiresAt, today, lead);
    if (tone === "expired") return { tone: "expired", title: "A compliance document has expired" };
    if (tone === "warn" && worst?.tone !== "expired") {
      worst = { tone: "warn", title: "A compliance document is expiring soon" };
    }
  }
  return worst;
}
