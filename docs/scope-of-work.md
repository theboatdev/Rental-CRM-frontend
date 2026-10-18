# Scope of Work (SOW): Shenaly Rent a Car Operations & Fleet Management Platform

**Document Version:** 1.0  
**Effective Date:** 17 October 2026  
**Client:** Shenaly Rent a Car ([shenalyrentacar.com](https://shenalyrentacar.com/)) · Colombo, Sri Lanka  
**Service Provider:** Software Engineering & Delivery Team  
**Project Code:** SRC-OPS-2026  

---

## 1. Executive Summary & Project Background

**Shenaly Rent a Car** operates a boutique vehicle rental business in Sri Lanka catering to domestic drivers, corporate clients, and international tourists. The business currently faces operational friction due to:
1. **Damage & return disputes:** Lack of immutable visual evidence at vehicle pickup and return.
2. **Regulatory & insurance compliance:** Heightened legal exposure when renting to foreign tourists without verified DMT airport temporary permits or AA Ceylon-endorsed International Driving Permits (IDPs).
3. **High fleet operating expenses:** Frequent fuel price fluctuations, high replacement parts tariffs, and loan-to-value (LTV) capital restrictions in Sri Lanka, requiring exact vehicle-by-vehicle net profit accounting.
4. **Dispersed reporting:** Absence of consolidated, automated weekly fleet utilization and revenue digests for executive leadership.

This Scope of Work defines the turnkey design, development, testing, cloud deployment, and handover of the **Shenaly Rent a Car Operations Platform**.

---

## 2. Project Scope & Architecture Boundary

### 2.1 In-Scope Deliverables
* **Admin & Staff Operations Web Portal (React + Tailwind CSS):** Responsive web application for desktop and tablet with role-based access control (Admin vs Staff).
* **Public Guest Front Link (Web Browser — No App Required):** Zero-install customer self-registration portal allowing local and foreign renters to submit identity documents and place early vehicle reservations.
* **Fleet Booking Calendar & Early Reservation Engine:** Visual multi-day fleet schedule matrix with month navigation, live vehicle availability, manual early booking tools, and one-click handover check-in.
* **Backend API & Business Logic Engine (Node.js + Express):** RESTful APIs handling authentication, rental contracts, payment ledgers, and profit calculations.
* **Encrypted Cloud Document & Photo Storage (AWS S3):** Secure storage with time-limited pre-signed access URLs for sensitive customer identity documents (NIC, passports) and vehicle condition photos.
* **Per-Vehicle Net Profitability Engine:** Automated calculation subtracting vehicle-specific maintenance, insurance, tire replacements, and service bills from rental earnings.
* **WhatsApp Business Automation Service:** Scheduled executive performance digests sent to management via Meta's WhatsApp Business Cloud API.
* **(Bonus Phase) Renter Mobile Web PWA:** Client-facing 6-shot photo capture utility for vehicle return checkouts.

### 2.2 Out-of-Scope (Explicit Exclusions)
* Complex third-party payment gateway merchant acquiring integrations; the system records manual receipts, bank slips, and POS slips.
* Hardware GPS / telematics tracker integration into vehicle ECUs.
* Native iOS / Android store apps (the system is delivered as a lightweight progressive web application / responsive web platform with zero app download required).

---

## 3. Work Breakdown Structure (WBS) & Functional Modules

### Module 1: Authentication & Role-Based Access Control (RBAC)
* **User Management:** Secure credentials for Admin and Operations Staff.
* **Permission Enforcement:**
  * **Admin:** Full financial visibility (per-vehicle net margins, revenue, profit summaries), cost approval, audit log access, and WhatsApp settings.
  * **Staff:** Day-to-day operations (renter intake, rental creation, payment receipts, photo audits, cost logging). Staff cannot view aggregate profit margins or delete financial ledger entries.
* **Session Management:** JWT-based stateless authentication with token expiration and refresh logic.

### Module 2: Renter Profiles & Regulatory Compliance
* **Customer Identification:** Auto-generated unique profile identifiers (e.g., `SR-0146`).
* **Sri Lankan Document Verification:**
  * **Domestic Renters:** National Identity Card (NIC) / Smart NIC, Sri Lanka Driving License, Proof of Address (Utility bill).
  * **International Tourists:** Passport, International Driving Permit (IDP), Department of Motor Traffic (DMT) Airport Temporary Driving Permit.
* **Compliance Safeguard:** Prominent warnings on foreign renter profiles missing mandatory DMT/IDP permits to protect hire-and-drive insurance validity.
* **Emergency Contacts:** Name, phone, and relationship recorded for every client.

### Module 3: Vehicle Fleet Inventory & Status Management
* **Vehicle Master Profile:** Plate number (e.g. `WP CBA-7706`), make, model, year, transmission, fuel type, current odometer reading, standard daily rate (LKR), and default security deposit (LKR).
* **Lifecycle State Machine:**
  * `Available` ➔ `Reserved` ➔ `Rented` ➔ `In Service / Maintenance`.
* **Vehicle Audit History:** Historical logs of all completed rentals, active renter details, and aggregated lifetime maintenance expenses.

### Module 4: Rental Contract Lifecycle & 6-Point Inspection
* **Rental Agreement Engine:** Auto-generated unique rental codes (e.g. `RNT-2026-0042`), date range selection, automatic daily calculation (`totalDays × dailyRate`), and deposit balance tracking.
* **Mandatory 6-Point Photo Handover Audit:**
  * Standardized capture checklist: 1. Front Bumper & Bonnet, 2. Rear Bumper & Trunk, 3. Left Profile, 4. Right Profile, 5. Interior & Upholstery, 6. Dashboard & Odometer.
  * Timestamped and tied to pickup condition logs.
* **Return & Comparison Viewer:** Side-by-side inspection viewer displaying pickup baseline vs return condition photos for rapid damage settlement.

### Module 5: Payments, Receipts & Security Deposit Ledger
* **Multi-Method Payment Recording:** Cash (LKR), Direct Bank Transfer (Commercial, Sampath, HNB), Credit/Debit Card POS Slip, or Online Gateway.
* **Receipt Generation:** Unique alphanumeric sequence (e.g. `RCPT-2026-0091`) with itemized breakdowns.
* **Deposit Lifecycle:** Record deposit collection, damage deductions (with itemized reason and photos), and deposit refunds.

### Module 6: Operating Costs & Service Bill Repository
* **Expense Categories:** Routine Maintenance, Mechanical Repair, Tire Replacement, Comprehensive Insurance Premium, Annual Revenue License & Fitness Test, Fuel & Lubricants, and Bodywork.
* **Invoice Archiving:** Upload and associate digital supplier bills (PDF / JPG) from workshops (e.g. Toyota Lanka, Auto Care).
* **Odometer Tagging:** Log vehicle mileage at time of service to trigger periodic 5,000 KM maintenance intervals.

### Module 7: Vehicle Profitability Engine & Management Dashboard
* **Real-Time Financial Metrics:**
  $$\text{Net Profit} = \sum \text{Rental Revenue} - \sum \text{Operational Costs}$$
* **Fleet Utilization & Health:** Active cars, idle cars, overdue rentals, and service-due warnings.
* **Exporting:** PDF / CSV export capability for accountants and tax auditors.

### Module 8: WhatsApp Business Cloud Automation
* **Weekly Performance Digest:** Configurable automated digest sent every Monday at 08:00 AM to the owner's WhatsApp number.
* **Message Payload:**
  * Fleet utilization rate.
  * 7-day collected rental revenue (LKR).
  * 7-day logged maintenance costs (LKR).
  * Top-performing and loss-making vehicle plates.
  * Action items (overdue vehicles, upcoming service checks).

### Module 9 (Bonus Extension): Renter Self-Service Return Inspection PWA
* Mobile-optimized web link dispatched to renter via WhatsApp.
* Guided camera viewfinder capturing the 6 mandatory angles upon return.
* Direct upload into the rental’s return audit record with client digital sign-off.

### Module 10: Public Guest Front Link (Self-Registration) & Fleet Booking Calendar
* **Zero-App Public Guest Link:** Lightweight web portal allowing renters to submit their identity credentials (NIC/DL for domestic residents; Passport & AA Ceylon IDP / DMT temporary permit for tourists) and request early vehicle reservations.
* **Instant Digital Voucher & WhatsApp Confirmation:** Generates unique Renter Profile ID (`SR-0150`) and early booking reference (`BK-2026-0044`), with a one-click WhatsApp message to Shenaly reservations (+94 77 123 4567).
* **Interactive Fleet Booking Calendar & Gantt Timeline:** Visual schedule of all fleet vehicles across days of the month, highlighting active rentals (green), early reservations (amber), and maintenance blocks (rose).
* **Manual Early Booking Scheduler:** Staff/Admin modal to schedule early bookings, lock vehicle availability, calculate estimated rental totals, and record advance security deposits.
* **One-Click Handover Conversion:** Single-click activation transitioning a `Reserved` booking to `Active` and triggering the mandatory 6-point pickup photo inspection upon client arrival.

---

## 4. Project Timeline, Milestones & Deliverables

| Milestone | Duration | Target Deliverables | Payment Trigger |
|---|---|---|:---:|
| **Milestone 1: Project Kickoff & UI/UX Foundation** | Week 1 | • Architecture confirmation & DB schema lock<br>• UI wireframes & responsive Tailwind design system<br>• Environment & AWS S3 bucket provisioning | **30% Advance** (LKR 96,120) |
| **Milestone 2: Core Platform Development** | Week 2 - 3 | • Modules 1–7 fully implemented (Auth, Renters, Vehicles, Rentals, 6-Point Photos, Payments, Costs)<br>• Vehicle Net Profit calculation engine<br>• Initial sandbox testing & data seeding | **50% Mid-Stage** (LKR 160,200) |
| **Milestone 3: WhatsApp Integration, QA & Go-Live** | Week 4 | • Module 8: WhatsApp Business Cloud API digest<br>• End-to-end integration testing & staff training<br>• Production deployment on AWS & domain connection<br>• Admin user documentation and handover | **20% Completion** (LKR 64,080) |
| **Optional Bonus: Renter Self-Return PWA** | +1 Week | • Module 9: Mobile self-service camera upload utility<br>• WhatsApp deep-link generation | LKR 55,800 (Separate milestone) |

---

## 5. Commercial Proposal & Investment Summary

| Item Description | Estimated Net Hours | Investment (LKR) |
|---|:---:|:---:|
| **Core Management System (Modules 1 through 8)** | **178 hrs** | **LKR 320,400** |
| *Includes Requirements, UI/UX, RBAC, Renter/Vehicle/Rental engines, 6-point photo audits, Payments, Costs, Profit Engine, WhatsApp API, QA & Cloud Deployment.* | | |
| **Bonus Module: Renter Return Photo Capture PWA (Module 9)** | **31 hrs** | **LKR 55,800** |
| *Includes guided mobile camera workflow, secure deep-links, and S3 direct pipeline.* | | |
| **Combined Total Investment (Core + Bonus)** | **209 hrs** | **LKR 376,200** |

*Note: All 3rd-party recurring service fees (AWS hosting & S3 storage, Meta WhatsApp Business Cloud API per-conversation message fees, domain name) are paid directly by the Client.*

---

## 6. Client Responsibilities & Dependencies

To ensure adherence to the delivery schedule, Shenaly Rent a Car will provide:
1. **Business Representative:** One designated primary contact for requirements clarification and milestone sign-offs.
2. **Branding Assets:** Official vector logo, preferred typography, and brand colour palette.
3. **Fleet & Pricing Baseline:** Initial CSV/spreadsheet of active fleet inventory, registration numbers, daily rates, and default security deposit tiers.
4. **Cloud Infrastructure Accounts:** Access to an AWS account (or approval for provider to provision under client billing) and a Meta Business Manager account with a verified phone number for the WhatsApp Business API.

---

## 7. Acceptance Criteria & Handover

The project shall be deemed complete and accepted when:
1. All functional test cases defined in the test plan pass across modern browsers (Chrome, Safari, Edge) on desktop and tablet.
2. Vehicle checkout and return photo flows operate without error, storing verified images in AWS S3.
3. The Net Profit engine correctly tallies revenue against expenses for individual vehicle ledger records.
4. The test WhatsApp digest is successfully transmitted and received on the client's verified mobile device.
5. User administration credentials and production deployment keys are handed over with the Admin Guide.

---

## 8. Acceptance & Authorization

**For Shenaly Rent a Car:**  
Name: ________________________________  
Title: _________________________________  
Signature: _____________________________  
Date: _________________________________  

**For Service Provider:**  
Name: ________________________________  
Title: Lead Technical Consultant  
Signature: _____________________________  
Date: _________________________________  
