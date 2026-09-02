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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_codes: {
        Row: {
          bonus_base_credits: number
          code: string
          created_at: string
          expires_at: string | null
          id: string
          instant_bonus: number
          is_used: boolean
          type: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          bonus_base_credits?: number
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          instant_bonus?: number
          is_used?: boolean
          type?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          bonus_base_credits?: number
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          instant_bonus?: number
          is_used?: boolean
          type?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          provider: string
          secret: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          provider: string
          secret: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          provider?: string
          secret?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          default_base_credits: number
          id: number
          max_interval_seconds: number
          min_interval_seconds: number
          updated_at: string
        }
        Insert: {
          default_base_credits?: number
          id?: number
          max_interval_seconds?: number
          min_interval_seconds?: number
          updated_at?: string
        }
        Update: {
          default_base_credits?: number
          id?: number
          max_interval_seconds?: number
          min_interval_seconds?: number
          updated_at?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          model: string
          prompt: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          model: string
          prompt: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          model?: string
          prompt?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          chat_id: string
          content: string
          created_at: string
          id: string
          model: string | null
          role: string
          user_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          chat_id: string
          content?: string
          created_at?: string
          id?: string
          model?: string | null
          role: string
          user_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          model?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          base_credits: number
          created_at: string
          current_credits: number
          display_name: string | null
          email: string | null
          last_renewal_at: string
          renewal_interval_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          base_credits?: number
          created_at?: string
          current_credits?: number
          display_name?: string | null
          email?: string | null
          last_renewal_at?: string
          renewal_interval_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          base_credits?: number
          created_at?: string
          current_credits?: number
          display_name?: string | null
          email?: string | null
          last_renewal_at?: string
          renewal_interval_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          action: string
          cost_usd: number
          created_at: string
          credits: number
          id: string
          model: string | null
          provider: string | null
          user_id: string
        }
        Insert: {
          action: string
          cost_usd?: number
          created_at?: string
          credits?: number
          id?: string
          model?: string | null
          provider?: string | null
          user_id: string
        }
        Update: {
          action?: string
          cost_usd?: number
          created_at?: string
          credits?: number
          id?: string
          model?: string | null
          provider?: string | null
          user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_generate_codes: {
        Args: {
          _bonus_base: number
          _count: number
          _expires_at?: string
          _instant: number
          _type: string
        }
        Returns: {
          bonus_base_credits: number
          code: string
          created_at: string
          expires_at: string | null
          id: string
          instant_bonus: number
          is_used: boolean
          type: string
          used_at: string | null
          used_by: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "access_codes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_stats: { Args: never; Returns: Json }
      admin_update_settings: {
        Args: { _default_base: number; _max: number; _min: number }
        Returns: {
          default_base_credits: number
          id: number
          max_interval_seconds: number
          min_interval_seconds: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "app_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_first_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      redeem_access_code: {
        Args: { _code: string }
        Returns: {
          base_credits: number
          created_at: string
          current_credits: number
          display_name: string | null
          email: string | null
          last_renewal_at: string
          renewal_interval_seconds: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      spend_credits: {
        Args: {
          _action: string
          _amount: number
          _cost?: number
          _model?: string
          _provider?: string
        }
        Returns: {
          base_credits: number
          created_at: string
          current_credits: number
          display_name: string | null
          email: string | null
          last_renewal_at: string
          renewal_interval_seconds: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sync_credits: {
        Args: never
        Returns: {
          base_credits: number
          created_at: string
          current_credits: number
          display_name: string | null
          email: string | null
          last_renewal_at: string
          renewal_interval_seconds: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
