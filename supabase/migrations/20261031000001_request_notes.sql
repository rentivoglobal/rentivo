-- Migration: Add request_notes column to availability_requests
-- Allows seekers to include move-in timeline, inspection preferences, or custom messages when requesting access

ALTER TABLE public.availability_requests 
ADD COLUMN IF NOT EXISTS request_notes TEXT;

COMMENT ON COLUMN public.availability_requests.request_notes IS 
'Custom note, move-in timeline, or inspection request written by the prospective renter.';
