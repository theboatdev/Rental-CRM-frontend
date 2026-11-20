"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import type { ConfigResponse, Me, ModuleKey, TenantConfig } from "./contract";
import { todayIn } from "./dates";
import { createFormatters, type Formatters } from "./format";

/** The signed-in member's workspace: who they are, the tenant's config, and helpers derived from both. */
export interface Workspace {
  me: Me;
  config: TenantConfig;
  configVersion: number;
  /** Whether the member's effective permissions include `permission`. UI only: the API enforces it again. */
  can: (permission: string) => boolean;
  moduleOn: (module: ModuleKey) => boolean;
  /**
   * Whether booking/vehicle rates, totals, deposits and outstanding balances
   * should show. False when the tenant hides booking pricing and the member
   * lacks financials:view. Payment ledger amounts stay visible either way.
   * UI only: the API strips the fields too.
   */
  canSeeBookingPricing: boolean;
  format: Formatters;
  /** The label of a config list key, e.g. label("paymentMethods", "BANK_TRANSFER"). Records store keys, never labels. */
  label: (list: keyof TenantConfig["lists"], key: string) => string;
  /** Active items of a config list, for dropdowns. */
  options: (list: keyof TenantConfig["lists"]) => Array<{ key: string; label: string }>;
  /** Today in the tenant's timezone, as YYYY-MM-DD. */
  today: () => string;
}

const WorkspaceContext = createContext<Workspace | null>(null);

export function useWorkspace(): Workspace {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return workspace;
}

export function WorkspaceProvider({ me, config, children }: { me: Me; config: ConfigResponse; children: ReactNode }) {
  const workspace = useMemo<Workspace>(() => {
    const permissions = new Set(me.permissions);
    const tenantConfig = config.config;
    const can = (permission: string) => permissions.has(permission);
    const hideBookingPricing = Boolean(tenantConfig.modules.rentals.hideBookingPricingWithoutFinancials);
    return {
      me,
      config: tenantConfig,
      configVersion: config.version,
      can,
      moduleOn: (module) => tenantConfig.modules[module].enabled,
      canSeeBookingPricing: !hideBookingPricing || can("financials:view"),
      format: createFormatters(tenantConfig),
      label: (list, key) => (tenantConfig.lists[list] ?? []).find((item) => item.key === key)?.label ?? key,
      options: (list) => (tenantConfig.lists[list] ?? []).filter((item) => item.active).map(({ key, label }) => ({ key, label })),
      today: () => todayIn(tenantConfig.locale.timezone),
    };
  }, [me, config]);

  // On the root element so dialogs, which render outside this tree, get the brand colour too.
  const brand = config.config.branding.primaryColor;
  useEffect(() => {
    document.documentElement.style.setProperty("--brand", brand);
  }, [brand]);

  return <WorkspaceContext.Provider value={workspace}>{children}</WorkspaceContext.Provider>;
}
