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
      authorization_log: {
        Row: {
          action: string
          child_id: string | null
          created_at: string
          details: Json
          id: string
          parent_id: string
          subject_id: string | null
          subject_type: string
        }
        Insert: {
          action: string
          child_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          parent_id?: string
          subject_id?: string | null
          subject_type: string
        }
        Update: {
          action?: string
          child_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          parent_id?: string
          subject_id?: string | null
          subject_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "authorization_log_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      child_consents: {
        Row: {
          child_id: string
          consent_type: Database["public"]["Enums"]["consent_type"]
          created_at: string
          granted: boolean
          id: string
          parent_id: string
          policy_version: string
          updated_at: string
        }
        Insert: {
          child_id: string
          consent_type: Database["public"]["Enums"]["consent_type"]
          created_at?: string
          granted?: boolean
          id?: string
          parent_id?: string
          policy_version?: string
          updated_at?: string
        }
        Update: {
          child_id?: string
          consent_type?: Database["public"]["Enums"]["consent_type"]
          created_at?: string
          granted?: boolean
          id?: string
          parent_id?: string
          policy_version?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_consents_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          age_band: string
          created_at: string
          id: string
          interests: string[]
          is_sample: boolean
          nickname: string
          parent_id: string
          updated_at: string
        }
        Insert: {
          age_band: string
          created_at?: string
          id?: string
          interests?: string[]
          is_sample?: boolean
          nickname: string
          parent_id?: string
          updated_at?: string
        }
        Update: {
          age_band?: string
          created_at?: string
          id?: string
          interests?: string[]
          is_sample?: boolean
          nickname?: string
          parent_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      circle_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          delivery: string
          display_name: string
          email: string
          id: string
          invite_token: string
          member_user_id: string | null
          parent_id: string
          relationship: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          delivery?: string
          display_name: string
          email: string
          id?: string
          invite_token?: string
          member_user_id?: string | null
          parent_id?: string
          relationship?: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          delivery?: string
          display_name?: string
          email?: string
          id?: string
          invite_token?: string
          member_user_id?: string | null
          parent_id?: string
          relationship?: string
          status?: string
        }
        Relationships: []
      }
      inspirations: {
        Row: {
          child_id: string
          created_at: string
          id: string
          kind: string
          parent_id: string
          prompt: string
          source_url: string | null
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          kind: string
          parent_id?: string
          prompt: string
          source_url?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          kind?: string
          parent_id?: string
          prompt?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspirations_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          child_id: string
          child_words: string
          created_at: string
          id: string
          parent_id: string
          plan_id: string | null
          reflection: string
          shared_approved_at: string | null
          shared_with_circle: boolean
          title: string
          updated_at: string
        }
        Insert: {
          child_id: string
          child_words?: string
          created_at?: string
          id?: string
          parent_id?: string
          plan_id?: string | null
          reflection?: string
          shared_approved_at?: string | null
          shared_with_circle?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          child_id?: string
          child_words?: string
          created_at?: string
          id?: string
          parent_id?: string
          plan_id?: string | null
          reflection?: string
          shared_approved_at?: string | null
          shared_with_circle?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_media: {
        Row: {
          caption: string
          child_id: string
          created_at: string
          entry_id: string
          id: string
          mime_type: string
          parent_id: string
          storage_path: string
        }
        Insert: {
          caption?: string
          child_id: string
          created_at?: string
          entry_id: string
          id?: string
          mime_type: string
          parent_id?: string
          storage_path: string
        }
        Update: {
          caption?: string
          child_id?: string
          created_at?: string
          entry_id?: string
          id?: string
          mime_type?: string
          parent_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_media_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_media_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          approved_at: string | null
          child_id: string
          created_at: string
          grown_up_notes: string
          id: string
          inspiration_id: string | null
          materials: string[]
          parent_id: string
          source: string
          status: string
          steps: Json
          title: string
          updated_at: string
          what_if: string
        }
        Insert: {
          approved_at?: string | null
          child_id: string
          created_at?: string
          grown_up_notes?: string
          id?: string
          inspiration_id?: string | null
          materials?: string[]
          parent_id?: string
          source: string
          status?: string
          steps?: Json
          title: string
          updated_at?: string
          what_if?: string
        }
        Update: {
          approved_at?: string | null
          child_id?: string
          created_at?: string
          grown_up_notes?: string
          id?: string
          inspiration_id?: string | null
          materials?: string[]
          parent_id?: string
          source?: string
          status?: string
          steps?: Json
          title?: string
          updated_at?: string
          what_if?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_inspiration_id_fkey"
            columns: ["inspiration_id"]
            isOneToOne: false
            referencedRelation: "inspirations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_circle_invite: { Args: { _token: string }; Returns: string }
      can_upload_journal_media: { Args: { _name: string }; Returns: boolean }
      can_view_journal_media: { Args: { _name: string }; Returns: boolean }
      create_sample_child: { Args: never; Returns: string }
      has_consent: {
        Args: {
          _child_id: string
          _type: Database["public"]["Enums"]["consent_type"]
        }
        Returns: boolean
      }
      is_circle_member_of: { Args: { _parent_id: string }; Returns: boolean }
      owns_child: { Args: { _child_id: string }; Returns: boolean }
    }
    Enums: {
      consent_type:
        | "profile_storage"
        | "ai_plan_generation"
        | "media_storage"
        | "family_circle_sharing"
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
      consent_type: [
        "profile_storage",
        "ai_plan_generation",
        "media_storage",
        "family_circle_sharing",
      ],
    },
  },
} as const