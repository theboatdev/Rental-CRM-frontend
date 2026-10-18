# Shenaly Rent a Car: chat record

Date: 3 to 4 October 2026
Project: Rental management system for Shenaly Rent a Car (https://shenalyrentacar.com/)

---

## 1. Your brief

> Shelly Rent a car
> URL https://shenalyrentacar.com/
>
> **Client profiles**
> - The pickup photos to be uploaded
> - The drop photos to be uploaded
> - NIC, DL and other documents for the renter
> - Payment
>
> **Vehicle profile**
> - Number of renters and their profile ID
> - The cost for each vehicle
> - Upload the cost section and bill of service for each vehicle
>
> **WhatsApp automation**
> - On weekly performance and vehicles
>
> **Bonus**
> - Photo capturing app for the renters to upload the vehicle photos upon return

---

## 2. Estimate (first reply)

**Assumptions**
- The name is taken as "Shenaly" from the URL. Your note says "Shelly", so this needs confirming.
- It is a new admin/staff web system, separate from the marketing site. There is no public booking engine.
- Payments are recorded manually (cash, bank transfer, card slip). There is no online gateway.
- WhatsApp uses the WhatsApp Business Cloud API. The client supplies the business number and Meta approval. Meta's message fees are billed separately.
- Uploads (NIC, driving licence, photos, bills) go to AWS S3, with access control on renter documents.
- Stack: React, Node.js, MongoDB, Tailwind, AWS.

**Core system (manual baseline hours)**

| Line item | What it covers | Manual hrs | Manual cost (LKR) |
|---|---|---:|---:|
| Discovery & requirements | Workflows, data model | 12 | 18,000 |
| UI/UX design | Admin screens | 28 | 42,000 |
| Authentication & roles | Admin and staff access | 14 | 21,000 |
| Client profiles | Renter ID, NIC/DL/other document uploads | 22 | 33,000 |
| Vehicle profiles | Details, status, availability | 20 | 30,000 |
| Rental management | Renters per vehicle, profile IDs, pickup/drop flow | 30 | 45,000 |
| Pickup & drop photos | Multi-image upload, timestamps, before/after view | 24 | 36,000 |
| Payment tracking | Payments, balances, receipts | 20 | 30,000 |
| Vehicle costs & service bills | Cost entries, bill uploads, per-vehicle profit | 22 | 33,000 |
| File storage & security | S3, access control | 10 | 15,000 |
| Reports dashboard | Renters, revenue and cost per vehicle | 18 | 27,000 |
| WhatsApp automation | Weekly performance and vehicle reports | 26 | 39,000 |
| Testing & QA | Full flow testing | 30 | 45,000 |
| DevOps & deployment | AWS go-live | 12 | 18,000 |
| Documentation & handover | Admin guide | 8 | 12,000 |

**Core summary**
- Manual build subtotal: LKR 444,000 (296 hrs)
- AI-assisted adjustment (-40%): -LKR 177,000
- Adjusted build subtotal: LKR 267,000 (178 hrs)
- Project management (10%): LKR 26,700
- Contingency (10%): LKR 26,700
- **Core grand total: LKR 320,400**
- Timeline: about 3 working weeks

**Bonus: renter photo-capture app**

| Line item | What it covers | Manual hrs | Manual cost (LKR) |
|---|---|---:|---:|
| Photo capture web app (PWA) | Guided shots, camera access, upload via secure link | 36 | 54,000 |
| Link generation & integration | Send link by WhatsApp, photos land in the drop record | 8 | 12,000 |
| Testing | Device and camera testing | 8 | 12,000 |

- Manual subtotal: LKR 78,000 (52 hrs)
- AI adjustment (-40%): -LKR 31,500
- Adjusted: LKR 46,500 (31 hrs)
- PM and contingency (10% each): LKR 4,650 each
- **Bonus total: LKR 55,800** (about 1 week)

**Combined (core + bonus): LKR 376,200**, about 4 working weeks with two mid-level engineers in parallel.

**Questions raised**
1. How many vehicles and staff users will there be? A larger fleet or multiple branches would push the estimate up.
2. Should the system also support customer-facing booking on the website, or is it internal-only?

This is a preliminary internal estimate for the sales conversation, subject to refinement after detailed scoping. The bonus app can be moved to a later phase to save LKR 55,800 up front.

---

## 3. Mockup (canvas)

**You asked:** "Create a mockup for this, a demo"

**Delivered:** a clickable design canvas with two screens.

- **Admin system (desktop):** dashboard, vehicles (with profile, cost breakdown, service bills and renters), renter profiles with documents, rentals with pickup/drop photo grids and a payment ledger, costs and bills table with an add-cost form, and WhatsApp weekly report settings with a message preview.
- **Renter photo app (phone):** a guided six-shot capture flow (front, rear, left, right, interior, odometer) with a submit step.

Link (private to you until shared): https://claude.ai/artifact/XRxozeqv3fCUMPACJpLJY6

All names, plates and amounts in it are invented sample data. It uses an amber and navy look, not the Shenaly site's branding.

---

## 4. Working demo (HTML)

**You asked:** "Give me a workable demo html"

**Delivered:** `shenaly-rent-a-car-demo.html`, a single file that opens in any browser.

**Works for real**
- Add, edit and delete vehicles. Each vehicle profile shows renters, revenue, costs, net profit and bills.
- Add renters (auto profile IDs such as SR-0146) and upload NIC, licence, passport or other documents.
- Create rentals (total = days x daily rate), record payments, track balances, mark returned (vehicle status updates).
- Upload six pickup and six drop photos per rental.
- Log costs per vehicle with an attached bill, and see cost, revenue and net per vehicle.
- Dashboard counts, 7-day payments chart and "needs attention" list calculated from the data.
- WhatsApp weekly report built from live numbers, opened in WhatsApp for sending or copied.
- Renter photo app: phone-style capture screen that saves photos into the rental's drop record.

**Simulated**
- Data is stored in the browser only. Export JSON and Reset demo data are in the sidebar.
- The renter photo link works only in the same browser.
- Photos are compressed, and PDFs are limited to 600 KB.
- The Monday 8:00 AM schedule is displayed only. Automatic sending needs the real backend and the WhatsApp Business API.
- No login. Sample data is invented.

---

## 5. Requirements sheet (doc)

**You asked:** "Create a req sheet for this"

**Delivered:** a shared doc, "Shenaly Rent a Car: Requirements Sheet".

Link: https://claude.ai/code/artifact/63dc7f4d-6fb6-4460-b3cd-2b7995a92d96

Sections:
1. Project overview
2. Functional requirements: 10 modules with IDs and Must/Should/Could priorities (access and roles, client profiles, documents, vehicles, rentals, pickup/drop photos, payments, costs and bills, dashboard and WhatsApp, renter photo app)
3. Clarifications required from the client (tick-box questions)
4. Client to provide (logo, vehicle list, templates, WhatsApp Business access, and so on)
5. Non-functional requirements, assumptions and out of scope
6. Technology, timeline and indicative price (core LKR 320,400, bonus LKR 55,800, combined LKR 376,200, about 4 working weeks) and payment terms (30% upfront, 50% of the remainder at the halfway stage, balance on completion)
7. Client sign-off block

One comment is left in the doc asking you to confirm the "internal system, no public booking" assumption.

**Details to review:** the payment terms (30% / 50% / balance) were my suggestion, not from your brief. Please confirm or change them before sending to the client.

---

## 6. Open items

- Confirm the spelling: Shenaly or Shelly.
- Confirm internal-only versus website booking.
- Confirm fleet size, number of staff and branches.
- Confirm the payment terms.
- Share the logo and brand colours if the demo should match the client's branding.
- Next possible steps: a formal quotation PDF or a full Scope of Work.
