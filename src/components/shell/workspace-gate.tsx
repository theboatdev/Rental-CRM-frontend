"use client";

import { SignOutButton, useAuth } from "@clerk/nextjs";
import { Loader2, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { OrganizationSwitcher } from "@/components/shell/organization-switcher";
import { Shell } from "@/components/shell/shell";
import type { ApiError } from "@/lib/api";
import { useConfig, useMe } from "@/lib/queries";
import { WorkspaceProvider } from "@/lib/workspace";

/**
 * Loads who the member is (GET /me) and the tenant's config (GET /config)
 * before showing anything, and explains what's wrong when that fails.
 */
export function WorkspaceGate({ children }: { children: ReactNode }) {
  const { isLoaded, orgId } = useAuth();
  const me = useMe();
  const config = useConfig();

  if (isLoaded && !orgId) {
    return <Problem title="Choose your company's workspace" detail="Your account isn't in an active workspace. Pick one below, or sign out and use the invitation email you received." />;
  }
  const error = me.error ?? config.error;
  if (error) return <Problem title={titleFor(error)} detail={error.message} hint={hintFor(error)} retry={() => Promise.all([me.refetch(), config.refetch()])} />;
  if (!me.data || !config.data) {
    return (
      <div className="flex min-h-svh items-center justify-center font-mono text-xs">
        <div className="flex items-center gap-3 border border-ink/15 bg-panel p-6">
          <Loader2 size={14} className="animate-spin text-brand" />
          <span className="font-bold tracking-widest uppercase">Loading your workspace…</span>
        </div>
      </div>
    );
  }
  return (
    <WorkspaceProvider me={me.data} config={config.data}>
      <Shell>{children}</Shell>
    </WorkspaceProvider>
  );
}

function titleFor(error: ApiError) {
  if (error.status === 0 || error.status >= 500) return "Can't reach the server";
  if (error.status === 401) return "Your session has ended";
  if (/isn't set up/.test(error.message)) return "This organization isn't a workspace";
  if (/aren't a member/.test(error.message)) return "You're not in this workspace yet";
  if (/workspace is/.test(error.message)) return "This workspace isn't available";
  return "Something went wrong";
}

function hintFor(error: ApiError) {
  if (/aren't a member/.test(error.message)) {
    return "If you've just accepted your invitation, give it a minute and reload. Otherwise ask your company's owner to invite you again.";
  }
  if (/isn't set up/.test(error.message)) return "Switch to your company's workspace below, or sign out and sign in with the account you were invited with.";
  if (/workspace is/.test(error.message)) return "Contact your company's owner or the platform's support.";
  return undefined;
}

function Problem({ title, detail, hint, retry }: { title: string; detail: string; hint?: string; retry?: () => unknown }) {
  return (
    <main className="swiss-grid-bg flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 border border-ink/15 bg-panel p-6 text-center">
        <ShieldAlert className="mx-auto size-10 text-muted" aria-hidden />
        <h1 className="text-xl font-black tracking-tight">{title}</h1>
        <p className="font-mono text-xs text-muted">{detail}</p>
        {hint && <p className="text-sm">{hint}</p>}
        <div className="flex flex-col items-center gap-3">
          <OrganizationSwitcher />
          <div className="flex gap-2">
            {retry && (
              <Button variant="outline" onClick={() => retry()}>
                Try again
              </Button>
            )}
            <SignOutButton redirectUrl="/sign-in">
              <Button variant="outline">Sign out</Button>
            </SignOutButton>
          </div>
        </div>
      </div>
    </main>
  );
}
