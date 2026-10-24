"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { ModuleKey } from "@/lib/contract";
import { useWorkspace } from "@/lib/workspace";

/**
 * Shows a page only when its module is on and the member has the permission
 * to open it. This only shapes the UI; the API refuses the same requests.
 */
export function ModuleGate({ module, permission, children }: { module?: ModuleKey; permission: string | string[]; children: ReactNode }) {
  const { moduleOn, can } = useWorkspace();
  const permissions = Array.isArray(permission) ? permission : [permission];
  const allowed = (!module || moduleOn(module)) && permissions.some(can);
  if (allowed) return <>{children}</>;
  return (
    <div className="mx-auto max-w-md border border-ink/15 bg-panel p-6 text-center">
      <h2 className="text-lg font-black">This section isn&apos;t available</h2>
      <p className="mt-2 font-mono text-xs text-muted">
        {module && !moduleOn(module) ? "It's switched off for your company." : "Your role doesn't include it. Ask your company's owner if you need it."}
      </p>
      <Link href="/" className="mt-4 inline-block font-mono text-xs font-bold text-brand underline">
        Back to the start page
      </Link>
    </div>
  );
}
