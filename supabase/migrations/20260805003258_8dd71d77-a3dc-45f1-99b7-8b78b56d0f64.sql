GRANT SELECT ON public.modifier_library TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modifier_library TO authenticated;
GRANT ALL ON public.modifier_library TO service_role;