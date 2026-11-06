-- Consolidate overlapping RLS policies while preserving the existing access model.
-- Public catalog reads remain public; privileged writes stay restricted.

-- Categories and products: public SELECT is handled by the catalog policy.
DROP POLICY IF EXISTS "Managers manage categories" ON public.categories;
CREATE POLICY "Managers insert categories" ON public.categories FOR INSERT TO authenticated
  WITH CHECK (has_store_role(store_id, (select auth.uid()), ARRAY['owner','manager']::public.store_role[]);
CREATE POLICY "Managers update categories" ON public.categories FOR UPDATE TO authenticated
  USING (has_store_role(store_id, (select auth.uid()), ARRAY['owner','manager']::public.store_role[]))
  WITH CHECK (has_store_role(store_id, (select auth.uid()), ARRAY['owner','manager']::public.store_role[]));
CREATE POLICY "Managers delete categories" ON public.categories FOR DELETE TO authenticated
  USING (has_store_role(store_id, (select auth.uid()), ARRAY['owner','manager']::public.store_role[]));

DROP POLICY IF EXISTS "Managers manage products" ON public.products;
CREATE POLICY "Managers insert products" ON public.products FOR INSERT TO authenticated
  WITH CHECK (has_store_role(store_id, (select auth.uid()), ARRAY['owner','manager']::public.store_role[]);
CREATE POLICY "Managers update products" ON public.products FOR UPDATE TO authenticated
  USING (has_store_role(store_id, (select auth.uid()), ARRAY['owner','manager']::public.store_role[]))
  WITH CHECK (has_store_role(store_id, (select auth.uid()), ARRAY['owner','manager']::public.store_role[]));
CREATE POLICY "Managers delete products" ON public.products FOR DELETE TO authenticated
  USING (has_store_role(store_id, (select auth.uid()), ARRAY['owner','manager']::public.store_role[]));

-- Modifier library: public read, authenticated store managers write.
DROP POLICY IF EXISTS "Managers manage library" ON public.modifier_library;
CREATE POLICY "Managers insert library items" ON public.modifier_library FOR INSERT TO authenticated
  WITH CHECK (has_store_role(store_id, (select auth.uid()), ARRAY['owner','manager']::public.store_role[]);
CREATE POLICY "Managers update library items" ON public.modifier_library FOR UPDATE TO authenticated
  USING (has_store_role(store_id, (select auth.uid()), ARRAY['owner','manager']::public.store_role[]))
  WITH CHECK (has_store_role(store_id, (select auth.uid()), ARRAY['owner','manager']::public.store_role[]));
CREATE POLICY "Managers delete library items" ON public.modifier_library FOR DELETE TO authenticated
  USING (has_store_role(store_id, (select auth.uid()), ARRAY['owner','manager']::public.store_role[]));

-- Product modifiers: public read, authenticated store managers write.
DROP POLICY IF EXISTS "Managers manage modifiers" ON public.product_modifiers;
DROP POLICY IF EXISTS "Owners can manage modifiers" ON public.product_modifiers;
CREATE POLICY "Managers insert modifiers" ON public.product_modifiers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_modifiers.product_id
    AND has_store_role(p.store_id, (select auth.uid()), ARRAY['owner','manager']::public.store_role[])));
CREATE POLICY "Managers update modifiers" ON public.product_modifiers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_modifiers.product_id
    AND has_store_role(p.store_id, (select auth.uid()), ARRAY['owner','manager']::public.store_role[])))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_modifiers.product_id
    AND has_store_role(p.store_id, (select auth.uid()), ARRAY['owner','manager']::public.store_role[])));
CREATE POLICY "Managers delete modifiers" ON public.product_modifiers FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_modifiers.product_id
    AND has_store_role(p.store_id, (select auth.uid()), ARRAY['owner','manager']::public.store_role[])));

