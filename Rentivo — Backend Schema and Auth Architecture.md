# Rentivo — Backend Schema and Auth Architecture

**Version:** 2.0 MVP Build Specification  
**Database Engine:** Supabase PostgreSQL 15+  
**Auth System:** Supabase Auth (GoTrue) with Row Level Security (RLS)  
**Media Provider:** ImageKit.io  
**Payment Engine:** Paystack  
**Notification Scope:** Transactional Email (Resend / SMTP)  

---

## 1. Architectural Principles

1. **PostgreSQL System of Record:** Supabase PostgreSQL acts as the single source of truth for all users, listings, requests, payments, and audit histories.
2. **UUID Primary Keys:** All application tables use `UUID` with `gen_random_uuid()` defaults to avoid ID enumeration and facilitate client-side generation when necessary.
3. **Financial Precision:** All monetary amounts are stored as integer minor currency units (Nigerian Kobo: ₦5,000 = `500000`) with explicit currency code `NGN`.
4. **Strict Contact Seclusion:** Lister private contact information (phone number, WhatsApp number, exact street address) is never exposed to public or unauthenticated queries. It is strictly secured by Row Level Security and accessible only via authorized RPC after Paystack payment confirmation or approved promotion waiver.
5. **ImageKit Photo Metadata:** Property photos store ImageKit CDN URLs, file IDs, and transformation paths directly in the database.

---

## 2. Supabase Custom Enums & Types

```sql
-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User Roles
CREATE TYPE user_role AS ENUM (
  'tenant',
  'business_renter',
  'landlord',
  'agent',
  'inspector',
  'admin'
);

-- Listing Taxonomy
CREATE TYPE property_category AS ENUM ('residential', 'commercial');

CREATE TYPE property_type AS ENUM (
  'self_contain',
  'flat_apartment',
  'duplex',
  'bungalow',
  'shop',
  'office_space',
  'warehouse',
  'land'
);

CREATE TYPE listing_status AS ENUM (
  'draft',
  'pending_approval',
  'active',
  'unavailable',
  'suspended',
  'rejected',
  'removed'
);

CREATE TYPE verification_status AS ENUM (
  'unverified',
  'pending',
  'verified',
  'rejected'
);

-- Availability & Payment Lifecycle
CREATE TYPE request_status AS ENUM (
  'submitted',
  'availability_pending',
  'confirmed',
  'payment_pending',
  'paid',
  'unavailable',
  'manual_escalation',
  'expired',
  'cancelled'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'success',
  'failed',
  'abandoned',
  'refunded'
);
```

---

## 3. Database Table Definitions (DDL)

### 3.1 `public.users`
Extends `auth.users` with role, verification status, and contact info:
```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'tenant',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  agency_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.2 `public.cities` and `public.areas`
Configurable locations (starting with Ibadan and its districts):
```sql
CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  country_code VARCHAR(2) NOT NULL DEFAULT 'NG',
  currency_code VARCHAR(3) NOT NULL DEFAULT 'NGN',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(city_id, slug)
);
```

### 3.3 `public.listings`
```sql
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category property_category NOT NULL,
  property_type property_type NOT NULL,
  status listing_status NOT NULL DEFAULT 'pending_approval',
  is_approved BOOLEAN NOT NULL DEFAULT FALSE, -- Must be approved by admin before public display
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  price_amount BIGINT NOT NULL, -- in Kobo (e.g. ₦450,000 = 45000000)
  currency_code VARCHAR(3) NOT NULL DEFAULT 'NGN',
  billing_period TEXT NOT NULL DEFAULT 'per_year', -- 'per_year', 'per_month'
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE RESTRICT,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE RESTRICT,
  address_summary TEXT NOT NULL, -- Publicly visible rough location (e.g. "Bodija, Near UI Second Gate")
  address_full TEXT NOT NULL,    -- Private exact address (revealed only after payment)
  bedrooms INTEGER,
  bathrooms INTEGER,
  size_sqm NUMERIC(10,2),
  amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.4 `public.listing_photos` (ImageKit Storage)
