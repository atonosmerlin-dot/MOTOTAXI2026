-- Create zones_destino and zone_prices tables
-- Idempotent: use IF NOT EXISTS where supported

-- Zones table
CREATE TABLE IF NOT EXISTS public.zones_destino (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Prices per origin point and zone
CREATE TABLE IF NOT EXISTS public.zone_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ponto_id UUID REFERENCES public.fixed_points(id) ON DELETE CASCADE NOT NULL,
  zona_id UUID REFERENCES public.zones_destino(id) ON DELETE CASCADE NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE (ponto_id, zona_id)
);

-- Trigger to update updated_at for zones_destino and zone_prices
CREATE OR REPLACE FUNCTION public.update_updated_at_column_zones()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_zones_destino_updated_at'
  ) THEN
    CREATE TRIGGER update_zones_destino_updated_at
      BEFORE UPDATE ON public.zones_destino
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column_zones();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_zone_prices_updated_at'
  ) THEN
    CREATE TRIGGER update_zone_prices_updated_at
      BEFORE UPDATE ON public.zone_prices
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column_zones();
  END IF;
END$$;

-- Grant SELECT to public for reading zones and prices
GRANT SELECT ON public.zones_destino TO PUBLIC;
GRANT SELECT ON public.zone_prices TO PUBLIC;
