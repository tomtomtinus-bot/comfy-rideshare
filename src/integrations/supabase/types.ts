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
      client_excluded_escorts: {
        Row: {
          client_id: string
          created_at: string
          escort_id: string
          id: string
          reason: string
          reason_category: string
        }
        Insert: {
          client_id: string
          created_at?: string
          escort_id: string
          id?: string
          reason: string
          reason_category: string
        }
        Update: {
          client_id?: string
          created_at?: string
          escort_id?: string
          id?: string
          reason?: string
          reason_category?: string
        }
        Relationships: []
      }
      client_favorite_escorts: {
        Row: {
          client_id: string
          created_at: string
          escort_id: string
          id: string
          note: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          escort_id: string
          id?: string
          note?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          escort_id?: string
          id?: string
          note?: string | null
        }
        Relationships: []
      }
      device_push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
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
      escort_preferred_clients: {
        Row: {
          client_id: string
          created_at: string
          escort_id: string
          id: string
          note: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          escort_id: string
          id?: string
          note?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          escort_id?: string
          id?: string
          note?: string | null
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
          cert_verified_countries: string[]
          certificate_files: string[]
          client_filter_mode: string
          company_name: string | null
          countries: string[]
          created_at: string
          escort_types: string[]
          fuel_surcharge: Json
          hourly_rate: number
          hourly_rate_be: number
          hourly_rate_de: number
          hourly_rate_fr: number
          hourly_rate_lu: number
          iban: string | null
          id: string
          insurance_policy: string | null
          km_rate_de: number | null
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
          wero_enabled: boolean
          wero_fee: number
          wero_handle: string | null
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
          cert_verified_countries?: string[]
          certificate_files?: string[]
          client_filter_mode?: string
          company_name?: string | null
          countries?: string[]
          created_at?: string
          escort_types?: string[]
          fuel_surcharge?: Json
          hourly_rate?: number
          hourly_rate_be?: number
          hourly_rate_de?: number
          hourly_rate_fr?: number
          hourly_rate_lu?: number
          iban?: string | null
          id: string
          insurance_policy?: string | null
          km_rate_de?: number | null
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
          wero_enabled?: boolean
          wero_fee?: number
          wero_handle?: string | null
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
          cert_verified_countries?: string[]
          certificate_files?: string[]
          client_filter_mode?: string
          company_name?: string | null
          countries?: string[]
          created_at?: string
          escort_types?: string[]
          fuel_surcharge?: Json
          hourly_rate?: number
          hourly_rate_be?: number
          hourly_rate_de?: number
          hourly_rate_fr?: number
          hourly_rate_lu?: number
          iban?: string | null
          id?: string
          insurance_policy?: string | null
          km_rate_de?: number | null
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
          wero_enabled?: boolean
          wero_fee?: number
          wero_handle?: string | null
        }
        Relationships: []
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          calendar_id: string
          connected_at: string
          escort_id: string
          expires_at: string
          last_sync_at: string | null
          refresh_token: string
          scope: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          calendar_id?: string
          connected_at?: string
          escort_id: string
          expires_at: string
          last_sync_at?: string | null
          refresh_token: string
          scope?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          calendar_id?: string
          connected_at?: string
          escort_id?: string
          expires_at?: string
          last_sync_at?: string | null
          refresh_token?: string
          scope?: string | null
          updated_at?: string
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
          pdf_path: string | null
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
          pdf_path?: string | null
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
          pdf_path?: string | null
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          total_amount?: number
          total_hours?: number
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          assignment_id: string
          body: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          assignment_id: string
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          assignment_id?: string
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "ride_assignments"
            referencedColumns: ["id"]
          },
        ]
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
          permit_number: string | null
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
          permit_number?: string | null
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
          permit_number?: string | null
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
          pdf_path: string | null
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
          pdf_path?: string | null
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
          pdf_path?: string | null
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
          approval_status: Database["public"]["Enums"]["approval_status"]
          approved_at: string | null
          approved_by: string | null
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
          privacy_accepted_at: string | null
          rejection_reason: string | null
          terms_accepted_at: string | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          anonymous_id?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
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
          privacy_accepted_at?: string | null
          rejection_reason?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          anonymous_id?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
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
          privacy_accepted_at?: string | null
          rejection_reason?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      ride_assignments: {
        Row: {
          actual_cost: number | null
          actual_hours: number | null
          broadcast_closes_at: string | null
          bundle_priority_offer: boolean
          cancel_decided_at: string | null
          cancel_request_reason: string | null
          cancel_request_status: string
          cancel_requested_at: string | null
          cancellation_fee: number
          created_at: string
          departed_base_at: string | null
          escort_id: string
          estimated_cost: number | null
          estimated_hours: number | null
          extra_costs: Json
          extra_costs_total: number
          google_event_id: string | null
          hours_notes: string | null
          hours_submitted_at: string | null
          id: string
          interest_expressed_at: string | null
          interest_score: number | null
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
          broadcast_closes_at?: string | null
          bundle_priority_offer?: boolean
          cancel_decided_at?: string | null
          cancel_request_reason?: string | null
          cancel_request_status?: string
          cancel_requested_at?: string | null
          cancellation_fee?: number
          created_at?: string
          departed_base_at?: string | null
          escort_id: string
          estimated_cost?: number | null
          estimated_hours?: number | null
          extra_costs?: Json
          extra_costs_total?: number
          google_event_id?: string | null
          hours_notes?: string | null
          hours_submitted_at?: string | null
          id?: string
          interest_expressed_at?: string | null
          interest_score?: number | null
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
          broadcast_closes_at?: string | null
          bundle_priority_offer?: boolean
          cancel_decided_at?: string | null
          cancel_request_reason?: string | null
          cancel_request_status?: string
          cancel_requested_at?: string | null
          cancellation_fee?: number
          created_at?: string
          departed_base_at?: string | null
          escort_id?: string
          estimated_cost?: number | null
          estimated_hours?: number | null
          extra_costs?: Json
          extra_costs_total?: number
          google_event_id?: string | null
          hours_notes?: string | null
          hours_submitted_at?: string | null
          id?: string
          interest_expressed_at?: string | null
          interest_score?: number | null
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
      ride_swap_requests: {
        Row: {
          client_id: string
          created_at: string
          decided_at: string | null
          expires_at: string
          id: string
          reason: string | null
          source_assignment_id: string
          source_escort_decision: string
          source_escort_id: string
          source_ride_id: string
          status: string
          target_assignment_id: string | null
          target_escort_decision: string
          target_escort_id: string | null
          target_ride_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          decided_at?: string | null
          expires_at?: string
          id?: string
          reason?: string | null
          source_assignment_id: string
          source_escort_decision?: string
          source_escort_id: string
          source_ride_id: string
          status?: string
          target_assignment_id?: string | null
          target_escort_decision?: string
          target_escort_id?: string | null
          target_ride_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          decided_at?: string | null
          expires_at?: string
          id?: string
          reason?: string | null
          source_assignment_id?: string
          source_escort_decision?: string
          source_escort_id?: string
          source_ride_id?: string
          status?: string
          target_assignment_id?: string | null
          target_escort_decision?: string
          target_escort_id?: string | null
          target_ride_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      rides: {
        Row: {
          app_fee: number
          be_escort_type: string | null
          bundle_id: string | null
          bundle_label: string | null
          bundle_open_for_extension: boolean
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cargo_height_m: number | null
          cargo_length_m: number | null
          cargo_weight_t: number | null
          cargo_width_m: number | null
          client_id: string
          client_reference: string | null
          created_at: string
          drivers: Json
          dropoff_address: string
          dropoff_city: string
          dropoff_lat: number
          dropoff_lng: number
          escort_type_required: string
          excluded_escort_ids: string[]
          id: string
          license_plates: string[]
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
          be_escort_type?: string | null
          bundle_id?: string | null
          bundle_label?: string | null
          bundle_open_for_extension?: boolean
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cargo_height_m?: number | null
          cargo_length_m?: number | null
          cargo_weight_t?: number | null
          cargo_width_m?: number | null
          client_id: string
          client_reference?: string | null
          created_at?: string
          drivers?: Json
          dropoff_address: string
          dropoff_city: string
          dropoff_lat: number
          dropoff_lng: number
          escort_type_required?: string
          excluded_escort_ids?: string[]
          id?: string
          license_plates?: string[]
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
          be_escort_type?: string | null
          bundle_id?: string | null
          bundle_label?: string | null
          bundle_open_for_extension?: boolean
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cargo_height_m?: number | null
          cargo_length_m?: number | null
          cargo_weight_t?: number | null
          cargo_width_m?: number | null
          client_id?: string
          client_reference?: string | null
          created_at?: string
          drivers?: Json
          dropoff_address?: string
          dropoff_city?: string
          dropoff_lat?: number
          dropoff_lng?: number
          escort_type_required?: string
          excluded_escort_ids?: string[]
          id?: string
          license_plates?: string[]
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
      weekly_fuel_prices: {
        Row: {
          country: string
          eur_per_liter: number
          fetched_at: string
          id: string
          source: string
          week_start: string
        }
        Insert: {
          country?: string
          eur_per_liter: number
          fetched_at?: string
          id?: string
          source?: string
          week_start: string
        }
        Update: {
          country?: string
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
      escort_profiles_public: {
        Row: {
          anonymous_id: string | null
          available: boolean | null
          base_city: string | null
          base_lat: number | null
          base_lng: number | null
          billing_country: string | null
          categories: string[] | null
          cert_expires_on: string | null
          cert_verified_countries: string[] | null
          client_filter_mode: string | null
          company_name: string | null
          countries: string[] | null
          created_at: string | null
          escort_types: string[] | null
          fuel_surcharge: Json | null
          hourly_rate: number | null
          hourly_rate_be: number | null
          hourly_rate_de: number | null
          hourly_rate_fr: number | null
          hourly_rate_lu: number | null
          id: string | null
          km_rate_de: number | null
          languages: string[] | null
          min_billable_hours: number | null
          rating: number | null
          rides_completed: number | null
          surcharges: Json | null
          updated_at: string | null
          vehicle_has_height_pole: boolean | null
          vehicle_has_konvooi_sign: boolean | null
          vehicle_has_lightbar: boolean | null
          vehicle_type: string | null
          wero_enabled: boolean | null
          wero_fee: number | null
          wero_handle: string | null
        }
        Insert: {
          anonymous_id?: string | null
          available?: boolean | null
          base_city?: string | null
          base_lat?: number | null
          base_lng?: number | null
          billing_country?: string | null
          categories?: string[] | null
          cert_expires_on?: string | null
          cert_verified_countries?: string[] | null
          client_filter_mode?: string | null
          company_name?: string | null
          countries?: string[] | null
          created_at?: string | null
          escort_types?: string[] | null
          fuel_surcharge?: Json | null
          hourly_rate?: number | null
          hourly_rate_be?: number | null
          hourly_rate_de?: number | null
          hourly_rate_fr?: number | null
          hourly_rate_lu?: number | null
          id?: string | null
          km_rate_de?: number | null
          languages?: string[] | null
          min_billable_hours?: number | null
          rating?: number | null
          rides_completed?: number | null
          surcharges?: Json | null
          updated_at?: string | null
          vehicle_has_height_pole?: boolean | null
          vehicle_has_konvooi_sign?: boolean | null
          vehicle_has_lightbar?: boolean | null
          vehicle_type?: string | null
          wero_enabled?: boolean | null
          wero_fee?: number | null
          wero_handle?: string | null
        }
        Update: {
          anonymous_id?: string | null
          available?: boolean | null
          base_city?: string | null
          base_lat?: number | null
          base_lng?: number | null
          billing_country?: string | null
          categories?: string[] | null
          cert_expires_on?: string | null
          cert_verified_countries?: string[] | null
          client_filter_mode?: string | null
          company_name?: string | null
          countries?: string[] | null
          created_at?: string | null
          escort_types?: string[] | null
          fuel_surcharge?: Json | null
          hourly_rate?: number | null
          hourly_rate_be?: number | null
          hourly_rate_de?: number | null
          hourly_rate_fr?: number | null
          hourly_rate_lu?: number | null
          id?: string | null
          km_rate_de?: number | null
          languages?: string[] | null
          min_billable_hours?: number | null
          rating?: number | null
          rides_completed?: number | null
          surcharges?: Json | null
          updated_at?: string | null
          vehicle_has_height_pole?: boolean | null
          vehicle_has_konvooi_sign?: boolean | null
          vehicle_has_lightbar?: boolean | null
          vehicle_type?: string | null
          wero_enabled?: boolean | null
          wero_fee?: number | null
          wero_handle?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_bundle_priority_offer: {
        Args: { _assignment_id: string }
        Returns: undefined
      }
      admin_approve_user: { Args: { _user_id: string }; Returns: undefined }
      admin_list_users: {
        Args: never
        Returns: {
          anonymous_id: string
          approval_status: string
          approved_at: string
          company_name: string
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          rejection_reason: string
          roles: string[]
        }[]
      }
      admin_promote_user: { Args: { _email: string }; Returns: string }
      admin_reject_user: {
        Args: { _reason?: string; _user_id: string }
        Returns: undefined
      }
      admin_revoke_admin: { Args: { _user_id: string }; Returns: undefined }
      admin_set_cert_verified_countries: {
        Args: { _countries: string[]; _escort_id: string }
        Returns: undefined
      }
      admin_set_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      bundle_rides: {
        Args: { _label: string; _ride_ids: string[] }
        Returns: string
      }
      client_cancel_ride: {
        Args: { _reason?: string; _ride_id: string }
        Returns: Json
      }
      client_cancel_swap: { Args: { _swap_id: string }; Returns: undefined }
      client_decide_cancellation:
        | {
            Args: { _approve: boolean; _assignment_id: string }
            Returns: undefined
          }
        | {
            Args: {
              _approve: boolean
              _assignment_id: string
              _search_replacement?: boolean
            }
            Returns: Json
          }
      client_eligible_escorts: {
        Args: never
        Returns: {
          accepted_count: number
          anonymous_id: string
          base_city: string
          company_name: string
          full_name: string
          id: string
          interactions: number
          last_interaction_at: string
          vehicle_type: string
        }[]
      }
      client_request_swap: {
        Args: {
          _reason?: string
          _source_assignment_id: string
          _target_ride_id: string
        }
        Returns: string
      }
      compute_fuel_surcharge: {
        Args: {
          p_base_amount: number
          p_escort_id: string
          p_hours: number
          p_ride_date: string
        }
        Returns: number
      }
      create_priority_assignments_for_bundle_ride: {
        Args: { _ride_id: string }
        Returns: number
      }
      decline_bundle_priority_offer: {
        Args: { _assignment_id: string; _reason?: string }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      escort_decide_swap: {
        Args: { _approve: boolean; _swap_id: string }
        Returns: Json
      }
      escort_eligible_clients: {
        Args: never
        Returns: {
          accepted_count: number
          anonymous_id: string
          billing_city: string
          company_name: string
          id: string
          interactions: number
          last_interaction_at: string
        }[]
      }
      escort_preferred_client_details: {
        Args: never
        Returns: {
          anonymous_id: string
          billing_city: string
          client_id: string
          company_name: string
          created_at: string
          id: string
          note: string
        }[]
      }
      escort_request_cancellation: {
        Args: { _assignment_id: string; _reason: string }
        Returns: undefined
      }
      express_ride_interest: { Args: { _assignment_id: string }; Returns: Json }
      fuel_country_code: { Args: { p_country: string }; Returns: string }
      generate_platform_invoices: { Args: never; Returns: number }
      generate_weekly_invoices: { Args: never; Returns: number }
      get_bundle_rides_for_escort: {
        Args: { _bundle_id: string }
        Returns: {
          assignment_id: string
          assignment_status: string
          broadcast_closes_at: string
          dropoff_city: string
          interest_expressed_at: string
          pickup_city: string
          ride_id: string
          scheduled_at: string
        }[]
      }
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
      get_ride_details_for_client: { Args: { _ride_id: string }; Returns: Json }
      get_ride_details_for_escort: { Args: { _ride_id: string }; Returns: Json }
      get_swap_options_for_assignment: {
        Args: { _source_assignment_id: string }
        Returns: {
          dropoff_city: string
          has_accepted_escort: boolean
          pickup_city: string
          ride_id: string
          scheduled_at: string
          status: string
          target_escort_anon: string
        }[]
      }
      get_swap_requests_for_ride: {
        Args: { _ride_id: string }
        Returns: {
          created_at: string
          expires_at: string
          id: string
          is_source_side: boolean
          reason: string
          source_assignment_id: string
          source_decision: string
          source_escort_anon: string
          source_ride_id: string
          source_route: string
          source_scheduled_at: string
          status: string
          target_decision: string
          target_escort_anon: string
          target_ride_id: string
          target_route: string
          target_scheduled_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invite_replacement_escorts: {
        Args: { _limit?: number; _ride_id: string }
        Returns: number
      }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
      is_assigned_escort: {
        Args: { _ride_id: string; _user_id: string }
        Returns: boolean
      }
      is_assignment_participant: {
        Args: { _assignment_id: string; _user_id: string }
        Returns: boolean
      }
      is_ride_client: {
        Args: { _ride_id: string; _user_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      notify_ride_confirmed: {
        Args: { _assignment_id: string }
        Returns: undefined
      }
      notify_ride_updated: {
        Args: { _ride_id: string; _summary: string }
        Returns: undefined
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      unbundle_ride: { Args: { _ride_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "opdrachtgever" | "begeleider" | "admin"
      approval_status: "pending" | "approved" | "rejected"
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
      approval_status: ["pending", "approved", "rejected"],
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
