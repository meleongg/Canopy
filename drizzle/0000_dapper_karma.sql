ALTER TABLE "flashcards"
  ADD COLUMN IF NOT EXISTS "target_text_override" text,
  ADD COLUMN IF NOT EXISTS "phonetic_reading_override" jsonb,
  ADD COLUMN IF NOT EXISTS "definitions_override" jsonb,
  ADD COLUMN IF NOT EXISTS "archived_at" timestamp;
--> statement-breakpoint
ALTER TABLE "ai_sessions"
  ADD COLUMN IF NOT EXISTS "seed_snapshot" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_archived_cards_idx"
  ON "flashcards" USING btree ("user_id", "archived_at");
