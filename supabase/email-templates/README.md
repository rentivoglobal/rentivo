# Rentivo Supabase Email Templates Guide

This directory contains production-ready, minimalist, mobile-responsive HTML email templates styled with the official Rentivo brand identity for Supabase Authentication.

All templates feature:
- **Compact Hero Header**: Sleek, low-profile header (~85px height) that keeps verification codes above the fold on mobile and desktop
- **Brand Identity**: Hosted official Rentivo SVG logo + clean white wordmark
- **Integrated Concept Art Badge**: Compact vector artwork depicting contemporary architectural elevations, warm window glow, and 3D verification crest
- **Brand Motto / Punchline**: `"★ Real Homes. Inspected Truth. Direct Mandates."`
- **Prominent 6-Digit Code Container**: High-legibility 32px monospace token with 8px tracking for manual entry
- High-contrast primary call-to-action button (`#000052`)
- Break-all direct link fallback for high email-client compatibility
- Legal & security footer tailored for Rentivo (Ibadan, Nigeria)

---

## ⚡ Setting Verification Code Length to Strictly 6 Digits

If your Supabase emails are currently sending 7 or 8 characters, configure GoTrue to generate strictly **6 digits**:

1. Go to your Supabase Dashboard:
   **[https://supabase.com/dashboard/project/uovlgngsmvjcgkgznyme/auth/providers](https://supabase.com/dashboard/project/uovlgngsmvjcgkgznyme/auth/providers)**
2. In the left menu, select **Authentication** &rarr; **Providers**.
3. Click on the **Email** provider to expand its settings.
4. Scroll to **Mailer OTP length** (or **OTP length**).
5. Set the value to **`6`** (default is sometimes 8).
6. Click **Save** at the bottom right.
7. Any subsequent confirmation or login emails will strictly generate a clean **6-digit code** (e.g. `482910`).

---

## 📍 Supabase Dashboard Email Templates Location

1. Open your Supabase Dashboard:
   **[https://supabase.com/dashboard/project/uovlgngsmvjcgkgznyme/auth/templates](https://supabase.com/dashboard/project/uovlgngsmvjcgkgznyme/auth/templates)**
2. Or in the left sidebar, click **Authentication** &rarr; **Email Templates**.

---

## 📋 Copy & Paste Instructions

### 1. Confirm Signup
- **Tab**: `Confirm signup`
- **Subject line**:
  ```text
  {{ .Token }} is your Rentivo verification code
  ```
- **Source file**: [`confirm-signup.html`](./confirm-signup.html)
- **Supported variables**: `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .SiteURL }}`, `{{ .Email }}`

---

### 2. Magic Link
- **Tab**: `Magic Link`
- **Subject line**:
  ```text
  {{ .Token }} is your Rentivo sign-in code
  ```
- **Source file**: [`magic-link.html`](./magic-link.html)
- **Supported variables**: `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .SiteURL }}`, `{{ .Email }}`

---

### 3. Reset Password
- **Tab**: `Reset Password`
- **Subject line**:
  ```text
  Reset your Rentivo password
  ```
- **Source file**: [`reset-password.html`](./reset-password.html)
- **Supported variables**: `{{ .ConfirmationURL }}`, `{{ .SiteURL }}`, `{{ .Email }}`
- **Note**: Direct 1-click password reset link (no verification code required).

---

### 4. Change Email Address
- **Tab**: `Change Email Address`
- **Subject line**:
  ```text
  Confirm your new email address for Rentivo
  ```
- **Source file**: [`change-email.html`](./change-email.html)
- **Supported variables**: `{{ .ConfirmationURL }}`, `{{ .SiteURL }}`, `{{ .Email }}`
- **Note**: Direct 1-click email confirmation link (no verification code required).

---

### 5. Invite User
- **Tab**: `Invite user`
- **Subject line**:
  ```text
  You've been invited to Rentivo
  ```
- **Source file**: [`invite-user.html`](./invite-user.html)
- **Supported variables**: `{{ .ConfirmationURL }}`, `{{ .SiteURL }}`, `{{ .Email }}`
- **Note**: Direct 1-click invite acceptance link (no verification code required).

---

## 🎨 Asset URLs

The Rentivo logo assets are permanently hosted on the Supabase project public storage bucket:
- **Logo (Icon + Mark)**: `https://uovlgngsmvjcgkgznyme.supabase.co/storage/v1/object/public/assets/rentivo-logo.svg`
- **Mark Only**: `https://uovlgngsmvjcgkgznyme.supabase.co/storage/v1/object/public/assets/rentivo-mark.svg`

Bucket configuration:
- Bucket name: `assets`
- Access: Public (`public = true`)
- RLS Policies: Public read-only access enabled
