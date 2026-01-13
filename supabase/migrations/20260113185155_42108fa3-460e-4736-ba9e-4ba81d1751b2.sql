-- 1. Drop existing functions and recreate with proper SECURITY DEFINER
-- These functions bypass RLS safely to return only specific fields

DROP FUNCTION IF EXISTS public.get_store_checkout_data(uuid);
DROP FUNCTION IF EXISTS public.get_store_pixel(uuid);
DROP FUNCTION IF EXISTS public.get_store_by_slug(text);

-- 2. Create secure get_payment_info function as requested
-- Returns pix_key and store name for active stores only
CREATE OR REPLACE FUNCTION public.get_payment_info(store_id_param uuid)
RETURNS TABLE(pix_key text, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Validate input
  IF store_id_param IS NULL THEN
    RETURN;
  END IF;
  
  -- Only return data for existing stores (active = is_open_manual is not explicitly false)
  RETURN QUERY
  SELECT s.pix_key, s.name
  FROM public.stores s
  WHERE s.id = store_id_param
    AND s.is_open_manual IS NOT FALSE;
END;
$$;

-- 3. Create secure function for WhatsApp (needed for checkout)
CREATE OR REPLACE FUNCTION public.get_store_whatsapp(store_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  whatsapp_num text;
BEGIN
  IF store_id_param IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT s.whatsapp INTO whatsapp_num
  FROM public.stores s
  WHERE s.id = store_id_param;
  
  RETURN whatsapp_num;
END;
$$;

-- 4. Recreate get_store_pixel with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_store_pixel(store_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  pixel_id text;
BEGIN
  IF store_id_param IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT s.facebook_pixel_id INTO pixel_id
  FROM public.stores s
  WHERE s.id = store_id_param;
  
  RETURN pixel_id;
END;
$$;

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_payment_info(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_whatsapp(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_pixel(uuid) TO anon, authenticated;

-- 6. Revoke any lingering permissions on stores table for anon
REVOKE SELECT ON public.stores FROM anon;