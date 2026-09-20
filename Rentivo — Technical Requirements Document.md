# Rentivo — Technical Requirements Document

**Version:** 2.0 MVP Build Specification  
**Launch Market:** Ibadan, Nigeria  
**Core Technologies:** Supabase (Database, Auth, RLS), ImageKit (Media CDN & Uploads), Paystack (Payments), Transactional Email (Resend/SMTP)  

---

## 1. Technical Direction & Architecture Overview

Rentivo is built as a responsive, high-performance web application designed for the Nigerian rental market, optimized for mobile-first access across low-to-mid range Android devices and varying mobile data connections.

The architecture decouples the user interface from backend services through managed cloud primitives:
- **Application Frontend:** React (TypeScript) + Vite + Tailwind CSS + Lucide Icons (with server routes/Edge functions for secrets).
- **Backend-as-a-Service (BaaS):** Supabase (PostgreSQL 15+, Supabase Auth, Row Level Security, Database Triggers & Edge Functions).
- **Media & Image Processing:** ImageKit.io (Direct client upload with HMAC token authentication, automated real-time WebP/AVIF optimization, resizing, responsive transformations, and global CDN caching).
- **Payment Gateway:** Paystack (Inline Checkout & standard redirect for the flat ₦5,000 access fee, secured by HMAC SHA512 webhook verification).
- **Communications & Notifications:** **Email-Only (MVP Scope)** via Resend / Postmark / Supabase SMTP. All notifications, landlord availability confirmations (via one-click signed tokens), and post-payment landlord contact deliveries are handled exclusively via Email and in-app dashboard views.

---

## 2. Technology Stack & Decision Matrix

| Layer | Technology Decision | Rationale |
|---|---|---|
| **Frontend Framework** | React 19 + TypeScript + Vite | Blazing fast client performance, lightweight bundle footprint, strict typing across database models. |
| **Styling & UI** | Tailwind CSS + Custom Design System | Utility-first, zero runtime CSS overhead, accessible custom components matching Rentivo brand tokens (`#000052` Navy, `#BE89FF` Lavender). |
| **Database & ORM** | Supabase PostgreSQL 15+ | Relational schema with foreign keys, JSONB for amenities/checklists, transactional integrity, and Row Level Security (RLS). |
| **Authentication** | Supabase Auth (GoTrue) | Role-aware sessions (Tenant, Business Renter, Landlord, Agent, Admin), secure JWTs, password recovery, email verification. |
| **Media & Photo Storage** | ImageKit.io | Automatic client compression, on-the-fly transformations (w=800, q=80, f=auto), smart cropping, fast delivery across Nigerian ISPs. |
| **Payment Gateway** | Paystack | Nigerian market standard; supports Cards, Bank Transfers, USSD, and Apple Pay with Naira (NGN) settlements and webhook signatures. |
| **Notification Engine** | Transactional Email (Resend / SMTP) | Reliable deliverability, clean HTML templates with mobile-friendly action buttons for one-click availability confirmation. |
| **Hosting & CI/CD** | Vercel / Netlify / Supabase Cloud | Continuous preview environments, automated branch deployments, edge caching. |

---

## 3. ImageKit Integration Architecture

Property images are uploaded directly from the client browser to ImageKit, eliminating server bandwidth bottlenecks while maintaining strict security:

```
[User Browser]
      │
      ├── 1. GET /api/imagekit/auth ────────► [Backend / Edge Function]
      │   (Returns: signature, token, expire)       │ (Uses IMAGEKIT_PRIVATE_KEY)
      │◄────────────────────────────────────────────┘
      │
      ├── 2. POST to upload.imagekit.io ────► [ImageKit Servers]
      │   (File + Auth Params + Tags)               │
      │◄── 3. Returns fileId, url, filePath ────────┘
      │
      └── 4. INSERT into Supabase listing_photos table
```

### 3.1 Security & Authentication Endpoint (`/api/imagekit/auth`)
The server or Supabase Edge Function uses the ImageKit Node.js SDK with `IMAGEKIT_PRIVATE_KEY` to generate HMAC-SHA1 tokens:
```typescript
import ImageKit from "imagekit";

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!
});

export async function getImageKitAuth() {
  return imagekit.getAuthenticationParameters();
}
```

### 3.2 Upload Guidelines & Constraints
- **File Types:** JPEG, PNG, WebP only. Executables and PDFs are rejected.
- **Maximum File Size:** 8MB per image.
- **Listing Requirements:** Minimum 3 photos, recommended 5–10 photos.
- **Destination Folder:** `/rentivo/listings/{listing_id}/`.
- **Tags Applied:** `["listing", "ibadan", listing_id]`.

