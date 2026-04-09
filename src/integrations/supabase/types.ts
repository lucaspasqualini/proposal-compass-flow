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
      bonus_history: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_date: string | null
          reference_year: number
          team_member_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          reference_year: number
          team_member_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          reference_year?: number
          team_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonus_history_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          capital_social: number | null
          cnae_descricao: string | null
          cnae_principal: string | null
          cnpj: string | null
          contact_name: string | null
          created_at: string
          data_abertura: string | null
          email: string | null
          id: string
          name: string
          natureza_juridica: string | null
          nome_fantasia: string | null
          notes: string | null
          phone: string | null
          porte: string | null
          qsa: Json | null
          razao_social: string | null
          situacao_cadastral: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          capital_social?: number | null
          cnae_descricao?: string | null
          cnae_principal?: string | null
          cnpj?: string | null
          contact_name?: string | null
          created_at?: string
          data_abertura?: string | null
          email?: string | null
          id?: string
          name: string
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          notes?: string | null
          phone?: string | null
          porte?: string | null
          qsa?: Json | null
          razao_social?: string | null
          situacao_cadastral?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          capital_social?: number | null
          cnae_descricao?: string | null
          cnae_principal?: string | null
          cnpj?: string | null
          contact_name?: string | null
          created_at?: string
          data_abertura?: string | null
          email?: string | null
          id?: string
          name?: string
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          notes?: string | null
          phone?: string | null
          porte?: string | null
          qsa?: Json | null
          razao_social?: string | null
          situacao_cadastral?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_allocations: {
        Row: {
          allocated_hours: number | null
          created_at: string
          end_date: string | null
          id: string
          project_id: string
          role_in_project: string | null
          start_date: string | null
          team_member_id: string
          updated_at: string
        }
        Insert: {
          allocated_hours?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          project_id: string
          role_in_project?: string | null
          start_date?: string | null
          team_member_id: string
          updated_at?: string
        }
        Update: {
          allocated_hours?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          project_id?: string
          role_in_project?: string | null
          start_date?: string | null
          team_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_allocations_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          client_id: string | null
          created_at: string
          description: string | null
          end_date: string | null
          etapa: string | null
          etapa_assinado_at: string | null
          id: string
          proposal_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          etapa?: string | null
          etapa_assinado_at?: string | null
          id?: string
          proposal_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          etapa?: string | null
          etapa_assinado_at?: string | null
          id?: string
          proposal_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_history: {
        Row: {
          created_at: string
          effective_date: string
          id: string
          new_role: string
          new_salary: number | null
          notes: string | null
          previous_role: string | null
          previous_salary: number | null
          team_member_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_date?: string
          id?: string
          new_role: string
          new_salary?: number | null
          notes?: string | null
          previous_role?: string | null
          previous_salary?: number | null
          team_member_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_date?: string
          id?: string
          new_role?: string
          new_salary?: number | null
          notes?: string | null
          previous_role?: string | null
          previous_salary?: number | null
          team_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_history_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          about_company: string | null
          client_id: string | null
          cliente_contato: string | null
          created_at: string
          created_by: string | null
          data_aprovacao: string | null
          data_envio: string | null
          data_fup: string | null
          description: string | null
          empresa: string | null
          id: string
          indicador: string | null
          observacoes: string | null
          parcelas: Json | null
          payment_terms: string | null
          payment_type: string | null
          proposal_number: string | null
          scope: string | null
          status: Database["public"]["Enums"]["proposal_status"]
          tipo_projeto: string | null
          title: string
          updated_at: string
          validity_date: string | null
          value: number | null
        }
        Insert: {
          about_company?: string | null
          client_id?: string | null
          cliente_contato?: string | null
          created_at?: string
          created_by?: string | null
          data_aprovacao?: string | null
          data_envio?: string | null
          data_fup?: string | null
          description?: string | null
          empresa?: string | null
          id?: string
          indicador?: string | null
          observacoes?: string | null
          parcelas?: Json | null
          payment_terms?: string | null
          payment_type?: string | null
          proposal_number?: string | null
          scope?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          tipo_projeto?: string | null
          title: string
          updated_at?: string
          validity_date?: string | null
          value?: number | null
        }
        Update: {
          about_company?: string | null
          client_id?: string | null
          cliente_contato?: string | null
          created_at?: string
          created_by?: string | null
          data_aprovacao?: string | null
          data_envio?: string | null
          data_fup?: string | null
          description?: string | null
          empresa?: string | null
          id?: string
          indicador?: string | null
          observacoes?: string | null
          parcelas?: Json | null
          payment_terms?: string | null
          payment_type?: string | null
          proposal_number?: string | null
          scope?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          tipo_projeto?: string | null
          title?: string
          updated_at?: string
          validity_date?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      receivables: {
        Row: {
          amount: number | null
          client_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          paid_at: string | null
          parcela_index: number
          proposal_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          parcela_index?: number
          proposal_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          parcela_index?: number
          proposal_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivables_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          area: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          role: string | null
          salary: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          area?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          role?: string | null
          salary?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          area?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          role?: string | null
          salary?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      project_status:
        | "em_andamento"
        | "em_pausa"
        | "aguardando_retorno"
        | "finalizado"
        | "cancelado"
      proposal_status: "em_elaboracao" | "em_negociacao" | "ganha" | "perdida"
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
      project_status: [
        "em_andamento",
        "em_pausa",
        "aguardando_retorno",
        "finalizado",
        "cancelado",
      ],
      proposal_status: ["em_elaboracao", "em_negociacao", "ganha", "perdida"],
    },
  },
} as const