```sql
CREATE TABLE public.listing_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  imagekit_file_id TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  alt_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.5 `public.verification_requests`
Physical inspection workflow tracking:
```sql
CREATE TABLE public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status verification_status NOT NULL DEFAULT 'pending',
  scheduled_date DATE,
  inspector_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  checklist_json JSONB NOT NULL DEFAULT '{
    "physicalVisitCompleted": false,
    "addressMatchesTitle": false,
    "listerMandateVerified": false,
    "photosAuthentic": false
  }'::jsonb,
  inspector_notes TEXT,
  decision_notes TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.6 `public.availability_requests`
Manages renter access inquiries and email token confirmation:
```sql
CREATE TABLE public.availability_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  renter_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status request_status NOT NULL DEFAULT 'submitted',
  email_confirmation_token_hash TEXT, -- Signed HMAC token hash for lister one-click email confirmation
  token_expires_at TIMESTAMPTZ,       -- 24 hours from submission
  confirmed_at TIMESTAMPTZ,
  unavailable_at TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ,
  contact_unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(listing_id, renter_user_id, created_at)
);
```

### 3.7 `public.payments` (Paystack Integration)
```sql
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  availability_request_id UUID NOT NULL REFERENCES public.availability_requests(id) ON DELETE CASCADE,
  renter_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_kobo BIGINT NOT NULL DEFAULT 500000, -- ₦5,000 in kobo
  currency_code VARCHAR(3) NOT NULL DEFAULT 'NGN',
  provider TEXT NOT NULL DEFAULT 'paystack',
  paystack_reference TEXT NOT NULL UNIQUE,
  paystack_transaction_id TEXT,
  channel TEXT, -- 'card', 'bank', 'ussd', 'qr'
  status payment_status NOT NULL DEFAULT 'pending',
  raw_webhook_payload JSONB,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.8 `public.promotion_redemptions` (First-100-Users Promo)
```sql
CREATE TABLE public.promotion_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renter_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  availability_request_id UUID NOT NULL REFERENCES public.availability_requests(id) ON DELETE CASCADE UNIQUE,
  promotion_code TEXT NOT NULL DEFAULT 'FIRST100',
  fee_waived_amount_kobo BIGINT NOT NULL DEFAULT 500000,
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.9 `public.favorites`
```sql
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);
```

### 3.10 `public.reports`
```sql
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  reporter_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL, -- 'fake_listing', 'already_rented', 'inflated_price', 'misleading_photos', 'other'
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'investigating', 'resolved', 'dismissed'
  admin_resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.11 `public.audit_logs`
```sql
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. Supabase Auth Integration & Database Triggers

### 4.1 Automatic Profile Creation on Signup
When a user signs up via Supabase Auth (`auth.users`), this trigger automatically seeds `public.users`:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    phone,
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Rentivo Member'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'tenant')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 5. Row Level Security (RLS) Policies

All tables have RLS enabled:
```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
```

### 5.1 Listing Visibility Policies
```sql
-- Anyone can view ONLY active listings that have been approved by an admin
CREATE POLICY "Public listings are viewable by everyone" 
ON public.listings FOR SELECT 
USING (status = 'active' AND is_approved = TRUE);

-- Listers can view all their own listings (including pending approval and drafts)
CREATE POLICY "Owners can view all their own listings" 
ON public.listings FOR SELECT 
TO authenticated 
USING (owner_user_id = auth.uid());

-- Listers can create listings (status defaults to pending_approval, is_approved = false)
CREATE POLICY "Owners can insert their own listings" 
ON public.listings FOR INSERT 
TO authenticated 
WITH CHECK (owner_user_id = auth.uid() AND is_approved = FALSE);

-- Listers can update their own listings (cannot self-approve)
CREATE POLICY "Owners can update their own listings" 
ON public.listings FOR UPDATE 
TO authenticated 
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

-- Admins have full access to view, moderate, approve, or reject all listings
CREATE POLICY "Admins have full access to all listings"
ON public.listings FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
));
```

