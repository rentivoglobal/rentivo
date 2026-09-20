# Rentivo — Implementation Plan

**Version:** 2.0 MVP Build Specification  
**Architecture:** Supabase (BaaS & Postgres), ImageKit (CDN & Uploads), Paystack (Payments), Email-Only Notifications (Resend/SMTP)  
**Target Market:** Ibadan, Nigeria  

---

## 1. Delivery Strategy & Principles

1. **Dependency-First Execution:** Data models, Supabase RLS security boundaries, and third-party credentials must be established before building high-fidelity client screens.
2. **Early Vertical Slice:** Complete the end-to-end critical path first:
   `Browse Listing -> Request Access (Free) -> Lister Email Confirmation -> Paystack ₦5,000 Payment -> Contact Reveal (Screen + Email)`.
3. **Strict Device Testing:** Every completed screen must be validated at 360px viewport on mobile simulations before advancing.
4. **Resilient Third-Party Integrations:** ImageKit uploads and Paystack webhooks must include fallback handlers, retries, and idempotency checks.

---

## 2. Phase-by-Phase Build Roadmap

### Phase 1: Environment, Tooling & Design Tokens
- Set up project dependencies: `@supabase/supabase-js`, `imagekit-javascript`, `lucide-react`, `tailwindcss`.
- Configure environment variables for Supabase, ImageKit, Paystack, and Resend.
- Enforce brand tokens in CSS/Tailwind: `#000052` (Navy), `#BE89FF` (Lavender), typography, and accessible contrasts.
- Add Rentivo approved SVG logo assets.
- **Done Criteria:** Application compiles without warnings. Tailwind brand colors and typography render correctly in local preview.

### Phase 2: Supabase Schema, Migrations & RLS Security
- Execute SQL DDL migrations in Supabase:
  - Types: `user_role`, `property_category`, `property_type`, `listing_status`, `verification_status`, `request_status`, `payment_status`.
  - Tables: `users`, `cities`, `areas`, `listings`, `listing_photos`, `verification_requests`, `availability_requests`, `payments`, `promotion_redemptions`, `favorites`, `reports`, `audit_logs`.
- Apply Row Level Security (RLS) policies for all tables.
- Deploy database trigger `on_auth_user_created` to sync `auth.users` with `public.users`.
- Create PostgreSQL function `get_unlocked_lister_contact(request_id)` for secure contact decryption.
- Seed initial data: City of Ibadan and initial neighborhood areas (Bodija, Ring Road, Akobo, Oluyole, UI/Samonda, Jericho, Dugbe, Challenge).
- **Done Criteria:** Supabase migration runs cleanly on empty instance. RLS blocks unauthorized reads of landlord private contact data.

### Phase 3: Supabase Authentication & Role Management
- Implement sign-up, sign-in, sign-out, and password reset screens.
- Build role-selection step during signup (`tenant`, `business_renter`, `landlord`, `agent`).
- Implement auth state provider and route guards:
  - Public routes (`/`, `/search`, `/listings/:id`, `/how-it-works`).
  - Protected renter routes (`/account/*`, `/requests/*`).
  - Protected lister routes (`/lister/*`).
  - Protected admin routes (`/admin/*`).
- **Done Criteria:** Users can register, log in, persist sessions across page reloads, and get redirected away from unauthorized areas.

### Phase 4: ImageKit Direct Media Upload & CDN Integration
- Set up ImageKit server authentication route (`/api/imagekit/auth`) generating HMAC signatures.
- Build reusable `ImageKitUploader` React component:
  - Drag-and-drop multi-file selection (minimum 3 photos, maximum 10).
  - Client-side validation: JPEG/PNG/WebP, max 8MB per file.
  - Progress bar per photo upload.
  - Drag-and-drop sort order arrangement.
  - "Set Primary Photo" selector.
- Build `OptimizedImage` component using ImageKit URL transformation queries (`tr=w-...,q-80,f-auto`).
- **Done Criteria:** Lister can select 3+ photos and upload them directly to ImageKit; URLs and metadata save properly in `listing_photos`.

### Phase 5: Public Marketplace & Search Experience
- Implement Home Landing Page (`/`):
  - Hero search bar with area, category, type, and budget inputs.
  - Verified property showcase carousel.
  - Value proposition and neighborhood guides.
- Implement Search & Filter Page (`/search`):
  - Dynamic filter panel (reactive query params).
  - Responsive listing card grid with ImageKit optimized thumbnails and Verified badges.
  - Sorting and pagination.
- Implement Listing Detail Page (`/listings/:id`):
  - Photo gallery with fullscreen lightbox.
  - Verified inspection checklist card.
  - Amenities grid and neighborhood description.
  - Free "Request Access" action button.
- **Done Criteria:** Unauthenticated visitors can seamlessly browse, filter, and inspect verified properties with sub-2s page loads.

