export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      abandoned_carts: {
        Row: {
          converted_to_order_id: string | null
          created_at: string
          customer_name: string
          customer_phone: string | null
          id: string
          items: Json
          recovered_at: string | null
          store_id: string
          total: number
        }
        Insert: {
          converted_to_order_id?: string | null
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          items?: Json
          recovered_at?: string | null
          store_id: string
          total?: number
        }
        Update: {
          converted_to_order_id?: string | null
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          items?: Json
          recovered_at?: string | null
          store_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_carts_converted_to_order_id_fkey"
            columns: ["converted_to_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_carts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_carts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          completion_tokens: number
          created_at: string
          error_message: string | null
          function_name: string
          id: string
          model: string | null
          prompt_tokens: number
          store_id: string | null
          success: boolean
          total_tokens: number
        }
        Insert: {
          completion_tokens?: number
          created_at?: string
          error_message?: string | null
          function_name: string
          id?: string
          model?: string | null
          prompt_tokens?: number
          store_id?: string | null
          success?: boolean
          total_tokens?: number
        }
        Update: {
          completion_tokens?: number
          created_at?: string
          error_message?: string | null
          function_name?: string
          id?: string
          model?: string | null
          prompt_tokens?: number
          store_id?: string | null
          success?: boolean
          total_tokens?: number
        }
        Relationships: []
      }
      cashback_transactions: {
        Row: {
          amount: number
          created_at: string
          customer_phone: string
          expires_at: string | null
          id: string
          order_id: string | null
          store_id: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_phone: string
          expires_at?: string | null
          id?: string
          order_id?: string | null
          store_id: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_phone?: string
          expires_at?: string | null
          id?: string
          order_id?: string | null
          store_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashback_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashback_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number | null
          store_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number | null
          store_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      global_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      menu_image_bank: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          sort_order: number
          url: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          url: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          url?: string
        }
        Relationships: []
      }
      modifier_library: {
        Row: {
          created_at: string
          group_max: number | null
          group_min: number
          group_name: string
          group_sort: number
          id: string
          is_available: boolean
          is_default: boolean
          name: string
          price: number
          sort_order: number
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_max?: number | null
          group_min?: number
          group_name?: string
          group_sort?: number
          id?: string
          is_available?: boolean
          is_default?: boolean
          name: string
          price?: number
          sort_order?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_max?: number | null
          group_min?: number
          group_name?: string
          group_sort?: number
          id?: string
          is_available?: boolean
          is_default?: boolean
          name?: string
          price?: number
          sort_order?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modifier_library_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modifier_library_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          created_at: string | null
          delivery_person_name: string | null
          delivery_person_phone: string | null
          estimated_delivery_at: string | null
          customer_name: string
          customer_phone: string | null
          customer_session_token: string | null
          id: string
          items: Json
          payment_method: string | null
          payment_status: string
          status: string | null
          store_id: string
          total: number
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          delivery_person_name?: string | null
          delivery_person_phone?: string | null
          estimated_delivery_at?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_session_token?: string | null
          id?: string
          items: Json
          payment_method?: string | null
          payment_status?: string
          status?: string | null
          store_id: string
          total: number
        }
        Update: {
          address?: string | null
          created_at?: string | null
          delivery_person_name?: string | null
          delivery_person_phone?: string | null
          estimated_delivery_at?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_session_token?: string | null
          id?: string
          items?: Json
          payment_method?: string | null
          payment_status?: string
          status?: string | null
          store_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      pdv_session_items: {
        Row: {
          created_at: string
          id: string
          modifiers: Json
          name: string
          note: string | null
          product_id: string | null
          quantity: number
          sent_to_kitchen_at: string | null
          session_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          modifiers?: Json
          name: string
          note?: string | null
          product_id?: string | null
          quantity?: number
          sent_to_kitchen_at?: string | null
          session_id: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          modifiers?: Json
          name?: string
          note?: string | null
          product_id?: string | null
          quantity?: number
          sent_to_kitchen_at?: string | null
          session_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "pdv_session_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdv_session_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pdv_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      pdv_sessions: {
        Row: {
          closed_at: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          discount: number
          id: string
          notes: string | null
          opened_at: string
          opened_by: string
          payment_method: string | null
          status: string
          store_id: string
          subtotal: number
          table_id: string | null
          total: number
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by: string
          payment_method?: string | null
          status?: string
          store_id: string
          subtotal?: number
          table_id?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string
          payment_method?: string | null
          status?: string
          store_id?: string
          subtotal?: number
          table_id?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdv_sessions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdv_sessions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdv_sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      product_modifiers: {
        Row: {
          created_at: string
          group_max: number | null
          group_min: number
          group_name: string | null
          group_sort: number | null
          id: string
          is_available: boolean
          is_default: boolean
          library_item_id: string | null
          name: string
          price: number
          product_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          group_max?: number | null
          group_min?: number
          group_name?: string | null
          group_sort?: number | null
          id?: string
          is_available?: boolean
          is_default?: boolean
          library_item_id?: string | null
          name: string
          price?: number
          product_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          group_max?: number | null
          group_min?: number
          group_name?: string | null
          group_sort?: number | null
          id?: string
          is_available?: boolean
          is_default?: boolean
          library_item_id?: string | null
          name?: string
          price?: number
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_modifiers_library_item_id_fkey"
            columns: ["library_item_id"]
            isOneToOne: false
            referencedRelation: "modifier_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_modifiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          free_addons_limit: number | null
          has_addons: boolean | null
          has_free_addons: boolean | null
          id: string
          image_url: string | null
          is_available: boolean | null
          is_featured: boolean | null
          name: string
          price: number
          sort_order: number | null
          store_id: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          free_addons_limit?: number | null
          has_addons?: boolean | null
          has_free_addons?: boolean | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_featured?: boolean | null
          name: string
          price: number
          sort_order?: number | null
          store_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          free_addons_limit?: number | null
          has_addons?: boolean | null
          has_free_addons?: boolean | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_featured?: boolean | null
          name?: string
          price?: number
          sort_order?: number | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          store_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          store_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          store_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_members: {
        Row: {
          created_at: string
          email: string | null
          id: string
          role: Database["public"]["Enums"]["store_role"]
          store_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          role?: Database["public"]["Enums"]["store_role"]
          store_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          role?: Database["public"]["Enums"]["store_role"]
          store_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_members_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_members_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_secrets: {
        Row: {
          mercadopago_access_token: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          mercadopago_access_token?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          mercadopago_access_token?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_secrets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_secrets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_templates: {
        Row: {
          categories: Json
          created_at: string | null
          description: string | null
          id: string
          name: string
          products: Json
          slug: string
        }
        Insert: {
          categories?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          products?: Json
          slug: string
        }
        Update: {
          categories?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          products?: Json
          slug?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          auto_print: boolean
          bg_color: string | null
          card_style: string | null
          cashback_enabled: boolean
          cashback_percentage: number
          cashback_validity_days: number
          checkout_type: string
          cover_url: string | null
          created_at: string
          delivery_fee: number | null
          facebook_pixel_id: string | null
          id: string
          is_active: boolean | null
          is_open_manual: boolean | null
          logo_url: string | null
          mercadopago_public_key: string | null
          name: string
          opening_hours: Json | null
          owner_id: string
          pix_key: string | null
          primary_color: string | null
          recovery_delay_minutes: number
          recovery_message_template: string | null
          slug: string
          store_template_style: string | null
          trial_expires_at: string | null
          updated_at: string
          upsell_blocking_categories: string[] | null
          upsell_default_message: string | null
          upsell_enabled: boolean
          upsell_exception_products: string[] | null
          upsell_products: string[] | null
          whatsapp: string | null
        }
        Insert: {
          auto_print?: boolean
          bg_color?: string | null
          card_style?: string | null
          cashback_enabled?: boolean
          cashback_percentage?: number
          cashback_validity_days?: number
          checkout_type?: string
          cover_url?: string | null
          created_at?: string
          delivery_fee?: number | null
          facebook_pixel_id?: string | null
          id?: string
          is_active?: boolean | null
          is_open_manual?: boolean | null
          logo_url?: string | null
          mercadopago_public_key?: string | null
          name: string
          opening_hours?: Json | null
          owner_id: string
          pix_key?: string | null
          primary_color?: string | null
          recovery_delay_minutes?: number
          recovery_message_template?: string | null
          slug: string
          store_template_style?: string | null
          trial_expires_at?: string | null
          updated_at?: string
          upsell_blocking_categories?: string[] | null
          upsell_default_message?: string | null
          upsell_enabled?: boolean
          upsell_exception_products?: string[] | null
          upsell_products?: string[] | null
          whatsapp?: string | null
        }
        Update: {
          auto_print?: boolean
          bg_color?: string | null
          card_style?: string | null
          cashback_enabled?: boolean
          cashback_percentage?: number
          cashback_validity_days?: number
          checkout_type?: string
          cover_url?: string | null
          created_at?: string
          delivery_fee?: number | null
          facebook_pixel_id?: string | null
          id?: string
          is_active?: boolean | null
          is_open_manual?: boolean | null
          logo_url?: string | null
          mercadopago_public_key?: string | null
          name?: string
          opening_hours?: Json | null
          owner_id?: string
          pix_key?: string | null
          primary_color?: string | null
          recovery_delay_minutes?: number
          recovery_message_template?: string | null
          slug?: string
          store_template_style?: string | null
          trial_expires_at?: string | null
          updated_at?: string
          upsell_blocking_categories?: string[] | null
          upsell_default_message?: string | null
          upsell_enabled?: boolean
          upsell_exception_products?: string[] | null
          upsell_products?: string[] | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          created_at: string
          id: string
          label: string | null
          number: number
          seats: number
          sort_order: number
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          number: number
          seats?: number
          sort_order?: number
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          number?: number
          seats?: number
          sort_order?: number
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tables_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      upsell_rules: {
        Row: {
          created_at: string
          custom_message: string | null
          id: string
          is_active: boolean
          offer_product_id: string
          sort_order: number | null
          store_id: string
          trigger_product_id: string
        }
        Insert: {
          created_at?: string
          custom_message?: string | null
          id?: string
          is_active?: boolean
          offer_product_id: string
          sort_order?: number | null
          store_id: string
          trigger_product_id: string
        }
        Update: {
          created_at?: string
          custom_message?: string | null
          id?: string
          is_active?: boolean
          offer_product_id?: string
          sort_order?: number | null
          store_id?: string
          trigger_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upsell_rules_offer_product_id_fkey"
            columns: ["offer_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsell_rules_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsell_rules_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsell_rules_trigger_product_id_fkey"
            columns: ["trigger_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      stores_public: {
        Row: {
          created_at: string | null
          delivery_fee: number | null
          id: string | null
          is_active: boolean | null
          is_open_manual: boolean | null
          logo_url: string | null
          name: string | null
          opening_hours: Json | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_fee?: number | null
          id?: string | null
          is_active?: boolean | null
          is_open_manual?: boolean | null
          logo_url?: string | null
          name?: string | null
          opening_hours?: Json | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_fee?: number | null
          id?: string | null
          is_active?: boolean | null
          is_open_manual?: boolean | null
          logo_url?: string | null
          name?: string | null
          opening_hours?: Json | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_library_group_to_product: {
        Args: { p_group_name: string; p_product_id: string }
        Returns: number
      }
      cancel_pdv_session: { Args: { p_session_id: string }; Returns: undefined }
      close_pdv_session: {
        Args: {
          p_payment_method: string
          p_redeem_cashback?: number
          p_session_id: string
        }
        Returns: Json
      }
      create_public_order: {
        Args: {
          p_address?: string
          p_cart_id?: string
          p_client_total?: number
          p_customer_name: string
          p_customer_phone?: string
          p_items?: Json
          p_order_id: string
          p_payment_method?: string
          p_store_id: string
        }
        Returns: {
          customer_session_token: string
          order_id: string
        }[]
      }
      create_store_from_template: {
        Args: {
          p_owner_id: string
          p_store_name: string
          p_store_slug: string
          p_template_slug: string
        }
        Returns: string
      }
      create_user_store_with_template: {
        Args: {
          p_store_name: string
          p_store_slug: string
          p_template_slug?: string
        }
        Returns: string
      }
      delete_store_master: { Args: { p_store_id: string }; Returns: boolean }
      get_all_orders_admin: {
        Args: never
        Returns: {
          address: string
          created_at: string
          customer_name: string
          customer_phone: string
          id: string
          items: Json
          payment_method: string
          status: string
          store_id: string
          store_name: string
          total: number
        }[]
      }
      get_all_stores_admin: {
        Args: never
        Returns: {
          created_at: string
          delivery_fee: number
          id: string
          is_active: boolean
          is_open_manual: boolean
          name: string
          owner_email: string
          owner_id: string
          pix_key: string
          slug: string
          trial_expires_at: string
          whatsapp: string
        }[]
      }
      get_all_users_admin: {
        Args: never
        Returns: {
          created_at: string
          email: string
          has_store: boolean
          id: string
          store_name: string
        }[]
      }
      get_cashback_balance: {
        Args: { p_customer_phone: string; p_store_id: string }
        Returns: number
      }
      get_global_setting: { Args: { setting_key: string }; Returns: string }
      get_my_store: {
        Args: never
        Returns: {
          is_owner: boolean
          role: Database["public"]["Enums"]["store_role"]
          store_id: string
        }[]
      }
      get_order_details: {
        Args: { order_id_param: string; session_token_param: string }
        Returns: {
          created_at: string
          id: string
          items: Json
          payment_method: string
          status: string
          store_name: string
          total: number
        }[]
      }
      get_order_details_owner: {
        Args: { order_id_param: string }
        Returns: {
          address: string
          created_at: string
          customer_name: string
          customer_phone: string
          id: string
          items: Json
          payment_method: string
          status: string
          store_id: string
          total: number
        }[]
      }
      get_order_status: {
        Args: { order_id_param: string; session_token_param: string }
        Returns: {
          created_at: string
          id: string
          status: string
          store_name: string
          total: number
        }[]
      }
      get_personalized_upsell: {
        Args: {
          p_cart_product_ids: string[]
          p_limit?: number
          p_store_id: string
        }
        Returns: {
          category_name: string
          custom_message: string
          id: string
          image_url: string
          is_rule_based: boolean
          name: string
          price: number
        }[]
      }
      get_platform_stats: { Args: never; Returns: Json }
      get_public_store_by_slug: {
        Args: { store_slug: string }
        Returns: {
          bg_color: string
          card_style: string
          checkout_type: string
          cover_url: string
          created_at: string
          delivery_fee: number
          id: string
          is_active: boolean
          is_open_manual: boolean
          is_trial_expired: boolean
          logo_url: string
          mercadopago_public_key: string
          name: string
          opening_hours: Json
          primary_color: string
          store_template_style: string
          updated_at: string
        }[]
      }
      get_store_cashback_config: {
        Args: { p_store_id: string }
        Returns: {
          enabled: boolean
          percentage: number
          validity_days: number
        }[]
      }
      get_store_checkout_info: {
        Args: { store_slug_param: string }
        Returns: {
          delivery_fee: number
          pix_key: string
          store_name: string
          whatsapp: string
        }[]
      }
      get_store_payment_data: {
        Args: { store_slug: string }
        Returns: {
          pix_key: string
          store_name: string
          whatsapp: string
        }[]
      }
      get_store_pixel_by_slug: { Args: { store_slug: string }; Returns: string }
      get_store_role: {
        Args: { _store_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["store_role"]
      }
      get_store_stats: {
        Args: { p_end_date?: string; p_start_date?: string; p_store_id: string }
        Returns: Json
      }
      get_upsell_products: {
        Args: { p_limit?: number; p_store_id: string }
        Returns: {
          category_name: string
          id: string
          image_url: string
          name: string
          price: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_store_access: {
        Args: { _store_id: string; _user_id: string }
        Returns: boolean
      }
      has_store_mercadopago_token: {
        Args: { _store_id: string }
        Returns: boolean
      }
      has_store_role: {
        Args: {
          _roles: Database["public"]["Enums"]["store_role"][]
          _store_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_master_admin: { Args: never; Returns: boolean }
      is_store_owner: {
        Args: { _store_id: string; _user_id: string }
        Returns: boolean
      }
      list_store_members: {
        Args: { p_store_id: string }
        Returns: {
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["store_role"]
          user_id: string
        }[]
      }
      mark_abandoned_cart_converted: {
        Args: { p_cart_id: string; p_order_id?: string }
        Returns: undefined
      }
      open_pdv_session: {
        Args: {
          p_customer_name?: string
          p_customer_phone?: string
          p_store_id: string
          p_table_id?: string
        }
        Returns: string
      }
      process_order_cashback: {
        Args: {
          p_customer_phone: string
          p_earn_base: number
          p_order_id: string
          p_redeem_amount: number
          p_store_id: string
        }
        Returns: number
      }
      remove_library_group_from_product: {
        Args: { p_group_name: string; p_product_id: string }
        Returns: number
      }
      set_store_mercadopago_token: {
        Args: { _store_id: string; _token: string }
        Returns: undefined
      }
      toggle_store_active: { Args: { p_store_id: string }; Returns: boolean }
      update_global_setting: {
        Args: { setting_key: string; setting_value: string }
        Returns: boolean
      }
      update_store_trial: {
        Args: { p_store_id: string; p_trial_date: string }
        Returns: boolean
      }
      upsert_abandoned_cart: {
        Args: {
          p_cart_id?: string
          p_customer_name?: string
          p_customer_phone?: string
          p_items?: Json
          p_store_id?: string
          p_total?: number
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      store_role: "owner" | "manager" | "attendant" | "kitchen"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      store_role: ["owner", "manager", "attendant", "kitchen"],
    },
  },
} as const
