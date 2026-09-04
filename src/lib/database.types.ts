/**
 * Supabase şemasından üretilmiş tipler. ELLE DÜZENLEME.
 * Yenilemek için: şema değiştiğinde `supabase gen types typescript --project-id gdumgdgwlfnohkaucfow`
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      application_notes: {
        Row: {
          application_id: string;
          author_id: string | null;
          created_at: string;
          id: string;
          note: string;
        };
        Insert: {
          application_id: string;
          author_id?: string | null;
          created_at?: string;
          id?: string;
          note: string;
        };
        Update: {
          application_id?: string;
          author_id?: string | null;
          created_at?: string;
          id?: string;
          note?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'application_notes_application_id_fkey';
            columns: ['application_id'];
            isOneToOne: false;
            referencedRelation: 'applications';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'application_notes_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          type: string;
          title: string;
          body: string | null;
          target_url: string | null;
          application_id: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          type: string;
          title: string;
          body?: string | null;
          target_url?: string | null;
          application_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          /* Kullanıcının yazabildiği TEK kolon: kolon yetkisi öyle. */
          read_at?: string | null;
        };
        Relationships: [];
      };
      applications: {
        Row: {
          application_method: Database['public']['Enums']['application_method'];
          applied_at: string;
          company_feedback: string | null;
          contact_share_consent_at: string | null;
          contact_share_consent_version: string | null;
          cover_letter: string | null;
          created_via: string | null;
          cv_path: string | null;
          cv_snapshot_path: string | null;
          email_attempts: number;
          email_delivery_status: Database['public']['Enums']['email_delivery_status'];
          email_last_error: string | null;
          email_provider_message_id: string | null;
          id: string;
          interview_date: string | null;
          interview_time: string | null;
          interview_type: string | null;
          interview_location: string | null;
          interview_note: string | null;
          interview_response: string | null;
          interview_responded_at: string | null;
          listing_id: string;
          match_score: number | null;
          offer_compensation: string | null;
          offer_note: string | null;
          offer_start_date: string | null;
          profile_snapshot: Json | null;
          status: Database['public']['Enums']['application_status'];
          status_changed_at: string | null;
          student_id: string;
          submitted_at: string | null;
          updated_at: string;
        };
        Insert: {
          application_method?: Database['public']['Enums']['application_method'];
          applied_at?: string;
          company_feedback?: string | null;
          contact_share_consent_at?: string | null;
          contact_share_consent_version?: string | null;
          cover_letter?: string | null;
          created_via?: string | null;
          cv_path?: string | null;
          cv_snapshot_path?: string | null;
          email_attempts?: number;
          email_delivery_status?: Database['public']['Enums']['email_delivery_status'];
          email_last_error?: string | null;
          email_provider_message_id?: string | null;
          profile_snapshot?: Json | null;
          status_changed_at?: string | null;
          submitted_at?: string | null;
          id?: string;
          interview_date?: string | null;
          interview_time?: string | null;
          interview_type?: string | null;
          interview_location?: string | null;
          interview_note?: string | null;
          interview_response?: string | null;
          interview_responded_at?: string | null;
          listing_id: string;
          match_score?: number | null;
          offer_compensation?: string | null;
          offer_note?: string | null;
          offer_start_date?: string | null;
          status?: Database['public']['Enums']['application_status'];
          student_id: string;
          updated_at?: string;
        };
        Update: {
          application_method?: Database['public']['Enums']['application_method'];
          applied_at?: string;
          company_feedback?: string | null;
          contact_share_consent_at?: string | null;
          contact_share_consent_version?: string | null;
          cover_letter?: string | null;
          created_via?: string | null;
          cv_path?: string | null;
          cv_snapshot_path?: string | null;
          email_attempts?: number;
          email_delivery_status?: Database['public']['Enums']['email_delivery_status'];
          email_last_error?: string | null;
          email_provider_message_id?: string | null;
          profile_snapshot?: Json | null;
          status_changed_at?: string | null;
          submitted_at?: string | null;
          id?: string;
          interview_date?: string | null;
          interview_time?: string | null;
          interview_type?: string | null;
          interview_location?: string | null;
          interview_note?: string | null;
          interview_response?: string | null;
          interview_responded_at?: string | null;
          listing_id?: string;
          match_score?: number | null;
          offer_compensation?: string | null;
          offer_note?: string | null;
          offer_start_date?: string | null;
          status?: Database['public']['Enums']['application_status'];
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'applications_listing_id_fkey';
            columns: ['listing_id'];
            isOneToOne: false;
            referencedRelation: 'listings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'applications_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'student_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      companies: {
        Row: {
          claimed_at: string | null;
          claimed_by: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          /** Üretilmiş kolon — yalnızca okunur. */
          name_normalized: string | null;
          origin: Database['public']['Enums']['listing_origin'];
          id: string;
          industry: string | null;
          location: string | null;
          logo_url: string | null;
          name: string;
          plan: Database['public']['Enums']['company_plan'];
          rating: number;
          size: string | null;
          slug: string;
          updated_at: string;
          verified: boolean;
          website_url: string | null;
        };
        Insert: {
          claimed_at?: string | null;
          claimed_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          origin?: Database['public']['Enums']['listing_origin'];
          industry?: string | null;
          location?: string | null;
          logo_url?: string | null;
          name: string;
          plan?: Database['public']['Enums']['company_plan'];
          rating?: number;
          size?: string | null;
          slug: string;
          updated_at?: string;
          verified?: boolean;
          website_url?: string | null;
        };
        Update: {
          claimed_at?: string | null;
          claimed_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          origin?: Database['public']['Enums']['listing_origin'];
          industry?: string | null;
          location?: string | null;
          logo_url?: string | null;
          name?: string;
          plan?: Database['public']['Enums']['company_plan'];
          rating?: number;
          size?: string | null;
          slug?: string;
          updated_at?: string;
          verified?: boolean;
          website_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'companies_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      company_claims: {
        Row: {
          company_id: string;
          contact_name: string;
          contact_title: string | null;
          created_at: string;
          id: string;
          note: string | null;
          phone: string | null;
          reject_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
          user_id: string;
          work_email: string;
        };
        Insert: {
          company_id: string;
          contact_name: string;
          contact_title?: string | null;
          created_at?: string;
          id?: string;
          note?: string | null;
          phone?: string | null;
          reject_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          user_id: string;
          work_email: string;
        };
        Update: {
          company_id?: string;
          contact_name?: string;
          contact_title?: string | null;
          created_at?: string;
          id?: string;
          note?: string | null;
          phone?: string | null;
          reject_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          user_id?: string;
          work_email?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'company_claims_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'company_claims_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      company_members: {
        Row: {
          company_id: string;
          created_at: string;
          is_owner: boolean;
          recruiter_role: string;
          user_id: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          is_owner?: boolean;
          recruiter_role?: string;
          user_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          is_owner?: boolean;
          recruiter_role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'company_members_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'company_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      listings: {
        Row: {
          applicants_count: number;
          application_deadline: string | null;
          application_method: Database['public']['Enums']['application_method'];
          apply_url: string | null;
          canonical_url: string | null;
          category: Database['public']['Enums']['listing_category'];
          city: string | null;
          country_code: string | null;
          original_language: string | null;
          international_applicants: boolean | null;
          visa_sponsorship: boolean | null;
          company_id: string;
          content_hash: string | null;
          created_at: string;
          deactivated_at: string | null;
          deactivation_reason: string | null;
          application_channel_id: string | null;
          first_seen_at: string | null;
          imported_at: string | null;
          raw_listing_id: string | null;
          insurance_note: string | null;
          last_seen_at: string | null;
          source_verified_at: string | null;
          source_checked_at: string | null;
          source_status: string | null;
          origin: Database['public']['Enums']['listing_origin'];
          raw: Json | null;
          source_id: string | null;
          source_listing_id: string | null;
          source_title: string | null;
          source_url: string | null;
          department: string | null;
          description: string | null;
          duration: string | null;
          featured: boolean;
          id: string;
          is_paid: boolean;
          mandatory_staj_accepted: boolean;
          min_grade_level: string | null;
          perks: string[];
          posted_at: string | null;
          preferred_skills: string[];
          required_skills: string[];
          responsibilities: string[];
          status: Database['public']['Enums']['listing_status'];
          stipend_text: string | null;
          term: Database['public']['Enums']['listing_term'];
          title: string;
          updated_at: string;
          voluntary_staj_accepted: boolean;
          work_type: Database['public']['Enums']['work_type'];
        };
        Insert: {
          applicants_count?: number;
          application_deadline?: string | null;
          application_method?: Database['public']['Enums']['application_method'];
          apply_url?: string | null;
          canonical_url?: string | null;
          content_hash?: string | null;
          deactivated_at?: string | null;
          deactivation_reason?: string | null;
          application_channel_id?: string | null;
          first_seen_at?: string | null;
          imported_at?: string | null;
          raw_listing_id?: string | null;
          insurance_note?: string | null;
          last_seen_at?: string | null;
          source_verified_at?: string | null;
          source_checked_at?: string | null;
          source_status?: string | null;
          origin?: Database['public']['Enums']['listing_origin'];
          raw?: Json | null;
          source_id?: string | null;
          source_listing_id?: string | null;
          source_url?: string | null;
          category?: Database['public']['Enums']['listing_category'];
          city?: string | null;
          country_code?: string | null;
          original_language?: string | null;
          international_applicants?: boolean | null;
          visa_sponsorship?: boolean | null;
          company_id: string;
          created_at?: string;
          department?: string | null;
          description?: string | null;
          duration?: string | null;
          featured?: boolean;
          id?: string;
          is_paid?: boolean;
          mandatory_staj_accepted?: boolean;
          min_grade_level?: string | null;
          perks?: string[];
          posted_at?: string | null;
          preferred_skills?: string[];
          required_skills?: string[];
          responsibilities?: string[];
          status?: Database['public']['Enums']['listing_status'];
          stipend_text?: string | null;
          term?: Database['public']['Enums']['listing_term'];
          title: string;
          updated_at?: string;
          voluntary_staj_accepted?: boolean;
          work_type?: Database['public']['Enums']['work_type'];
        };
        Update: {
          applicants_count?: number;
          application_deadline?: string | null;
          application_method?: Database['public']['Enums']['application_method'];
          apply_url?: string | null;
          canonical_url?: string | null;
          content_hash?: string | null;
          deactivated_at?: string | null;
          deactivation_reason?: string | null;
          application_channel_id?: string | null;
          first_seen_at?: string | null;
          imported_at?: string | null;
          raw_listing_id?: string | null;
          insurance_note?: string | null;
          last_seen_at?: string | null;
          source_verified_at?: string | null;
          source_checked_at?: string | null;
          source_status?: string | null;
          origin?: Database['public']['Enums']['listing_origin'];
          raw?: Json | null;
          source_id?: string | null;
          source_listing_id?: string | null;
          source_url?: string | null;
          category?: Database['public']['Enums']['listing_category'];
          city?: string | null;
          country_code?: string | null;
          original_language?: string | null;
          international_applicants?: boolean | null;
          visa_sponsorship?: boolean | null;
          company_id?: string;
          created_at?: string;
          department?: string | null;
          description?: string | null;
          duration?: string | null;
          featured?: boolean;
          id?: string;
          is_paid?: boolean;
          mandatory_staj_accepted?: boolean;
          min_grade_level?: string | null;
          perks?: string[];
          posted_at?: string | null;
          preferred_skills?: string[];
          required_skills?: string[];
          responsibilities?: string[];
          status?: Database['public']['Enums']['listing_status'];
          stipend_text?: string | null;
          term?: Database['public']['Enums']['listing_term'];
          title?: string;
          updated_at?: string;
          voluntary_staj_accepted?: boolean;
          work_type?: Database['public']['Enums']['work_type'];
        };
        Relationships: [
          {
            foreignKeyName: 'listings_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          kvkk_consent_at: string | null;
          kvkk_consent_version: string | null;
          marketing_consent: boolean;
          phone: string | null;
          interface_language: string | null;
          content_language: string | null;
          home_country: string | null;
          role: Database['public']['Enums']['user_role'];
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name?: string;
          id: string;
          kvkk_consent_at?: string | null;
          kvkk_consent_version?: string | null;
          marketing_consent?: boolean;
          phone?: string | null;
          interface_language?: string | null;
          content_language?: string | null;
          home_country?: string | null;
          role?: Database['public']['Enums']['user_role'];
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          kvkk_consent_at?: string | null;
          kvkk_consent_version?: string | null;
          marketing_consent?: boolean;
          phone?: string | null;
          interface_language?: string | null;
          content_language?: string | null;
          home_country?: string | null;
          role?: Database['public']['Enums']['user_role'];
          updated_at?: string;
        };
        Relationships: [];
      };
      quiz_attempts: {
        Row: {
          answers: Json | null;
          created_at: string;
          id: string;
          passed: boolean;
          quiz_id: string;
          score: number;
          student_id: string;
        };
        Insert: {
          answers?: Json | null;
          created_at?: string;
          id?: string;
          passed?: boolean;
          quiz_id: string;
          score: number;
          student_id: string;
        };
        Update: {
          answers?: Json | null;
          created_at?: string;
          id?: string;
          passed?: boolean;
          quiz_id?: string;
          score?: number;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quiz_attempts_quiz_id_fkey';
            columns: ['quiz_id'];
            isOneToOne: false;
            referencedRelation: 'quizzes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quiz_attempts_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'student_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      quiz_questions: {
        Row: {
          code_snippet: string | null;
          correct_index: number;
          explanation: string | null;
          id: string;
          options: string[];
          question: string;
          quiz_id: string;
          sort_order: number;
        };
        Insert: {
          code_snippet?: string | null;
          correct_index: number;
          explanation?: string | null;
          id?: string;
          options: string[];
          question: string;
          quiz_id: string;
          sort_order?: number;
        };
        Update: {
          code_snippet?: string | null;
          correct_index?: number;
          explanation?: string | null;
          id?: string;
          options?: string[];
          question?: string;
          quiz_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'quiz_questions_quiz_id_fkey';
            columns: ['quiz_id'];
            isOneToOne: false;
            referencedRelation: 'quizzes';
            referencedColumns: ['id'];
          },
        ];
      };
      quizzes: {
        Row: {
          badge_icon: string | null;
          badge_name: string;
          category: Database['public']['Enums']['skill_category'];
          created_at: string;
          id: string;
          is_active: boolean;
          pass_score: number;
          skill_name: string;
        };
        Insert: {
          badge_icon?: string | null;
          badge_name: string;
          category?: Database['public']['Enums']['skill_category'];
          created_at?: string;
          id?: string;
          is_active?: boolean;
          pass_score?: number;
          skill_name: string;
        };
        Update: {
          badge_icon?: string | null;
          badge_name?: string;
          category?: Database['public']['Enums']['skill_category'];
          created_at?: string;
          id?: string;
          is_active?: boolean;
          pass_score?: number;
          skill_name?: string;
        };
        Relationships: [];
      };
      sources: {
        Row: {
          adapter: string;
          base_url: string;
          company_id: string | null;
          crawl_delay_seconds: number;
          created_at: string;
          next_run_at: string | null;
          run_interval_minutes: number;
          trust: Database['public']['Enums']['source_trust'];
          id: string;
          is_enabled: boolean;
          kind: Database['public']['Enums']['source_kind'];
          last_run_at: string | null;
          last_success_at: string | null;
          name: string;
          rate_limit_per_min: number;
          robots_allowed: boolean;
          slug: string;
          tos_notes: string | null;
          tos_reviewed_at: string | null;
          tos_reviewed_by: string | null;
          updated_at: string;
          user_agent: string;
        };
        Insert: {
          adapter?: string;
          base_url: string;
          company_id?: string | null;
          crawl_delay_seconds?: number;
          created_at?: string;
          next_run_at?: string | null;
          run_interval_minutes?: number;
          trust?: Database['public']['Enums']['source_trust'];
          id?: string;
          is_enabled?: boolean;
          kind: Database['public']['Enums']['source_kind'];
          last_run_at?: string | null;
          last_success_at?: string | null;
          name: string;
          rate_limit_per_min?: number;
          robots_allowed?: boolean;
          slug: string;
          tos_notes?: string | null;
          tos_reviewed_at?: string | null;
          tos_reviewed_by?: string | null;
          updated_at?: string;
          user_agent?: string;
        };
        Update: {
          adapter?: string;
          base_url?: string;
          company_id?: string | null;
          crawl_delay_seconds?: number;
          created_at?: string;
          next_run_at?: string | null;
          run_interval_minutes?: number;
          trust?: Database['public']['Enums']['source_trust'];
          id?: string;
          is_enabled?: boolean;
          kind?: Database['public']['Enums']['source_kind'];
          last_run_at?: string | null;
          last_success_at?: string | null;
          name?: string;
          rate_limit_per_min?: number;
          robots_allowed?: boolean;
          slug?: string;
          tos_notes?: string | null;
          tos_reviewed_at?: string | null;
          tos_reviewed_by?: string | null;
          updated_at?: string;
          user_agent?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sources_tos_reviewed_by_fkey';
            columns: ['tos_reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      application_channels: {
        Row: {
          company_id: string;
          created_at: string;
          evidence_url: string | null;
          id: string;
          is_active: boolean;
          type: Database['public']['Enums']['channel_type'];
          value: string;
          verification: Database['public']['Enums']['channel_verification'];
          verification_method: string | null;
          verified_at: string | null;
          verified_by: string | null;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          evidence_url?: string | null;
          id?: string;
          is_active?: boolean;
          type: Database['public']['Enums']['channel_type'];
          value: string;
          verification?: Database['public']['Enums']['channel_verification'];
          verification_method?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          evidence_url?: string | null;
          id?: string;
          is_active?: boolean;
          type?: Database['public']['Enums']['channel_type'];
          value?: string;
          verification?: Database['public']['Enums']['channel_verification'];
          verification_method?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'application_channels_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
        ];
      };
      raw_listings: {
        Row: {
          apply_url: string | null;
          canonical_url: string | null;
          city: string | null;
          classifier_notes: string | null;
          company_name_raw: string | null;
          content_hash: string;
          deadline: string | null;
          description: string | null;
          external_id: string | null;
          first_seen_at: string;
          id: string;
          internship_score: number | null;
          is_internship: boolean | null;
          last_seen_at: string;
          matched_company_id: string | null;
          posted_at: string | null;
          processed_at: string | null;
          promoted_listing_id: string | null;
          raw: Json;
          reject_reason: Database['public']['Enums']['reject_reason'] | null;
          source_id: string;
          status: Database['public']['Enums']['pipeline_status'];
          title: string | null;
          url: string;
          work_type_guess: string | null;
        };
        Insert: {
          apply_url?: string | null;
          canonical_url?: string | null;
          city?: string | null;
          classifier_notes?: string | null;
          company_name_raw?: string | null;
          content_hash: string;
          deadline?: string | null;
          description?: string | null;
          external_id?: string | null;
          first_seen_at?: string;
          id?: string;
          internship_score?: number | null;
          is_internship?: boolean | null;
          last_seen_at?: string;
          matched_company_id?: string | null;
          posted_at?: string | null;
          processed_at?: string | null;
          promoted_listing_id?: string | null;
          raw: Json;
          reject_reason?: Database['public']['Enums']['reject_reason'] | null;
          source_id: string;
          status?: Database['public']['Enums']['pipeline_status'];
          title?: string | null;
          url: string;
          work_type_guess?: string | null;
        };
        Update: {
          apply_url?: string | null;
          canonical_url?: string | null;
          city?: string | null;
          classifier_notes?: string | null;
          company_name_raw?: string | null;
          content_hash?: string;
          deadline?: string | null;
          description?: string | null;
          external_id?: string | null;
          first_seen_at?: string;
          id?: string;
          internship_score?: number | null;
          is_internship?: boolean | null;
          last_seen_at?: string;
          matched_company_id?: string | null;
          posted_at?: string | null;
          processed_at?: string | null;
          promoted_listing_id?: string | null;
          raw?: Json;
          reject_reason?: Database['public']['Enums']['reject_reason'] | null;
          source_id?: string;
          status?: Database['public']['Enums']['pipeline_status'];
          title?: string | null;
          url?: string;
          work_type_guess?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'raw_listings_source_id_fkey';
            columns: ['source_id'];
            isOneToOne: false;
            referencedRelation: 'sources';
            referencedColumns: ['id'];
          },
        ];
      };
      import_events: {
        Row: {
          created_at: string;
          event_type: Database['public']['Enums']['import_event_type'];
          id: string;
          message: string | null;
          payload: Json | null;
          raw_listing_id: string | null;
          run_id: string | null;
          source_id: string;
        };
        Insert: {
          created_at?: string;
          event_type: Database['public']['Enums']['import_event_type'];
          id?: string;
          message?: string | null;
          payload?: Json | null;
          raw_listing_id?: string | null;
          run_id?: string | null;
          source_id: string;
        };
        Update: {
          created_at?: string;
          event_type?: Database['public']['Enums']['import_event_type'];
          id?: string;
          message?: string | null;
          payload?: Json | null;
          raw_listing_id?: string | null;
          run_id?: string | null;
          source_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'import_events_run_id_fkey';
            columns: ['run_id'];
            isOneToOne: false;
            referencedRelation: 'import_runs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'import_events_source_id_fkey';
            columns: ['source_id'];
            isOneToOne: false;
            referencedRelation: 'sources';
            referencedColumns: ['id'];
          },
        ];
      };
      instagram_yayinlari: {
        Row: {
          baslik: string;
          created_at: string;
          gonderi_kimligi: string;
          set_kodu: string;
          temizlendi_mi: boolean;
          yayin_zamani: string;
        };
        Insert: {
          baslik: string;
          created_at?: string;
          gonderi_kimligi: string;
          set_kodu: string;
          temizlendi_mi?: boolean;
          yayin_zamani?: string;
        };
        Update: {
          baslik?: string;
          created_at?: string;
          gonderi_kimligi?: string;
          set_kodu?: string;
          temizlendi_mi?: boolean;
          yayin_zamani?: string;
        };
        Relationships: [];
      };
      import_runs: {
        Row: {
          created_count: number;
          promoted_count: number;
          rejected_count: number;
          deactivated_count: number;
          error_text: string | null;
          fetched_count: number;
          finished_at: string | null;
          id: string;
          skipped_count: number;
          source_id: string;
          started_at: string;
          status: Database['public']['Enums']['ingest_status'];
          updated_count: number;
        };
        Insert: {
          created_count?: number;
          promoted_count?: number;
          rejected_count?: number;
          deactivated_count?: number;
          error_text?: string | null;
          fetched_count?: number;
          finished_at?: string | null;
          id?: string;
          skipped_count?: number;
          source_id: string;
          started_at?: string;
          status?: Database['public']['Enums']['ingest_status'];
          updated_count?: number;
        };
        Update: {
          created_count?: number;
          promoted_count?: number;
          rejected_count?: number;
          deactivated_count?: number;
          error_text?: string | null;
          fetched_count?: number;
          finished_at?: string | null;
          id?: string;
          skipped_count?: number;
          source_id?: string;
          started_at?: string;
          status?: Database['public']['Enums']['ingest_status'];
          updated_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'ingestion_runs_source_id_fkey';
            columns: ['source_id'];
            isOneToOne: false;
            referencedRelation: 'sources';
            referencedColumns: ['id'];
          },
        ];
      };
      student_languages: {
        Row: {
          id: string;
          language: string;
          level: string;
          proficiency_text: string | null;
          student_id: string;
          verified: boolean;
        };
        Insert: {
          id?: string;
          language: string;
          level: string;
          proficiency_text?: string | null;
          student_id: string;
          verified?: boolean;
        };
        Update: {
          id?: string;
          language?: string;
          level?: string;
          proficiency_text?: string | null;
          student_id?: string;
          verified?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'student_languages_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'student_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      student_profiles: {
        Row: {
          bio: string | null;
          cv_path: string | null;
          department: string | null;
          earned_badges: string[];
          faculty: string | null;
          github_username: string | null;
          gpa: number | null;
          grade_level: Database['public']['Enums']['grade_level'] | null;
          graduation_year: number | null;
          id: string;
          is_open_to_offers: boolean;
          linkedin_url: string | null;
          portfolio_url: string | null;
          preferred_job_countries: string[];
          pref_cities: string[];
          pref_earliest_start: string | null;
          pref_min_stipend: number | null;
          pref_type: Database['public']['Enums']['internship_type'];
          pref_uni_provides_insurance: boolean;
          pref_weekly_days: number | null;
          pref_work_type: Database['public']['Enums']['work_type_pref'];
          soft_skills: string[];
          target_roles: string[];
          university: string | null;
          updated_at: string;
        };
        Insert: {
          bio?: string | null;
          cv_path?: string | null;
          department?: string | null;
          earned_badges?: string[];
          faculty?: string | null;
          github_username?: string | null;
          gpa?: number | null;
          grade_level?: Database['public']['Enums']['grade_level'] | null;
          graduation_year?: number | null;
          id: string;
          is_open_to_offers?: boolean;
          linkedin_url?: string | null;
          portfolio_url?: string | null;
          preferred_job_countries?: string[];
          pref_cities?: string[];
          pref_earliest_start?: string | null;
          pref_min_stipend?: number | null;
          pref_type?: Database['public']['Enums']['internship_type'];
          pref_uni_provides_insurance?: boolean;
          pref_weekly_days?: number | null;
          pref_work_type?: Database['public']['Enums']['work_type_pref'];
          soft_skills?: string[];
          target_roles?: string[];
          university?: string | null;
          updated_at?: string;
        };
        Update: {
          bio?: string | null;
          cv_path?: string | null;
          department?: string | null;
          earned_badges?: string[];
          faculty?: string | null;
          github_username?: string | null;
          gpa?: number | null;
          grade_level?: Database['public']['Enums']['grade_level'] | null;
          graduation_year?: number | null;
          id?: string;
          is_open_to_offers?: boolean;
          linkedin_url?: string | null;
          portfolio_url?: string | null;
          preferred_job_countries?: string[];
          pref_cities?: string[];
          pref_earliest_start?: string | null;
          pref_min_stipend?: number | null;
          pref_type?: Database['public']['Enums']['internship_type'];
          pref_uni_provides_insurance?: boolean;
          pref_weekly_days?: number | null;
          pref_work_type?: Database['public']['Enums']['work_type_pref'];
          soft_skills?: string[];
          target_roles?: string[];
          university?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'student_profiles_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      student_projects: {
        Row: {
          created_at: string;
          description: string | null;
          github_url: string | null;
          id: string;
          live_url: string | null;
          sort_order: number;
          student_id: string;
          tech_stack: string[];
          title: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          github_url?: string | null;
          id?: string;
          live_url?: string | null;
          sort_order?: number;
          student_id: string;
          tech_stack?: string[];
          title: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          github_url?: string | null;
          id?: string;
          live_url?: string | null;
          sort_order?: number;
          student_id?: string;
          tech_stack?: string[];
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'student_projects_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'student_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      student_skills: {
        Row: {
          category: Database['public']['Enums']['skill_category'];
          created_at: string;
          domain: Database['public']['Enums']['hard_skill_domain'] | null;
          id: string;
          level: Database['public']['Enums']['skill_level'];
          name: string;
          student_id: string;
          verified: boolean;
          years_of_exp: number | null;
        };
        Insert: {
          category?: Database['public']['Enums']['skill_category'];
          created_at?: string;
          domain?: Database['public']['Enums']['hard_skill_domain'] | null;
          id?: string;
          level?: Database['public']['Enums']['skill_level'];
          name: string;
          student_id: string;
          verified?: boolean;
          years_of_exp?: number | null;
        };
        Update: {
          category?: Database['public']['Enums']['skill_category'];
          created_at?: string;
          domain?: Database['public']['Enums']['hard_skill_domain'] | null;
          id?: string;
          level?: Database['public']['Enums']['skill_level'];
          name?: string;
          student_id?: string;
          verified?: boolean;
          years_of_exp?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'student_skills_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'student_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      quiz_questions_public: {
        Row: {
          code_snippet: string | null;
          id: string | null;
          options: string[] | null;
          question: string | null;
          quiz_id: string | null;
          sort_order: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'quiz_questions_quiz_id_fkey';
            columns: ['quiz_id'];
            isOneToOne: false;
            referencedRelation: 'quizzes';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      app_role: {
        Args: Record<string, never>;
        Returns: Database['public']['Enums']['user_role'];
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_company_member: { Args: { target_company: string }; Returns: boolean };
      submit_quiz_attempt: {
        Args: { p_quiz_id: string; p_answers: Json };
        Returns: Json;
      };
      approve_company_claim: { Args: { claim_id: string }; Returns: undefined };
      reject_company_claim: { Args: { claim_id: string; reason: string }; Returns: undefined };
      /* Teklife yanıt — kabul/ret yalnızca bu kapıdan geçiyor. */
      teklife_yanit_ver: {
        Args: { p_basvuru: string; p_kabul: boolean };
        Returns: Database['public']['Enums']['application_status'];
      };
      /* Bütün okunmamış bildirimleri okundu yapar; sayıyı döndürür. */
      bildirimleri_okundu_isaretle: { Args: Record<string, never>; Returns: number };
      /* Görüşme davetine yanıt — kabul/ret yalnızca bu kapıdan geçiyor. */
      gorusmeye_yanit_ver: {
        Args: { p_basvuru: string; p_katilacak: boolean };
        Returns: string;
      };
      /* Kabul edilmiş teklifte karşı tarafın iletişim satırı. */
      basvuru_iletisimi: {
        Args: { p_basvuru: string };
        Returns: {
          taraf: string;
          ad: string | null;
          eposta: string | null;
          telefon: string | null;
          unvan: string | null;
        }[];
      };
    };
    Enums: {
      application_method: 'email_application' | 'external' | 'internal';
      channel_type: 'email' | 'external_url' | 'internal';
      channel_verification: 'unverified' | 'verified' | 'rejected';
      import_event_type:
        | 'discovered'
        | 'updated'
        | 'rejected'
        | 'promoted'
        | 'deactivated'
        | 'error';
      pipeline_status:
        | 'discovered'
        | 'needs_verification'
        | 'rejected'
        | 'promoted'
        | 'stale';
      reject_reason:
        | 'not_internship'
        | 'company_unresolved'
        | 'source_untrusted'
        | 'duplicate'
        | 'inactive'
        | 'no_application_channel'
        | 'parse_error';
      source_trust: 'official' | 'verified_third_party' | 'discovery_signal';
      email_delivery_status:
        | 'not_required'
        | 'pending'
        | 'sent'
        | 'bounced'
        | 'failed'
        | 'skipped_unverified';
      ingest_status: 'ok' | 'partial' | 'failed';
      listing_origin: 'scraped' | 'internal' | 'manual';
      source_kind: 'api' | 'rss' | 'jsonld' | 'sitemap' | 'partner' | 'manual';
      application_status:
        | 'submitted'
        | 'under_review'
        | 'technical_assessment'
        | 'interview_scheduled'
        | 'offer_extended'
        | 'offer_accepted'
        | 'offer_declined'
        | 'rejected'
        | 'withdrawn';
      company_plan: 'Free' | 'Startup' | 'Corporate' | 'Enterprise';
      grade_level:
        | '1. Sınıf'
        | '2. Sınıf'
        | '3. Sınıf'
        | '4. Sınıf'
        | 'Yüksek Lisans / Mezun';
      hard_skill_domain:
        | 'Yazılım & Bilişim'
        | 'Tasarım & Görsel'
        | 'Mühendislik & Üretim'
        | 'İşletme, Pazarlama & Finans';
      internship_type:
        | 'Summer Mandatory'
        | 'Long-term'
        | 'Voluntary'
        | 'Part-time'
        | 'Any';
      listing_category: 'general' | 'public_sector' | 'global';
      listing_status: 'draft' | 'published' | 'closed' | 'archived';
      listing_term: 'Summer 2026' | 'Fall 2026' | 'Long-term 2026' | 'All Year';
      skill_category:
        | 'Frontend'
        | 'Backend'
        | 'Mobile'
        | 'Data/AI'
        | 'DevOps/Cloud'
        | 'UI/UX Design'
        | 'Cybersecurity'
        | 'Product & Agile'
        | 'Soft Skills'
        | 'Languages'
        | 'General';
      skill_level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
      user_role: 'student' | 'company' | 'admin';
      work_type: 'Remote' | 'Hybrid' | 'On-site';
      work_type_pref: 'Remote' | 'Hybrid' | 'On-site' | 'Any';
    };
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database['public'];

type TablesAndViews = PublicSchema['Tables'] & PublicSchema['Views'];

export type Tables<T extends keyof TablesAndViews> = TablesAndViews[T]['Row'];

export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update'];

export type Enums<T extends keyof PublicSchema['Enums']> =
  PublicSchema['Enums'][T];
