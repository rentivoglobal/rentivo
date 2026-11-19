-- Track the welcome email independently so billing success is not lost when email delivery is temporary unavailable.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_subscriptions_welcome_email
  ON public.subscriptions (welcome_email_sent_at)
  WHERE welcome_email_sent_at IS NULL;
