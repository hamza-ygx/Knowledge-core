// Generated from the Supabase schema (project agent-org-map). Regenerate after migrations.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      agents: {
        Row: {
          created_at: string;
          department_id: string;
          description: string;
          id: string;
          kind: string;
          last_run_at: string | null;
          name: string;
          owner_id: string;
          position: number;
          reports_to: string | null;
          role: string;
          status: string;
          tools: string[];
          webhook_token_hash: string | null;
        };
        Insert: {
          created_at?: string;
          department_id: string;
          description?: string;
          id?: string;
          kind?: string;
          last_run_at?: string | null;
          name: string;
          owner_id?: string;
          position?: number;
          reports_to?: string | null;
          role?: string;
          status?: string;
          tools?: string[];
          webhook_token_hash?: string | null;
        };
        Update: {
          created_at?: string;
          department_id?: string;
          description?: string;
          id?: string;
          kind?: string;
          last_run_at?: string | null;
          name?: string;
          owner_id?: string;
          position?: number;
          reports_to?: string | null;
          role?: string;
          status?: string;
          tools?: string[];
          webhook_token_hash?: string | null;
        };
        Relationships: [];
      };
      departments: {
        Row: {
          color: string;
          created_at: string;
          id: string;
          name: string;
          owner_id: string;
          position: number;
          subtitle: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          id?: string;
          name: string;
          owner_id?: string;
          position?: number;
          subtitle?: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          id?: string;
          name?: string;
          owner_id?: string;
          position?: number;
          subtitle?: string;
        };
        Relationships: [];
      };
      process_steps: {
        Row: {
          agent_id: string;
          automated: boolean;
          created_at: string;
          id: string;
          owner_id: string;
          position: number;
          text: string;
        };
        Insert: {
          agent_id: string;
          automated?: boolean;
          created_at?: string;
          id?: string;
          owner_id?: string;
          position?: number;
          text: string;
        };
        Update: {
          agent_id?: string;
          automated?: boolean;
          created_at?: string;
          id?: string;
          owner_id?: string;
          position?: number;
          text?: string;
        };
        Relationships: [];
      };
      runs: {
        Row: {
          agent_id: string;
          created_at: string;
          duration_ms: number | null;
          error: string | null;
          external_id: string;
          finished_at: string | null;
          id: string;
          output: Json | null;
          owner_id: string;
          started_at: string;
          status: string;
          summary: string | null;
        };
        Insert: {
          agent_id: string;
          created_at?: string;
          duration_ms?: number | null;
          error?: string | null;
          external_id?: string;
          finished_at?: string | null;
          id?: string;
          output?: Json | null;
          owner_id?: string;
          started_at?: string;
          status: string;
          summary?: string | null;
        };
        Update: {
          agent_id?: string;
          created_at?: string;
          duration_ms?: number | null;
          error?: string | null;
          external_id?: string;
          finished_at?: string | null;
          id?: string;
          output?: Json | null;
          owner_id?: string;
          started_at?: string;
          status?: string;
          summary?: string | null;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          agent_id: string | null;
          created_at: string;
          department_id: string | null;
          due_date: string | null;
          id: string;
          notes: string;
          owner_id: string;
          position: number;
          stage: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          agent_id?: string | null;
          created_at?: string;
          department_id?: string | null;
          due_date?: string | null;
          id?: string;
          notes?: string;
          owner_id?: string;
          position?: number;
          stage?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          agent_id?: string | null;
          created_at?: string;
          department_id?: string | null;
          due_date?: string | null;
          id?: string;
          notes?: string;
          owner_id?: string;
          position?: number;
          stage?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      ingest_run: {
        Args: { p_agent_id: string; p_event: Json; p_token: string };
        Returns: Json;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
