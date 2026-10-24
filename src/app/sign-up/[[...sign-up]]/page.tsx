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
    <main className="swiss-grid-bg flex min-h-svh flex-col items-center justify-center gap-6 p-4">
      <div className="text-center">
        <p className="font-mono text-[10px] font-bold tracking-widest text-brand uppercase">Fleet operations</p>
        <h1 className="mt-1 text-xl font-black tracking-tight">Accept your invitation</h1>
      </div>
      <Suspense fallback={<div className="h-[480px] w-full max-w-[400px] animate-pulse bg-ink/5" />}>
        <SignUp />
      </Suspense>
    </main>
  );
}
