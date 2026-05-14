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
      applications: {
        Row: {
          candidate_id: string
          company_id: string
          created_at: string
          id: string
          job_id: string
          score: number | null
          score_breakdown: Json | null
          status: Database["public"]["Enums"]["application_status"]
        }
        Insert: {
          candidate_id: string
          company_id: string
          created_at?: string
          id?: string
          job_id: string
          score?: number | null
          score_breakdown?: Json | null
          status?: Database["public"]["Enums"]["application_status"]
        }
        Update: {
          candidate_id?: string
          company_id?: string
          created_at?: string
          id?: string
          job_id?: string
          score?: number | null
          score_breakdown?: Json | null
          status?: Database["public"]["Enums"]["application_status"]
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          created_at: string
          cv_file_url: string | null
          cv_language: string | null
          cv_text: string | null
          email: string
          id: string
          name: string
          parsed_data: Json | null
          phone: string | null
          transferable_iqama: boolean | null
          residence_country: string | null
          residence_region: string | null
          notice_period: number | null
        }
        Insert: {
          created_at?: string
          cv_file_url?: string | null
          cv_language?: string | null
          cv_text?: string | null
          email: string
          id?: string
          name: string
          parsed_data?: Json | null
          phone?: string | null
          transferable_iqama?: boolean | null
          residence_country?: string | null
          residence_region?: string | null
          notice_period?: number | null
        }
        Update: {
          created_at?: string
          cv_file_url?: string | null
          cv_language?: string | null
          cv_text?: string | null
          email?: string
          id?: string
          name?: string
          parsed_data?: Json | null
          phone?: string | null
          transferable_iqama?: boolean | null
          residence_country?: string | null
          residence_region?: string | null
          notice_period?: number | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          font_family: string | null
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          font_family?: string | null
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          font_family?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string
        }
        Relationships: []
      }

      jobs: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          job_type: Database["public"]["Enums"]["job_type"] | null
          sector: Database["public"]["Enums"]["job_sector"] | null
          description_ar: string | null
          description_en: string | null
          id: string
          requirements_ar: string | null
          requirements_en: string | null
          status: Database["public"]["Enums"]["job_status"]
          title_ar: string | null
          title_en: string | null
          location: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          job_type?: Database["public"]["Enums"]["job_type"] | null
          sector?: Database["public"]["Enums"]["job_sector"] | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          requirements_ar?: string | null
          requirements_en?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title_ar?: string | null
          title_en?: string | null
          location?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          job_type?: Database["public"]["Enums"]["job_type"] | null
          sector?: Database["public"]["Enums"]["job_sector"] | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          requirements_ar?: string | null
          requirements_en?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title_ar?: string | null
          title_en?: string | null
          location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },

        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          sector: Database["public"]["Enums"]["job_sector"] | null
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          sector?: Database["public"]["Enums"]["job_sector"] | null
          email: string
          full_name?: string | null
          id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          sector?: Database["public"]["Enums"]["job_sector"] | null
          email?: string
          full_name?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      [_ in never]: never
    }
    Functions: {
      current_user_company_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "hr"
      application_status: "pending" | "reviewed" | "accepted" | "rejected"
      job_sector: "industrial" | "contracting" | "trading"
      job_status: "active" | "inactive"
      job_type: "full-time" | "part-time" | "contract"
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
      app_role: ["super_admin", "hr"],
      application_status: ["pending", "reviewed", "accepted", "rejected"],
      job_sector: ["industrial", "contracting", "trading"],
      job_status: ["active", "inactive"],
      job_type: ["full-time", "part-time", "contract"],
    },
  },
} as const
