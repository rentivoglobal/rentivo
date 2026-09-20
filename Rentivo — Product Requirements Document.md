# Rentivo — Product Requirements Document

**Version:** 2.0 MVP Build Specification  
**Launch Market:** Ibadan, Nigeria  
**Core Stack:** Supabase, ImageKit, Paystack, Transactional Email (Resend/SMTP)  

---

## 1. Product Summary

Rentivo is a mobile-first rental marketplace for residential and commercial properties in Ibadan, Nigeria. It provides tenants and business renters a direct, trustworthy way to browse genuine listings, prioritize physically inspected properties, and obtain direct landlord contacts without paying inflated agent commissions (which often reach 20% to 50% in traditional offline transactions).

Listing is completely free for landlords and verified agents. A renter pays a single, predictable flat access fee of **₦5,000 once**, charged **only after** Rentivo verifies with the property owner that the selected property is vacant and ready for leasing.

> **Brand Integrity Rule:** Use only approved Rentivo logo variations. Preserve the original proportions, brand colors (`#000052` Deep Navy and `#BE89FF` Lavender), and clear space. Never alter, recolor, or distort the mark.

---

## 2. The Problem We Solve

In Ibadan, property seekers face chronic market failures:
1. **Inflated Middleman Charges:** Unregulated agents charge exorbitant viewing fees ("inspection fees") and 10–20% upfront agency + legal commissions before lease signing.
2. **Fake & Ghost Listings:** Many properties advertised online or offline are already rented, non-existent, or advertised with stolen photos.
3. **Stale Availability:** Renters spend time and transport money traveling to view properties that were rented weeks ago.
4. **Landlord Invisibility:** Property owners struggle to find genuine, vetted prospects quickly without dealing with dozens of unstructured street agents.

Rentivo solves this by:
- Operating an on-ground **Physical Verification Inspection** team in Ibadan that visits properties and awards the **Verified Badge**.
- Offering **Free Browsing** and **Free Access Requests**.
- Automating **Lister Availability Confirmation** via rapid **One-Click Email Checks** before requesting any payment.
- Charging only a **flat ₦5,000 fee** via Paystack once availability is 100% confirmed.
- Delivering landlord contacts immediately both **in-app** and directly to the renter's **Email**.

---

## 3. Target User Personas

1. **Residential Tenants:**
   - University students (University of Ibadan, The Polytechnic Ibadan, Lead City University), young professionals, and families looking for self-contain units, mini-flats, 2/3-bedroom apartments, or duplexes in Bodija, Akobo, Oluyole, Ring Road, Jericho, and Samonda.
   - Device Profile: Low-to-mid range Android smartphones on mobile networks (MTN, Airtel, Glo).
2. **Business Renters:**
   - Retailers, salon owners, boutique operators, startups, and professional firms seeking shops or office spaces in commercial corridors.
   - Care about road access, power consistency, commercial foot traffic, and verified ownership.
3. **Landlords & Property Owners:**
   - Real estate investors and property owners who want serious, verified tenants without paying listing fees.
   - Respond quickly via email to simple "Is this property still available?" one-click buttons.
4. **Authorized Agents:**
   - Supply partners who represent vetted landlords and agree to Rentivo’s verified listing guidelines.

---

## 4. MVP Functional Scope

### 4.1 Must-Have Capabilities (Phase 1)
- **Zero-Fee Browsing:** Public search and listing detail exploration without requiring prior account creation.
- **Configurable Location Hierarchy:** City-level and neighborhood-level data (launching in Ibadan: Bodija, Ring Road, Oluyole, Akobo, UI/Samonda, Jericho, Agodi, Challenge, Dugbe).
- **ImageKit Photo Engine:** Direct client uploads, minimum 3 photos per listing, automatic WebP/AVIF formatting, responsive thumbnail generation, and fast CDN delivery.
- **Role-Based Accounts (Supabase Auth):** Fast signup/login with roles: `tenant`, `business_renter`, `landlord`, `agent`, `admin`.
- **Physical Inspection Workflow:** On-ground checklist (physical visit, title match, mandate verification, photo authenticity) resulting in the **Verified Badge**.
- **Free "Request Access" Submission:** Renters register intent without paying any upfront fee.
- **Email-Only Availability Confirmation Loop:**
  - Automated transactional email dispatched to the lister with one-click buttons: `[ YES, IT'S AVAILABLE ]` vs. `[ NO, ALREADY TAKEN ]`.
  - Signed time-limited tokens to allow one-click confirmation without mandatory password login.
- **Paystack Payment Integration:**
  - Flat ₦5,000 access fee unlocked only when request status is `confirmed`.
  - Secure Paystack inline popup or redirect supporting Cards, Bank Transfers, and USSD.
  - Server-verified webhooks (`x-paystack-signature`) with idempotent database updates.
