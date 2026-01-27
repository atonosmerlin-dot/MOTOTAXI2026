-- Insert a virtual fixed point for direct calls (without QR code)
INSERT INTO public.fixed_points (id, name, address, is_active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'Chamada Direta',
  'Localização do Cliente',
  true
)
ON CONFLICT DO NOTHING;