### Phase 6: Lister Center & Listing Management
- Build Lister Dashboard (`/lister`): Key metrics (active listings, request inquiries, views).
- Build Create Listing Wizard (`/lister/listings/new`):
  - Category and property type selectors.
  - Location picker (Ibadan areas).
  - Price and billing period input.
  - Integrated `ImageKitUploader`.
- Build My Listings view (`/lister/listings`) with status pills (Pending Admin Review, Published & Active, Draft, Unavailable).
- Build Physical Verification Request form (`/lister/verification`).
- **Done Criteria:** A landlord can create a listing with 5 photos in under 3 minutes; newly created listings default to `status = 'pending_approval'` and `is_approved = false`; verified that pending listings DO NOT appear on the public search page until approved by an admin.

### Phase 7: Email-Only Availability Confirmation Engine
- Integrate Resend API (or Supabase SMTP) for transactional email delivery.
- Build responsive HTML email templates:
  1. Lister Availability Request Email with signed `[ YES, STILL AVAILABLE ]` and `[ NO, ALREADY TAKEN ]` buttons.
  2. Renter "Available! Proceed to Pay" Email.
  3. Renter "Property Unavailable" Email.
  4. Renter "Contact Unlocked & Payment Receipt" Email.
- Implement tokenized email action endpoint (`/availability/action`):
  - Validates signed JWT token from lister's email click.
  - Transitions `availability_requests` to `confirmed` or `unavailable`.
  - Dispatches follow-up email to renter.
- Implement 30-minute timeout job triggering the Admin Escalation Queue.
- **Done Criteria:** Lister clicks "YES" in their email client; renter receives notification within seconds; database state updates accurately.

### Phase 8: Paystack Integration & Contact Reveal
- Implement Paystack Inline Checkout trigger on `/requests/:id` when status is `confirmed`.
- Configure Paystack Webhook Handler (`/api/webhooks/paystack`):
  - Validate HMAC SHA512 signature using `x-paystack-signature`.
  - Check idempotency against `payments.paystack_reference`.
  - Update `payments` to `success` and `availability_requests` to `paid`.
- Implement Contact Reveal UI on `/requests/:id`:
  - Fetch landlord phone, WhatsApp, and exact address via `get_unlocked_lister_contact` RPC.
  - Trigger instant post-payment email delivery containing complete contact details.
- Implement First-100-Users promo check to auto-waive fee if cap is open.
- **Done Criteria:** Successful ₦5,000 payment reveals landlord contact on screen and sends duplicate details to renter's email.

### Phase 9: Admin Operations Portal
- Build Admin Overview (`/admin`): Live statistics, pending listing approval counters, and revenue metrics.
- Build Listing Moderation Queue (`/admin/listings`): Pre-publish verification queue where admins inspect submissions, approve to publish live (`status = 'active'`, `is_approved = true`), or reject with feedback.
- Build Physical Inspection Queue (`/admin/verification`): Assign inspectors, submit inspection checklist, approve Verified badge.
- Build Availability Escalation Queue (`/admin/escalations`): Manual phone call resolutions for non-responding listers.
- Build Paystack Payments Ledger (`/admin/payments`): Transaction tracking and reconciliation.
- Build Reports Queue (`/admin/reports`): Handle reported fake listings.
- **Done Criteria:** Admin team can approve newly submitted posts to make them public, operate inspection approvals, and resolve availability escalations without touching the database directly.

### Phase 10: End-to-End QA, Hardening & Pilot Launch
- End-to-end integration testing across desktop and mobile devices.
- Security audit: Verify RLS prevents landlord contact leakage before payment.
- Test webhook failure, duplicate webhook submissions, and expired email tokens.
- Pilot recruitment: Onboard first 25 Ibadan landlords/agents in Bodija and Ring Road.
- Conduct physical inspections for initial pilot listings.
- **Done Criteria:** Complete pilot run with 10 real test users from search to paid contact reveal with zero errors.

---

## 3. Testing & Verification Checklist

- [ ] **Public Browsing:** Fast search and filtering across all Ibadan neighborhoods.
- [ ] **Admin Pre-Publish Gate:** Unapproved listings from listers are completely hidden from public search until explicitly verified and approved by an admin.
- [ ] **Auth & RLS:** Unauthenticated and unpermitted users cannot query `address_full` or landlord phone numbers.
- [ ] **ImageKit Upload:** Direct upload handles multiple images, rejects non-image files, and delivers optimized WebP formats.
- [ ] **Email Availability Loop:** One-click YES button from email updates status to `confirmed` within 3 seconds.
- [ ] **Paystack Checkout:** Correct ₦5,000 amount charged; webhook signature verified; idempotency prevents double charging.
- [ ] **Contact Reveal:** Contact card displays correctly in-app and identical copy arrives in renter's email inbox.
- [ ] **Admin Escalation:** Requests without lister response within window reliably surface in admin queue.
- [ ] **Mobile Responsiveness:** All pages pass 360px viewport tests with legible 16px body text and 44px touch targets.
