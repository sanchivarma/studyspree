export type Json = string | number | boolean | null | {
    [key: string]: Json | undefined;
} | Json[];
export type Database = {
    "public": {
        Tables: {
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
            "profiles": {
                Row: {
                    "ambience_enabled": boolean;
                    "comeback_shown_for_date": string | null;
                    "companion_preferences": NonNullable<Json>;
                    "created_at": string;
                    "display_name": string;
                    "first_name": string;
                    "id": string;
                    "last_name": string;
                    "music_track": string | null;
                    "music_volume": number;
                    "onboarding_complete": boolean;
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
                    "ambience_enabled"?: boolean;
                    "comeback_shown_for_date"?: string | null;
                    "companion_preferences"?: NonNullable<Json>;
                    "created_at"?: string;
                    "display_name"?: string;
                    "first_name"?: string;
                    "id": string;
                    "last_name"?: string;
                    "music_track"?: string | null;
                    "music_volume"?: number;
                    "onboarding_complete"?: boolean;
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
                    "ambience_enabled"?: boolean;
                    "comeback_shown_for_date"?: string | null;
                    "companion_preferences"?: NonNullable<Json>;
                    "created_at"?: string;
                    "display_name"?: string;
                    "first_name"?: string;
                    "id"?: string;
                    "last_name"?: string;
                    "music_track"?: string | null;
                    "music_volume"?: number;
                    "onboarding_complete"?: boolean;
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
                    "started_at"?: string;
                    "streak_changed"?: boolean;
                    "task"?: string | null;
                    "theme_slug"?: string;
                    "user_id"?: string;
                };
                Relationships: [
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
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            "lookup_login_email": {
                Args: {
                    "p_lookup_secret": string;
                    "p_username": string;
                };
                Returns: string;
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
