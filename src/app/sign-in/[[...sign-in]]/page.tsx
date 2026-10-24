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
    <main className="swiss-grid-bg flex min-h-svh flex-col items-center justify-center gap-6 p-4">
      <div className="text-center">
        <p className="font-mono text-[10px] font-bold tracking-widest text-brand uppercase">Fleet operations</p>
        <h1 className="mt-1 text-xl font-black tracking-tight">Sign in to your company&apos;s workspace</h1>
      </div>
      {/* SignIn reads the pathname of this catch-all route, which is request data. */}
      <Suspense fallback={<div className="h-[420px] w-full max-w-[400px] animate-pulse bg-ink/5" />}>
        <SignIn />
      </Suspense>
    </main>
  );
}
