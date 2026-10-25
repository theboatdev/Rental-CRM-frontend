"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { OrganizationSwitcher } from "@/components/shell/organization-switcher";
import { visibleTabs } from "@/lib/navigation";
import { useWorkspace } from "@/lib/workspace";

/** The frame around every page: the tenant's branding, its tabs, and the member's account. */
export function Shell({ children }: { children: ReactNode }) {
  const { config, me, can } = useWorkspace();
  const { branding } = config;
  const pathname = usePathname();
  const tabs = visibleTabs(config, can);

  useEffect(() => {
    document.title = branding.displayName;
  }, [branding.displayName]);

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="relative z-10 flex flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-line bg-panel">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              {branding.logoUrl ? (
                // Tenant logos are arbitrary https URLs from the config, so they aren't routed through next/image.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.logoUrl} alt="" className="size-10 shrink-0 object-contain" />
              ) : (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink text-lg font-semibold text-white">{branding.shortName.charAt(0)}</span>
              )}
              <span className="min-w-0">
                <span className="block break-words text-sm font-semibold tracking-tight text-ink sm:text-base">{branding.displayName}</span>
                {branding.tagline && <span className="mt-0.5 hidden text-xs text-muted sm:block">{branding.tagline}</span>}
              </span>
            </Link>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <OrganizationSwitcher compact />
              <div className="hidden border-l border-line pl-3 text-right md:block">
                <p className="text-xs font-medium text-ink">{me.user.name ?? me.user.email}</p>
                <p className="text-xs text-muted">{me.role.name}</p>
              </div>
              <UserButton />
            </div>
          </div>
          <nav className="no-scrollbar overflow-x-auto border-t border-line/60" aria-label="Sections">
            <div className="mx-auto flex max-w-7xl gap-1 px-4 sm:px-8">
              {tabs.map((tab) => {
                const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
                return (
                  <Link
                    key={tab.key}
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex min-h-12 items-center px-3 text-sm whitespace-nowrap transition-colors duration-150 ${
                      active ? "font-medium text-ink" : "text-muted hover:text-ink"
                    }`}
                  >
                    {tab.label}
                    {active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand" />}
                  </Link>
                );
              })}
            </div>
          </nav>
        </header>

        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-panel focus:p-3">Skip to content</a>
        <main id="main-content" className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 py-7 sm:px-8 sm:py-10">{children}</main>

        <footer className="mt-10 border-t border-line py-5 text-xs text-muted">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-8">
            <span className="flex items-center gap-2">
              <span className="font-medium text-ink">{branding.displayName}</span>
            </span>
            <span className="break-all text-center sm:text-right">{[branding.supportPhone, branding.supportEmail].filter(Boolean).join(" · ")}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
