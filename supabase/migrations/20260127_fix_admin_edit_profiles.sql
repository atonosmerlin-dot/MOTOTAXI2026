-- Fix RLS policies for profiles to allow admins to edit user profiles
-- This is needed for the admin panel to edit driver profiles

-- Drop the overly restrictive UPDATE policy
DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON public.profiles;

-- Create a new UPDATE policy that allows admins
CREATE POLICY "Profiles - UPDATE próprio ou admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR public.has_role(auth.uid(), 'admin')
  );

-- Also ensure admins can insert profiles for other users if needed
DROP POLICY IF EXISTS "Usuários podem criar próprio perfil" ON public.profiles;

CREATE POLICY "Profiles - INSERT próprio ou admin"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id
    OR public.has_role(auth.uid(), 'admin')
  );
