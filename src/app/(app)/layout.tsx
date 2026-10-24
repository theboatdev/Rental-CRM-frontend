"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WorkspaceGate } from "@/components/shell/workspace-gate";
import { ApiError } from "@/lib/api";

/** Every signed-in page: data fetching, then the workspace (who, which tenant, its config), then the shell. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // Retry server hiccups, never 4xx answers like 403 or 404.
            retry: (failures, error) => failures < 2 && (!(error instanceof ApiError) || error.status === 0 || error.status >= 500),
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceGate>{children}</WorkspaceGate>
    </QueryClientProvider>
  );
}
