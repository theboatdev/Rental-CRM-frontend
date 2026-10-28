import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// /book/<slug> is the public guest booking page.
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/book(.*)"]);

/**
 * Everything except sign-in, sign-up (accepting an invitation) and the guest
 * booking page needs an active session. Personal accounts are off in Clerk, so a session only
 * becomes active once the user has picked one of their organizations (their
 * company's workspace). Until then it's pending, counts as signed out here,
 * and Clerk's sign-in page asks them to choose one. The backend checks the
 * session token again on every API call.
 */
export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
