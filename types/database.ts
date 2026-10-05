// DO NOT EDIT BY HAND.
//
// Derived from supabase/migrations/*.sql in Phase 2 by parsing the migration
// files, because the sandbox that wrote this phase had no database to introspect.
// Once the schema is on a Supabase project, replace this file with the official
// output, which should match it closely:
//
//   npx supabase gen types typescript --project-id YOUR_REFERENCE_ID > types/database.ts
//
// Notes: bigint columns (view_count, bytes, audit_log.id) are typed as number to
// match the official generator, although PostgREST returns them as JSON numbers
// that can lose precision above 2^53. Generated columns do not exist in this schema.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ad_slots: {
        Row: {
          id: string
          slot_key: string
          name: string
          description: string | null
          width: number | null
          height: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slot_key: string
          name: string
          description?: string | null
          width?: number | null
          height?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slot_key?: string
          name?: string
          description?: string | null
          width?: number | null
          height?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      advertisements: {
        Row: {
          id: string
          slot_id: string
          advertiser: string
          name: string
          creative_media_id: string | null
          target_url: string
          disclosure_label: string
          is_active: boolean
          starts_at: string | null
          ends_at: string | null
          priority: number
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          slot_id: string
          advertiser: string
          name: string
          creative_media_id?: string | null
          target_url: string
          disclosure_label?: string
          is_active?: boolean
          starts_at?: string | null
          ends_at?: string | null
          priority?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          slot_id?: string
          advertiser?: string
          name?: string
          creative_media_id?: string | null
          target_url?: string
          disclosure_label?: string
          is_active?: boolean
          starts_at?: string | null
          ends_at?: string | null
          priority?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advertisements_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "ad_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advertisements_creative_media_id_fkey"
            columns: ["creative_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advertisements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_revisions: {
        Row: {
          id: string
          article_id: string
          revision_number: number
          body: Json
          editor_id: string | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          article_id: string
          revision_number: number
          body: Json
          editor_id?: string | null
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          article_id?: string
          revision_number?: number
          body?: Json
          editor_id?: string | null
          note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_revisions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_revisions_editor_id_fkey"
            columns: ["editor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_sources: {
        Row: {
          id: string
          article_id: string
          source_name: string
          url: string
          original_title: string | null
          author: string | null
          source_published_at: string | null
          discovered_at: string | null
          source_type: Database["public"]["Enums"]["source_kind"]
          license_note: string | null
          scraped_article_id: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          article_id: string
          source_name: string
          url: string
          original_title?: string | null
          author?: string | null
          source_published_at?: string | null
          discovered_at?: string | null
          source_type?: Database["public"]["Enums"]["source_kind"]
          license_note?: string | null
          scraped_article_id?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          article_id?: string
          source_name?: string
          url?: string
          original_title?: string | null
          author?: string | null
          source_published_at?: string | null
          discovered_at?: string | null
          source_type?: Database["public"]["Enums"]["source_kind"]
          license_note?: string | null
          scraped_article_id?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_sources_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_sources_scraped_article_id_fkey"
            columns: ["scraped_article_id"]
            isOneToOne: false
            referencedRelation: "scraped_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_tags: {
        Row: {
          article_id: string
          tag_id: string
          created_at: string
        }
        Insert: {
          article_id: string
          tag_id: string
          created_at?: string
        }
        Update: {
          article_id?: string
          tag_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_tags_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      article_topics: {
        Row: {
          article_id: string
          topic_id: string
          created_at: string
        }
        Insert: {
          article_id: string
          topic_id: string
          created_at?: string
        }
        Update: {
          article_id?: string
          topic_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_topics_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          id: string
          title: string
          subtitle: string | null
          slug: string
          body: Json
          excerpt: string | null
          author_id: string
          category_id: string | null
          status: Database["public"]["Enums"]["article_status"]
          published_at: string | null
          scheduled_for: string | null
          reading_time: number | null
          hero_media_id: string | null
          is_breaking: boolean
          breaking_priority: number
          is_top_story: boolean
          top_story_start: string | null
          top_story_end: string | null
          is_featured: boolean
          is_editors_pick: boolean
          geography: Database["public"]["Enums"]["geo_scope"]
          view_count: number
          seo_title: string | null
          meta_description: string | null
          canonical_url: string | null
          social_title: string | null
          social_description: string | null
          social_image_id: string | null
          noindex: boolean
          search_vector: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          title: string
          subtitle?: string | null
          slug: string
          body?: Json
          excerpt?: string | null
          author_id: string
          category_id?: string | null
          status?: Database["public"]["Enums"]["article_status"]
          published_at?: string | null
          scheduled_for?: string | null
          reading_time?: number | null
          hero_media_id?: string | null
          is_breaking?: boolean
          breaking_priority?: number
          is_top_story?: boolean
          top_story_start?: string | null
          top_story_end?: string | null
          is_featured?: boolean
          is_editors_pick?: boolean
          geography?: Database["public"]["Enums"]["geo_scope"]
          view_count?: number
          seo_title?: string | null
          meta_description?: string | null
          canonical_url?: string | null
          social_title?: string | null
          social_description?: string | null
          social_image_id?: string | null
          noindex?: boolean
          search_vector?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          subtitle?: string | null
          slug?: string
          body?: Json
          excerpt?: string | null
          author_id?: string
          category_id?: string | null
          status?: Database["public"]["Enums"]["article_status"]
          published_at?: string | null
          scheduled_for?: string | null
          reading_time?: number | null
          hero_media_id?: string | null
          is_breaking?: boolean
          breaking_priority?: number
          is_top_story?: boolean
          top_story_start?: string | null
          top_story_end?: string | null
          is_featured?: boolean
          is_editors_pick?: boolean
          geography?: Database["public"]["Enums"]["geo_scope"]
          view_count?: number
          seo_title?: string | null
          meta_description?: string | null
          canonical_url?: string | null
          social_title?: string | null
          social_description?: string | null
          social_image_id?: string | null
          noindex?: boolean
          search_vector?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_hero_media_id_fkey"
            columns: ["hero_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_social_image_id_fkey"
            columns: ["social_image_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          id: number
          actor_id: string | null
          action: string
          entity: string
          entity_id: string | null
          diff: Json | null
          created_at: string
        }
        Insert: {
          id?: never
          actor_id?: string | null
          action: string
          entity: string
          entity_id?: string | null
          diff?: Json | null
          created_at?: string
        }
        Update: {
          id?: never
          actor_id?: string | null
          action?: string
          entity?: string
          entity_id?: string | null
          diff?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          parent_id: string | null
          seo_title: string | null
          seo_description: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          parent_id?: string | null
          seo_title?: string | null
          seo_description?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          parent_id?: string | null
          seo_title?: string | null
          seo_description?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cluster_members: {
        Row: {
          cluster_id: string
          scraped_article_id: string
          similarity: number | null
          is_primary: boolean
          added_at: string
        }
        Insert: {
          cluster_id: string
          scraped_article_id: string
          similarity?: number | null
          is_primary?: boolean
          added_at?: string
        }
        Update: {
          cluster_id?: string
          scraped_article_id?: string
          similarity?: number | null
          is_primary?: boolean
          added_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cluster_members_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "story_clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cluster_members_scraped_article_id_fkey"
            columns: ["scraped_article_id"]
            isOneToOne: false
            referencedRelation: "scraped_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          start_at: string
          end_at: string | null
          timezone: string
          location: string | null
          city: string | null
          country: string | null
          mode: Database["public"]["Enums"]["event_mode"]
          organizer: string | null
          website: string | null
          registration_url: string | null
          ticket_info: string | null
          image_media_id: string | null
          geography: Database["public"]["Enums"]["geo_scope"]
          is_published: boolean
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          start_at: string
          end_at?: string | null
          timezone?: string
          location?: string | null
          city?: string | null
          country?: string | null
          mode: Database["public"]["Enums"]["event_mode"]
          organizer?: string | null
          website?: string | null
          registration_url?: string | null
          ticket_info?: string | null
          image_media_id?: string | null
          geography?: Database["public"]["Enums"]["geo_scope"]
          is_published?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          start_at?: string
          end_at?: string | null
          timezone?: string
          location?: string | null
          city?: string | null
          country?: string | null
          mode?: Database["public"]["Enums"]["event_mode"]
          organizer?: string | null
          website?: string | null
          registration_url?: string | null
          ticket_info?: string | null
          image_media_id?: string | null
          geography?: Database["public"]["Enums"]["geo_scope"]
          is_published?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_image_media_id_fkey"
            columns: ["image_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          id: string
          public_id: string
          url: string
          width: number | null
          height: number | null
          format: string | null
          bytes: number | null
          alt: string
          is_decorative: boolean
          caption: string | null
          credit: string | null
          source: string | null
          license: string | null
          focal_x: number | null
          focal_y: number | null
          folder: string | null
          uploaded_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          public_id: string
          url: string
          width?: number | null
          height?: number | null
          format?: string | null
          bytes?: number | null
          alt?: string
          is_decorative?: boolean
          caption?: string | null
          credit?: string | null
          source?: string | null
          license?: string | null
          focal_x?: number | null
          focal_y?: number | null
          folder?: string | null
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          public_id?: string
          url?: string
          width?: number | null
          height?: number | null
          format?: string | null
          bytes?: number | null
          alt?: string
          is_decorative?: boolean
          caption?: string | null
          credit?: string | null
          source?: string | null
          license?: string | null
          focal_x?: number | null
          focal_y?: number | null
          folder?: string | null
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      navigation_items: {
        Row: {
          id: string
          area: Database["public"]["Enums"]["navigation_area"]
          label: string
          href: string
          parent_id: string | null
          sort_order: number
          is_visible: boolean
          opens_in_new_tab: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          area: Database["public"]["Enums"]["navigation_area"]
          label: string
          href: string
          parent_id?: string | null
          sort_order?: number
          is_visible?: boolean
          opens_in_new_tab?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          area?: Database["public"]["Enums"]["navigation_area"]
          label?: string
          href?: string
          parent_id?: string | null
          sort_order?: number
          is_visible?: boolean
          opens_in_new_tab?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "navigation_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "navigation_items"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          id: string
          email: string
          status: Database["public"]["Enums"]["subscriber_status"]
          source: string | null
          confirmed_at: string | null
          unsubscribed_at: string | null
          confirmation_token: string
          unsubscribe_token: string
          consent_text: string
          consent_version: string
          consent_ip_hash: string | null
          consent_user_agent: string | null
          consented_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          status?: Database["public"]["Enums"]["subscriber_status"]
          source?: string | null
          confirmed_at?: string | null
          unsubscribed_at?: string | null
          confirmation_token?: string
          unsubscribe_token?: string
          consent_text: string
          consent_version: string
          consent_ip_hash?: string | null
          consent_user_agent?: string | null
          consented_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          status?: Database["public"]["Enums"]["subscriber_status"]
          source?: string | null
          confirmed_at?: string | null
          unsubscribed_at?: string | null
          confirmation_token?: string
          unsubscribe_token?: string
          consent_text?: string
          consent_version?: string
          consent_ip_hash?: string | null
          consent_user_agent?: string | null
          consented_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_review_media: {
        Row: {
          review_id: string
          media_id: string
          sort_order: number
          created_at: string
        }
        Insert: {
          review_id: string
          media_id: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          review_id?: string
          media_id?: string
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_review_media_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "product_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_review_media_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      product_review_points: {
        Row: {
          id: string
          review_id: string
          kind: Database["public"]["Enums"]["review_point_kind"]
          body: string
          tested: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          review_id: string
          kind: Database["public"]["Enums"]["review_point_kind"]
          body: string
          tested?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          review_id?: string
          kind?: Database["public"]["Enums"]["review_point_kind"]
          body?: string
          tested?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_review_points_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "product_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          id: string
          product_id: string
          slug: string
          reviewer_id: string
          version_reviewed: string
          summary: string | null
          verdict: string | null
          rating: number | null
          pricing: string | null
          pricing_tested: boolean
          free_tier_notes: string | null
          free_tier_tested: boolean
          tested_on: string | null
          status: Database["public"]["Enums"]["article_status"]
          published_at: string | null
          seo_title: string | null
          meta_description: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          product_id: string
          slug: string
          reviewer_id: string
          version_reviewed: string
          summary?: string | null
          verdict?: string | null
          rating?: number | null
          pricing?: string | null
          pricing_tested?: boolean
          free_tier_notes?: string | null
          free_tier_tested?: boolean
          tested_on?: string | null
          status?: Database["public"]["Enums"]["article_status"]
          published_at?: string | null
          seo_title?: string | null
          meta_description?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          slug?: string
          reviewer_id?: string
          version_reviewed?: string
          summary?: string | null
          verdict?: string | null
          rating?: number | null
          pricing?: string | null
          pricing_tested?: boolean
          free_tier_notes?: string | null
          free_tier_tested?: boolean
          tested_on?: string | null
          status?: Database["public"]["Enums"]["article_status"]
          published_at?: string | null
          seo_title?: string | null
          meta_description?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          id: string
          name: string
          slug: string
          category: string | null
          vendor: string
          website: string | null
          description: string | null
          is_published: boolean
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          category?: string | null
          vendor: string
          website?: string | null
          description?: string | null
          is_published?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          category?: string | null
          vendor?: string
          website?: string | null
          description?: string | null
          is_published?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["user_role"]
          is_active: boolean
          display_name: string
          slug: string
          avatar_media_id: string | null
          bio: string | null
          specialization: string | null
          social_links: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          is_active?: boolean
          display_name: string
          slug: string
          avatar_media_id?: string | null
          bio?: string | null
          specialization?: string | null
          social_links?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          is_active?: boolean
          display_name?: string
          slug?: string
          avatar_media_id?: string | null
          bio?: string | null
          specialization?: string | null
          social_links?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_avatar_media_id_fkey"
            columns: ["avatar_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      redirects: {
        Row: {
          id: string
          from_path: string
          to_path: string
          status_code: number
          is_active: boolean
          note: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          from_path: string
          to_path: string
          status_code?: number
          is_active?: boolean
          note?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          from_path?: string
          to_path?: string
          status_code?: number
          is_active?: boolean
          note?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "redirects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scraped_articles: {
        Row: {
          id: string
          source_id: string
          url: string
          canonical_url: string
          title: string
          author: string | null
          published_at: string | null
          discovered_at: string
          summary: string | null
          language: string | null
          content_hash: string | null
          geography: Database["public"]["Enums"]["geo_scope"]
          status: Database["public"]["Enums"]["scrape_status"]
          reviewed_by: string | null
          reviewed_at: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          source_id: string
          url: string
          canonical_url: string
          title: string
          author?: string | null
          published_at?: string | null
          discovered_at?: string
          summary?: string | null
          language?: string | null
          content_hash?: string | null
          geography?: Database["public"]["Enums"]["geo_scope"]
          status?: Database["public"]["Enums"]["scrape_status"]
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          source_id?: string
          url?: string
          canonical_url?: string
          title?: string
          author?: string | null
          published_at?: string | null
          discovered_at?: string
          summary?: string | null
          language?: string | null
          content_hash?: string | null
          geography?: Database["public"]["Enums"]["geo_scope"]
          status?: Database["public"]["Enums"]["scrape_status"]
          reviewed_by?: string | null
          reviewed_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scraped_articles_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scraped_articles_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          value: Json
          description: string | null
          is_public: boolean
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          key: string
          value: Json
          description?: string | null
          is_public?: boolean
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Json
          description?: string | null
          is_public?: boolean
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_links: {
        Row: {
          id: string
          platform: string
          label: string
          url: string
          sort_order: number
          is_visible: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          platform: string
          label: string
          url: string
          sort_order?: number
          is_visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          platform?: string
          label?: string
          url?: string
          sort_order?: number
          is_visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sources: {
        Row: {
          id: string
          name: string
          slug: string
          kind: Database["public"]["Enums"]["source_kind"]
          homepage_url: string
          feed_url: string | null
          country: string | null
          language: string
          is_active: boolean
          respect_robots: boolean
          crawl_interval_minutes: number
          last_fetched_at: string | null
          last_status_code: number | null
          last_error: string | null
          license_note: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          kind?: Database["public"]["Enums"]["source_kind"]
          homepage_url: string
          feed_url?: string | null
          country?: string | null
          language?: string
          is_active?: boolean
          respect_robots?: boolean
          crawl_interval_minutes?: number
          last_fetched_at?: string | null
          last_status_code?: number | null
          last_error?: string | null
          license_note?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          kind?: Database["public"]["Enums"]["source_kind"]
          homepage_url?: string
          feed_url?: string | null
          country?: string | null
          language?: string
          is_active?: boolean
          respect_robots?: boolean
          crawl_interval_minutes?: number
          last_fetched_at?: string | null
          last_status_code?: number | null
          last_error?: string | null
          license_note?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      startup_funding_rounds: {
        Row: {
          id: string
          startup_id: string
          round_type: Database["public"]["Enums"]["funding_round_type"]
          announced_on: string | null
          amount: number | null
          currency: string | null
          lead_investors: string[]
          investors: string[]
          source_url: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          startup_id: string
          round_type: Database["public"]["Enums"]["funding_round_type"]
          announced_on?: string | null
          amount?: number | null
          currency?: string | null
          lead_investors?: string[]
          investors?: string[]
          source_url: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          startup_id?: string
          round_type?: Database["public"]["Enums"]["funding_round_type"]
          announced_on?: string | null
          amount?: number | null
          currency?: string | null
          lead_investors?: string[]
          investors?: string[]
          source_url?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "startup_funding_rounds_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      startups: {
        Row: {
          id: string
          name: string
          slug: string
          logo_media_id: string | null
          country: string | null
          city: string | null
          founders: Json
          founded_year: number | null
          website: string | null
          industry: string | null
          product: string | null
          description: string | null
          technologies: string[]
          geography: Database["public"]["Enums"]["geo_scope"]
          is_published: boolean
          verified_identity: boolean
          verified_founders: boolean
          verified_product: boolean
          verified_funding: boolean
          verified_at: string | null
          verified_by: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_media_id?: string | null
          country?: string | null
          city?: string | null
          founders?: Json
          founded_year?: number | null
          website?: string | null
          industry?: string | null
          product?: string | null
          description?: string | null
          technologies?: string[]
          geography?: Database["public"]["Enums"]["geo_scope"]
          is_published?: boolean
          verified_identity?: boolean
          verified_founders?: boolean
          verified_product?: boolean
          verified_funding?: boolean
          verified_at?: string | null
          verified_by?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_media_id?: string | null
          country?: string | null
          city?: string | null
          founders?: Json
          founded_year?: number | null
          website?: string | null
          industry?: string | null
          product?: string | null
          description?: string | null
          technologies?: string[]
          geography?: Database["public"]["Enums"]["geo_scope"]
          is_published?: boolean
          verified_identity?: boolean
          verified_founders?: boolean
          verified_product?: boolean
          verified_funding?: boolean
          verified_at?: string | null
          verified_by?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "startups_logo_media_id_fkey"
            columns: ["logo_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "startups_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "startups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      story_clusters: {
        Row: {
          id: string
          headline: string
          summary: string | null
          status: Database["public"]["Enums"]["cluster_status"]
          geography: Database["public"]["Enums"]["geo_scope"]
          score: number
          first_seen_at: string
          last_seen_at: string
          assigned_to: string | null
          article_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          headline: string
          summary?: string | null
          status?: Database["public"]["Enums"]["cluster_status"]
          geography?: Database["public"]["Enums"]["geo_scope"]
          score?: number
          first_seen_at?: string
          last_seen_at?: string
          assigned_to?: string | null
          article_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          headline?: string
          summary?: string | null
          status?: Database["public"]["Enums"]["cluster_status"]
          geography?: Database["public"]["Enums"]["geo_scope"]
          score?: number
          first_seen_at?: string
          last_seen_at?: string
          assigned_to?: string | null
          article_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_clusters_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_clusters_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      trending_scores: {
        Row: {
          article_id: string
          score: number
          components: Json
          computed_at: string
        }
        Insert: {
          article_id: string
          score?: number
          components?: Json
          computed_at?: string
        }
        Update: {
          article_id?: string
          score?: number
          components?: Json
          computed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trending_scores_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: true
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      publish_due_articles: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
    }
    Enums: {
      article_status:
        | "draft"
        | "review"
        | "approved"
        | "scheduled"
        | "published"
        | "archived"
      cluster_status:
        | "open"
        | "assigned"
        | "published"
        | "dismissed"
      event_mode:
        | "online"
        | "in_person"
        | "hybrid"
      funding_round_type:
        | "grant"
        | "pre_seed"
        | "seed"
        | "series_a"
        | "series_b"
        | "series_c_plus"
        | "debt"
        | "acquisition"
        | "other"
      geo_scope:
        | "kenya"
        | "africa"
        | "worldwide"
        | "none"
      navigation_area:
        | "header"
        | "footer"
        | "legal"
      review_point_kind:
        | "pro"
        | "con"
      scrape_status:
        | "new"
        | "reviewed"
        | "used"
        | "rejected"
        | "duplicate"
      source_kind:
        | "news_report"
        | "press_release"
        | "official_blog"
        | "blog_post"
        | "documentation"
        | "changelog"
        | "research_paper"
        | "code_repository"
        | "social_post"
        | "dataset"
        | "other"
      subscriber_status:
        | "pending"
        | "confirmed"
        | "unsubscribed"
        | "bounced"
        | "complained"
      user_role:
        | "super_admin"
        | "administrator"
        | "editor"
        | "author"
        | "reporter"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database["public"]

export type Tables<
  T extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][T]["Row"]

export type TablesInsert<
  T extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][T]["Insert"]

export type TablesUpdate<
  T extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][T]["Update"]

export type Enums<
  T extends keyof DefaultSchema["Enums"],
> = DefaultSchema["Enums"][T]

export const Constants = {
  public: {
    Enums: {
      article_status: ["draft", "review", "approved", "scheduled", "published", "archived"],
      cluster_status: ["open", "assigned", "published", "dismissed"],
      event_mode: ["online", "in_person", "hybrid"],
      funding_round_type: ["grant", "pre_seed", "seed", "series_a", "series_b", "series_c_plus", "debt", "acquisition", "other"],
      geo_scope: ["kenya", "africa", "worldwide", "none"],
      navigation_area: ["header", "footer", "legal"],
      review_point_kind: ["pro", "con"],
      scrape_status: ["new", "reviewed", "used", "rejected", "duplicate"],
      source_kind: ["news_report", "press_release", "official_blog", "blog_post", "documentation", "changelog", "research_paper", "code_repository", "social_post", "dataset", "other"],
      subscriber_status: ["pending", "confirmed", "unsubscribed", "bounced", "complained"],
      user_role: ["super_admin", "administrator", "editor", "author", "reporter"],
    },
  },
} as const
