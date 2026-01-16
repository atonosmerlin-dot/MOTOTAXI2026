-- Migration: create push_subscriptions table
-- Run in Supabase SQL editor if table does not exist

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES public.drivers(id) ON DELETE CASCADE,
  subscription jsonb NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Optional index for quick lookup by driver_id
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_driver_id ON public.push_subscriptions(driver_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_on_push_subscriptions ON public.push_subscriptions;
CREATE TRIGGER set_timestamp_on_push_subscriptions
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE PROCEDURE public.trigger_set_timestamp();
