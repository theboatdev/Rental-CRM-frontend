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
  const { branding, locale } = config;
  const pathname = usePathname();
  const tabs = visibleTabs(config, can);

  useEffect(() => {
    document.title = branding.displayName;
  }, [branding.displayName]);

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="swiss-grid-bg pointer-events-none fixed inset-0 z-0 opacity-30" />
      <div className="relative z-10 flex flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-line bg-panel">
          <div className="flex items-center justify-between border-b border-brand/20 bg-brand/5 px-4 py-1.5 font-mono text-[11px] tracking-wider text-brand sm:px-8">
            <span className="flex items-center gap-1.5 font-bold uppercase">
              <span className="inline-block size-1.5 bg-brand" />
              {branding.shortName} operations
            </span>
            <span className="hidden text-ink/60 md:inline">
              {locale.timezone} · {locale.currency}
              {locale.secondaryCurrency ? ` / ${locale.secondaryCurrency}` : ""}
            </span>
          </div>
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8">
            <Link href="/" className="flex items-center gap-3">
              {branding.logoUrl ? (
                // Tenant logos are arbitrary https URLs from the config, so they aren't routed through next/image.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.logoUrl} alt="" className="size-10 object-contain" />
              ) : (
                <span className="flex size-10 items-center justify-center bg-brand text-xl font-black text-white">{branding.shortName.charAt(0)}</span>
              )}
              <span>
                <span className="block text-xl font-black tracking-tighter text-ink uppercase">{branding.displayName}</span>
                {branding.tagline && <span className="block font-mono text-[11px] tracking-wide text-muted">{branding.tagline}</span>}
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <OrganizationSwitcher compact />
              <div className="hidden border-l border-line pl-3 text-right sm:block">
                <p className="text-xs font-bold text-ink">{me.user.name ?? me.user.email}</p>
                <p className="font-mono text-[10px] font-semibold tracking-wider text-brand uppercase">{me.role.name}</p>
              </div>
              <UserButton />
            </div>
          </div>
          <nav className="no-scrollbar overflow-x-auto border-t border-line" aria-label="Sections">
            <div className="mx-auto flex max-w-7xl px-4 sm:px-8">
              {tabs.map((tab, index) => {
                const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
                return (
                  <Link
                    key={tab.key}
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex items-center gap-2 border-r border-line px-5 py-3.5 font-mono text-xs tracking-wider whitespace-nowrap uppercase transition-colors ${
                      active ? "bg-paper font-bold text-ink" : "text-muted hover:bg-paper hover:text-ink"
                    }`}
                  >
                    <span className={`text-[10px] ${active ? "text-brand" : ""}`}>{String(index + 1).padStart(2, "0")}</span>
                    {tab.label}
                    {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand" />}
                  </Link>
                );
              })}
            </div>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-8">{children}</main>

        <footer className="mt-12 border-t border-line bg-panel py-6 font-mono text-xs text-muted">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-8">
            <span className="flex items-center gap-2">
              <span className="inline-block size-2 bg-brand" />
              <span className="font-bold text-ink uppercase">{branding.displayName}</span>
            </span>
            <span>{[branding.supportPhone, branding.supportEmail].filter(Boolean).join(" · ")}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
