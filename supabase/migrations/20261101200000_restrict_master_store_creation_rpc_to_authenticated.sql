REVOKE ALL ON FUNCTION public.create_store_manual(text,text,text,integer,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_store_manual(text,text,text,integer,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_store_manual(text,text,text,integer,text) TO authenticated;
