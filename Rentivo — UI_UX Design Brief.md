# Rentivo — UI/UX Design Brief

**Version:** 2.0 MVP Build Specification  
**Brand Identity:** Deep Navy (`#000052`) & Lavender (`#BE89FF`)  
**Design Approach:** Mobile-First, High Trust, Restrained & Fast  
**Integrations Covered:** ImageKit (Media Loading & Transforms), Paystack (Checkout Modals), Email Templates (One-Click Yes/No)  

---

## 1. Design Objective & Experience Principles

Rentivo is designed to rebuild trust in the Nigerian property market. The design prioritizes **transparency, credibility, speed, and simplicity**. Every screen must assure users that listings are real, verified, and free of extortionate middleman fees.

### Core Experience Principles
1. **Unambiguous Trust Signals:** The green "Verified" badge is reserved exclusively for properties with a completed physical inspection. Unverified properties are clearly labeled and never masqueraded as verified.
2. **Predictable & Anxiety-Free Pricing:** The ₦5,000 fee is displayed with clear explanations that it is charged **only after** availability is verified by the landlord.
3. **Mobile-First Realities:** The UI is designed from a 360px viewport upward, optimized for low-to-mid range Android devices on Nigerian networks (MTN, Airtel, Glo). Touch targets must be at least 44x44px.
4. **Instant Visual Feedback:** Async operations (ImageKit uploads, Paystack checkout, availability state changes) provide explicit loading skeletons, micro-animations, and success indicators.

---

## 2. Brand Identity & Color Tokens

> **Brand Asset Integrity:** Use only the official Rentivo SVG logos provided in `/public` (`RENTIVO.svg` and `RENTIVO-lockup.svg`). Preserve the original proportions, spacing, and colors. Never stretch, rotate, recolor, or enclose in unapproved shapes.

### 2.1 Color Palette
```css
:root {
  /* Brand Primary & Accent */
  --color-navy: #000052;            /* Primary brand color for headers, logos, dark buttons */
  --color-lavender: #BE89FF;        /* Primary accent for hero highlights, key CTAs, focus rings */
  --color-lavender-light: #F4EEFF;  /* Soft lavender tint for badges, subtle card backgrounds */

  /* Surfaces & Backgrounds */
  --color-surface: #FFFFFF;         /* Pure white surface for cards and modals */
  --color-surface-muted: #F7F5FB;   /* Page background with warm lavender-gray undertone */
  --color-surface-subtle: #EFEBF7;  /* Secondary background for input fields, table headers */

  /* Typography */
  --color-text-primary: #11112B;    /* High contrast near-black navy for body and headings */
  --color-text-secondary: #5D5D78;  /* Readable medium gray for subtitles, meta info */
  --color-text-tertiary: #8C8CA5;   /* Light gray for disabled text, placeholders */

  /* Structural */
  --color-border: #E4E1ED;          /* Subtle card and input divider border */
  --color-border-focused: #BE89FF;  /* Input focus border */

  /* Operational & Status */
  --color-verified: #16794A;        /* Green for Verified badge and physical inspections */
  --color-verified-bg: #E8F7EE;     /* Soft green pill background */
  --color-warning: #A15C00;         /* Amber/Gold for "Checking Availability" states */
  --color-warning-bg: #FEF7EA;
  --color-danger: #B42318;          /* Red for "Unavailable", reports, and errors */
  --color-danger-bg: #FEE4E2;
}
```

---

## 3. Typography & Hierarchy

- **Primary Font Family:** `Inter`, `Manrope`, or system sans-serif (`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`).
- **Hierarchy Scale:**
  - **Display (Hero Headline):** 32px (mobile) / 48px (desktop), Bold (700), Line Height 1.15.
  - **H1 (Page Titles):** 24px (mobile) / 32px (desktop), Bold (700).
  - **H2 (Section Headers):** 20px (mobile) / 24px (desktop), SemiBold (600).
  - **H3 (Card Titles, Modal Titles):** 16px (mobile) / 18px (desktop), SemiBold (600).
  - **Body Text:** 16px minimum on mobile for touch legibility, Regular (400), Line Height 1.5.
  - **Caption / Meta:** 13px / 14px, Medium (500).