- **Multi-Channel Contact Reveal:**
  - Post-payment access immediately displays Landlord/Agent Full Name, direct phone number, WhatsApp link, and full exact address on the web portal (`/requests/:id`).
  - An instant email receipt with complete landlord contact details is dispatched to the renter's inbox.
- **First-100-Users Promotion:** System automatically waives the ₦5,000 fee for the first 100 qualifying confirmed rentals, unlocking contact immediately.
- **Mandatory Admin Pre-Publish Moderation Gate:** All property listings submitted by landlords or agents remain hidden from public search and cannot be viewed by renters until an admin reviews and verifies the post in the Admin Moderation Queue.
- **Reporting & Flagging Engine:** Ability for any user to flag suspicious, duplicate, or already rented listings.
- **Admin Operations Center:** Queues for listing moderation, physical inspection assignment, 30-minute availability escalations, and Paystack payment tracking.

### 4.2 Out of Scope (Post-MVP Roadmap)
- Long-term rent collection and deposit escrow handling (rental agreements remain offline between landlord and tenant).
- WhatsApp Business Bot & SMS Gateway (deferred in favor of Email-Only for launch simplicity).
- Native mobile applications (iOS/Android) — web application is 100% mobile responsive.
- Shortlet / nightly hotel bookings (strictly monthly and yearly rentals).
- Advanced automated biometric ID verification (physical inspection verifies legitimacy in Phase 1).

---

## 5. Core User Stories & Acceptance Criteria

### US-1: Renter Exploration
> **As a renter**, I want to search and filter rentals by neighborhood, property type, price, and verification status so that I can quickly find properties matching my budget.
- *Acceptance Criteria:* Search results update reactively; verified listings clearly display the green badge; prices are formatted in Naira (`₦...`); images load under 2 seconds on 3G/4G connections.

### US-2: Request Access & Zero Upfront Fee
> **As a renter**, I want to request access for a property for free so that I do not spend money until I know the listing is vacant.
- *Acceptance Criteria:* Clicking "Request Access" requires authentication; request is recorded in `availability_requests` with status `availability_pending`; no payment modal is shown; user sees clear status "Checking availability with landlord".

### US-3: One-Click Email Confirmation by Lister
> **As a landlord or agent**, I want to confirm property availability directly from my email inbox so that I can respond in seconds without logging in.
- *Acceptance Criteria:* Email arrives with property photo, title, and two distinct action buttons; clicking "YES" updates database status to `confirmed`; clicking "NO" marks property as `unavailable`; tokens expire after 24 hours.

### US-4: Paystack Fee Payment & Contact Unlocking
> **As a confirmed renter**, I want to pay ₦5,000 through Paystack so that I can immediately receive the landlord's phone number, WhatsApp link, and address.
- *Acceptance Criteria:* Payment button only appears when request is `confirmed`; Paystack charges exactly ₦5,000; on successful payment, the page immediately displays the contact details and sends a duplicate copy to the renter's email.

### US-5: Physical Inspection & Verified Badge
> **As an admin/inspector**, I want to complete an on-site physical inspection checklist so that genuine properties earn the Verified badge.
- *Acceptance Criteria:* Admin can schedule inspection; inspector submits completed checklist; listing updates to `is_verified = true` with inspection date stamped.

---

## 6. Success Metrics & KPIs

| Metric | 60-Day Target | Measurement Method |
|---|---|---|
| **Active Genuine Listings** | 100+ active listings in Ibadan | Supabase `listings` where `status = 'active'` |
| **Inspection Verification Rate** | > 60% of active listings verified | `COUNT(is_verified = true) / total active` |
| **Lister Email Response Rate** | > 70% responses within 2 hours | Timestamp comparison between email dispatch and token resolution |
| **Completed Paid Unlocks** | 30+ paid access fee unlocks | Paystack verified transactions (`amount_kobo = 500000`) |
| **Reported Fake Rate** | < 3% of listings reported | `reports` count divided by total listings |
| **Mobile Performance** | < 2.5s First Contentful Paint on 4G | Google Lighthouse Mobile Score > 85 |

---

## 7. Business & Legal Rules

1. **The ₦5,000 Fee Rule:** The fee is strictly an **Access and Information Verification Fee** for connecting the renter directly to a verified landlord without middlemen. It does not constitute a rent deposit or a guarantee that the landlord will accept the renter's personal lease application.
2. **Refund Policy:** If a confirmed property is found to be already rented within 24 hours of contact reveal despite the lister's confirmation, the renter receives a full ₦5,000 refund or a free credit for another listing after admin review.
3. **Free Listing Guarantee:** Landlords and agents are never charged for posting listings or requesting inspections.
4. **Data Privacy (NDPR):** Lister personal contact data is strictly shielded until payment verification.
5. **Pre-Publish Gate Rule:** No user-submitted listing goes live automatically. Newly submitted listings remain hidden from public search and cannot be viewed by renters until an admin reviews and verifies the post in the Admin Moderation Queue to ensure quality and prevent fraud.
