"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { visibleTabs } from "@/lib/navigation";
import { useWorkspace } from "@/lib/workspace";

/** Opens the member's first tab, which depends on the config's navigation and their role. */
export default function StartPage() {
  const { config, can } = useWorkspace();
  const router = useRouter();
  const first = visibleTabs(config, can)[0];

  useEffect(() => {
    if (first) router.replace(first.href);
  }, [first, router]);

  if (first) return null;
  return (
    <div className="mx-auto max-w-md border border-ink/15 bg-panel p-6 text-center">
      <h2 className="text-lg font-black">Nothing to show yet</h2>
      <p className="mt-2 font-mono text-xs text-muted">Your role doesn&apos;t include any sections. Ask your company&apos;s owner to give you a role.</p>
    </div>
  );
}