- **Price Formatting Rule:** Prices must always be rendered boldly with the Naira currency symbol: e.g. **`₦650,000`**`/year` or **`₦5,000`**` flat access fee`.

---

## 4. ImageKit Media Presentation Guidelines

To prevent mobile lag and layout shifts, all property imagery rendered via ImageKit must follow these rules:

1. **Fixed Aspect Ratios:**
   - Listing Grid Cards: `16:10` or `4:3` aspect ratio with `object-cover`.
   - Property Detail Hero Lightbox: `16:9` widescreen or `3:2` standard.
2. **ImageKit Dynamic Transformations:**
   - **Marketplace Grid Thumbnails:** `tr=w-500,h-350,fo-auto,q-80,f-auto`
   - **Hero Detail View:** `tr=w-1200,h-800,q-85,f-auto`
   - **Blur-Up LQIP Placeholder:** `tr=w-40,bl-6,q-20,f-auto` (displayed while high-res image streams in).
3. **Empty / Broken Image Fallback:**
   - Always render an elegant branded SVG placeholder if an image fails to load or is missing.

---

## 5. Paystack & Payment UI Patterns

1. **Pre-Payment State (`confirmed`):**
   - Clean, elevated card showing:
     - Property thumbnail and title.
     - Confirmed status with landlord availability timestamp.
     - Transparent fee breakdown: Access Fee = ₦5,000 (No agency fees, no legal fees, no viewing charges).
   - Primary Action Button: Large 48px high lavender/navy button `[ Pay ₦5,000 to Unlock Landlord Details ]`.
2. **Paystack Inline Modal:**
   - Triggered cleanly without page reload via Paystack Inline JS.
   - Shows Rentivo logo, customer email, and ₦5,000 amount.
3. **Post-Payment Revealed Card (`paid`):**
   - High-contrast celebratory card with soft green border and background.
   - Prominent Landlord Information:
     - Avatar / Name & Agency.
     - Direct Phone Number with clickable `tel:` link.
     - WhatsApp Quick Chat button with pre-filled message ("Hello, I requested access for [Listing Title] on Rentivo...").
     - Exact Full Address & Landmarks.
   - Confirmation notice: *"A copy of these details and your payment receipt have been sent to your email."*

---

## 6. Email Template UI Guidelines (Resend / SMTP)

Emails are the primary communication channel between Rentivo, renters, and landlords. They must be clean, mobile-optimized, and render consistently in Gmail, Yahoo, Apple Mail, and Outlook:

1. **Header:** Centered Rentivo logo with deep navy header bar or clean white surface.
2. **Lister Availability Email:**
   - Prominent Property Card: Image thumbnail, title, neighborhood, and rent.
   - Callout: "A prospective tenant has requested to inspect this property."
   - **Primary Action (YES):** Full-width, high-contrast green button: `[ YES, IT'S STILL AVAILABLE ]` (min 48px height, 16px bold text).
   - **Secondary Action (NO):** Full-width red/gray button: `[ NO, ALREADY TAKEN ]`.
   - Reassurance footer: "Clicking takes 2 seconds and updates the renter immediately."
3. **Renter Unlock Email:**
   - Clean table detailing landlord phone number, WhatsApp link, and physical property address.
   - Paystack transaction receipt reference.
   - Direct button back to the web portal.

---

## 7. Responsive Navigation & Mobile Layout Rules

1. **Mobile (< 768px):**
   - Fixed top header: Rentivo logo + search icon + hamburger menu.
   - Fixed bottom navigation bar (48px - 56px height): Explore, Saved, Requests, Post, Account.
   - Sticky CTA on Listing Detail Page: Bottom bar with price and "Request Access (Free)" button.
2. **Desktop (>= 768px):**
   - Generous top navbar with logo, search shortcut, category links, Post a Listing CTA, and user profile avatar.
   - Sidebar filters on search results with grid layout (2 or 3 columns).
