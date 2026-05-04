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
          bank_account_holder: string | null
          base_address: string | null
          base_city: string
          base_lat: number
          base_lng: number
          base_postcode: string | null
          billing_address: string | null
          billing_city: string | null
          billing_contact_name: string | null
          billing_country: string | null
          billing_email: string | null
          billing_postcode: string | null
          categories: string[]
          cert_expires_on: string | null
          cert_number: string | null
          certificate_files: string[]
          company_name: string | null
          countries: string[]
          created_at: string
          escort_types: string[]
          fuel_surcharge: Json
          hourly_rate: number
          hourly_rate_be: number
          iban: string | null
          id: string
          insurance_policy: string | null
          kvk_number: string | null
          languages: string[]
          min_billable_hours: number
          rating: number
          rides_completed: number
          surcharges: Json
          updated_at: string
          vat_number: string | null
          vca_number: string | null
          vehicle_has_height_pole: boolean
          vehicle_has_konvooi_sign: boolean
          vehicle_has_lightbar: boolean
          vehicle_type: string
        }
        Insert: {
          anonymous_id?: string
          available?: boolean
          bank_account_holder?: string | null
          base_address?: string | null
          base_city: string
          base_lat: number
          base_lng: number
          base_postcode?: string | null
          billing_address?: string | null
          billing_city?: string | null
          billing_contact_name?: string | null
          billing_country?: string | null
          billing_email?: string | null
          billing_postcode?: string | null
          categories?: string[]
          cert_expires_on?: string | null
          cert_number?: string | null
          certificate_files?: string[]
          company_name?: string | null
          countries?: string[]
          created_at?: string
          escort_types?: string[]
          fuel_surcharge?: Json
          hourly_rate?: number
          hourly_rate_be?: number
          iban?: string | null
          id: string
          insurance_policy?: string | null
          kvk_number?: string | null
          languages?: string[]
          min_billable_hours?: number
          rating?: number
          rides_completed?: number
          surcharges?: Json
          updated_at?: string
          vat_number?: string | null
          vca_number?: string | null
          vehicle_has_height_pole?: boolean
          vehicle_has_konvooi_sign?: boolean
          vehicle_has_lightbar?: boolean
          vehicle_type?: string
        }
        Update: {
          anonymous_id?: string
          available?: boolean
          bank_account_holder?: string | null
          base_address?: string | null
          base_city?: string
          base_lat?: number
          base_lng?: number
          base_postcode?: string | null
          billing_address?: string | null
          billing_city?: string | null
          billing_contact_name?: string | null
          billing_country?: string | null
          billing_email?: string | null
          billing_postcode?: string | null
          categories?: string[]
          cert_expires_on?: string | null
          cert_number?: string | null
          certificate_files?: string[]
          company_name?: string | null
          countries?: string[]
          created_at?: string
          escort_types?: string[]
          fuel_surcharge?: Json
          hourly_rate?: number
          hourly_rate_be?: number
          iban?: string | null
          id?: string
          insurance_policy?: string | null
          kvk_number?: string | null
          languages?: string[]
          min_billable_hours?: number
          rating?: number
          rides_completed?: number
          surcharges?: Json
          updated_at?: string
          vat_number?: string | null
          vca_number?: string | null
          vehicle_has_height_pole?: boolean
          vehicle_has_konvooi_sign?: boolean
          vehicle_has_lightbar?: boolean
          vehicle_type?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          amount: number
          description: string | null
          hourly_rate: number
          hours: number
          id: string
          invoice_id: string
          ride_assignment_id: string
          ride_date: string
          ride_id: string
        }
        Insert: {
          amount: number
          description?: string | null
          hourly_rate: number
          hours: number
          id?: string
          invoice_id: string
          ride_assignment_id: string
          ride_date: string
          ride_id: string
        }
        Update: {
          amount?: number
          description?: string | null
          hourly_rate?: number
          hours?: number
          id?: string
          invoice_id?: string
          ride_assignment_id?: string
          ride_date?: string
          ride_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string
          created_at: string
          escort_id: string
          id: string
          invoice_number: string
          paid_at: string | null
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["invoice_status"]
          total_amount: number
          total_hours: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          escort_id: string
          id?: string
          invoice_number?: string
          paid_at?: string | null
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["invoice_status"]
          total_amount?: number
          total_hours?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          escort_id?: string
          id?: string
          invoice_number?: string
          paid_at?: string | null
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          total_amount?: number
          total_hours?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          ride_assignment_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          ride_assignment_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          ride_assignment_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      permit_routes: {
        Row: {
          created_at: string
          destination: string
          id: string
          loaded: boolean
          origin: string
          permit_id: string
          route_index: number
          waypoints: Json
        }
        Insert: {
          created_at?: string
          destination: string
          id?: string
          loaded?: boolean
          origin: string
          permit_id: string
          route_index: number
          waypoints?: Json
        }
        Update: {
          created_at?: string
          destination?: string
          id?: string
          loaded?: boolean
          origin?: string
          permit_id?: string
          route_index?: number
          waypoints?: Json
        }
        Relationships: [
          {
            foreignKeyName: "permit_routes_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "permits"
            referencedColumns: ["id"]
          },
        ]
      }
      permits: {
        Row: {
          cargo: string | null
          carrier: string | null
          client_id: string
          created_at: string
          id: string
          max_height_m: number | null
          max_length_m: number | null
          max_weight_kg: number | null
          max_width_m: number | null
          pdf_path: string | null
          permit_number: string
          raw_data: Json | null
          reference: string | null
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          cargo?: string | null
          carrier?: string | null
          client_id: string
          created_at?: string
          id?: string
          max_height_m?: number | null
          max_length_m?: number | null
          max_weight_kg?: number | null
          max_width_m?: number | null
          pdf_path?: string | null
          permit_number: string
          raw_data?: Json | null
          reference?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          cargo?: string | null
          carrier?: string | null
          client_id?: string
          created_at?: string
          id?: string
          max_height_m?: number | null
          max_length_m?: number | null
          max_weight_kg?: number | null
          max_width_m?: number | null
          pdf_path?: string | null
          permit_number?: string
          raw_data?: Json | null
          reference?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: []
      }
      platform_invoice_items: {
        Row: {
          amount: number
          created_at: string
          id: string
          num_escorts: number
          platform_invoice_id: string
          ride_date: string
          ride_id: string
          route: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          num_escorts: number
          platform_invoice_id: string
          ride_date: string
          ride_id: string
          route?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          num_escorts?: number
          platform_invoice_id?: string
          ride_date?: string
          ride_id?: string
          route?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_invoice_items_platform_invoice_id_fkey"
            columns: ["platform_invoice_id"]
            isOneToOne: false
            referencedRelation: "platform_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_invoices: {
        Row: {
          client_id: string
          created_at: string
          id: string
          invoice_number: string
          paid_at: string | null
          period_end: string
          period_start: string
          status: string
          total_amount: number
          total_escorts: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          invoice_number?: string
          paid_at?: string | null
          period_end: string
          period_start: string
          status?: string
          total_amount?: number
          total_escorts?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          invoice_number?: string
          paid_at?: string | null
          period_end?: string
          period_start?: string
          status?: string
          total_amount?: number
          total_escorts?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          anonymous_id: string | null
          billing_address: string | null
          billing_city: string | null
          billing_contact_name: string | null
          billing_country: string | null
          billing_email: string | null
          billing_frequency: string
          billing_postcode: string | null
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          kvk_number: string | null
          last_platform_invoice_at: string | null
          phone: string | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          anonymous_id?: string | null
          billing_address?: string | null
          billing_city?: string | null
          billing_contact_name?: string | null
          billing_country?: string | null
          billing_email?: string | null
          billing_frequency?: string
          billing_postcode?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          kvk_number?: string | null
          last_platform_invoice_at?: string | null
          phone?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          anonymous_id?: string | null
          billing_address?: string | null
          billing_city?: string | null
          billing_contact_name?: string | null
          billing_country?: string | null
          billing_email?: string | null
          billing_frequency?: string
          billing_postcode?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          kvk_number?: string | null
          last_platform_invoice_at?: string | null
          phone?: string | null
          updated_at?: string
          vat_number?: string | null
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
          extra_costs: Json
          extra_costs_total: number
          hours_notes: string | null
          hours_submitted_at: string | null
          id: string
          invited_at: string
          invoice_id: string | null
          invoiced_at: string | null
          reminder_10h_sent_at: string | null
          reminder_8h_sent_at: string | null
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
          extra_costs?: Json
          extra_costs_total?: number
          hours_notes?: string | null
          hours_submitted_at?: string | null
          id?: string
          invited_at?: string
          invoice_id?: string | null
          invoiced_at?: string | null
          reminder_10h_sent_at?: string | null
          reminder_8h_sent_at?: string | null
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
          extra_costs?: Json
          extra_costs_total?: number
          hours_notes?: string | null
          hours_submitted_at?: string | null
          id?: string
          invited_at?: string
          invoice_id?: string | null
          invoiced_at?: string | null
          reminder_10h_sent_at?: string | null
          reminder_8h_sent_at?: string | null
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
            foreignKeyName: "ride_assignments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
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
          client_reference: string | null
          created_at: string
          dropoff_address: string
          dropoff_city: string
          dropoff_lat: number
          dropoff_lng: number
          escort_type_required: string
          id: string
          notes: string | null
          num_escorts: number
          permit_id: string | null
          permit_number: string | null
          pickup_address: string
          pickup_city: string
          pickup_lat: number
          pickup_lng: number
          platform_invoice_id: string | null
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
          client_reference?: string | null
          created_at?: string
          dropoff_address: string
          dropoff_city: string
          dropoff_lat: number
          dropoff_lng: number
          escort_type_required?: string
          id?: string
          notes?: string | null
          num_escorts?: number
          permit_id?: string | null
          permit_number?: string | null
          pickup_address: string
          pickup_city: string
          pickup_lat: number
          pickup_lng: number
          platform_invoice_id?: string | null
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
          client_reference?: string | null
          created_at?: string
          dropoff_address?: string
          dropoff_city?: string
          dropoff_lat?: number
          dropoff_lng?: number
          escort_type_required?: string
          id?: string
          notes?: string | null
          num_escorts?: number
          permit_id?: string | null
          permit_number?: string | null
          pickup_address?: string
          pickup_city?: string
          pickup_lat?: number
          pickup_lng?: number
          platform_invoice_id?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["ride_status"]
          time_window_end?: string | null
          time_window_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rides_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "permits"
            referencedColumns: ["id"]
          },
        ]
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
      weekly_fuel_prices: {
        Row: {
          eur_per_liter: number
          fetched_at: string
          id: string
          source: string
          week_start: string
        }
        Insert: {
          eur_per_liter: number
          fetched_at?: string
          id?: string
          source?: string
          week_start: string
        }
        Update: {
          eur_per_liter?: number
          fetched_at?: string
          id?: string
          source?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_platform_invoices: { Args: never; Returns: number }
      generate_weekly_invoices: { Args: never; Returns: number }
      get_counterparty_name: {
        Args: { _assignment_id: string }
        Returns: {
          name: string
          role: string
        }[]
      }
      get_escort_busy_windows: {
        Args: { _escort_id: string; _from: string; _to: string }
        Returns: {
          window_end: string
          window_start: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_assigned_escort: {
        Args: { _ride_id: string; _user_id: string }
        Returns: boolean
      }
      is_ride_client: {
        Args: { _ride_id: string; _user_id: string }
        Returns: boolean
      }
      notify_ride_confirmed: {
        Args: { _assignment_id: string }
        Returns: undefined
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
      invoice_status: "draft" | "sent" | "paid" | "cancelled"
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
      invoice_status: ["draft", "sent", "paid", "cancelled"],
      ride_status: ["open", "matched", "in_progress", "completed", "cancelled"],
    },
  },
} as const
