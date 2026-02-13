-- Fix: store_templates SELECT policy is RESTRICTIVE, blocking unauthenticated users from viewing demos
-- Drop the restrictive policy and recreate as PERMISSIVE so anyone (including anonymous) can read templates

DROP POLICY IF EXISTS "Authenticated users can view templates" ON public.store_templates;

CREATE POLICY "Anyone can view templates"
ON public.store_templates
FOR SELECT
USING (true);
