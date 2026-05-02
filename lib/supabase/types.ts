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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_data: Json | null
          old_data: Json | null
          organization_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_sheet_snapshots: {
        Row: {
          accounts_payable: number
          accounts_receivable: number
          balance_status: string | null
          cash: number
          created_at: string
          created_by: string | null
          credit_card_payable: number
          current_period_profit: number
          deposits: number
          equipment_assets: number
          id: string
          loans_payable: number
          organization_id: string
          owner_capital: number
          owner_draws: number
          payroll_payable: number
          period_month: string
          prepaid_expenses: number
          retained_earnings: number
          tax_payable: number
          total_assets: number
          total_equity: number
          total_liabilities: number
          unearned_revenue: number
        }
        Insert: {
          accounts_payable?: number
          accounts_receivable?: number
          balance_status?: string | null
          cash?: number
          created_at?: string
          created_by?: string | null
          credit_card_payable?: number
          current_period_profit?: number
          deposits?: number
          equipment_assets?: number
          id?: string
          loans_payable?: number
          organization_id: string
          owner_capital?: number
          owner_draws?: number
          payroll_payable?: number
          period_month: string
          prepaid_expenses?: number
          retained_earnings?: number
          tax_payable?: number
          total_assets?: number
          total_equity?: number
          total_liabilities?: number
          unearned_revenue?: number
        }
        Update: {
          accounts_payable?: number
          accounts_receivable?: number
          balance_status?: string | null
          cash?: number
          created_at?: string
          created_by?: string | null
          credit_card_payable?: number
          current_period_profit?: number
          deposits?: number
          equipment_assets?: number
          id?: string
          loans_payable?: number
          organization_id?: string
          owner_capital?: number
          owner_draws?: number
          payroll_payable?: number
          period_month?: string
          prepaid_expenses?: number
          retained_earnings?: number
          tax_payable?: number
          total_assets?: number
          total_equity?: number
          total_liabilities?: number
          unearned_revenue?: number
        }
        Relationships: [
          {
            foreignKeyName: "balance_sheet_snapshots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_sheet_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_accounts: {
        Row: {
          account_name: string
          account_type: string
          created_at: string
          currency: string
          id: string
          opening_balance: number
          organization_id: string
          status: string
        }
        Insert: {
          account_name: string
          account_type?: string
          created_at?: string
          currency?: string
          id?: string
          opening_balance?: number
          organization_id: string
          status?: string
        }
        Update: {
          account_name?: string
          account_type?: string
          created_at?: string
          currency?: string
          id?: string
          opening_balance?: number
          organization_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_expenses: {
        Row: {
          amount: number
          category: string
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          expense_date: string
          id: string
          organization_id: string
          paid_date: string | null
          status: string
          tax_amount: number
          total_amount: number
          vendor_name: string | null
        }
        Insert: {
          amount?: number
          category: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          expense_date: string
          id?: string
          organization_id: string
          paid_date?: string | null
          status?: string
          tax_amount?: number
          total_amount?: number
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          category?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          expense_date?: string
          id?: string
          organization_id?: string
          paid_date?: string | null
          status?: string
          tax_amount?: number
          total_amount?: number
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_expenses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_transactions: {
        Row: {
          amount: number
          counterparty: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          organization_id: string
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          amount?: number
          counterparty?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          transaction_date: string
          transaction_type: string
        }
        Update: {
          amount?: number
          counterparty?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "capital_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cashflow_transactions: {
        Row: {
          amount: number
          approved_by: string | null
          business_account_id: string | null
          category: string
          client_id: string | null
          created_at: string
          created_by: string | null
          direction: string
          id: string
          invoice_id: string | null
          notes: string | null
          organization_id: string
          payee_name: string | null
          payment_method: string | null
          transaction_date: string
          vendor_name: string | null
        }
        Insert: {
          amount: number
          approved_by?: string | null
          business_account_id?: string | null
          category: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          direction: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          organization_id: string
          payee_name?: string | null
          payment_method?: string | null
          transaction_date: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          business_account_id?: string | null
          category?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          direction?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          organization_id?: string
          payee_name?: string | null
          payment_method?: string | null
          transaction_date?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cashflow_transactions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashflow_transactions_business_account_id_fkey"
            columns: ["business_account_id"]
            isOneToOne: false
            referencedRelation: "business_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashflow_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashflow_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashflow_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashflow_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_members: {
        Row: {
          client_id: string
          created_at: string
          id: string
          member_role: string
          organization_id: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          member_role?: string
          organization_id: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          member_role?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          account_manager_id: string | null
          category: string | null
          contact_email: string | null
          contact_name: string | null
          created_at: string
          id: string
          monthly_retainer: number
          name: string
          organization_id: string
          status: string
        }
        Insert: {
          account_manager_id?: string | null
          category?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          monthly_retainer?: number
          name: string
          organization_id: string
          status?: string
        }
        Update: {
          account_manager_id?: string | null
          category?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          monthly_retainer?: number
          name?: string
          organization_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_account_manager_id_fkey"
            columns: ["account_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          asset_url: string | null
          brief: string | null
          campaign: string | null
          caption: string | null
          client_id: string
          content_type: string | null
          created_at: string
          id: string
          last_synced_at: string | null
          notion_page_id: string | null
          notion_source_url: string | null
          organization_id: string
          owner_id: string | null
          platform: string
          production_risk: string
          production_template: string | null
          publish_date: string | null
          published_url: string | null
          requires_channel_manager: boolean
          requires_design: boolean
          requires_editing: boolean
          reviewer_id: string | null
          status: string
          synced_from: string | null
          title: string
        }
        Insert: {
          asset_url?: string | null
          brief?: string | null
          campaign?: string | null
          caption?: string | null
          client_id: string
          content_type?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          notion_page_id?: string | null
          notion_source_url?: string | null
          organization_id: string
          owner_id?: string | null
          platform: string
          production_risk?: string
          production_template?: string | null
          publish_date?: string | null
          published_url?: string | null
          requires_channel_manager?: boolean
          requires_design?: boolean
          requires_editing?: boolean
          reviewer_id?: string | null
          status?: string
          synced_from?: string | null
          title: string
        }
        Update: {
          asset_url?: string | null
          brief?: string | null
          campaign?: string | null
          caption?: string | null
          client_id?: string
          content_type?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          notion_page_id?: string | null
          notion_source_url?: string | null
          organization_id?: string
          owner_id?: string | null
          platform?: string
          production_risk?: string
          production_template?: string | null
          publish_date?: string | null
          published_url?: string | null
          requires_channel_manager?: boolean
          requires_design?: boolean
          requires_editing?: boolean
          reviewer_id?: string | null
          status?: string
          synced_from?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_control_settings: {
        Row: {
          cash_risk_warning_days: number
          created_at: string
          expense_variance_warning_percent: number
          financial_period: string
          id: string
          minimum_cash_reserve: number
          organization_id: string
          owner_draw_requires_reserve_check: boolean
          payroll_cycle: string
          reserve_months: number
          strict_spending_control: boolean
          tax_reserve_rate: number
          updated_at: string
        }
        Insert: {
          cash_risk_warning_days?: number
          created_at?: string
          expense_variance_warning_percent?: number
          financial_period?: string
          id?: string
          minimum_cash_reserve?: number
          organization_id: string
          owner_draw_requires_reserve_check?: boolean
          payroll_cycle?: string
          reserve_months?: number
          strict_spending_control?: boolean
          tax_reserve_rate?: number
          updated_at?: string
        }
        Update: {
          cash_risk_warning_days?: number
          created_at?: string
          expense_variance_warning_percent?: number
          financial_period?: string
          id?: string
          minimum_cash_reserve?: number
          organization_id?: string
          owner_draw_requires_reserve_check?: boolean
          payroll_cycle?: string
          reserve_months?: number
          strict_spending_control?: boolean
          tax_reserve_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_control_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_periods: {
        Row: {
          actual_closing_cash: number
          cash_risk_status: string
          closed_at: string | null
          closed_by: string | null
          closing_cash: number
          created_at: string
          forecast_budget_id: string | null
          id: string
          minimum_cash_reserve: number
          opening_cash: number
          organization_id: string
          period_end: string | null
          period_month: string
          period_start: string | null
          projected_closing_cash: number
          review_notes: string | null
          status: string
          tax_reserve_rate: number
        }
        Insert: {
          actual_closing_cash?: number
          cash_risk_status?: string
          closed_at?: string | null
          closed_by?: string | null
          closing_cash?: number
          created_at?: string
          forecast_budget_id?: string | null
          id?: string
          minimum_cash_reserve?: number
          opening_cash?: number
          organization_id: string
          period_end?: string | null
          period_month: string
          period_start?: string | null
          projected_closing_cash?: number
          review_notes?: string | null
          status?: string
          tax_reserve_rate?: number
        }
        Update: {
          actual_closing_cash?: number
          cash_risk_status?: string
          closed_at?: string | null
          closed_by?: string | null
          closing_cash?: number
          created_at?: string
          forecast_budget_id?: string | null
          id?: string
          minimum_cash_reserve?: number
          opening_cash?: number
          organization_id?: string
          period_end?: string | null
          period_month?: string
          period_start?: string | null
          projected_closing_cash?: number
          review_notes?: string | null
          status?: string
          tax_reserve_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_periods_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_periods_forecast_budget_id_fkey"
            columns: ["forecast_budget_id"]
            isOneToOne: false
            referencedRelation: "forecast_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_periods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_budget_items: {
        Row: {
          category: string
          client_id: string | null
          created_at: string
          description: string | null
          expected_amount: number
          expected_date: string | null
          forecast_budget_id: string
          id: string
          item_type: string
          organization_id: string
        }
        Insert: {
          category: string
          client_id?: string | null
          created_at?: string
          description?: string | null
          expected_amount?: number
          expected_date?: string | null
          forecast_budget_id: string
          id?: string
          item_type: string
          organization_id: string
        }
        Update: {
          category?: string
          client_id?: string | null
          created_at?: string
          description?: string | null
          expected_amount?: number
          expected_date?: string | null
          forecast_budget_id?: string
          id?: string
          item_type?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forecast_budget_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forecast_budget_items_forecast_budget_id_fkey"
            columns: ["forecast_budget_id"]
            isOneToOne: false
            referencedRelation: "forecast_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forecast_budget_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_budgets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          expected_closing_cash: number
          expected_money_in: number
          expected_money_out: number
          expected_tax_reserve: number
          forecast_month: string
          id: string
          opening_cash: number
          organization_id: string
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          expected_closing_cash?: number
          expected_money_in?: number
          expected_money_out?: number
          expected_tax_reserve?: number
          forecast_month: string
          id?: string
          opening_cash?: number
          organization_id: string
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          expected_closing_cash?: number
          expected_money_in?: number
          expected_money_out?: number
          expected_tax_reserve?: number
          forecast_month?: string
          id?: string
          opening_cash?: number
          organization_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "forecast_budgets_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forecast_budgets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forecast_budgets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          description: string
          id: string
          invoice_id: string
          line_total: number
          organization_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          invoice_id: string
          line_total?: number
          organization_id: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string
          line_total?: number
          organization_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          due_date: string | null
          file_url: string | null
          id: string
          invoice_number: string
          organization_id: string
          paid_at: string | null
          sent_at: string | null
          service_period_end: string | null
          service_period_start: string | null
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          total_amount: number
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          file_url?: string | null
          id?: string
          invoice_number: string
          organization_id: string
          paid_at?: string | null
          sent_at?: string | null
          service_period_end?: string | null
          service_period_start?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total_amount?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          file_url?: string | null
          id?: string
          invoice_number?: string
          organization_id?: string
          paid_at?: string | null
          sent_at?: string | null
          service_period_end?: string | null
          service_period_start?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      member_sessions: {
        Row: {
          active_minutes: number
          consent_version: string | null
          created_at: string
          id: string
          idle_minutes: number
          login_time: string
          logout_time: string | null
          organization_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          active_minutes?: number
          consent_version?: string | null
          created_at?: string
          id?: string
          idle_minutes?: number
          login_time?: string
          logout_time?: string | null
          organization_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          active_minutes?: number
          consent_version?: string | null
          created_at?: string
          id?: string
          idle_minutes?: number
          login_time?: string
          logout_time?: string | null
          organization_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link_url: string | null
          message: string | null
          organization_id: string | null
          status: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link_url?: string | null
          message?: string | null
          organization_id?: string | null
          status?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link_url?: string | null
          message?: string | null
          organization_id?: string | null
          status?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notion_sync_logs: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          error_count: number
          id: string
          imported_count: number
          notion_database_id: string | null
          organization_id: string
          skipped_count: number
          status: string
          sync_mode: string
          sync_type: string
          updated_count: number
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          error_count?: number
          id?: string
          imported_count?: number
          notion_database_id?: string | null
          organization_id: string
          skipped_count?: number
          status?: string
          sync_mode: string
          sync_type?: string
          updated_count?: number
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          error_count?: number
          id?: string
          imported_count?: number
          notion_database_id?: string | null
          organization_id?: string
          skipped_count?: number
          status?: string
          sync_mode?: string
          sync_type?: string
          updated_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "notion_sync_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notion_sync_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notion_sync_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role: string
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string
          organization_id: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          organization_id: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          organization_id?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_workspaces: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          status: string
          workspace_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          status?: string
          workspace_type: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          status?: string
          workspace_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_workspaces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          business_type: string
          created_at: string
          currency: string
          id: string
          name: string
          owner_id: string | null
          slug: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          business_type?: string
          created_at?: string
          currency?: string
          id?: string
          name: string
          owner_id?: string | null
          slug: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          business_type?: string
          created_at?: string
          currency?: string
          id?: string
          name?: string
          owner_id?: string | null
          slug?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_cycles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          organization_id: string
          paid_at: string | null
          payroll_due_date: string
          period_month: string
          status: string
          tax_withholding: number
          total_gross_pay: number
          total_net_pay: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          organization_id: string
          paid_at?: string | null
          payroll_due_date: string
          period_month: string
          status?: string
          tax_withholding?: number
          total_gross_pay?: number
          total_net_pay?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          paid_at?: string | null
          payroll_due_date?: string
          period_month?: string
          status?: string
          tax_withholding?: number
          total_gross_pay?: number
          total_net_pay?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_cycles_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_cycles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_items: {
        Row: {
          cashflow_transaction_id: string | null
          created_at: string
          gross_amount: number
          id: string
          net_amount: number
          organization_id: string
          paid_date: string | null
          payee_name: string | null
          payee_type: string
          payment_status: string
          payroll_cycle_id: string
          tax_amount: number
          user_id: string | null
        }
        Insert: {
          cashflow_transaction_id?: string | null
          created_at?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          organization_id: string
          paid_date?: string | null
          payee_name?: string | null
          payee_type?: string
          payment_status?: string
          payroll_cycle_id: string
          tax_amount?: number
          user_id?: string | null
        }
        Update: {
          cashflow_transaction_id?: string | null
          created_at?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          organization_id?: string
          paid_date?: string | null
          payee_name?: string | null
          payee_type?: string
          payment_status?: string
          payroll_cycle_id?: string
          tax_amount?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_cashflow_transaction_id_fkey"
            columns: ["cashflow_transaction_id"]
            isOneToOne: false
            referencedRelation: "cashflow_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_payroll_cycle_id_fkey"
            columns: ["payroll_cycle_id"]
            isOneToOne: false
            referencedRelation: "payroll_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          daily_time_limit_minutes: number | null
          email: string
          full_name: string
          id: string
          status: string
          weekly_time_limit_minutes: number | null
        }
        Insert: {
          created_at?: string
          daily_time_limit_minutes?: number | null
          email: string
          full_name: string
          id: string
          status?: string
          weekly_time_limit_minutes?: number | null
        }
        Update: {
          created_at?: string
          daily_time_limit_minutes?: number | null
          email?: string
          full_name?: string
          id?: string
          status?: string
          weekly_time_limit_minutes?: number | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          approved_at: string | null
          client_id: string
          created_at: string
          file_url: string | null
          generated_by: string | null
          id: string
          notes: string | null
          organization_id: string
          report_data: Json
          report_period: string
          report_type: string
          status: string
        }
        Insert: {
          approved_at?: string | null
          client_id: string
          created_at?: string
          file_url?: string | null
          generated_by?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          report_data?: Json
          report_period: string
          report_type?: string
          status?: string
        }
        Update: {
          approved_at?: string | null
          client_id?: string
          created_at?: string
          file_url?: string | null
          generated_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          report_data?: Json
          report_period?: string
          report_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          channel: string
          clicks: number
          client_id: string
          comments: number
          content_item_id: string | null
          created_at: string
          id: string
          impressions: number
          leads: number
          likes: number
          organization_id: string
          published_at: string | null
          published_url: string
          reach: number
          report_period: string | null
          saves: number
          shares: number
          spend: number
        }
        Insert: {
          channel: string
          clicks?: number
          client_id: string
          comments?: number
          content_item_id?: string | null
          created_at?: string
          id?: string
          impressions?: number
          leads?: number
          likes?: number
          organization_id: string
          published_at?: string | null
          published_url: string
          reach?: number
          report_period?: string | null
          saves?: number
          shares?: number
          spend?: number
        }
        Update: {
          channel?: string
          clicks?: number
          client_id?: string
          comments?: number
          content_item_id?: string | null
          created_at?: string
          id?: string
          impressions?: number
          leads?: number
          likes?: number
          organization_id?: string
          published_at?: string | null
          published_url?: string
          reach?: number
          report_period?: string | null
          saves?: number
          shares?: number
          spend?: number
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          booking_source: string
          client_id: string | null
          completed_at: string | null
          content_item_id: string | null
          created_at: string
          created_by: string | null
          dependency_task_id: string | null
          description: string | null
          due_date: string | null
          id: string
          organization_id: string
          owner_id: string | null
          priority: string
          production_risk: string
          required_role: string | null
          reviewer_id: string | null
          status: string
          task_type: string | null
          title: string
        }
        Insert: {
          booking_source?: string
          client_id?: string | null
          completed_at?: string | null
          content_item_id?: string | null
          created_at?: string
          created_by?: string | null
          dependency_task_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id: string
          owner_id?: string | null
          priority?: string
          production_risk?: string
          required_role?: string | null
          reviewer_id?: string | null
          status?: string
          task_type?: string | null
          title: string
        }
        Update: {
          booking_source?: string
          client_id?: string | null
          completed_at?: string | null
          content_item_id?: string | null
          created_at?: string
          created_by?: string | null
          dependency_task_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string
          owner_id?: string | null
          priority?: string
          production_risk?: string
          required_role?: string | null
          reviewer_id?: string | null
          status?: string
          task_type?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_dependency_task_id_fkey"
            columns: ["dependency_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_view_preferences: {
        Row: {
          created_at: string
          default_view: string
          filters: Json | null
          id: string
          module: string
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_view: string
          filters?: Json | null
          id?: string
          module: string
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_view?: string
          filters?: Json | null
          id?: string
          module?: string
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_view_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_view_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_org_role: { Args: { target_org_id: string }; Returns: string }
      has_finance_access: { Args: { target_org_id: string }; Returns: boolean }
      has_operation_access: {
        Args: { target_org_id: string }
        Returns: boolean
      }
      is_client_member: { Args: { target_client_id: string }; Returns: boolean }
      is_org_admin: { Args: { target_org_id: string }; Returns: boolean }
      is_org_member: { Args: { target_org_id: string }; Returns: boolean }
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