### 3.3 Dynamic Delivery Transformations
Images are loaded using standard ImageKit URL transformation parameters:
- **Card Thumbnail (Grid):** `https://ik.imagekit.io/rentivo/listings/{id}/{photo}?tr=w-500,h-350,fo-auto,q-80,f-auto`
- **Hero / Detail Lightbox:** `https://ik.imagekit.io/rentivo/listings/{id}/{photo}?tr=w-1200,h-800,q-85,f-auto`
- **Low-Quality Image Placeholder (LQIP):** `https://ik.imagekit.io/rentivo/listings/{id}/{photo}?tr=w-40,bl-6,q-20,f-auto`

---

## 4. Paystack Integration Architecture

Rentivo charges a single flat fee of **₦5,000** (500,000 kobo) strictly after property availability has been verified.

### 4.1 Payment Lifecycle & State Machine
```
[Renter Submits Request]
         │
         ▼
[availability_pending] ──(Lister confirms via Email)──► [confirmed]
                                                             │
                                                             ▼
                                                    [payment_pending]
                                                             │
                                        (Renter opens Paystack Checkout)
                                                             │
                                                             ▼
                                                [Paystack Webhook Verified]
                                                             │
                                                             ▼
                                                   [paid / contact_revealed]
                                                             │
                                    ┌────────────────────────┴────────────────────────┐
                                    ▼                                                 ▼
                      [Unlock Contact in Web Portal]                    [Send Contact Details via Email]
```

### 4.2 Webhook Signature & Security (`/api/webhooks/paystack`)
- Paystack sends a `POST` request with the `x-paystack-signature` header containing an HMAC SHA512 hash of the request body using `PAYSTACK_SECRET_KEY`.
- The webhook handler strictly verifies this signature before processing:
```typescript
import crypto from "crypto";

export function verifyPaystackSignature(rawBody: string, signature: string): boolean {
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(rawBody)
    .digest("hex");
  return hash === signature;
}
```
- **Idempotency Rule:** If the payment record with `provider_reference` already exists and is marked `paid`, the webhook logs the duplicate and returns `200 OK` without performing redundant database mutations.

---

## 5. Email Notification System (Resend / SMTP)

All marketplace communications, verification loops, and contact reveals operate exclusively through Email for Phase 1 MVP:

### 5.1 Lister Availability Check Email
When a renter submits "Request Access", the system automatically generates a time-limited signed HMAC token and sends an email to the property owner/agent:
- **Email Subject:** `Action Required: Is "[Listing Title]" still available? — Rentivo`
- **Email Body:**
  - Listing photo thumbnail, title, address, and rental price.
  - Notification that a verified renter has requested access.
  - **Button 1 (Green):** `[ YES, IT'S STILL AVAILABLE ]` -> Links to `https://rentivo.ng/availability/action?token={JWT}&decision=yes`
  - **Button 2 (Neutral/Red):** `[ NO, ALREADY TAKEN / UNAVAILABLE ]` -> Links to `https://rentivo.ng/availability/action?token={JWT}&decision=no`
  - Note indicating response validity window (e.g., 2 hours).

### 5.2 Renter "Available - Ready for Payment" Email
Sent immediately upon the lister clicking "YES":
- **Email Subject:** `Good News! "[Listing Title]" is available — Unlock Landlord Contact`
- **Content:** Confirms property availability, outlines the flat ₦5,000 fee, and provides a direct CTA button: `[ Pay ₦5,000 to Unlock Details ]`.

### 5.3 Renter "Contact Unlocked" Email (Post-Payment)
Sent immediately after Paystack webhook confirms ₦5,000 payment:
- **Email Subject:** `Landlord Details Unlocked: "[Listing Title]" — Rentivo`
- **Content:**
  - Landlord / Agent Full Name.
  - Direct Phone Number & WhatsApp link (`https://wa.me/234...`).
  - Exact property address and directions.
  - Verified inspection checklist summary.
  - Receipt details (Paystack Reference, ₦5,000 paid).
  - Direct link back to `/requests/:id` on the web portal.

### 5.4 Renter "Unavailable" Email
Sent if lister clicks "NO" or property is flagged unavailable:
- **Email Subject:** `Update: "[Listing Title]" is no longer available — Rentivo`
- **Content:** Explains that the property was reported occupied or unavailable, reassures that **no charge** was incurred, and provides links to similar verified properties in the same neighborhood.

---

## 6. Security, Authorization & Privacy Rules