-- Upsell rules: owner is already included in has_store_role().
DROP POLICY IF EXISTS "Owners can manage upsell rules" ON public.upsell_rules;

-- Order SELECT is one explicit predicate for administrators and store members.
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Members can view store orders" ON public.orders;
CREATE POLICY "Admins and members can view orders" ON public.orders FOR SELECT TO authenticated
  USING (has_role((select auth.uid()), 'admin'::public.app_role)
    OR has_store_access(store_id, (select auth.uid())));

-- PDV operators can write; the team-read policy already grants SELECT.
DROP POLICY IF EXISTS "operator manage items" ON public.pdv_session_items;
CREATE POLICY "operator insert items" ON public.pdv_session_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.pdv_sessions s WHERE s.id = pdv_session_items.session_id
    AND has_store_role(s.store_id, (select auth.uid()), ARRAY['owner','manager','attendant']::public.store_role[])));
CREATE POLICY "operator update items" ON public.pdv_session_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pdv_sessions s WHERE s.id = pdv_session_items.session_id
    AND has_store_role(s.store_id, (select auth.uid()), ARRAY['owner','manager','attendant']::public.store_role[])))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pdv_sessions s WHERE s.id = pdv_session_items.session_id
    AND has_store_role(s.store_id, (select auth.uid()), ARRAY['owner','manager','attendant']::public.store_role[])));
CREATE POLICY "operator delete items" ON public.pdv_session_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pdv_sessions s WHERE s.id = pdv_session_items.session_id
    AND has_store_role(s.store_id, (select auth.uid()), ARRAY['owner','manager','attendant']::public.store_role[])));

DROP POLICY IF EXISTS "operator manage sessions" ON public.pdv_sessions;
CREATE POLICY "operator insert sessions" ON public.pdv_sessions FOR INSERT TO authenticated
  WITH CHECK (has_store_role(store_id, (select auth.uid()), ARRAY['owner','manager','attendant']::public.store_role[]));
CREATE POLICY "operator update sessions" ON public.pdv_sessions FOR UPDATE TO authenticated
  USING (has_store_role(store_id, (select auth.uid()), ARRAY['owner','manager','attendant']::public.store_role[]))
  WITH CHECK (has_store_role(store_id, (select auth.uid()), ARRAY['owner','manager','attendant']::public.store_role[]));
CREATE POLICY "operator delete sessions" ON public.pdv_sessions FOR DELETE TO authenticated
  USING (has_store_role(store_id, (select auth.uid()), ARRAY['owner','manager','attendant']::public.store_role[]));

-- Tables: team read/update policies already include owners/managers; retain insert/delete rights.
DROP POLICY IF EXISTS "owner manage tables" ON public.tables;
CREATE POLICY "Managers insert tables" ON public.tables FOR INSERT TO authenticated
  WITH CHECK (has_store_role(store_id, (select auth.uid()), ARRAY['owner','manager']::public.store_role[]));
CREATE POLICY "Managers delete tables" ON public.tables FOR DELETE TO authenticated
  USING (has_store_role(store_id, (select auth.uid()), ARRAY['owner','manager']::public.store_role[]));

-- Store master privileges are separated from public/member SELECT.
DROP POLICY IF EXISTS "Master admin full access" ON public.stores;
DROP POLICY IF EXISTS "Owners can manage their stores" ON public.stores;
CREATE POLICY "Members and master can view stores" ON public.stores FOR SELECT TO authenticated
  USING (has_store_access(id, (select auth.uid())) OR is_master_admin());
CREATE POLICY "Owners and master insert stores" ON public.stores FOR INSERT TO authenticated
  WITH CHECK (owner_id = (select auth.uid()) OR is_master_admin());
CREATE POLICY "Owners and master update stores" ON public.stores FOR UPDATE TO authenticated
  USING (has_store_role(id, (select auth.uid()), ARRAY['owner','manager']::public.store_role[]) OR is_master_admin())
  WITH CHECK (has_store_role(id, (select auth.uid()), ARRAY['owner','manager']::public.store_role[]) OR is_master_admin());
