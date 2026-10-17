export type Json = string | number | boolean | null | {
    [key: string]: Json | undefined;
} | Json[];
export type Database = {
    "public": {
        Tables: {
            "account_entitlements": {
                Row: {
                    "expires_at": string | null;
                    "plan": string;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "expires_at"?: string | null;
                    "plan": string;
                    "user_id": string;
                };
                Update: {
                    "expires_at"?: string | null;
                    "plan"?: string;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "account_entitlements_plan_fkey";
                        columns: [
                            "plan"
                        ];
                        isOneToOne: false;
                        referencedRelation: "plan_policies";
                        referencedColumns: [
                            "plan"
                        ];
                    },
                    {
                        foreignKeyName: "account_entitlements_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: true;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "achievement_awards": {
                Row: {
                    "earned_at": string;
                    "milestone": number;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "earned_at"?: string;
                    "milestone": number;
                    "user_id": string;
                };
                Update: {
                    "earned_at"?: string;
                    "milestone"?: number;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "achievement_awards_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "app_feedback": {
                Row: {
                    "body": string;
                    "created_at": string;
                    "id": string;
                    "kind": string;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "body": string;
                    "created_at"?: string;
                    "id"?: string;
                    "kind": string;
                    "user_id": string;
                };
                Update: {
                    "body"?: string;
                    "created_at"?: string;
                    "id"?: string;
                    "kind"?: string;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "app_feedback_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "app_notifications": {
                Row: {
                    "actor_id": string | null;
                    "created_at": string;
                    "id": string;
                    "is_read": boolean;
                    "kind": string;
                    "resource_id": string | null;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "actor_id"?: string | null;
                    "created_at"?: string;
                    "id"?: string;
                    "is_read"?: boolean;
                    "kind": string;
                    "resource_id"?: string | null;
                    "user_id": string;
                };
                Update: {
                    "actor_id"?: string | null;
                    "created_at"?: string;
                    "id"?: string;
                    "is_read"?: boolean;
                    "kind"?: string;
                    "resource_id"?: string | null;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "app_notifications_actor_id_fkey";
                        columns: [
                            "actor_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "app_notifications_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "buddy_listings": {
                Row: {
                    "body": string;
                    "created_at": string;
                    "id": string;
                    "is_published": boolean;
                    "owner_id": string;
                    "subjects": (string)[];
                    "title": string;
                    "updated_at": string;
                };
                ComputedFields: never;
                Insert: {
                    "body": string;
                    "created_at"?: string;
                    "id"?: string;
                    "is_published"?: boolean;
                    "owner_id": string;
                    "subjects"?: (string)[];
                    "title": string;
                    "updated_at"?: string;
                };
                Update: {
                    "body"?: string;
                    "created_at"?: string;
                    "id"?: string;
                    "is_published"?: boolean;
                    "owner_id"?: string;
                    "subjects"?: (string)[];
                    "title"?: string;
                    "updated_at"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "buddy_listings_owner_id_fkey";
                        columns: [
                            "owner_id"
                        ];
                        isOneToOne: true;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "calendar_invitations": {
                Row: {
                    "created_at": string;
                    "event_id": string;
                    "response": string;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "created_at"?: string;
                    "event_id": string;
                    "response"?: string;
                    "user_id": string;
                };
                Update: {
                    "created_at"?: string;
                    "event_id"?: string;
                    "response"?: string;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "calendar_invitations_event_id_fkey";
                        columns: [
                            "event_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "scheduled_sessions";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "calendar_invitations_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "chat_messages": {
                Row: {
                    "author_id": string;
                    "body": string;
                    "client_id": string;
                    "created_at": string;
                    "edited_at": string | null;
                    "id": string;
                    "is_deleted": boolean;
                    "parent_id": string | null;
                    "thread_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "author_id": string;
                    "body": string;
                    "client_id": string;
                    "created_at"?: string;
                    "edited_at"?: string | null;
                    "id"?: string;
                    "is_deleted"?: boolean;
                    "parent_id"?: string | null;
                    "thread_id": string;
                };
                Update: {
                    "author_id"?: string;
                    "body"?: string;
                    "client_id"?: string;
                    "created_at"?: string;
                    "edited_at"?: string | null;
                    "id"?: string;
                    "is_deleted"?: boolean;
                    "parent_id"?: string | null;
                    "thread_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "chat_messages_author_id_fkey";
                        columns: [
                            "author_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "chat_messages_parent_id_fkey";
                        columns: [
                            "parent_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "chat_messages";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "chat_messages_thread_id_fkey";
                        columns: [
                            "thread_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "conversation_threads";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "community_admins": {
                Row: {
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "user_id": string;
                };
                Update: {
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "community_admins_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: true;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "community_reports": {
                Row: {
                    "created_at": string;
                    "id": string;
                    "reason": string;
                    "reporter_id": string;
                    "status": string;
                    "target_id": string;
                    "target_kind": string;
                };
                ComputedFields: never;
                Insert: {
                    "created_at"?: string;
                    "id"?: string;
                    "reason": string;
                    "reporter_id": string;
                    "status"?: string;
                    "target_id": string;
                    "target_kind": string;
                };
                Update: {
                    "created_at"?: string;
                    "id"?: string;
                    "reason"?: string;
                    "reporter_id"?: string;
                    "status"?: string;
                    "target_id"?: string;
                    "target_kind"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "community_reports_reporter_id_fkey";
                        columns: [
                            "reporter_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "contact_list_members": {
                Row: {
                    "contact_id": string;
                    "list_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "contact_id": string;
                    "list_id": string;
                };
                Update: {
                    "contact_id"?: string;
                    "list_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "contact_list_members_contact_id_fkey";
                        columns: [
                            "contact_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "contact_list_members_list_id_fkey";
                        columns: [
                            "list_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "contact_lists";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "contact_lists": {
                Row: {
                    "created_at": string;
                    "id": string;
                    "owner_id": string;
                    "title": string;
                };
                ComputedFields: never;
                Insert: {
                    "created_at"?: string;
                    "id"?: string;
                    "owner_id": string;
                    "title": string;
                };
                Update: {
                    "created_at"?: string;
                    "id"?: string;
                    "owner_id"?: string;
                    "title"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "contact_lists_owner_id_fkey";
                        columns: [
                            "owner_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "conversation_threads": {
                Row: {
                    "created_at": string;
                    "group_id": string | null;
                    "id": string;
                    "kind": string;
                    "owner_id": string | null;
                    "read_only": boolean;
                    "title": string;
                };
                ComputedFields: never;
                Insert: {
                    "created_at"?: string;
                    "group_id"?: string | null;
                    "id"?: string;
                    "kind": string;
                    "owner_id"?: string | null;
                    "read_only"?: boolean;
                    "title": string;
                };
                Update: {
                    "created_at"?: string;
                    "group_id"?: string | null;
                    "id"?: string;
                    "kind"?: string;
                    "owner_id"?: string | null;
                    "read_only"?: boolean;
                    "title"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "conversation_threads_group_id_fkey";
                        columns: [
                            "group_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "study_groups";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "conversation_threads_owner_id_fkey";
                        columns: [
                            "owner_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "day_stats": {
                Row: {
                    "local_date": string;
                    "session_count": number;
                    "total_seconds": number;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "local_date": string;
                    "session_count"?: number;
                    "total_seconds"?: number;
                    "user_id": string;
                };
                Update: {
                    "local_date"?: string;
                    "session_count"?: number;
                    "total_seconds"?: number;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "day_stats_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "email_invitation_reservations": {
                Row: {
                    "created_at": string;
                    "id": string;
                    "recipient_hash": string;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "created_at"?: string;
                    "id": string;
                    "recipient_hash": string;
                    "user_id": string;
                };
                Update: {
                    "created_at"?: string;
                    "id"?: string;
                    "recipient_hash"?: string;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "email_invitation_reservations_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "feed_posts": {
                Row: {
                    "attachments": NonNullable<Json>;
                    "author_id": string;
                    "body": string;
                    "created_at": string;
                    "edited_at": string | null;
                    "group_id": string | null;
                    "id": string;
                    "is_deleted": boolean;
                    "parent_id": string | null;
                };
                ComputedFields: never;
                Insert: {
                    "attachments"?: NonNullable<Json>;
                    "author_id": string;
                    "body": string;
                    "created_at"?: string;
                    "edited_at"?: string | null;
                    "group_id"?: string | null;
                    "id"?: string;
                    "is_deleted"?: boolean;
                    "parent_id"?: string | null;
                };
                Update: {
                    "attachments"?: NonNullable<Json>;
                    "author_id"?: string;
                    "body"?: string;
                    "created_at"?: string;
                    "edited_at"?: string | null;
                    "group_id"?: string | null;
                    "id"?: string;
                    "is_deleted"?: boolean;
                    "parent_id"?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "feed_posts_author_id_fkey";
                        columns: [
                            "author_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "feed_posts_group_id_fkey";
                        columns: [
                            "group_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "study_groups";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "feed_posts_parent_id_fkey";
                        columns: [
                            "parent_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "feed_posts";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "group_members": {
                Row: {
                    "accepted": boolean;
                    "created_at": string;
                    "group_id": string;
                    "role": string;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "accepted"?: boolean;
                    "created_at"?: string;
                    "group_id": string;
                    "role"?: string;
                    "user_id": string;
                };
                Update: {
                    "accepted"?: boolean;
                    "created_at"?: string;
                    "group_id"?: string;
                    "role"?: string;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "group_members_group_id_fkey";
                        columns: [
                            "group_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "study_groups";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "group_members_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "leaderboard_snapshots": {
                Row: {
                    "metric": string;
                    "period": string;
                    "rank": number;
                    "score": number;
                    "snapshot_at": string;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "metric": string;
                    "period": string;
                    "rank": number;
                    "score": number;
                    "snapshot_at": string;
                    "user_id": string;
                };
                Update: {
                    "metric"?: string;
                    "period"?: string;
                    "rank"?: number;
                    "score"?: number;
                    "snapshot_at"?: string;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "leaderboard_snapshots_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "partner_preferences": {
                Row: {
                    "is_favorite": boolean;
                    "notify": boolean;
                    "partner_id": string;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "is_favorite"?: boolean;
                    "notify"?: boolean;
                    "partner_id": string;
                    "user_id": string;
                };
                Update: {
                    "is_favorite"?: boolean;
                    "notify"?: boolean;
                    "partner_id"?: string;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "partner_preferences_partner_id_fkey";
                        columns: [
                            "partner_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "partner_preferences_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "plan_policies": {
                Row: {
                    "daily_room_seconds": number | null;
                    "max_pins": number | null;
                    "partner_rows": number | null;
                    "plan": string;
                };
                ComputedFields: never;
                Insert: {
                    "daily_room_seconds"?: number | null;
                    "max_pins"?: number | null;
                    "partner_rows"?: number | null;
                    "plan": string;
                };
                Update: {
                    "daily_room_seconds"?: number | null;
                    "max_pins"?: number | null;
                    "partner_rows"?: number | null;
                    "plan"?: string;
                };
                Relationships: [
                ];
            };
            "post_reactions": {
                Row: {
                    "emoji": string;
                    "post_id": string;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "emoji": string;
                    "post_id": string;
                    "user_id": string;
                };
                Update: {
                    "emoji"?: string;
                    "post_id"?: string;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "post_reactions_post_id_fkey";
                        columns: [
                            "post_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "feed_posts";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "post_reactions_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "profile_cards": {
                Row: {
                    "avatar_path": string | null;
                    "banner_path": string | null;
                    "bio": string;
                    "country_code": string;
                    "display_name": string;
                    "interests": (string)[];
                    "is_public": boolean;
                    "looking_for": (string)[];
                    "occupation": string;
                    "socials": NonNullable<Json>;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "avatar_path"?: string | null;
                    "banner_path"?: string | null;
                    "bio"?: string;
                    "country_code"?: string;
                    "display_name"?: string;
                    "interests"?: (string)[];
                    "is_public"?: boolean;
                    "looking_for"?: (string)[];
                    "occupation"?: string;
                    "socials"?: NonNullable<Json>;
                    "user_id": string;
                };
                Update: {
                    "avatar_path"?: string | null;
                    "banner_path"?: string | null;
                    "bio"?: string;
                    "country_code"?: string;
                    "display_name"?: string;
                    "interests"?: (string)[];
                    "is_public"?: boolean;
                    "looking_for"?: (string)[];
                    "occupation"?: string;
                    "socials"?: NonNullable<Json>;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "profile_cards_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: true;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "profile_follows": {
                Row: {
                    "created_at": string;
                    "follower_id": string;
                    "following_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "created_at"?: string;
                    "follower_id": string;
                    "following_id": string;
                };
                Update: {
                    "created_at"?: string;
                    "follower_id"?: string;
                    "following_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "profile_follows_follower_id_fkey";
                        columns: [
                            "follower_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "profile_follows_following_id_fkey";
                        columns: [
                            "following_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "profiles": {
                Row: {
                    "allow_direct_messages": boolean;
                    "ambience_enabled": boolean;
                    "comeback_shown_for_date": string | null;
                    "companion_preferences": NonNullable<Json>;
                    "created_at": string;
                    "display_name": string;
                    "first_name": string;
                    "id": string;
                    "last_name": string;
                    "leaderboard_opt_in": boolean;
                    "music_track": string | null;
                    "music_volume": number;
                    "onboarding_complete": boolean;
                    "personal_tile": NonNullable<Json>;
                    "reduce_motion": boolean;
                    "room_volume": number;
                    "selected_theme": string;
                    "show_streak": boolean;
                    "timezone": string;
                    "username": string;
                    "webcam_corner": string;
                    "webcam_enabled": boolean;
                };
                ComputedFields: never;
                Insert: {
                    "allow_direct_messages"?: boolean;
                    "ambience_enabled"?: boolean;
                    "comeback_shown_for_date"?: string | null;
                    "companion_preferences"?: NonNullable<Json>;
                    "created_at"?: string;
                    "display_name"?: string;
                    "first_name"?: string;
                    "id": string;
                    "last_name"?: string;
                    "leaderboard_opt_in"?: boolean;
                    "music_track"?: string | null;
                    "music_volume"?: number;
                    "onboarding_complete"?: boolean;
                    "personal_tile"?: NonNullable<Json>;
                    "reduce_motion"?: boolean;
                    "room_volume"?: number;
                    "selected_theme"?: string;
                    "show_streak"?: boolean;
                    "timezone"?: string;
                    "username": string;
                    "webcam_corner"?: string;
                    "webcam_enabled"?: boolean;
                };
                Update: {
                    "allow_direct_messages"?: boolean;
                    "ambience_enabled"?: boolean;
                    "comeback_shown_for_date"?: string | null;
                    "companion_preferences"?: NonNullable<Json>;
                    "created_at"?: string;
                    "display_name"?: string;
                    "first_name"?: string;
                    "id"?: string;
                    "last_name"?: string;
                    "leaderboard_opt_in"?: boolean;
                    "music_track"?: string | null;
                    "music_volume"?: number;
                    "onboarding_complete"?: boolean;
                    "personal_tile"?: NonNullable<Json>;
                    "reduce_motion"?: boolean;
                    "room_volume"?: number;
                    "selected_theme"?: string;
                    "show_streak"?: boolean;
                    "timezone"?: string;
                    "username"?: string;
                    "webcam_corner"?: string;
                    "webcam_enabled"?: boolean;
                };
                Relationships: [
                ];
            };
            "room_chat_messages": {
                Row: {
                    "author_id": string;
                    "body": string;
                    "client_id": string;
                    "created_at": string;
                    "id": string;
                    "kind": string;
                    "room_id": string;
                    "visit_id": string | null;
                };
                ComputedFields: never;
                Insert: {
                    "author_id": string;
                    "body": string;
                    "client_id": string;
                    "created_at"?: string;
                    "id"?: string;
                    "kind"?: string;
                    "room_id": string;
                    "visit_id"?: string | null;
                };
                Update: {
                    "author_id"?: string;
                    "body"?: string;
                    "client_id"?: string;
                    "created_at"?: string;
                    "id"?: string;
                    "kind"?: string;
                    "room_id"?: string;
                    "visit_id"?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "room_chat_messages_author_id_fkey";
                        columns: [
                            "author_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "room_chat_messages_room_id_fkey";
                        columns: [
                            "room_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "study_rooms";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "room_chat_messages_visit_id_fkey";
                        columns: [
                            "visit_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "room_visits";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "room_invites": {
                Row: {
                    "created_by": string;
                    "expires_at": string;
                    "id": string;
                    "remaining_uses": number;
                    "room_id": string;
                    "token_hash": string;
                };
                ComputedFields: never;
                Insert: {
                    "created_by": string;
                    "expires_at": string;
                    "id"?: string;
                    "remaining_uses": number;
                    "room_id": string;
                    "token_hash": string;
                };
                Update: {
                    "created_by"?: string;
                    "expires_at"?: string;
                    "id"?: string;
                    "remaining_uses"?: number;
                    "room_id"?: string;
                    "token_hash"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "room_invites_created_by_fkey";
                        columns: [
                            "created_by"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "room_invites_room_id_fkey";
                        columns: [
                            "room_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "study_rooms";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "room_members": {
                Row: {
                    "role": string;
                    "room_id": string;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "role"?: string;
                    "room_id": string;
                    "user_id": string;
                };
                Update: {
                    "role"?: string;
                    "room_id"?: string;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "room_members_room_id_fkey";
                        columns: [
                            "room_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "study_rooms";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "room_members_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "room_pins": {
                Row: {
                    "reason": string;
                    "room_id": string;
                    "target_id": string;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "reason"?: string;
                    "room_id": string;
                    "target_id": string;
                    "user_id": string;
                };
                Update: {
                    "reason"?: string;
                    "room_id"?: string;
                    "target_id"?: string;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "room_pins_room_id_fkey";
                        columns: [
                            "room_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "study_rooms";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "room_pins_target_id_fkey";
                        columns: [
                            "target_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "room_pins_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "room_visits": {
                Row: {
                    "id": string;
                    "joined_at": string;
                    "last_seen_at": string;
                    "left_at": string | null;
                    "room_id": string;
                    "sharing_video": boolean;
                    "status_message": string;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "id"?: string;
                    "joined_at"?: string;
                    "last_seen_at"?: string;
                    "left_at"?: string | null;
                    "room_id": string;
                    "sharing_video"?: boolean;
                    "status_message"?: string;
                    "user_id": string;
                };
                Update: {
                    "id"?: string;
                    "joined_at"?: string;
                    "last_seen_at"?: string;
                    "left_at"?: string | null;
                    "room_id"?: string;
                    "sharing_video"?: boolean;
                    "status_message"?: string;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "room_visits_room_id_fkey";
                        columns: [
                            "room_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "study_rooms";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "room_visits_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "saved_messages": {
                Row: {
                    "message_id": string;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "message_id": string;
                    "user_id": string;
                };
                Update: {
                    "message_id"?: string;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "saved_messages_message_id_fkey";
                        columns: [
                            "message_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "chat_messages";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "saved_messages_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "saved_posts": {
                Row: {
                    "post_id": string;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "post_id": string;
                    "user_id": string;
                };
                Update: {
                    "post_id"?: string;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "saved_posts_post_id_fkey";
                        columns: [
                            "post_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "feed_posts";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "saved_posts_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "scheduled_sessions": {
                Row: {
                    "capacity": number;
                    "created_at": string;
                    "creator_id": string;
                    "ends_at": string;
                    "id": string;
                    "is_cancelled": boolean;
                    "minutes": number;
                    "room_id": string;
                    "starts_at": string;
                    "title": string;
                };
                ComputedFields: never;
                Insert: {
                    "capacity": number;
                    "created_at"?: string;
                    "creator_id": string;
                    "ends_at": string;
                    "id"?: string;
                    "is_cancelled"?: boolean;
                    "minutes": number;
                    "room_id": string;
                    "starts_at": string;
                    "title": string;
                };
                Update: {
                    "capacity"?: number;
                    "created_at"?: string;
                    "creator_id"?: string;
                    "ends_at"?: string;
                    "id"?: string;
                    "is_cancelled"?: boolean;
                    "minutes"?: number;
                    "room_id"?: string;
                    "starts_at"?: string;
                    "title"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "scheduled_sessions_creator_id_fkey";
                        columns: [
                            "creator_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "scheduled_sessions_room_id_fkey";
                        columns: [
                            "room_id"
                        ];
                        isOneToOne: true;
                        referencedRelation: "study_rooms";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "session_bookings": {
                Row: {
                    "created_at": string;
                    "event_id": string;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "created_at"?: string;
                    "event_id": string;
                    "user_id": string;
                };
                Update: {
                    "created_at"?: string;
                    "event_id"?: string;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "session_bookings_event_id_fkey";
                        columns: [
                            "event_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "scheduled_sessions";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "session_bookings_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "sessions": {
                Row: {
                    "actual_seconds": number;
                    "companions": NonNullable<Json>;
                    "ended_at": string | null;
                    "ended_reason": string | null;
                    "freeze_used": boolean;
                    "id": string;
                    "last_heartbeat_at": string;
                    "local_date": string;
                    "planned_minutes": number | null;
                    "shared_room_id": string | null;
                    "started_at": string;
                    "streak_changed": boolean;
                    "task": string | null;
                    "theme_slug": string;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "actual_seconds"?: number;
                    "companions"?: NonNullable<Json>;
                    "ended_at"?: string | null;
                    "ended_reason"?: string | null;
                    "freeze_used"?: boolean;
                    "id"?: string;
                    "last_heartbeat_at"?: string;
                    "local_date": string;
                    "planned_minutes"?: number | null;
                    "shared_room_id"?: string | null;
                    "started_at"?: string;
                    "streak_changed"?: boolean;
                    "task"?: string | null;
                    "theme_slug"?: string;
                    "user_id": string;
                };
                Update: {
                    "actual_seconds"?: number;
                    "companions"?: NonNullable<Json>;
                    "ended_at"?: string | null;
                    "ended_reason"?: string | null;
                    "freeze_used"?: boolean;
                    "id"?: string;
                    "last_heartbeat_at"?: string;
                    "local_date"?: string;
                    "planned_minutes"?: number | null;
                    "shared_room_id"?: string | null;
                    "started_at"?: string;
                    "streak_changed"?: boolean;
                    "task"?: string | null;
                    "theme_slug"?: string;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "sessions_shared_room_id_fkey";
                        columns: [
                            "shared_room_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "study_rooms";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "sessions_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "streaks": {
                Row: {
                    "best_streak": number;
                    "current_streak": number;
                    "freezes_remaining": number;
                    "freezes_reset_at": string;
                    "last_active_date": string | null;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "best_streak"?: number;
                    "current_streak"?: number;
                    "freezes_remaining"?: number;
                    "freezes_reset_at": string;
                    "last_active_date"?: string | null;
                    "user_id": string;
                };
                Update: {
                    "best_streak"?: number;
                    "current_streak"?: number;
                    "freezes_remaining"?: number;
                    "freezes_reset_at"?: string;
                    "last_active_date"?: string | null;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "streaks_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: true;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "study_contacts": {
                Row: {
                    "accepted": boolean;
                    "created_at": string;
                    "id": string;
                    "recipient_id": string;
                    "requester_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "accepted"?: boolean;
                    "created_at"?: string;
                    "id"?: string;
                    "recipient_id": string;
                    "requester_id": string;
                };
                Update: {
                    "accepted"?: boolean;
                    "created_at"?: string;
                    "id"?: string;
                    "recipient_id"?: string;
                    "requester_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "study_contacts_recipient_id_fkey";
                        columns: [
                            "recipient_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "study_contacts_requester_id_fkey";
                        columns: [
                            "requester_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "study_groups": {
                Row: {
                    "created_at": string;
                    "description": string;
                    "id": string;
                    "is_private": boolean;
                    "name": string;
                    "owner_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "created_at"?: string;
                    "description"?: string;
                    "id"?: string;
                    "is_private"?: boolean;
                    "name": string;
                    "owner_id": string;
                };
                Update: {
                    "created_at"?: string;
                    "description"?: string;
                    "id"?: string;
                    "is_private"?: boolean;
                    "name"?: string;
                    "owner_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "study_groups_owner_id_fkey";
                        columns: [
                            "owner_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "study_rooms": {
                Row: {
                    "capacity": number;
                    "category": string;
                    "created_at": string;
                    "description": string;
                    "group_id": string | null;
                    "id": string;
                    "is_closed": boolean;
                    "is_private": boolean;
                    "name": string;
                    "owner_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "capacity"?: number;
                    "category"?: string;
                    "created_at"?: string;
                    "description"?: string;
                    "group_id"?: string | null;
                    "id"?: string;
                    "is_closed"?: boolean;
                    "is_private"?: boolean;
                    "name": string;
                    "owner_id": string;
                };
                Update: {
                    "capacity"?: number;
                    "category"?: string;
                    "created_at"?: string;
                    "description"?: string;
                    "group_id"?: string | null;
                    "id"?: string;
                    "is_closed"?: boolean;
                    "is_private"?: boolean;
                    "name"?: string;
                    "owner_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "study_rooms_group_id_fkey";
                        columns: [
                            "group_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "study_groups";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "study_rooms_owner_id_fkey";
                        columns: [
                            "owner_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "study_tasks": {
                Row: {
                    "created_at": string;
                    "due_date": string;
                    "id": string;
                    "is_done": boolean;
                    "title": string;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "created_at"?: string;
                    "due_date": string;
                    "id"?: string;
                    "is_done"?: boolean;
                    "title": string;
                    "user_id": string;
                };
                Update: {
                    "created_at"?: string;
                    "due_date"?: string;
                    "id"?: string;
                    "is_done"?: boolean;
                    "title"?: string;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "study_tasks_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "thread_members": {
                Row: {
                    "thread_id": string;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "thread_id": string;
                    "user_id": string;
                };
                Update: {
                    "thread_id"?: string;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "thread_members_thread_id_fkey";
                        columns: [
                            "thread_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "conversation_threads";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "thread_members_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "user_blocks": {
                Row: {
                    "blocked_id": string;
                    "blocker_id": string;
                    "created_at": string;
                };
                ComputedFields: never;
                Insert: {
                    "blocked_id": string;
                    "blocker_id": string;
                    "created_at"?: string;
                };
                Update: {
                    "blocked_id"?: string;
                    "blocker_id"?: string;
                    "created_at"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "user_blocks_blocked_id_fkey";
                        columns: [
                            "blocked_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "user_blocks_blocker_id_fkey";
                        columns: [
                            "blocker_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            "apply_streak_activity": {
                Args: {
                    "p_date": string;
                    "p_state": Json;
                };
                Returns: Json;
            };
            "calendar_mutate": {
                Args: {
                    "p_action": string;
                    "p_data": Json;
                };
                Returns: Json;
            };
            "calendar_read": {
                Args: {
                    "p_area": string;
                    "p_query"?: Json;
                };
                Returns: Json;
            };
            "community_dashboard": {
                Args: Record<PropertyKey, never>;
                Returns: Json;
            };
            "community_leaderboard": {
                Args: {
                    "p_cursor"?: Json;
                    "p_metric": string;
                    "p_period": string;
                };
                Returns: Json;
            };
            "community_mutate": {
                Args: {
                    "p_action": string;
                    "p_data": Json;
                };
                Returns: Json;
            };
            "community_read": {
                Args: {
                    "p_area": string;
                    "p_query"?: Json;
                };
                Returns: Json;
            };
            "community_read_base": {
                Args: {
                    "p_area": string;
                    "p_query"?: Json;
                };
                Returns: Json;
            };
            "community_recipients": {
                Args: {
                    "p_term"?: string;
                };
                Returns: Json;
            };
            "finish_study_session": {
                Args: {
                    "p_id": string;
                    "p_reason": string;
                };
                Returns: {
                    "actual_seconds": number;
                    "companions": NonNullable<Json>;
                    "ended_at": string | null;
                    "ended_reason": string | null;
                    "freeze_used": boolean;
                    "id": string;
                    "last_heartbeat_at": string;
                    "local_date": string;
                    "planned_minutes": number | null;
                    "shared_room_id": string | null;
                    "started_at": string;
                    "streak_changed": boolean;
                    "task": string | null;
                    "theme_slug": string;
                    "user_id": string;
                };
                SetofOptions: {
                    from: "*";
                    to: "sessions";
                    isOneToOne: true;
                    isSetofReturn: false;
                };
            };
            "join_room_with_goal": {
                Args: {
                    "p_goal"?: string;
                    "p_room": string;
                };
                Returns: Json;
            };
            "lookup_login_email": {
                Args: {
                    "p_lookup_secret": string;
                    "p_username": string;
                };
                Returns: string;
            };
            "maintain_study_leases": {
                Args: Record<PropertyKey, never>;
                Returns: Json;
            };
            "moderate_room": {
                Args: {
                    "p_room": string;
                    "p_target": string;
                };
                Returns: Json;
            };
            "read_room_chat": {
                Args: {
                    "p_room": string;
                };
                Returns: Json;
            };
            "read_visible_profile": {
                Args: {
                    "p_username": string;
                };
                Returns: Json;
            };
            "reserve_email_invitation": {
                Args: {
                    "p_id": string;
                    "p_recipient_hash": string;
                };
                Returns: boolean;
            };
            "send_room_chat": {
                Args: {
                    "p_body": string;
                    "p_client_id": string;
                    "p_room": string;
                };
                Returns: Json;
            };
            "start_study_session": {
                Args: {
                    "p_companions": Json;
                    "p_minutes": number;
                    "p_task": string;
                    "p_theme": string;
                };
                Returns: {
                    "actual_seconds": number;
                    "companions": NonNullable<Json>;
                    "ended_at": string | null;
                    "ended_reason": string | null;
                    "freeze_used": boolean;
                    "id": string;
                    "last_heartbeat_at": string;
                    "local_date": string;
                    "planned_minutes": number | null;
                    "shared_room_id": string | null;
                    "started_at": string;
                    "streak_changed": boolean;
                    "task": string | null;
                    "theme_slug": string;
                    "user_id": string;
                };
                SetofOptions: {
                    from: "*";
                    to: "sessions";
                    isOneToOne: true;
                    isSetofReturn: false;
                };
            };
            "study_days": {
                Args: {
                    "p_from": string;
                    "p_to": string;
                };
                Returns: Json;
            };
            "study_summary": {
                Args: Record<PropertyKey, never>;
                Returns: Json;
            };
            "valid_companion_selection": {
                Args: {
                    "selection": Json;
                };
                Returns: boolean;
            };
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};
type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];
export type Tables<DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | {
    schema: keyof DatabaseWithoutInternals;
}, TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"]) : never = never> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
    Row: infer R;
} ? R : never : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
    Row: infer R;
} ? R : never : never;
export type TablesInsert<DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | {
    schema: keyof DatabaseWithoutInternals;
}, TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] : never = never> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I;
} ? I : never : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I;
} ? I : never : never;
export type TablesUpdate<DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | {
    schema: keyof DatabaseWithoutInternals;
}, TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] : never = never> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U;
} ? U : never : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U;
} ? U : never : never;
export type Enums<DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | {
    schema: keyof DatabaseWithoutInternals;
}, EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"] : never = never> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName] : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions] : never;
export type CompositeTypes<PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] | {
    schema: keyof DatabaseWithoutInternals;
}, CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"] : never = never> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName] : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions] : never;
export const Constants = {
    "public": {
        Enums: {}
    }
} as const;
