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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
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
      orders: {
        Row: {
          address: string | null
          created_at: string | null
          customer_name: string
          customer_phone: string | null
          customer_session_token: string | null
          id: string
          items: Json
          payment_method: string | null
          status: string | null
          store_id: string
          total: number
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_session_token?: string | null
          id?: string
          items: Json
          payment_method?: string | null
          status?: string | null
          store_id: string
          total: number
        }
        Update: {
          address?: string | null
          created_at?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_session_token?: string | null
          id?: string
          items?: Json
          payment_method?: string | null
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
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
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
          id?: string
          image_url?: string | null
          is_available?: boolean | null
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
          id?: string
          image_url?: string | null
          is_available?: boolean | null
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
          created_at: string
          delivery_fee: number | null
          facebook_pixel_id: string | null
          id: string
          is_active: boolean | null
          is_open_manual: boolean | null
          logo_url: string | null
          name: string
          opening_hours: Json | null
          owner_id: string
          pix_key: string | null
          slug: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          delivery_fee?: number | null
          facebook_pixel_id?: string | null
          id?: string
          is_active?: boolean | null
          is_open_manual?: boolean | null
          logo_url?: string | null
          name: string
          opening_hours?: Json | null
          owner_id: string
          pix_key?: string | null
          slug: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          delivery_fee?: number | null
          facebook_pixel_id?: string | null
          id?: string
          is_active?: boolean | null
          is_open_manual?: boolean | null
          logo_url?: string | null
          name?: string
          opening_hours?: Json | null
          owner_id?: string
          pix_key?: string | null
          slug?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
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
          is_open_manual: boolean
          name: string
          owner_email: string
          owner_id: string
          pix_key: string
          slug: string
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
      get_public_store_by_slug: {
        Args: { store_slug: string }
        Returns: {
          created_at: string
          delivery_fee: number
          id: string
          is_open_manual: boolean
          logo_url: string
          name: string
          opening_hours: Json
          slug: string
          updated_at: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_master_admin: { Args: never; Returns: boolean }
      toggle_store_active: { Args: { p_store_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
    },
  },
} as const