CREATE POLICY "Owners and master delete stores" ON public.stores FOR DELETE TO authenticated
  USING (is_master_admin() OR owner_id = (select auth.uid()));

-- Global settings: admins can read all, public users only the explicit whitelist.
DROP POLICY IF EXISTS "Master admin can manage global settings" ON public.global_settings;
DROP POLICY IF EXISTS "Public can read whitelisted settings" ON public.global_settings;
CREATE POLICY "Public and master read global settings" ON public.global_settings FOR SELECT TO anon, authenticated
  USING (key = ANY (ARRAY['subscription_price','default_trial_days','owner_whatsapp','landing_pixel_id'])
    OR is_master_admin());
CREATE POLICY "Master insert global settings" ON public.global_settings FOR INSERT TO authenticated
  WITH CHECK (is_master_admin());
CREATE POLICY "Master update global settings" ON public.global_settings FOR UPDATE TO authenticated
  USING (is_master_admin()) WITH CHECK (is_master_admin());
CREATE POLICY "Master delete global settings" ON public.global_settings FOR DELETE TO authenticated
  USING (is_master_admin());

-- Master admin writes to public-read reference data, without overlapping SELECT.
DROP POLICY IF EXISTS "master_write" ON public.menu_image_bank;
CREATE POLICY "Master insert menu images" ON public.menu_image_bank FOR INSERT TO authenticated WITH CHECK (is_master_admin());
CREATE POLICY "Master update menu images" ON public.menu_image_bank FOR UPDATE TO authenticated USING (is_master_admin()) WITH CHECK (is_master_admin());
CREATE POLICY "Master delete menu images" ON public.menu_image_bank FOR DELETE TO authenticated USING (is_master_admin());

DROP POLICY IF EXISTS "Master admin can manage templates" ON public.store_templates;
CREATE POLICY "Master insert templates" ON public.store_templates FOR INSERT TO authenticated WITH CHECK (is_master_admin());
CREATE POLICY "Master update templates" ON public.store_templates FOR UPDATE TO authenticated USING (is_master_admin()) WITH CHECK (is_master_admin());
CREATE POLICY "Master delete templates" ON public.store_templates FOR DELETE TO authenticated USING (is_master_admin());

-- Store members: combine self/owner reads, keep owner writes.
DROP POLICY IF EXISTS "Members can view themselves" ON public.store_members;
DROP POLICY IF EXISTS "Owners manage members" ON public.store_members;
CREATE POLICY "Members and owners can view store members" ON public.store_members FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR is_store_owner(store_id, (select auth.uid())));
CREATE POLICY "Owners insert store members" ON public.store_members FOR INSERT TO authenticated
  WITH CHECK (is_store_owner(store_id, (select auth.uid())));
CREATE POLICY "Owners update store members" ON public.store_members FOR UPDATE TO authenticated
  USING (is_store_owner(store_id, (select auth.uid())))
  WITH CHECK (is_store_owner(store_id, (select auth.uid())));
CREATE POLICY "Owners delete store members" ON public.store_members FOR DELETE TO authenticated
  USING (is_store_owner(store_id, (select auth.uid())));

-- User role visibility: self or master; master writes remain explicit.
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Master admin can manage roles" ON public.user_roles;
CREATE POLICY "Users and master can view roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR is_master_admin());
CREATE POLICY "Master insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (is_master_admin());
CREATE POLICY "Master update roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (is_master_admin()) WITH CHECK (is_master_admin());
CREATE POLICY "Master delete roles" ON public.user_roles FOR DELETE TO authenticated USING (is_master_admin());

-- The ALL-deny policy already blocks SELECT; remove the redundant SELECT-only deny policy.
DROP POLICY IF EXISTS "Block all client reads of secrets" ON public.store_secrets;
