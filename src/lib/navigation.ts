import type { ModuleKey, TenantConfig } from "./contract";

/** Where each tab module lives, and the permission needed to open it. */
export const MODULE_ROUTES: Partial<Record<ModuleKey, { href: string; permission: string }>> = {
  dashboard: { href: "/dashboard", permission: "dashboard:view" },
  vehicles: { href: "/vehicles", permission: "vehicles:read" },
  renters: { href: "/renters", permission: "renters:read" },
  rentals: { href: "/rentals", permission: "rentals:read" },
  calendar: { href: "/calendar", permission: "calendar:view" },
  payments: { href: "/payments", permission: "payments:read" },
  costs: { href: "/costs", permission: "costs:read" },
  whatsappDigest: { href: "/whatsapp", permission: "whatsapp:view" },
};

export interface Tab {
  key: string;
  label: string;
  href: string;
}

/**
 * The tabs a member sees: the config's `navigation`, in its order and with
 * its labels, minus disabled modules and those they lack the permission for.
 * Team settings come last for members who can see the team.
 */
export function visibleTabs(config: TenantConfig, can: (permission: string) => boolean): Tab[] {
  const tabs: Tab[] = config.navigation.flatMap(({ module, label }) => {
    const route = MODULE_ROUTES[module];
    return route && config.modules[module].enabled && can(route.permission) ? [{ key: module, label, href: route.href }] : [];
  });
  if (can("team:read") || can("roles:manage")) tabs.push({ key: "team", label: "Team & roles", href: "/team" });
  return tabs;
}
