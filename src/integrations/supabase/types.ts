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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      analytics: {
        Row: {
          created_at: string
          extra_info: Json | null
          history_id: string
          id: string
          language: string | null
          title: string
          user_id: string
          words_used: number
        }
        Insert: {
          created_at?: string
          extra_info?: Json | null
          history_id: string
          id?: string
          language?: string | null
          title: string
          user_id: string
          words_used?: number
        }
        Update: {
          created_at?: string
          extra_info?: Json | null
          history_id?: string
          id?: string
          language?: string | null
          title?: string
          user_id?: string
          words_used?: number
        }
        Relationships: []
      }
      banned_emails: {
        Row: {
          created_at: string
          email: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          email: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          reason?: string | null
        }
        Relationships: []
      }
      blocked_countries: {
        Row: {
          country_code: string
          country_name: string
          created_at: string
          id: string
        }
        Insert: {
          country_code: string
          country_name: string
          created_at?: string
          id?: string
        }
        Update: {
          country_code?: string
          country_name?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string | null
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string | null
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string | null
          subject?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string | null
          discount_amount: number | null
          discount_percentage: number
          expires_at: string | null
          id: string
          last_used_at: string | null
          max_uses: number | null
          type: string
          updated_at: string | null
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string | null
          discount_amount?: number | null
          discount_percentage?: number
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          max_uses?: number | null
          type: string
          updated_at?: string | null
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string | null
          discount_amount?: number | null
          discount_percentage?: number
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          max_uses?: number | null
          type?: string
          updated_at?: string | null
          used_count?: number
        }
        Relationships: []
      }
      expiry_notifications: {
        Row: {
          id: string
          notification_type: string
          plan_expires_at: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          notification_type: string
          plan_expires_at: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          notification_type?: string
          plan_expires_at?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      history: {
        Row: {
          audio_url: string | null
          created_at: string
          generation_completed_at: string | null
          generation_started_at: string | null
          id: string
          language: string
          original_text: string
          processing_time_ms: number | null
          title: string
          updated_at: string
          user_id: string
          voice_settings: Json | null
          words_used: number
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          generation_completed_at?: string | null
          generation_started_at?: string | null
          id?: string
          language?: string
          original_text: string
          processing_time_ms?: number | null
          title: string
          updated_at?: string
          user_id: string
          voice_settings?: Json | null
          words_used?: number
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          generation_completed_at?: string | null
          generation_started_at?: string | null
          id?: string
          language?: string
          original_text?: string
          processing_time_ms?: number | null
          title?: string
          updated_at?: string
          user_id?: string
          voice_settings?: Json | null
          words_used?: number
        }
        Relationships: []
      }
      ip_tracking: {
        Row: {
          city: string | null
          country_code: string | null
          country_name: string | null
          created_at: string
          id: string
          ip_address: unknown
          updated_at: string
          user_id: string | null
        }
        Insert: {
          city?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          id?: string
          ip_address: unknown
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          city?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      newsletter_subscriptions: {
        Row: {
          email: string
          id: string
          is_active: boolean | null
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          is_active?: boolean | null
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          is_active?: boolean | null
          subscribed_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          plan: string | null
          status: string
          updated_at: string
          user_id: string | null
          words_purchased: number | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          plan?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          words_purchased?: number | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          plan?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          words_purchased?: number | null
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          allowed: boolean | null
          country_code: string
          created_at: string
          currency: string
          id: string
          payment_gateway: string
        }
        Insert: {
          allowed?: boolean | null
          country_code: string
          created_at?: string
          currency: string
          id?: string
          payment_gateway: string
        }
        Update: {
          allowed?: boolean | null
          country_code?: string
          created_at?: string
          currency?: string
          id?: string
          payment_gateway?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          coupon_code: string | null
          created_at: string
          currency: string
          id: string
          payment_id: string
          payment_method: string | null
          plan: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          coupon_code?: string | null
          created_at?: string
          currency?: string
          id?: string
          payment_id: string
          payment_method?: string | null
          plan?: string | null
          status: string
          user_id: string
        }
        Update: {
          amount?: number
          coupon_code?: string | null
          created_at?: string
          currency?: string
          id?: string
          payment_id?: string
          payment_method?: string | null
          plan?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          currency: string
          features: Json | null
          id: string
          name: string
          original_price: number | null
          price: number
          updated_at: string
          upload_limit_mb: number
          word_limit: number
        }
        Insert: {
          created_at?: string
          currency: string
          features?: Json | null
          id?: string
          name: string
          original_price?: number | null
          price: number
          updated_at?: string
          upload_limit_mb?: number
          word_limit: number
        }
        Update: {
          created_at?: string
          currency?: string
          features?: Json | null
          id?: string
          name?: string
          original_price?: number | null
          price?: number
          updated_at?: string
          upload_limit_mb?: number
          word_limit?: number
        }
        Relationships: []
      }
      prebuilt_voices: {
        Row: {
          accent: string | null
          audio_preview_url: string | null
          category: string
          created_at: string
          description: string
          gender: string | null
          id: string
          is_active: boolean
          language: string
          name: string
          required_plan: string
          sort_order: number
          updated_at: string
          voice_id: string
        }
        Insert: {
          accent?: string | null
          audio_preview_url?: string | null
          category?: string
          created_at?: string
          description: string
          gender?: string | null
          id?: string
          is_active?: boolean
          language?: string
          name: string
          required_plan?: string
          sort_order?: number
          updated_at?: string
          voice_id: string
        }
        Update: {
          accent?: string | null
          audio_preview_url?: string | null
          category?: string
          created_at?: string
          description?: string
          gender?: string | null
          id?: string
          is_active?: boolean
          language?: string
          name?: string
          required_plan?: string
          sort_order?: number
          updated_at?: string
          voice_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          country: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          ip_address: unknown | null
          is_vpn_user: boolean | null
          last_ip_check: string | null
          last_login_at: string | null
          last_payment_amount: number | null
          last_payment_id: string | null
          last_payment_method: string | null
          last_word_purchase_at: string | null
          login_count: number | null
          max_voice_storage_mb: number | null
          max_word_purchase_limit: number | null
          plan: string | null
          plan_end_date: string | null
          plan_expires_at: string | null
          plan_renewal_reminder_sent: boolean | null
          plan_start_date: string | null
          plan_words_used: number | null
          preferred_language: string | null
          total_words_used: number | null
          ui_language: string | null
          updated_at: string
          upload_limit_mb: number | null
          user_id: string
          voice_storage_used_mb: number | null
          word_balance: number | null
          words_limit: number | null
          words_used: number | null
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          ip_address?: unknown | null
          is_vpn_user?: boolean | null
          last_ip_check?: string | null
          last_login_at?: string | null
          last_payment_amount?: number | null
          last_payment_id?: string | null
          last_payment_method?: string | null
          last_word_purchase_at?: string | null
          login_count?: number | null
          max_voice_storage_mb?: number | null
          max_word_purchase_limit?: number | null
          plan?: string | null
          plan_end_date?: string | null
          plan_expires_at?: string | null
          plan_renewal_reminder_sent?: boolean | null
          plan_start_date?: string | null
          plan_words_used?: number | null
          preferred_language?: string | null
          total_words_used?: number | null
          ui_language?: string | null
          updated_at?: string
          upload_limit_mb?: number | null
          user_id: string
          voice_storage_used_mb?: number | null
          word_balance?: number | null
          words_limit?: number | null
          words_used?: number | null
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          ip_address?: unknown | null
          is_vpn_user?: boolean | null
          last_ip_check?: string | null
          last_login_at?: string | null
          last_payment_amount?: number | null
          last_payment_id?: string | null
          last_payment_method?: string | null
          last_word_purchase_at?: string | null
          login_count?: number | null
          max_voice_storage_mb?: number | null
          max_word_purchase_limit?: number | null
          plan?: string | null
          plan_end_date?: string | null
          plan_expires_at?: string | null
          plan_renewal_reminder_sent?: boolean | null
          plan_start_date?: string | null
          plan_words_used?: number | null
          preferred_language?: string | null
          total_words_used?: number | null
          ui_language?: string | null
          updated_at?: string
          upload_limit_mb?: number | null
          user_id?: string
          voice_storage_used_mb?: number | null
          word_balance?: number | null
          words_limit?: number | null
          words_used?: number | null
        }
        Relationships: []
      }
      purchase_notifications: {
        Row: {
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          order_id: string | null
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          order_id?: string | null
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          order_id?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_locations: {
        Row: {
          city: string | null
          confidence_score: number | null
          country_code: string
          country_name: string
          created_at: string | null
          id: string
          ip_address: unknown
          is_vpn: boolean | null
          last_checked_at: string | null
          region: string | null
          updated_at: string | null
          user_id: string
          vpn_provider: string | null
        }
        Insert: {
          city?: string | null
          confidence_score?: number | null
          country_code: string
          country_name: string
          created_at?: string | null
          id?: string
          ip_address: unknown
          is_vpn?: boolean | null
          last_checked_at?: string | null
          region?: string | null
          updated_at?: string | null
          user_id: string
          vpn_provider?: string | null
        }
        Update: {
          city?: string | null
          confidence_score?: number | null
          country_code?: string
          country_name?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          is_vpn?: boolean | null
          last_checked_at?: string | null
          region?: string | null
          updated_at?: string | null
          user_id?: string
          vpn_provider?: string | null
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          id: string
          last_updated: string
          session_start: string
          user_id: string
          words_used: number
        }
        Insert: {
          id?: string
          last_updated?: string
          session_start?: string
          user_id: string
          words_used?: number
        }
        Update: {
          id?: string
          last_updated?: string
          session_start?: string
          user_id?: string
          words_used?: number
        }
        Relationships: []
      }
      user_voices: {
        Row: {
          audio_blob: string | null
          audio_url: string | null
          created_at: string
          duration: string | null
          id: string
          is_selected: boolean | null
          language: string | null
          name: string
          user_id: string
        }
        Insert: {
          audio_blob?: string | null
          audio_url?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          is_selected?: boolean | null
          language?: string | null
          name: string
          user_id: string
        }
        Update: {
          audio_blob?: string | null
          audio_url?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          is_selected?: boolean | null
          language?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_recordings: {
        Row: {
          audio_url: string | null
          created_at: string
          duration_seconds: number | null
          file_size_bytes: number | null
          id: string
          language: string
          original_text: string
          s3_key: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          voice_settings: Json | null
          words_used: number
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
          language?: string
          original_text: string
          s3_key?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          voice_settings?: Json | null
          words_used?: number
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
          language?: string
          original_text?: string
          s3_key?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          voice_settings?: Json | null
          words_used?: number
        }
        Relationships: []
      }
      vpn_detections: {
        Row: {
          created_at: string | null
          detection_result: Json | null
          expires_at: string | null
          id: string
          ip_address: unknown
          is_vpn: boolean
          provider: string | null
        }
        Insert: {
          created_at?: string | null
          detection_result?: Json | null
          expires_at?: string | null
          id?: string
          ip_address: unknown
          is_vpn?: boolean
          provider?: string | null
        }
        Update: {
          created_at?: string | null
          detection_result?: Json | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_vpn?: boolean
          provider?: string | null
        }
        Relationships: []
      }
      word_purchases: {
        Row: {
          amount_paid: number
          created_at: string
          currency: string
          id: string
          payment_id: string | null
          payment_method: string | null
          status: string
          updated_at: string
          user_id: string
          words_purchased: number
        }
        Insert: {
          amount_paid: number
          created_at?: string
          currency?: string
          id?: string
          payment_id?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
          user_id: string
          words_purchased: number
        }
        Update: {
          amount_paid?: number
          created_at?: string
          currency?: string
          id?: string
          payment_id?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          words_purchased?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_purchased_words: {
        Args: {
          payment_id_param: string
          user_id_param: string
          words_to_add: number
        }
        Returns: boolean
      }
      check_plan_expiry: {
        Args: { user_id_param: string }
        Returns: Json
      }
      deduct_words_and_log_history: {
        Args: {
          p_audio_url: string
          p_char_count: number
          p_metadata: Json
          p_text_sample: string
          p_title: string
          p_user_id: string
          p_word_count: number
        }
        Returns: undefined
      }
      deduct_words_smartly: {
        Args: { user_id_param: string; words_to_deduct: number }
        Returns: Json
      }
      reset_plan_words: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      safe_update_profile_for_subscription: {
        Args: {
          p_last_payment_amount: number
          p_last_payment_id: string
          p_last_payment_method?: string
          p_plan: string
          p_plan_end_date: string
          p_plan_start_date: string
          p_plan_words_used: number
          p_upload_limit_mb: number
          p_user_id: string
          p_word_balance: number
          p_words_limit: number
        }
        Returns: Json
      }
      update_word_count: {
        Args: { new_word_count: number; user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
