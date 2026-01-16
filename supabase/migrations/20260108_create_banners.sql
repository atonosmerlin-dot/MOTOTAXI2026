-- Create banners table for homepage carousel
CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_destination TEXT,
  is_active BOOLEAN DEFAULT true,
  transition_speed INTEGER DEFAULT 5000, -- in milliseconds
  is_auto BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone, including anonymous, can view active banners)
CREATE POLICY "public_read_active_banners"
  ON public.banners
  FOR SELECT
  USING (is_active = true);

-- Admin can do everything
CREATE POLICY "admin_all_banners"
  ON public.banners
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Add site_config entry for enabling/disabling banners carousel
INSERT INTO public.site_config (key, value, updated_at)
VALUES ('banners_enabled', 'true', NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.site_config (key, value, updated_at)
VALUES ('banners_transition_speed', '5000', NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.site_config (key, value, updated_at)
VALUES ('banners_auto_play', 'true', NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
