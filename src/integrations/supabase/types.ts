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
      escort_availability: {
        Row: {
          created_at: string
          date: string | null
          end_time: string
          escort_id: string
          id: string
          start_time: string
          weekday: number | null
        }
        Insert: {
          created_at?: string
          date?: string | null
          end_time: string
          escort_id: string
          id?: string
          start_time: string
          weekday?: number | null
        }
        Update: {
          created_at?: string
          date?: string | null
          end_time?: string
          escort_id?: string
          id?: string
          start_time?: string
          weekday?: number | null
        }
        Relationships: []
      }
      escort_profiles: {
        Row: {
          anonymous_id: string
          available: boolean
          base_address: string | null
          base_city: string
          base_lat: number
          base_lng: number
          base_postcode: string | null
          categories: string[]
          cert_expires_on: string | null
          cert_number: string | null
          certificate_files: string[]
          countries: string[]
          created_at: string
          escort_types: string[]
          hourly_rate: number
          id: string
          insurance_policy: string | null
          languages: string[]
          rating: number
          rides_completed: number
          surcharges: Json
          updated_at: string
          vca_number: string | null
          vehicle_has_height_pole: boolean
          vehicle_has_konvooi_sign: boolean
          vehicle_has_lightbar: boolean
          vehicle_type: string
        }
        Insert: {
          anonymous_id?: string
          available?: boolean
          base_address?: string | null
          base_city: string
          base_lat: number
          base_lng: number
          base_postcode?: string | null
          categories?: string[]
          cert_expires_on?: string | null
          cert_number?: string | null
          certificate_files?: string[]
          countries?: string[]
          created_at?: string
          escort_types?: string[]
          hourly_rate?: number
          id: string
          insurance_policy?: string | null
          languages?: string[]
          rating?: number
          rides_completed?: number
          surcharges?: Json
          updated_at?: string
          vca_number?: string | null
          vehicle_has_height_pole?: boolean
          vehicle_has_konvooi_sign?: boolean
          vehicle_has_lightbar?: boolean
          vehicle_type?: string
        }
        Update: {
          anonymous_id?: string
          available?: boolean
          base_address?: string | null
          base_city?: string
          base_lat?: number
          base_lng?: number
          base_postcode?: string | null
          categories?: string[]
          cert_expires_on?: string | null
          cert_number?: string | null
          certificate_files?: string[]
          countries?: string[]
          created_at?: string
          escort_types?: string[]
          hourly_rate?: number
          id?: string
          insurance_policy?: string | null
          languages?: string[]
          rating?: number
          rides_completed?: number
          surcharges?: Json
          updated_at?: string
          vca_number?: string | null
          vehicle_has_height_pole?: boolean
          vehicle_has_konvooi_sign?: boolean
          vehicle_has_lightbar?: boolean
          vehicle_type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          anonymous_id: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          anonymous_id?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          anonymous_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ride_assignments: {
        Row: {
          actual_cost: number | null
          actual_hours: number | null
          created_at: string
          departed_base_at: string | null
          escort_id: string
          estimated_cost: number | null
          estimated_hours: number | null
          hours_notes: string | null
          hours_submitted_at: string | null
          id: string
          invited_at: string
          responded_at: string | null
          responds_by: string
          returned_base_at: string | null
          ride_id: string
          status: Database["public"]["Enums"]["assignment_status"]
          travel_back_home_min: number
          travel_to_pickup_min: number
        }
        Insert: {
          actual_cost?: number | null
          actual_hours?: number | null
          created_at?: string
          departed_base_at?: string | null
          escort_id: string
          estimated_cost?: number | null
          estimated_hours?: number | null
          hours_notes?: string | null
          hours_submitted_at?: string | null
          id?: string
          invited_at?: string
          responded_at?: string | null
          responds_by?: string
          returned_base_at?: string | null
          ride_id: string
          status?: Database["public"]["Enums"]["assignment_status"]
          travel_back_home_min?: number
          travel_to_pickup_min?: number
        }
        Update: {
          actual_cost?: number | null
          actual_hours?: number | null
          created_at?: string
          departed_base_at?: string | null
          escort_id?: string
          estimated_cost?: number | null
          estimated_hours?: number | null
          hours_notes?: string | null
          hours_submitted_at?: string | null
          id?: string
          invited_at?: string
          responded_at?: string | null
          responds_by?: string
          returned_base_at?: string | null
          ride_id?: string
          status?: Database["public"]["Enums"]["assignment_status"]
          travel_back_home_min?: number
          travel_to_pickup_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "ride_assignments_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          app_fee: number
          cargo_height_m: number | null
          cargo_length_m: number | null
          cargo_weight_t: number | null
          cargo_width_m: number | null
          client_id: string
          created_at: string
          dropoff_address: string
          dropoff_city: string
          dropoff_lat: number
          dropoff_lng: number
          escort_type_required: string
          id: string
          notes: string | null
          num_escorts: number
          permit_number: string | null
          pickup_address: string
          pickup_city: string
          pickup_lat: number
          pickup_lng: number
          scheduled_at: string
          status: Database["public"]["Enums"]["ride_status"]
          time_window_end: string | null
          time_window_start: string | null
          updated_at: string
        }
        Insert: {
          app_fee?: number
          cargo_height_m?: number | null
          cargo_length_m?: number | null
          cargo_weight_t?: number | null
          cargo_width_m?: number | null
          client_id: string
          created_at?: string
          dropoff_address: string
          dropoff_city: string
          dropoff_lat: number
          dropoff_lng: number
          escort_type_required?: string
          id?: string
          notes?: string | null
          num_escorts?: number
          permit_number?: string | null
          pickup_address: string
          pickup_city: string
          pickup_lat: number
          pickup_lng: number
          scheduled_at: string
          status?: Database["public"]["Enums"]["ride_status"]
          time_window_end?: string | null
          time_window_start?: string | null
          updated_at?: string
        }
        Update: {
          app_fee?: number
          cargo_height_m?: number | null
          cargo_length_m?: number | null
          cargo_weight_t?: number | null
          cargo_width_m?: number | null
          client_id?: string
          created_at?: string
          dropoff_address?: string
          dropoff_city?: string
          dropoff_lat?: number
          dropoff_lng?: number
          escort_type_required?: string
          id?: string
          notes?: string | null
          num_escorts?: number
          permit_number?: string | null
          pickup_address?: string
          pickup_city?: string
          pickup_lat?: number
          pickup_lng?: number
          scheduled_at?: string
          status?: Database["public"]["Enums"]["ride_status"]
          time_window_end?: string | null
          time_window_start?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "opdrachtgever" | "begeleider" | "admin"
      assignment_status:
        | "invited"
        | "accepted"
        | "declined"
        | "expired"
        | "cancelled"
      ride_status:
        | "open"
        | "matched"
        | "in_progress"
        | "completed"
        | "cancelled"
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
      app_role: ["opdrachtgever", "begeleider", "admin"],
      assignment_status: [
        "invited",
        "accepted",
        "declined",
        "expired",
        "cancelled",
      ],
      ride_status: ["open", "matched", "in_progress", "completed", "cancelled"],
    },
  },
} as const
