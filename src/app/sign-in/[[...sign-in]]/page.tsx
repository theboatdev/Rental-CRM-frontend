import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Clerk's sign-in, including its "choose an organization" step for members
 * of several companies. New team members arrive through an email invitation;
 * there's no open sign-up.
 */
export default function SignInPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-4">
      <div className="max-w-sm text-center">
        <p className="font-sans text-xs font-semibold tracking-normal text-muted">Fleet operations</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in to your company&apos;s workspace</h1>
      </div>
      {/* SignIn reads the pathname of this catch-all route, which is request data. */}
      <Suspense fallback={<div className="h-[420px] w-full max-w-[400px] animate-pulse rounded-lg bg-ink/5" />}>
        <SignIn />
      </Suspense>
    </main>
  );
}
