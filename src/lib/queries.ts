"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { type ApiError, type ApiRequest, useApiRequest } from "./api";
import type {
  Availability,
  AuditEntry,
  CalendarMonth,
  ConfigResponse,
  Cost,
  Dashboard,
  DashboardRange,
  FuelLog,
  Invitation,
  Me,
  Member,
  Payment,
  PermissionInfo,
  Rental,
  RentalDetail,
  RentalStatus,
  Renter,
  RenterDossier,
  Role,
  VehicleDossier,
  VehicleWithStats,
  WhatsAppDigest,
} from "./contract";

/**
 * React Query hooks for the tenant API. Every key starts with the active
 * organization id, so switching organization never shows another tenant's
 * cached data.
 */

type QueryOptions<T> = Omit<UseQueryOptions<T, ApiError>, "queryKey" | "queryFn">;

function useTenantQuery<T>(key: unknown[], path: string | null, options?: QueryOptions<T>) {
  const { orgId } = useAuth();
  const request = useApiRequest();
  return useQuery<T, ApiError>({
    queryKey: [orgId, ...key],
    queryFn: () => request<T>("GET", path!),
    enabled: Boolean(orgId && path) && (options?.enabled ?? true),
    ...options,
  });
}

const query = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])));
  const text = search.toString();
  return text ? `?${text}` : "";
};

export const useMe = () => useTenantQuery<Me>(["me"], "/me", { retry: false });
export const useConfig = () => useTenantQuery<ConfigResponse>(["config"], "/config", { retry: false });

export const useDashboard = (range: DashboardRange) => useTenantQuery<Dashboard>(["dashboard", range], `/dashboard${query({ range })}`);
export const useVehicles = () => useTenantQuery<VehicleWithStats[]>(["vehicles"], "/vehicles");
export const useVehicle = (id: string | null) => useTenantQuery<VehicleDossier>(["vehicles", id], id && `/vehicles/${id}`);
export const useAvailability = (startDate: string, endDate: string, excludeRentalId?: string) =>
  useTenantQuery<Availability[]>(
    ["availability", startDate, endDate, excludeRentalId],
    startDate && endDate && startDate < endDate ? `/vehicles/availability${query({ startDate, endDate, excludeRentalId })}` : null,
  );
export const useRenters = () => useTenantQuery<Renter[]>(["renters"], "/renters");
export const useRenter = (id: string | null) => useTenantQuery<RenterDossier>(["renters", id], id && `/renters/${id}`);
export const useRentals = (status?: RentalStatus | "open") => useTenantQuery<Rental[]>(["rentals", status ?? "all"], `/rentals${query({ status })}`);
export const useRental = (id: string | null) => useTenantQuery<RentalDetail>(["rentals", "detail", id], id && `/rentals/${id}`);
export const useCalendar = (month: string) => useTenantQuery<CalendarMonth>(["calendar", month], `/calendar${query({ month })}`);
export const usePayments = () => useTenantQuery<Payment[]>(["payments"], "/payments");
export const useCosts = () => useTenantQuery<Cost[]>(["costs"], "/costs");
export const useFuelLogs = (enabled = true) => useTenantQuery<FuelLog[]>(["fuel"], enabled ? "/fuel-logs" : null);
export const useDigest = () => useTenantQuery<WhatsAppDigest>(["digest"], "/whatsapp/digest");
export const useMembers = (status: "active" | "removed" | "all" = "active") => useTenantQuery<Member[]>(["members", status], `/members${query({ status })}`);
export const useInvitations = () => useTenantQuery<Invitation[]>(["invitations"], "/invitations");
export const useRoles = () => useTenantQuery<Role[]>(["roles"], "/roles");
export const usePermissionCatalog = () => useTenantQuery<PermissionInfo[]>(["permissions"], "/permissions");
export const useAudit = (enabled = true) => useTenantQuery<AuditEntry[]>(["audit"], enabled ? "/audit?limit=200" : null);

/** Everything an operations change can affect: they're cheap to refetch, so a change refreshes them all. */
const OPERATIONS = ["vehicles", "availability", "renters", "rentals", "calendar", "payments", "costs", "fuel", "dashboard", "digest", "audit"];
const TEAM = ["members", "invitations", "roles", "audit", "me"];

/**
 * A mutation against the tenant API. On success it refreshes the queries of
 * its `scope`: day-to-day operations, or team and roles.
 */
export function useTenantMutation<TVariables, TResult>(
  run: (request: ApiRequest, variables: TVariables) => Promise<TResult>,
  scope: "operations" | "team" = "operations",
) {
  const { orgId } = useAuth();
  const request = useApiRequest();
  const queryClient = useQueryClient();
  return useMutation<TResult, ApiError, TVariables>({
    mutationFn: (variables) => run(request, variables),
    onSuccess: () =>
      Promise.all((scope === "team" ? TEAM : OPERATIONS).map((key) => queryClient.invalidateQueries({ queryKey: [orgId, key] }))),
  });
}
