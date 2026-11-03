CREATE OR REPLACE FUNCTION public._canonicalize_order_items(p_store_id uuid, p_items jsonb)
RETURNS TABLE(canonical_items jsonb, subtotal numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_temp AS $$
DECLARE it jsonb; mod jsonb; pid uuid; mid uuid; qty integer; base_price numeric; base_name text; mod_price numeric; mod_name text; mods_total numeric; mods_json jsonb; result_items jsonb := '[]'::jsonb; result_total numeric := 0; n integer; m integer; is_library boolean;
BEGIN
 IF p_store_id IS NULL OR p_items IS NULL OR jsonb_typeof(p_items)<>'array' THEN RAISE EXCEPTION 'Invalid store or item list'; END IF;
 n:=jsonb_array_length(p_items); IF n<1 OR n>100 THEN RAISE EXCEPTION 'Cart/order must contain 1 to 100 items'; END IF;
 FOR it IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  IF jsonb_typeof(it)<>'object' THEN RAISE EXCEPTION 'Invalid item'; END IF;
  BEGIN pid:=(it->>'id')::uuid; qty:=(it->>'quantity')::integer; EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'Invalid item id or quantity'; END;
  IF qty IS NULL OR qty<1 OR qty>100 THEN RAISE EXCEPTION 'Invalid item quantity'; END IF;
  base_price:=NULL; base_name:=NULL; is_library:=false;
  SELECT p.price,p.name INTO base_price,base_name FROM public.products p WHERE p.id=pid AND p.store_id=p_store_id AND p.is_available=true;
  IF NOT FOUND THEN SELECT ml.price,ml.name INTO base_price,base_name FROM public.modifier_library ml WHERE ml.id=pid AND ml.store_id=p_store_id AND ml.is_available=true; IF FOUND THEN is_library:=true; END IF; END IF;
  IF base_price IS NULL OR base_price<0 THEN RAISE EXCEPTION 'Product unavailable'; END IF;
  mods_total:=0; mods_json:='[]'::jsonb;
  IF it ? 'modifiers' AND jsonb_typeof(it->'modifiers') NOT IN ('null') THEN
   IF jsonb_typeof(it->'modifiers')<>'array' THEN RAISE EXCEPTION 'Invalid modifiers'; END IF;
   m:=jsonb_array_length(it->'modifiers'); IF m>30 OR (is_library AND m>0) THEN RAISE EXCEPTION 'Invalid modifiers'; END IF;
   FOR mod IN SELECT value FROM jsonb_array_elements(it->'modifiers') LOOP
    BEGIN mid:=(mod->>'id')::uuid; EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'Invalid modifier id'; END;
    SELECT pm.price,pm.name INTO mod_price,mod_name FROM public.product_modifiers pm WHERE pm.id=mid AND pm.product_id=pid AND pm.is_available=true;
    IF NOT FOUND OR mod_price IS NULL OR mod_price<0 THEN RAISE EXCEPTION 'Modifier unavailable'; END IF;
    mods_total:=mods_total+mod_price; mods_json:=mods_json||jsonb_build_array(jsonb_build_object('id',mid,'name',mod_name,'price',mod_price));
   END LOOP;
  END IF;
  result_total:=result_total+(base_price+mods_total)*qty;
  result_items:=result_items||jsonb_build_array(jsonb_build_object('id',pid,'name',base_name,'quantity',qty,'price',base_price,'modifiers',mods_json,'observation',nullif(left(trim(coalesce(it->>'observation','')),500),'')));
 END LOOP;
 RETURN QUERY SELECT result_items,round(result_total,2);
END; $$;
REVOKE ALL ON FUNCTION public._canonicalize_order_items(uuid,jsonb) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.validate_order_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,pg_temp AS $$
DECLARE v_items jsonb; v_subtotal numeric; v_fee numeric:=0;
BEGIN
 NEW.status:='pending';
 IF NEW.customer_session_token IS NULL THEN NEW.customer_session_token:=encode(extensions.gen_random_bytes(32),'hex'); END IF;
 IF NEW.store_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.stores WHERE id=NEW.store_id AND is_active=true) THEN RAISE EXCEPTION 'Invalid or inactive store'; END IF;
 IF NEW.customer_name IS NULL OR length(trim(NEW.customer_name))<2 THEN RAISE EXCEPTION 'Customer name is required'; END IF;
 SELECT canonical_items,subtotal INTO v_items,v_subtotal FROM public._canonicalize_order_items(NEW.store_id,NEW.items);
 IF nullif(trim(coalesce(NEW.address,'')),'') IS NOT NULL THEN SELECT coalesce(delivery_fee,0) INTO v_fee FROM public.stores WHERE id=NEW.store_id; END IF;
 NEW.items:=v_items; NEW.total:=round(v_subtotal+v_fee,2); NEW.customer_name:=left(trim(NEW.customer_name),200);
 NEW.customer_phone:=nullif(left(regexp_replace(coalesce(NEW.customer_phone,''),'[^0-9]','','g'),20),'');
 NEW.address:=nullif(left(trim(coalesce(NEW.address,'')),500),''); NEW.payment_method:=nullif(left(trim(coalesce(NEW.payment_method,'')),50),'');
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.validate_order_insert() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.create_public_order(p_order_id uuid,p_store_id uuid,p_customer_name text,p_customer_phone text DEFAULT NULL,p_items jsonb DEFAULT '[]'::jsonb,p_address text DEFAULT NULL,p_payment_method text DEFAULT NULL,p_client_total numeric DEFAULT NULL,p_cart_id uuid DEFAULT NULL)
RETURNS TABLE(order_id uuid,customer_session_token text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,pg_temp AS $$
DECLARE v_items jsonb; v_subtotal numeric; v_fee numeric:=0; v_pre_total numeric; v_client_total numeric; v_discount numeric:=0; v_balance numeric:=0; v_phone text:=left(regexp_replace(coalesce(p_customer_phone,''),'[^0-9]','','g'),20); v_address text:=nullif(left(trim(coalesce(p_address,'')),500),''); v_enabled boolean:=false; v_id uuid; v_token text;
BEGIN
 IF p_order_id IS NULL OR p_store_id IS NULL THEN RAISE EXCEPTION 'Order and store are required'; END IF;
 IF p_customer_name IS NULL OR length(trim(p_customer_name))<2 OR length(p_customer_name)>200 THEN RAISE EXCEPTION 'Invalid customer name'; END IF;
 IF length(v_phone)<10 OR length(v_phone)>20 THEN RAISE EXCEPTION 'Invalid customer phone'; END IF;
 IF p_payment_method NOT IN ('whatsapp_cash','whatsapp_card','whatsapp_pix') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.stores WHERE id=p_store_id AND is_active=true) THEN RAISE EXCEPTION 'Store is unavailable'; END IF;
 SELECT canonical_items,subtotal INTO v_items,v_subtotal FROM public._canonicalize_order_items(p_store_id,p_items);
 SELECT coalesce(delivery_fee,0),coalesce(cashback_enabled,false) INTO v_fee,v_enabled FROM public.stores WHERE id=p_store_id;
 IF v_address IS NULL THEN v_fee:=0; END IF;
 v_pre_total:=round(v_subtotal+v_fee,2); v_client_total:=round(coalesce(p_client_total,v_pre_total),2);
 IF v_client_total<0 OR v_client_total>v_pre_total THEN RAISE EXCEPTION 'Invalid client total'; END IF;
 v_discount:=round(v_pre_total-v_client_total,2);
 IF v_discount>0 THEN
  IF NOT v_enabled THEN RAISE EXCEPTION 'Cashback is disabled'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_store_id::text||':'||v_phone,0));
  v_balance:=public.get_cashback_balance(p_store_id,v_phone);
  IF v_discount>v_balance THEN RAISE EXCEPTION 'Cashback balance changed; refresh and retry'; END IF;
 END IF;
 INSERT INTO public.orders(id,store_id,customer_name,customer_phone,items,total,address,payment_method)
 VALUES(p_order_id,p_store_id,trim(p_customer_name),v_phone,v_items,v_pre_total,v_address,p_payment_method)
 RETURNING id,public.orders.customer_session_token INTO v_id,v_token;
 IF v_discount>0 THEN
  INSERT INTO public.cashback_transactions(store_id,customer_phone,order_id,type,amount) VALUES(p_store_id,v_phone,v_id,'redeem',v_discount);
  UPDATE public.orders SET total=round(v_pre_total-v_discount,2) WHERE id=v_id;
 END IF;
 IF p_cart_id IS NOT NULL THEN
  UPDATE public.abandoned_carts SET recovered_at=coalesce(recovered_at,now()),converted_to_order_id=v_id
  WHERE id=p_cart_id AND store_id=p_store_id AND recovered_at IS NULL AND converted_to_order_id IS NULL
   AND (customer_phone IS NULL OR regexp_replace(customer_phone,'[^0-9]','','g')=v_phone);
 END IF;
 RETURN QUERY SELECT v_id,v_token;