1. **Mandatory Admin Pre-Publish Moderation Gate:**
   - **No listing submitted by a landlord or agent appears on public pages (`/` or `/search`) until an admin explicitly reviews and approves it.**
   - Newly created listings are assigned `status = 'pending_approval'` and `is_approved = false`.
   - The listing remains strictly invisible to public browsing and cannot be discovered or queried by unauthorized users.
   - Only when an administrator reviews the submission in the Admin Moderation Queue (`/admin/listings`) and approves it does the system set `status = 'active'`, `is_approved = true`, `approved_by = admin_id`, and `approved_at = NOW()`.
   - Listers can view their pending listings in their own Lister Dashboard (`/lister/listings`) with a clear "Pending Admin Approval" badge, but the public cannot access them.

2. **Row Level Security (RLS) Enforcement:**
   - Enabled on all Supabase tables.
   - Public users can ONLY query listings where `status = 'active'` AND `is_approved = true`.
   - Landlord contact details (`phone`, `email`, `address_full`) are stored in restricted columns or retrieved via a secure PostgreSQL function `get_unlocked_lister_contact(request_id)` that verifies an active `paid` or `promotion_redemption` record exists for the calling `auth.uid()`.

3. **Contact Protection:** Public API responses must never leak raw landlord phone numbers or private addresses before payment verification.

4. **Bot & Abuse Protection:** Rate-limiting applied to signups, listing creation, and Request Access submissions (e.g., max 5 access requests per renter per hour).

5. **Data Retention & Privacy (NDPR Compliance):** Payment references and transaction logs are stored indefinitely for audit purposes; unconfirmed temporary contact request tokens expire after 72 hours.

---

## 7. Environment Variables Specification

```env
# -------------------------------------------------------------
# APP CONFIGURATION
# -------------------------------------------------------------
APP_BASE_URL="https://rentivo.ng"
NODE_ENV="production"

# -------------------------------------------------------------
# SUPABASE CONFIGURATION
# -------------------------------------------------------------
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# -------------------------------------------------------------
# IMAGEKIT CONFIGURATION
# -------------------------------------------------------------
VITE_IMAGEKIT_PUBLIC_KEY="public_..."
VITE_IMAGEKIT_URL_ENDPOINT="https://ik.imagekit.io/rentivo"
IMAGEKIT_PRIVATE_KEY="private_..."

# -------------------------------------------------------------
# PAYSTACK CONFIGURATION
# -------------------------------------------------------------
VITE_PAYSTACK_PUBLIC_KEY="pk_live_..."
PAYSTACK_SECRET_KEY="sk_live_..."
PAYSTACK_WEBHOOK_SECRET="sk_live_..."

# -------------------------------------------------------------
# EMAIL (RESEND / SMTP) CONFIGURATION
# -------------------------------------------------------------
RESEND_API_KEY="re_..."
EMAIL_FROM="Rentivo Notifications <notifications@rentivo.ng>"
EMAIL_SUPPORT="support@rentivo.ng"

# -------------------------------------------------------------
# APPLICATION SECRETS
# -------------------------------------------------------------
AVAILABILITY_TOKEN_SECRET="super-secure-random-secret-key-32-chars"
CRON_SECRET="scheduled-jobs-auth-token"
```

---

## 8. Suggested Repository Structure

```text
rentivo/
├── public/                     # Brand logos, icons, favicon
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── common/             # Button, Modal, Badge, Navbar, Footer
│   │   ├── listings/           # ListingCard, PhotoGallery, FilterBar
│   │   ├── imagekit/           # ImageKitUploader, OptimizedImage
│   │   └── payment/            # PaystackPayButton, PaymentStatusCard
│   ├── pages/                  # Page route components
│   │   ├── public/             # HomePage, SearchPage, ListingDetailPage, HowItWorksPage
│   │   ├── auth/               # LoginPage, SignupPage, ForgotPasswordPage, CallbackPage
│   │   ├── renter/             # RequestsPage, RequestDetailPage, FavoritesPage, ProfilePage
│   │   ├── lister/             # ListerDashboard, CreateListingPage, EditListingPage, InspectionPage
│   │   └── admin/              # AdminDashboard, ModerationPage, EscalationPage, PaymentsPage
│   ├── lib/
│   │   ├── supabaseClient.ts   # Supabase client initialization
│   │   ├── imagekitClient.ts   # ImageKit configuration & transformation helpers
│   │   ├── paystackClient.ts   # Paystack checkout helper
│   │   └── emailTemplates.ts   # HTML email builders
│   ├── services/               # API & DB service functions
│   │   ├── listingsService.ts
│   │   ├── requestsService.ts
│   │   ├── authService.ts
│   │   └── adminService.ts
│   ├── types/
│   │   └── index.ts            # Supabase database types & domain models
│   └── styles/
│       └── index.css           # Tailwind directives & CSS design tokens
├── supabase/
│   ├── migrations/             # SQL schema migrations & RLS policies
│   └── functions/              # Supabase Edge Functions (ImageKit auth, Paystack webhook)
└── package.json
```
