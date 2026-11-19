-- Prevent concurrent Paystack retries from sending duplicate welcome emails.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS welcome_email_claimed_at TIMESTAMPTZ;
