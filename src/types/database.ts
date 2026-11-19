export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      dining_tables: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          label: string;
          pos_x: number;
          pos_y: number;
          qr_token: string;
          restaurant_id: string;
          rotation: number;
          seats: number;
          shape: Database["public"]["Enums"]["table_shape"];
          updated_at: string;
          zone_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          label: string;
          pos_x?: number;
          pos_y?: number;
          qr_token?: string;
          restaurant_id: string;
          rotation?: number;
          seats?: number;
          shape?: Database["public"]["Enums"]["table_shape"];
          updated_at?: string;
          zone_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          label?: string;
          pos_x?: number;
          pos_y?: number;
          qr_token?: string;
          restaurant_id?: string;
          rotation?: number;
          seats?: number;
          shape?: Database["public"]["Enums"]["table_shape"];
          updated_at?: string;
          zone_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "dining_tables_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dining_tables_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "zones";
            referencedColumns: ["id"];
          },
        ];
      };
      feedback: {
        Row: {
          comment: string | null;
          created_at: string;
          id: string;
          rating: number;
          restaurant_id: string;
          session_id: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          comment?: string | null;
          created_at?: string;
          id?: string;
          rating: number;
          restaurant_id: string;
          session_id: string;
          user_id?: string | null;
        };
        Update: {
          comment?: string | null;
          created_at?: string;
          id?: string;
          rating?: number;
          restaurant_id?: string;
          session_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "feedback_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feedback_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "table_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_categories: {
        Row: {
          created_at: string;
          icon: string | null;
          id: string;
          is_active: boolean;
          name: string;
          name_bn: string | null;
          restaurant_id: string;
          sort: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          name_bn?: string | null;
          restaurant_id: string;
          sort?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          name_bn?: string | null;
          restaurant_id?: string;
          sort?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_categories_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_items: {
        Row: {
          category_id: string;
          created_at: string;
          description: string | null;
          description_bn: string | null;
          id: string;
          image_path: string | null;
          is_active: boolean;
          is_available: boolean;
          name: string;
          name_bn: string | null;
          prep_minutes: number;
          price_minor: number;
          restaurant_id: string;
          sort: number;
          spice_level: number;
          tags: string[];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          category_id: string;
          created_at?: string;
          description?: string | null;
          description_bn?: string | null;
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          is_available?: boolean;
          name: string;
          name_bn?: string | null;
          prep_minutes?: number;
          price_minor: number;
          restaurant_id: string;
          sort?: number;
          spice_level?: number;
          tags?: string[];
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          description?: string | null;
          description_bn?: string | null;
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          is_available?: boolean;
          name?: string;
          name_bn?: string | null;
          prep_minutes?: number;
          price_minor?: number;
          restaurant_id?: string;
          sort?: number;
          spice_level?: number;
          tags?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "menu_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      modifier_groups: {
        Row: {
          id: string;
          item_id: string;
          max_select: number;
          min_select: number;
          name: string;
          name_bn: string | null;
          restaurant_id: string;
          sort: number;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          item_id: string;
          max_select?: number;
          min_select?: number;
          name: string;
          name_bn?: string | null;
          restaurant_id: string;
          sort?: number;
        };
        Update: {
          id?: string;
          item_id?: string;
          max_select?: number;
          min_select?: number;
          name?: string;
          name_bn?: string | null;
          restaurant_id?: string;
          sort?: number;
        };
        Relationships: [
          {
            foreignKeyName: "modifier_groups_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "modifier_groups_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      modifier_options: {
        Row: {
          group_id: string;
          id: string;
          is_available: boolean;
          is_default: boolean;
          name: string;
          name_bn: string | null;
          price_delta_minor: number;
          restaurant_id: string;
          sort: number;
        };
        ComputedFields: never;
        Insert: {
          group_id: string;
          id?: string;
          is_available?: boolean;
          is_default?: boolean;
          name: string;
          name_bn?: string | null;
          price_delta_minor?: number;
          restaurant_id: string;
          sort?: number;
        };
        Update: {
          group_id?: string;
          id?: string;
          is_available?: boolean;
          is_default?: boolean;
          name?: string;
          name_bn?: string | null;
          price_delta_minor?: number;
          restaurant_id?: string;
          sort?: number;
        };
        Relationships: [
          {
            foreignKeyName: "modifier_options_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "modifier_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "modifier_options_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      order_events: {
        Row: {
          actor: string | null;
          created_at: string;
          from_status: Database["public"]["Enums"]["order_status"] | null;
          id: number;
          note: string | null;
          order_id: string;
          restaurant_id: string;
          to_status: Database["public"]["Enums"]["order_status"];
        };
        ComputedFields: never;
        Insert: {
          actor?: string | null;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["order_status"] | null;
          id?: never;
          note?: string | null;
          order_id: string;
          restaurant_id: string;
          to_status: Database["public"]["Enums"]["order_status"];
        };
        Update: {
          actor?: string | null;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["order_status"] | null;
          id?: never;
          note?: string | null;
          order_id?: string;
          restaurant_id?: string;
          to_status?: Database["public"]["Enums"]["order_status"];
        };
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_events_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          created_at: string;
          id: string;
          is_done: boolean;
          is_voided: boolean;
          line_total_minor: number;
          menu_item_id: string | null;
          modifiers: NonNullable<Json>;
          name_snapshot: string;
          note: string | null;
          order_id: string;
          quantity: number;
          restaurant_id: string;
          unit_price_minor: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          is_done?: boolean;
          is_voided?: boolean;
          line_total_minor: number;
          menu_item_id?: string | null;
          modifiers?: NonNullable<Json>;
          name_snapshot: string;
          note?: string | null;
          order_id: string;
          quantity: number;
          restaurant_id: string;
          unit_price_minor: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_done?: boolean;
          is_voided?: boolean;
          line_total_minor?: number;
          menu_item_id?: string | null;
          modifiers?: NonNullable<Json>;
          name_snapshot?: string;
          note?: string | null;
          order_id?: string;
          quantity?: number;
          restaurant_id?: string;
          unit_price_minor?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey";
            columns: ["menu_item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          cancel_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          client_request_id: string;
          confirmed_at: string | null;
          confirmed_by: string | null;
          customer_note: string | null;
          id: string;
          order_no: number;
          placed_at: string;
          placed_by: string | null;
          preparing_at: string | null;
          ready_at: string | null;
          restaurant_id: string;
          sent_at: string | null;
          served_at: string | null;
          session_id: string;
          status: Database["public"]["Enums"]["order_status"];
          subtotal_minor: number;
          table_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          client_request_id: string;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          customer_note?: string | null;
          id?: string;
          order_no?: never;
          placed_at?: string;
          placed_by?: string | null;
          preparing_at?: string | null;
          ready_at?: string | null;
          restaurant_id: string;
          sent_at?: string | null;
          served_at?: string | null;
          session_id: string;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal_minor?: number;
          table_id: string;
          updated_at?: string;
        };
        Update: {
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          client_request_id?: string;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          customer_note?: string | null;
          id?: string;
          order_no?: never;
          placed_at?: string;
          placed_by?: string | null;
          preparing_at?: string | null;
          ready_at?: string | null;
          restaurant_id?: string;
          sent_at?: string | null;
          served_at?: string | null;
          session_id?: string;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal_minor?: number;
          table_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "table_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "dining_tables";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount_minor: number;
          channel: string | null;
          created_at: string;
          gateway_payload: Json | null;
          gateway_val_id: string | null;
          id: string;
          method: Database["public"]["Enums"]["payment_method"];
          paid_at: string | null;
          received_by: string | null;
          restaurant_id: string;
          session_id: string;
          status: Database["public"]["Enums"]["payment_status"];
          tran_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          amount_minor: number;
          channel?: string | null;
          created_at?: string;
          gateway_payload?: Json | null;
          gateway_val_id?: string | null;
          id?: string;
          method: Database["public"]["Enums"]["payment_method"];
          paid_at?: string | null;
          received_by?: string | null;
          restaurant_id: string;
          session_id: string;
          status?: Database["public"]["Enums"]["payment_status"];
          tran_id?: string | null;
          updated_at?: string;
        };
        Update: {
          amount_minor?: number;
          channel?: string | null;
          created_at?: string;
          gateway_payload?: Json | null;
          gateway_val_id?: string | null;
          id?: string;
          method?: Database["public"]["Enums"]["payment_method"];
          paid_at?: string | null;
          received_by?: string | null;
          restaurant_id?: string;
          session_id?: string;
          status?: Database["public"]["Enums"]["payment_status"];
          tran_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "table_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurants: {
        Row: {
          created_at: string;
          currency: string;
          id: string;
          logo_path: string | null;
          name: string;
          service_charge_bps: number;
          settings: NonNullable<Json>;
          slug: string;
          tagline: string | null;
          timezone: string;
          updated_at: string;
          vat_bps: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          currency?: string;
          id?: string;
          logo_path?: string | null;
          name: string;
          service_charge_bps?: number;
          settings?: NonNullable<Json>;
          slug: string;
          tagline?: string | null;
          timezone?: string;
          updated_at?: string;
          vat_bps?: number;
        };
        Update: {
          created_at?: string;
          currency?: string;
          id?: string;
          logo_path?: string | null;
          name?: string;
          service_charge_bps?: number;
          settings?: NonNullable<Json>;
          slug?: string;
          tagline?: string | null;
          timezone?: string;
          updated_at?: string;
          vat_bps?: number;
        };
        Relationships: [];
      };
      service_requests: {
        Row: {
          acknowledged_at: string | null;
          acknowledged_by: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          note: string | null;
          resolved_at: string | null;
          restaurant_id: string;
          session_id: string;
          status: Database["public"]["Enums"]["request_status"];
          table_id: string;
          type: Database["public"]["Enums"]["request_type"];
        };
        ComputedFields: never;
        Insert: {
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          note?: string | null;
          resolved_at?: string | null;
          restaurant_id: string;
          session_id: string;
          status?: Database["public"]["Enums"]["request_status"];
          table_id: string;
          type: Database["public"]["Enums"]["request_type"];
        };
        Update: {
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          note?: string | null;
          resolved_at?: string | null;
          restaurant_id?: string;
          session_id?: string;
          status?: Database["public"]["Enums"]["request_status"];
          table_id?: string;
          type?: Database["public"]["Enums"]["request_type"];
        };
        Relationships: [
          {
            foreignKeyName: "service_requests_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_requests_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "table_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_requests_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "dining_tables";
            referencedColumns: ["id"];
          },
        ];
      };
      session_guests: {
        Row: {
          joined_at: string;
          session_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          joined_at?: string;
          session_id: string;
          user_id: string;
        };
        Update: {
          joined_at?: string;
          session_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_guests_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "table_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_members: {
        Row: {
          avatar_color: string;
          created_at: string;
          display_name: string;
          is_active: boolean;
          restaurant_id: string;
          role: Database["public"]["Enums"]["staff_role"];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_color?: string;
          created_at?: string;
          display_name: string;
          is_active?: boolean;
          restaurant_id: string;
          role: Database["public"]["Enums"]["staff_role"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avatar_color?: string;
          created_at?: string;
          display_name?: string;
          is_active?: boolean;
          restaurant_id?: string;
          role?: Database["public"]["Enums"]["staff_role"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_members_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      table_sessions: {
        Row: {
          closed_at: string | null;
          closed_by: string | null;
          guest_count: number;
          id: string;
          opened_at: string;
          restaurant_id: string;
          status: Database["public"]["Enums"]["session_status"];
          table_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          closed_at?: string | null;
          closed_by?: string | null;
          guest_count?: number;
          id?: string;
          opened_at?: string;
          restaurant_id: string;
          status?: Database["public"]["Enums"]["session_status"];
          table_id: string;
          updated_at?: string;
        };
        Update: {
          closed_at?: string | null;
          closed_by?: string | null;
          guest_count?: number;
          id?: string;
          opened_at?: string;
          restaurant_id?: string;
          status?: Database["public"]["Enums"]["session_status"];
          table_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "table_sessions_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "table_sessions_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "dining_tables";
            referencedColumns: ["id"];
          },
        ];
      };
      zones: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          restaurant_id: string;
          sort: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          restaurant_id: string;
          sort?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          restaurant_id?: string;
          sort?: number;
        };
        Relationships: [
          {
            foreignKeyName: "zones_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      advance_order: {
        Args: {
          p_order_id: string;
          p_reason?: string;
          p_to: Database["public"]["Enums"]["order_status"];
        };
        Returns: {
          cancel_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          client_request_id: string;
          confirmed_at: string | null;
          confirmed_by: string | null;
          customer_note: string | null;
          id: string;
          order_no: number;
          placed_at: string;
          placed_by: string | null;
          preparing_at: string | null;
          ready_at: string | null;
          restaurant_id: string;
          sent_at: string | null;
          served_at: string | null;
          session_id: string;
          status: Database["public"]["Enums"]["order_status"];
          subtotal_minor: number;
          table_id: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "orders";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      cancel_my_order: { Args: { p_order_id: string }; Returns: undefined };
      close_session: { Args: { p_force?: boolean; p_session_id: string }; Returns: undefined };
      create_service_request: {
        Args: {
          p_note?: string;
          p_session_id: string;
          p_type: Database["public"]["Enums"]["request_type"];
        };
        Returns: string;
      };
      floor_snapshot: { Args: Record<PropertyKey, never>; Returns: Json };
      guest_table_info: { Args: { p_qr_token: string }; Returns: Json };
      is_session_guest: { Args: { p_session: string }; Returns: boolean };
      is_staff: {
        Args: { p_restaurant: string; p_roles?: Database["public"]["Enums"]["staff_role"][] };
        Returns: boolean;
      };
      join_table: { Args: { p_qr_token: string }; Returns: Json };
      mark_gateway_payment: {
        Args: {
          p_amount_minor: number;
          p_payload: Json;
          p_status: Database["public"]["Enums"]["payment_status"];
          p_tran_id: string;
          p_val_id: string;
        };
        Returns: {
          amount_minor: number;
          channel: string | null;
          created_at: string;
          gateway_payload: Json | null;
          gateway_val_id: string | null;
          id: string;
          method: Database["public"]["Enums"]["payment_method"];
          paid_at: string | null;
          received_by: string | null;
          restaurant_id: string;
          session_id: string;
          status: Database["public"]["Enums"]["payment_status"];
          tran_id: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "payments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      my_restaurant_id: { Args: Record<PropertyKey, never>; Returns: string };
      place_order: {
        Args: { p_client_request_id: string; p_items: Json; p_note?: string; p_session_id: string };
        Returns: string;
      };
      record_cash_payment: {
        Args: { p_amount_minor: number; p_channel?: string; p_session_id: string };
        Returns: string;
      };
      sales_report: { Args: { p_from: string; p_to: string }; Returns: Json };
      session_bill: { Args: { p_session_id: string }; Returns: Json };
      set_item_availability: {
        Args: { p_available: boolean; p_item_id: string };
        Returns: undefined;
      };
      set_order_item_done: {
        Args: { p_done: boolean; p_order_item_id: string };
        Returns: undefined;
      };
      staff_role_of: {
        Args: { p_restaurant: string };
        Returns: Database["public"]["Enums"]["staff_role"];
      };
      submit_feedback: {
        Args: { p_comment?: string; p_rating: number; p_session_id: string };
        Returns: undefined;
      };
      update_service_request: {
        Args: { p_request_id: string; p_status: Database["public"]["Enums"]["request_status"] };
        Returns: undefined;
      };
      waiter_adjust_items: { Args: { p_changes: Json; p_order_id: string }; Returns: undefined };
    };
    Enums: {
      order_status:
        "placed" | "confirmed" | "in_kitchen" | "preparing" | "ready" | "served" | "cancelled";
      payment_method: "cash" | "sslcommerz";
      payment_status: "initiated" | "pending_review" | "paid" | "failed" | "cancelled" | "refunded";
      request_status: "open" | "acknowledged" | "resolved";
      request_type: "call_waiter" | "request_bill" | "water" | "cutlery" | "other";
      session_status: "open" | "billing" | "closed";
      staff_role: "owner" | "manager" | "waiter" | "kitchen" | "cashier";
      table_shape: "round" | "square" | "rect";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      order_status: [
        "placed",
        "confirmed",
        "in_kitchen",
        "preparing",
        "ready",
        "served",
        "cancelled",
      ],
      payment_method: ["cash", "sslcommerz"],
      payment_status: ["initiated", "pending_review", "paid", "failed", "cancelled", "refunded"],
      request_status: ["open", "acknowledged", "resolved"],
      request_type: ["call_waiter", "request_bill", "water", "cutlery", "other"],
      session_status: ["open", "billing", "closed"],
      staff_role: ["owner", "manager", "waiter", "kitchen", "cashier"],
      table_shape: ["round", "square", "rect"],
    },
  },
} as const;
