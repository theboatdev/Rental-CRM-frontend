import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Accept your invitation" };

/**
 * Where invitation emails land (the backend's CLERK_INVITATION_REDIRECT_URL).
 * Sign-up is restricted in Clerk, so it only works with the invitation's
 * ticket, which Clerk's SignUp reads from the link. Accepting joins the
 * company's organization; the backend then adds the member with the invited role.
 */
export default function SignUpPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-4">
      <div className="max-w-sm text-center">
        <p className="font-sans text-xs font-semibold tracking-normal text-muted">Fleet operations</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Accept your invitation</h1>
      </div>
      <Suspense fallback={<div className="h-[480px] w-full max-w-[400px] animate-pulse rounded-lg bg-ink/5" />}>
        <SignUp />
      </Suspense>
    </main>
  );
}
