"use client";

import { useAuth, useOrganizationList } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Switches between the workspaces (Clerk organizations) a member belongs to.
 * Hidden for members of a single workspace. Clerk's own switcher isn't used
 * because it also offers organization management, which belongs to the
 * Team page here.
 */
export function OrganizationSwitcher({ compact = false }: { compact?: boolean }) {
  const { orgId } = useAuth();
  const { isLoaded, userMemberships, setActive } = useOrganizationList({ userMemberships: { infinite: true } });
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  const memberships = userMemberships?.data ?? [];
  if (!isLoaded || memberships.length < 2) return null;

  return (
    <select
      aria-label="Workspace"
      className={`border border-ink/20 bg-panel font-mono text-xs outline-none focus:border-brand ${compact ? "max-w-48 p-1.5" : "w-full max-w-xs p-2"}`}
      value={orgId ?? ""}
      disabled={switching}
      onChange={async (event) => {
        setSwitching(true);
        try {
          await setActive({ organization: event.target.value });
          router.push("/");
        } finally {
          setSwitching(false);
        }
      }}
    >
      {!orgId && <option value="">Choose a workspace…</option>}
      {memberships.map((membership) => (
        <option key={membership.organization.id} value={membership.organization.id}>
          {membership.organization.name}
        </option>
      ))}
    </select>
  );
}
