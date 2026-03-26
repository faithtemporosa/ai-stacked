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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_activity_logs: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          commission_amount: number
          commission_expires_at: string | null
          commission_rate: number
          created_at: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_amount: number
          payment_type: string
          referred_user_id: string
          status: Database["public"]["Enums"]["commission_status"]
          stripe_payment_id: string | null
          subscription_id: string | null
        }
        Insert: {
          affiliate_id: string
          commission_amount: number
          commission_expires_at?: string | null
          commission_rate?: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_amount: number
          payment_type?: string
          referred_user_id: string
          status?: Database["public"]["Enums"]["commission_status"]
          stripe_payment_id?: string | null
          subscription_id?: string | null
        }
        Update: {
          affiliate_id?: string
          commission_amount?: number
          commission_expires_at?: string | null
          commission_rate?: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_amount?: number
          payment_type?: string
          referred_user_id?: string
          status?: Database["public"]["Enums"]["commission_status"]
          stripe_payment_id?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payouts: {
        Row: {
          admin_notes: string | null
          affiliate_id: string
          amount: number
          id: string
          payout_details: Json | null
          payout_method: string
          processed_at: string | null
          processed_by: string | null
          requested_at: string
          status: string
        }
        Insert: {
          admin_notes?: string | null
          affiliate_id: string
          amount: number
          id?: string
          payout_details?: Json | null
          payout_method?: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: string
        }
        Update: {
          admin_notes?: string | null
          affiliate_id?: string
          amount?: number
          id?: string
          payout_details?: Json | null
          payout_method?: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          application_reason: string | null
          applied_at: string | null
          approved_at: string | null
          approved_by: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_routing_number: string | null
          commission_rate: number
          created_at: string
          id: string
          last_payout_date: string | null
          paid_earnings: number
          payout_method: string | null
          paypal_email: string | null
          pending_earnings: number
          referral_code: string
          status: Database["public"]["Enums"]["affiliate_status"]
          total_earnings: number
          total_referrals: number
          updated_at: string
          user_id: string
          venmo_username: string | null
        }
        Insert: {
          application_reason?: string | null
          applied_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_routing_number?: string | null
          commission_rate?: number
          created_at?: string
          id?: string
          last_payout_date?: string | null
          paid_earnings?: number
          payout_method?: string | null
          paypal_email?: string | null
          pending_earnings?: number
          referral_code: string
          status?: Database["public"]["Enums"]["affiliate_status"]
          total_earnings?: number
          total_referrals?: number
          updated_at?: string
          user_id: string
          venmo_username?: string | null
        }
        Update: {
          application_reason?: string | null
          applied_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_routing_number?: string | null
          commission_rate?: number
          created_at?: string
          id?: string
          last_payout_date?: string | null
          paid_earnings?: number
          payout_method?: string | null
          paypal_email?: string | null
          pending_earnings?: number
          referral_code?: string
          status?: Database["public"]["Enums"]["affiliate_status"]
          total_earnings?: number
          total_referrals?: number
          updated_at?: string
          user_id?: string
          venmo_username?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          email: string | null
          event_type: string
          id: string
          os: string | null
          page_path: string
          referrer: string | null
          session_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          email?: string | null
          event_type?: string
          id?: string
          os?: string | null
          page_path: string
          referrer?: string | null
          session_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          email?: string | null
          event_type?: string
          id?: string
          os?: string | null
          page_path?: string
          referrer?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      automation_usage: {
        Row: {
          automation_id: string
          automation_name: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          automation_id: string
          automation_name: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          automation_id?: string
          automation_name?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      automations: {
        Row: {
          category: string
          description: string | null
          features: string[]
          id: string
          last_updated: string
          name: string
          price: number
        }
        Insert: {
          category: string
          description?: string | null
          features: string[]
          id: string
          last_updated?: string
          name: string
          price: number
        }
        Update: {
          category?: string
          description?: string | null
          features?: string[]
          id?: string
          last_updated?: string
          name?: string
          price?: number
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          automation_id: string
          created_at: string
          customer_email: string | null
          customer_name: string | null
          hours_saved: number
          id: string
          name: string
          price: number
          quantity: number
          thumbnail: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          automation_id: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          hours_saved: number
          id?: string
          name: string
          price: number
          quantity?: number
          thumbnail?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          automation_id?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          hours_saved?: number
          id?: string
          name?: string
          price?: number
          quantity?: number
          thumbnail?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          automation_count: number | null
          brand_name: string | null
          cart_items: string | null
          created_at: string
          email: string
          estimated_completion_date: string | null
          id: string
          message: string
          name: string
          order_id: string | null
          order_total: number | null
          status: string
        }
        Insert: {
          automation_count?: number | null
          brand_name?: string | null
          cart_items?: string | null
          created_at?: string
          email: string
          estimated_completion_date?: string | null
          id?: string
          message: string
          name: string
          order_id?: string | null
          order_total?: number | null
          status?: string
        }
        Update: {
          automation_count?: number | null
          brand_name?: string | null
          cart_items?: string | null
          created_at?: string
          email?: string
          estimated_completion_date?: string | null
          id?: string
          message?: string
          name?: string
          order_id?: string | null
          order_total?: number | null
          status?: string
        }
        Relationships: []
      }
      credential_access_logs: {
        Row: {
          access_type: string
          accessed_at: string | null
          accessed_by: string
          credential_id: string
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          access_type: string
          accessed_at?: string | null
          accessed_by: string
          credential_id: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          access_type?: string
          accessed_at?: string | null
          accessed_by?: string
          credential_id?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credential_access_logs_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "customer_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_credentials: {
        Row: {
          connection_notes: string | null
          created_at: string | null
          credential_type: Database["public"]["Enums"]["credential_type"]
          customer_id: string
          encrypted_api_key: string | null
          encrypted_extra_fields: Json | null
          encrypted_password: string | null
          encrypted_username: string | null
          id: string
          is_valid: boolean | null
          tags: string[] | null
          tool_name: string
          updated_at: string | null
        }
        Insert: {
          connection_notes?: string | null
          created_at?: string | null
          credential_type: Database["public"]["Enums"]["credential_type"]
          customer_id: string
          encrypted_api_key?: string | null
          encrypted_extra_fields?: Json | null
          encrypted_password?: string | null
          encrypted_username?: string | null
          id?: string
          is_valid?: boolean | null
          tags?: string[] | null
          tool_name: string
          updated_at?: string | null
        }
        Update: {
          connection_notes?: string | null
          created_at?: string | null
          credential_type?: Database["public"]["Enums"]["credential_type"]
          customer_id?: string
          encrypted_api_key?: string | null
          encrypted_extra_fields?: Json | null
          encrypted_password?: string | null
          encrypted_username?: string | null
          id?: string
          is_valid?: boolean | null
          tags?: string[] | null
          tool_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      login_activity: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          id: string
          ip_address: string | null
          login_at: string
          os: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          id?: string
          ip_address?: string | null
          login_at?: string
          os?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          id?: string
          ip_address?: string | null
          login_at?: string
          os?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          email_digest_enabled: boolean
          has_seen_welcome: boolean
          id: string
          referral_discount_applied: boolean | null
          referred_by: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          email_digest_enabled?: boolean
          has_seen_welcome?: boolean
          id?: string
          referral_discount_applied?: boolean | null
          referred_by?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          email_digest_enabled?: boolean
          has_seen_welcome?: boolean
          id?: string
          referral_discount_applied?: boolean | null
          referred_by?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          automation_limit: number
          automations_purchased: string[] | null
          automations_used: number
          bundle_name: string | null
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          customer_email: string | null
          customer_name: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string
          stripe_subscription_id: string | null
          total_amount: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          automation_limit?: number
          automations_purchased?: string[] | null
          automations_used?: number
          bundle_name?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id: string
          stripe_subscription_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          automation_limit?: number
          automations_purchased?: string[] | null
          automations_used?: number
          bundle_name?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string
          stripe_subscription_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tool_credential_configs: {
        Row: {
          created_at: string
          display_name: string
          fields: Json
          help_text: string | null
          id: string
          is_active: boolean
          tool_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          fields?: Json
          help_text?: string | null
          id?: string
          is_active?: boolean
          tool_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          fields?: Json
          help_text?: string | null
          id?: string
          is_active?: boolean
          tool_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          table_name: string
          trigger_name: string
          webhook_url: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload: Json
          table_name: string
          trigger_name: string
          webhook_url: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          table_name?: string
          trigger_name?: string
          webhook_url?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          automation_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          automation_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          automation_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      affiliate_commissions_safe: {
        Row: {
          affiliate_id: string | null
          commission_amount: number | null
          commission_expires_at: string | null
          commission_rate: number | null
          created_at: string | null
          id: string | null
          notes: string | null
          paid_at: string | null
          payment_amount: number | null
          payment_type: string | null
          referred_user_id: string | null
          status: Database["public"]["Enums"]["commission_status"] | null
          subscription_id: string | null
        }
        Insert: {
          affiliate_id?: string | null
          commission_amount?: number | null
          commission_expires_at?: string | null
          commission_rate?: number | null
          created_at?: string | null
          id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_amount?: number | null
          payment_type?: string | null
          referred_user_id?: string | null
          status?: Database["public"]["Enums"]["commission_status"] | null
          subscription_id?: string | null
        }
        Update: {
          affiliate_id?: string | null
          commission_amount?: number | null
          commission_expires_at?: string | null
          commission_rate?: number | null
          created_at?: string | null
          id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_amount?: number | null
          payment_type?: string | null
          referred_user_id?: string | null
          status?: Database["public"]["Enums"]["commission_status"] | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_referral_codes: {
        Row: {
          referral_code: string | null
          status: Database["public"]["Enums"]["affiliate_status"] | null
        }
        Insert: {
          referral_code?: string | null
          status?: Database["public"]["Enums"]["affiliate_status"] | null
        }
        Update: {
          referral_code?: string | null
          status?: Database["public"]["Enums"]["affiliate_status"] | null
        }
        Relationships: []
      }
      profiles_with_roles: {
        Row: {
          created_at: string | null
          email: string | null
          email_digest_enabled: boolean | null
          has_seen_welcome: boolean | null
          id: string | null
          is_admin: boolean | null
          role: string | null
          updated_at: string | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_affiliate_active: {
        Args: { affiliate_id: string }
        Returns: boolean
      }
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_affiliate_referrals: {
        Args: { aff_id: string }
        Returns: undefined
      }
      validate_referral_code: {
        Args: { code: string }
        Returns: {
          referral_code: string
          status: Database["public"]["Enums"]["affiliate_status"]
        }[]
      }
    }
    Enums: {
      affiliate_status: "active" | "suspended" | "pending"
      app_role: "admin" | "user"
      commission_status:
        | "pending"
        | "approved"
        | "paid"
        | "refunded"
        | "cancelled"
      credential_type:
        | "google_oauth"
        | "wordpress_admin"
        | "meta_business"
        | "tiktok_oauth"
        | "crm_api"
        | "api_key"
        | "webhook_secret"
        | "smtp"
        | "database"
        | "other"
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
      affiliate_status: ["active", "suspended", "pending"],
      app_role: ["admin", "user"],
      commission_status: [
        "pending",
        "approved",
        "paid",
        "refunded",
        "cancelled",
      ],
      credential_type: [
        "google_oauth",
        "wordpress_admin",
        "meta_business",
        "tiktok_oauth",
        "crm_api",
        "api_key",
        "webhook_secret",
        "smtp",
        "database",
        "other",
      ],
    },
  },
} as const
