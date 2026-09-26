# Rentivo Supabase Email Templates Guide

This directory contains production-ready, minimalist, mobile-responsive HTML email templates styled with the official Rentivo brand identity for Supabase Authentication.

All templates feature:
- Clean, uncluttered layout with modern typography
- Hosted official SVG Rentivo logo with typographic fallback (`RENTIVO` in `#000052`)
- High-contrast primary call-to-action button (`#000052`)
- Highlighted 6-digit OTP code container for clients/users who prefer entering the token manually
- Break-all direct link fallback for high email-client compatibility
- Legal & security footer tailored for Rentivo (Ibadan, Nigeria)

---

## 📍 Supabase Dashboard Location

1. Open your Supabase Dashboard:
   **[https://supabase.com/dashboard/project/uovlgngsmvjcgkgznyme/auth/templates](https://supabase.com/dashboard/project/uovlgngsmvjcgkgznyme/auth/templates)**
2. Or in the left sidebar, click **Authentication** &rarr; **Email Templates**.

---

## 📋 Copy & Paste Instructions

### 1. Confirm Signup
- **Tab**: `Confirm signup`
- **Subject line**:
  ```text
  Confirm your Rentivo account
  ```
- **Source file**: [`confirm-signup.html`](./confirm-signup.html)
- **Supported variables**: `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .SiteURL }}`, `{{ .Email }}`

---

### 2. Magic Link
- **Tab**: `Magic Link`
- **Subject line**:
  ```text
  Your Rentivo sign-in link
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
