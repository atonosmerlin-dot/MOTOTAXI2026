-- Create table for hero/hero_image configuration
CREATE TABLE IF NOT EXISTS public.site_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Insert default hero_image config
INSERT INTO public.site_config (key, value) VALUES 
  ('hero_image_url', 'https://via.placeholder.com/600x400?text=MotoPoint')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

-- Create policy to allow admins to update
CREATE POLICY "Admins can update site config" ON public.site_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
  );

-- Create policy to allow public read
CREATE POLICY "Public can read site config" ON public.site_config
  FOR SELECT USING (true);
