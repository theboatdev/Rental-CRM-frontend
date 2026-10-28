# Tenant app

The app a rental company works in every day: fleet, renters, bookings and hand-overs, payments, running costs, the dashboard and the WhatsApp digest, plus team and role management. Each company (tenant) signs in to its own workspace; Shenaly Rent a Car is tenant #1.

It also serves each tenant's public booking page at `/book/<slug>`, where renters register and book without an account.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Clerk · TanStack Query.

## Run locally

```sh
npm install
cp .env.example .env.local   # Clerk keys and the backend's tenant API URL
npm run dev                  # http://localhost:3000
```

It needs the backend running (`npm run dev` in `backend/`, port 5000), with `http://localhost:3000` in its `CLERK_AUTHORIZED_PARTIES`.

To sign in you need a member account in a provisioned tenant:

1. A super admin creates the tenant in the admin dashboard, which invites its Owner by email. More users are invited from the tenant's **Users** page there, or by the Owner from this app's Team page.
2. The invitation link opens this app's `/sign-up` (set the backend's `CLERK_INVITATION_REDIRECT_URL` to `http://localhost:3000/sign-up`).
3. The backend adds the member when Clerk's webhook arrives; locally, `npm run seed -- --tenant <slug> --user <user_id> --email <email>` in the backend does it by hand.

See the backend repo's `docs/clerk-setup.md`, steps 7 and 8.

Checks: `npm run typecheck`, `npm run lint`, `npm run build`.

## Netlify

Use `npm run build` as the build command and `.next` as the publish directory. If deploying from a parent repository, set the base directory to `frontend`.

Set the variables from `.env.example` in Netlify's **Project configuration → Environment variables**, using the deployed backend URL for `NEXT_PUBLIC_API_URL`. The `NEXT_PUBLIC_*` values are public browser configuration; create them without **Contains secret values**. Keep `CLERK_SECRET_KEY` marked as secret.

`netlify.toml` excludes only `NEXT_PUBLIC_CLERK_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` from secret scanning. This handles existing Netlify configurations where these public values were marked as secrets and then detected in generated routes and browser bundles. All other secret scanning remains enabled. Commit the configuration and trigger a new deploy to apply it.

## How it works

- **Auth.** `src/proxy.ts` (Clerk) requires a session for everything but `/sign-in` and `/sign-up`. Personal accounts are off in Clerk, so a session is only active once the user picks one of their organizations; Clerk's sign-in shows that step. The organization is the tenant.
- **Data.** Pages call the backend's `/api/v1` from the browser with the Clerk session token (`src/lib/api.ts`), through TanStack Query hooks (`src/lib/queries.ts`). Query keys start with the active organization id, so switching workspace never shows another tenant's cache.
- **Workspace.** `src/components/shell/workspace-gate.tsx` loads `GET /me` (the member, role and effective permissions) and `GET /config` (the tenant's config) before anything renders, and explains what's wrong when that fails (not a member yet, workspace suspended, backend down).
- **Config-driven UI.** `useWorkspace()` (`src/lib/workspace.tsx`) gives every page:
  - `can(permission)` to hide what the role can't use;
  - `moduleOn(module)` for modules the super admin switched off;
  - `label(list, key)` and `options(list)` for the config's lists (payment methods, cost categories, document types);
  - locale formatters for currency, dates in the tenant's timezone, and distances;
  - the tenant's branding, set as the `--brand` CSS colour.

  The tabs follow the config's `navigation` order and labels (`src/lib/navigation.ts`).
- **Files.** Document scans, inspection photos and bills go from the browser straight to Cloudinary (`src/lib/uploads.ts`):
  - the backend signs each upload (`POST /uploads`), the file is posted to Cloudinary, and Cloudinary's response is sent with the record, where the backend checks it;
  - `FilePicker` (`src/components/ops/files.tsx`) uploads as soon as a file is picked, and forms wait for running uploads before they submit;
  - responses carry links that expire after 10 minutes, so pages always use fresh data to open a file.
- **Guest booking page.** `/book/<slug>` (`src/components/booking/booking-page.tsx`) needs no sign-in (`src/proxy.ts`). It calls the backend's `/api/public/<slug>`, derived from `NEXT_PUBLIC_API_URL` by swapping `/v1` for `/public`. The tenant's branding colours the page.
- **The backend decides.** Hiding UI is never the protection. The API checks every permission and module again, validates every form, and strips profit and margin figures for roles without `financials:view`, so pages render what comes back. Form errors show the backend's field issues.

## Layout

| Path | Purpose |
|---|---|
| `src/proxy.ts` | Clerk session check |
| `src/app/sign-in`, `src/app/sign-up` | Clerk sign-in, and invitation acceptance |
| `src/app/(app)/` | The signed-in pages: `dashboard`, `vehicles`, `renters`, `rentals`, `calendar`, `payments`, `costs`, `whatsapp`, `team` |
| `src/app/book/[slug]/`, `src/components/booking/` | The public guest booking page |
| `src/components/shell/` | Workspace gate, header and tabs, organization switcher, per-page module gate |
| `src/components/ops/` | Forms and dialogs shared by pages: booking, rental details, payments, vehicles, costs and fuel, renters. `fields.tsx` renders the config's custom fields in forms, detail views and lists; `files.tsx` picks, uploads and opens files |
| `src/components/ui/` | Buttons, dialogs, form fields, tables, badges |
| `src/lib/contract.ts` | TypeScript types for the backend's responses, written by hand. Keep them in step with `backend/src/tenant/presenters.js` |
| `src/lib/` | API client, query hooks, workspace context, formatters, dates, navigation; `uploads.ts` (Cloudinary uploads) and `public-api.ts` (the guest portal API) |
| `docs/` | Product scope and client research |

## WhatsApp digest

The backend sends the digest on its schedule once the platform team connects the tenant's WhatsApp Business number in the admin dashboard. The WhatsApp page shows whether it's connected and the latest sends. Members with `whatsapp:manage` can send it now, and anyone who can view it can still open it in WhatsApp by hand.
