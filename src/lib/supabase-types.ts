// ============================================================================
// SEEDBAY: SUPABASE DATABASE TYPES
// ============================================================================

// Types pour la base de données (à générer avec Supabase CLI)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          role: 'buyer' | 'vendor' | 'admin'
          seller_verified: boolean
          seller_badge: 'bronze' | 'silver' | 'gold' | null
          seller_bio: string | null
          seller_website: string | null
          stripe_account_id: string | null
          avg_rating: number
          total_sales: number
          total_projects_sold: number
          created_at: string
          updated_at: string
          email_verified_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['users']['Row']>
        Update: Partial<Database['public']['Tables']['users']['Row']>
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          seller_id: string
          title: string
          slug: string
          description: string
          problem: string
          solution: string
          maturity_level: 'idea' | 'roadmap' | 'mvp' | 'production'
          tech_stack: string[]
          license_type: 'exclusive' | 'non-exclusive'
          category: string
          tags: string[] | null
          price: number
          currency: string
          thumbnail_url: string | null
          status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived'
          rejection_reason: string | null
          is_featured: boolean
          featured_until: string | null
          view_count: number
          purchase_count: number
          avg_rating: number
          review_count: number
          created_at: string
          updated_at: string
          published_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['projects']['Row']>
        Update: Partial<Database['public']['Tables']['projects']['Row']>
        Relationships: [
          {
            foreignKeyName: 'seller_id',
            columns: ['seller_id'],
            referencedRelation: 'users',
            referencedColumns: ['id'],
          },
        ]
      }
      orders: {
        Row: {
          id: string
          project_id: string
          user_id: string
          stripe_payment_intent_id: string
          amount: number
          currency: string | null
          status: 'pending' | 'paid' | 'failed' | 'refunded'
          created_at: string
          updated_at: string | null
          stripe_charge_id: string | null
        }
        Insert: Partial<Database['public']['Tables']['orders']['Row']>
        Update: Partial<Database['public']['Tables']['orders']['Row']>
        Relationships: [
          {
            foreignKeyName: 'project_id',
            columns: ['project_id'],
            referencedRelation: 'projects',
            referencedColumns: ['id'],
          },
          {
            foreignKeyName: 'user_id',
            columns: ['user_id'],
            referencedRelation: 'users',
            referencedColumns: ['id'],
          },
        ]
      }
      purchases: {
        Row: {
          id: string
          user_id: string
          project_id: string
          order_id: string
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['purchases']['Row']>
        Update: Partial<Database['public']['Tables']['purchases']['Row']>
        Relationships: [
          {
            foreignKeyName: 'user_id',
            columns: ['user_id'],
            referencedRelation: 'users',
            referencedColumns: ['id'],
          },
          {
            foreignKeyName: 'project_id',
            columns: ['project_id'],
            referencedRelation: 'projects',
            referencedColumns: ['id'],
          },
          {
            foreignKeyName: 'order_id',
            columns: ['order_id'],
            referencedRelation: 'orders',
            referencedColumns: ['id'],
          },
        ]
      }
      deliverables: {
        Row: {
          id: string
          order_id: string
          url: string
          delivered_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['deliverables']['Row']>
        Update: Partial<Database['public']['Tables']['deliverables']['Row']>
        Relationships: [
          {
            foreignKeyName: 'order_id',
            columns: ['order_id'],
            referencedRelation: 'orders',
            referencedColumns: ['id'],
          },
        ]
      }
      reviews: {
        Row: {
          id: string
          order_id: string
          reviewer_id: string
          project_id: string
          rating: number
          comment: string | null
          helpful_count: number
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['reviews']['Row']>
        Update: Partial<Database['public']['Tables']['reviews']['Row']>
        Relationships: [
          {
            foreignKeyName: 'order_id',
            columns: ['order_id'],
            referencedRelation: 'orders',
            referencedColumns: ['id'],
          },
          {
            foreignKeyName: 'reviewer_id',
            columns: ['reviewer_id'],
            referencedRelation: 'users',
            referencedColumns: ['id'],
          },
          {
            foreignKeyName: 'project_id',
            columns: ['project_id'],
            referencedRelation: 'projects',
            referencedColumns: ['id'],
          },
        ]
      }
      favorites: {
        Row: {
          id: string
          user_id: string
          project_id: string
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['favorites']['Row']>
        Update: Partial<Database['public']['Tables']['favorites']['Row']>
        Relationships: [
          {
            foreignKeyName: 'user_id',
            columns: ['user_id'],
            referencedRelation: 'users',
            referencedColumns: ['id'],
          },
          {
            foreignKeyName: 'project_id',
            columns: ['project_id'],
            referencedRelation: 'projects',
            referencedColumns: ['id'],
          },
        ]
      }
      messages: {
        Row: {
          id: string
          order_id: string | null
          sender_id: string
          recipient_id: string
          subject: string
          body: string
          is_read: boolean
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['messages']['Row']>
        Update: Partial<Database['public']['Tables']['messages']['Row']>
        Relationships: [
          {
            foreignKeyName: 'order_id',
            columns: ['order_id'],
            referencedRelation: 'orders',
            referencedColumns: ['id'],
          },
          {
            foreignKeyName: 'sender_id',
            columns: ['sender_id'],
            referencedRelation: 'users',
            referencedColumns: ['id'],
          },
          {
            foreignKeyName: 'recipient_id',
            columns: ['recipient_id'],
            referencedRelation: 'users',
            referencedColumns: ['id'],
          },
        ]
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          resource_type: string | null
          resource_id: string | null
          old_values: Record<string, unknown> | null
          new_values: Record<string, unknown> | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['audit_logs']['Row']>
        Update: Partial<Database['public']['Tables']['audit_logs']['Row']>
        Relationships: [
          {
            foreignKeyName: 'user_id',
            columns: ['user_id'],
            referencedRelation: 'users',
            referencedColumns: ['id'],
          },
        ]
      }
      downloads: {
        Row: {
          id: string
          order_id: string
          deliverable_id: string
          downloaded_at: string
          download_ip: string | null
          download_user_agent: string | null
        }
        Insert: Partial<Database['public']['Tables']['downloads']['Row']>
        Update: Partial<Database['public']['Tables']['downloads']['Row']>
        Relationships: [
          {
            foreignKeyName: 'order_id',
            columns: ['order_id'],
            referencedRelation: 'orders',
            referencedColumns: ['id'],
          },
          {
            foreignKeyName: 'deliverable_id',
            columns: ['deliverable_id'],
            referencedRelation: 'deliverables',
            referencedColumns: ['id'],
          },
        ]
      }
      stripe_events: {
        Row: {
          id: string
          event_id: string
          event_type: string
          payload: Record<string, unknown>
          status: 'received' | 'processed' | 'failed'
          created_at: string
          processed_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['stripe_events']['Row']>
        Update: Partial<Database['public']['Tables']['stripe_events']['Row']>
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
