ALTER TABLE "user_preferences" ADD COLUMN "proficiency" text DEFAULT 'intermediate' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "correction_style" text DEFAULT 'gentle' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "conversation_goal" text DEFAULT 'everyday' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "chinese_script" text DEFAULT 'match-cards' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "formality" text DEFAULT 'neutral' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "playback_speed" text DEFAULT '1' NOT NULL;