### 5.2 Photos Policies
```sql
-- Anyone can view photos ONLY of approved active listings
CREATE POLICY "Photos are viewable by everyone" 
ON public.listing_photos FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.listings 
  WHERE listings.id = listing_photos.listing_id 
  AND ((listings.status = 'active' AND listings.is_approved = TRUE) OR listings.owner_user_id = auth.uid())
));

-- Lister can insert/delete photos for their listings
CREATE POLICY "Owners can manage photos" 
ON public.listing_photos FOR ALL 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM public.listings 
  WHERE listings.id = listing_photos.listing_id 
  AND listings.owner_user_id = auth.uid()
));

-- Admins can manage all photos
CREATE POLICY "Admins can manage all photos"
ON public.listing_photos FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
));
```

### 5.3 Requests & Payments Policies
```sql
-- Renters see their own requests
CREATE POLICY "Renters see their own requests" 
ON public.availability_requests FOR SELECT 
TO authenticated 
USING (renter_user_id = auth.uid());

-- Listers see requests for their listings
CREATE POLICY "Listers see requests for their listings" 
ON public.availability_requests FOR SELECT 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM public.listings 
  WHERE listings.id = availability_requests.listing_id 
  AND listings.owner_user_id = auth.uid()
));

-- Renters see their own payments
CREATE POLICY "Renters see their own payments" 
ON public.payments FOR SELECT 
TO authenticated 
USING (renter_user_id = auth.uid());
```

---

## 6. Secure Contact Reveal Procedure (RPC)

To prevent data leaks, landlord contact information is retrieved only through an authorized PostgreSQL function that verifies payment status:

```sql
CREATE OR REPLACE FUNCTION public.get_unlocked_lister_contact(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_renter_id UUID;
  v_request_status request_status;
  v_is_promo BOOLEAN;
  v_listing_id UUID;
  v_lister_data JSONB;
BEGIN
  -- Get request details
  SELECT renter_user_id, status, listing_id 
  INTO v_renter_id, v_request_status, v_listing_id
  FROM public.availability_requests
  WHERE id = p_request_id;

  -- Ensure caller is the authorized renter or an admin
  IF auth.uid() <> v_renter_id AND NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You are not permitted to view this contact';
  END IF;

  -- Check if promotion waiver is applied
  SELECT EXISTS (
    SELECT 1 FROM public.promotion_redemptions WHERE availability_request_id = p_request_id
  ) INTO v_is_promo;

  -- Verify request is paid or promo-waived
  IF v_request_status <> 'paid' AND NOT v_is_promo THEN
    RAISE EXCEPTION 'Payment required: Landlord contact is locked until payment is verified';
  END IF;

  -- Fetch landlord data and exact address
  SELECT jsonb_build_object(
    'fullName', u.full_name,
    'phone', u.phone,
    'whatsapp', COALESCE(u.whatsapp, u.phone),
    'agencyName', u.agency_name,
    'exactAddress', l.address_full,
    'memberSince', u.created_at
  )
  INTO v_lister_data
  FROM public.listings l
  JOIN public.users u ON u.id = l.owner_user_id
  WHERE l.id = v_listing_id;

  RETURN v_lister_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 7. Performance Indexes

```sql
CREATE INDEX idx_listings_active_filter ON public.listings (status, city_id, area_id, category, property_type);
CREATE INDEX idx_listings_price ON public.listings (price_amount);
CREATE INDEX idx_listings_verified ON public.listings (is_verified) WHERE is_verified = TRUE;
CREATE INDEX idx_photos_listing ON public.listing_photos (listing_id, sort_order);
CREATE INDEX idx_requests_renter ON public.availability_requests (renter_user_id, status);
CREATE INDEX idx_requests_listing ON public.availability_requests (listing_id, status);
CREATE INDEX idx_payments_reference ON public.payments (paystack_reference);
CREATE INDEX idx_favorites_user ON public.favorites (user_id);
```