END; $$;
REVOKE ALL ON FUNCTION public.create_public_order(uuid,uuid,text,text,jsonb,text,text,numeric,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_order(uuid,uuid,text,text,jsonb,text,text,numeric,uuid) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.process_order_cashback(p_store_id uuid,p_order_id uuid,p_customer_phone text,p_redeem_amount numeric,p_earn_base numeric)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,pg_temp AS $$
DECLARE v_phone text:=left(regexp_replace(coalesce(p_customer_phone,''),'[^0-9]','','g'),20); v_order_phone text; v_order_store uuid; v_total numeric; v_enabled boolean; v_pct numeric; v_days integer; v_award numeric;
BEGIN
 IF p_store_id IS NULL OR p_order_id IS NULL OR length(v_phone)<10 THEN RETURN 0; END IF;
 SELECT store_id,customer_phone,total INTO v_order_store,v_order_phone,v_total FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND OR v_order_store<>p_store_id OR regexp_replace(coalesce(v_order_phone,''),'[^0-9]','','g')<>v_phone THEN RAISE EXCEPTION 'Order/customer validation failed'; END IF;
 IF EXISTS(SELECT 1 FROM public.cashback_transactions WHERE order_id=p_order_id AND store_id=p_store_id AND customer_phone=v_phone AND type='earn') THEN RETURN 0; END IF;
 SELECT cashback_enabled,cashback_percentage,cashback_validity_days INTO v_enabled,v_pct,v_days FROM public.stores WHERE id=p_store_id;
 IF NOT coalesce(v_enabled,false) OR coalesce(v_pct,0)<=0 THEN RETURN 0; END IF;
 v_award:=round(greatest(coalesce(v_total,0),0)*v_pct/100,2);
 IF v_award>0 THEN INSERT INTO public.cashback_transactions(store_id,customer_phone,order_id,type,amount,expires_at)
 VALUES(p_store_id,v_phone,p_order_id,'earn',v_award,CASE WHEN v_days>0 THEN now()+(v_days||' days')::interval ELSE NULL END); END IF;
 RETURN coalesce(v_award,0);
END; $$;
REVOKE ALL ON FUNCTION public.process_order_cashback(uuid,uuid,text,numeric,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_order_cashback(uuid,uuid,text,numeric,numeric) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.upsert_abandoned_cart(p_cart_id uuid DEFAULT NULL,p_store_id uuid DEFAULT NULL,p_customer_name text DEFAULT NULL,p_customer_phone text DEFAULT NULL,p_items jsonb DEFAULT '[]'::jsonb,p_total numeric DEFAULT 0)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,pg_temp AS $$
DECLARE v_items jsonb; v_subtotal numeric; v_cart_id uuid; v_name text:=left(trim(coalesce(p_customer_name,'')),200); v_phone text:=left(regexp_replace(coalesce(p_customer_phone,''),'[^0-9]','','g'),20);
BEGIN
 IF p_store_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.stores WHERE id=p_store_id AND is_active=true) THEN RAISE EXCEPTION 'Invalid store'; END IF;
 IF coalesce(v_name,'')='' AND length(v_phone)<10 THEN RAISE EXCEPTION 'Customer name or valid phone is required'; END IF;
 SELECT canonical_items,subtotal INTO v_items,v_subtotal FROM public._canonicalize_order_items(p_store_id,p_items);
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',e.value->'id','name',e.value->'name','quantity',e.value->'quantity','price',e.value->'price')),'[]'::jsonb)
 INTO v_items FROM jsonb_array_elements(v_items) e;
 IF p_cart_id IS NOT NULL THEN
  UPDATE public.abandoned_carts SET customer_name=coalesce(nullif(v_name,''),customer_name),customer_phone=coalesce(nullif(v_phone,''),customer_phone),items=v_items,total=v_subtotal
  WHERE id=p_cart_id AND store_id=p_store_id AND recovered_at IS NULL AND converted_to_order_id IS NULL RETURNING id INTO v_cart_id;
  IF v_cart_id IS NULL THEN RAISE EXCEPTION 'Cart not found or already recovered'; END IF;
 ELSE
  INSERT INTO public.abandoned_carts(store_id,customer_name,customer_phone,items,total)
  VALUES(p_store_id,coalesce(nullif(v_name,''),'Cliente'),nullif(v_phone,''),v_items,v_subtotal) RETURNING id INTO v_cart_id;
 END IF;
 RETURN v_cart_id;
END; $$;
REVOKE ALL ON FUNCTION public.upsert_abandoned_cart(uuid,uuid,text,text,jsonb,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_abandoned_cart(uuid,uuid,text,text,jsonb,numeric) TO anon,authenticated;
