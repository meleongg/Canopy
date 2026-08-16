ALTER TABLE "flashcards" ADD COLUMN "language_code" text;--> statement-breakpoint
ALTER TABLE "flashcards" ADD COLUMN "target_text" text;--> statement-breakpoint
ALTER TABLE "flashcards" ADD COLUMN "phonetic_reading" jsonb;--> statement-breakpoint
ALTER TABLE "flashcards" ADD COLUMN "definitions" jsonb;--> statement-breakpoint
ALTER TABLE "flashcards" ADD COLUMN "linguistic_meta" jsonb;--> statement-breakpoint
UPDATE "flashcards" AS "flashcard"
SET
  "language_code" = "word"."language_code",
  "target_text" = COALESCE("flashcard"."target_text_override", "word"."target_text"),
  "phonetic_reading" = COALESCE("flashcard"."phonetic_reading_override", "word"."phonetic_reading"),
  "definitions" = COALESCE("flashcard"."definitions_override", "word"."definitions"),
  "linguistic_meta" = "word"."linguistic_meta"
FROM "words" AS "word"
WHERE "flashcard"."word_id" = "word"."id";--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "flashcards"
    GROUP BY "user_id", "language_code", "target_text"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot migrate duplicate learner vocabulary terms without manual resolution';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "flashcards" ALTER COLUMN "language_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "flashcards" ALTER COLUMN "target_text" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "flashcards" ALTER COLUMN "phonetic_reading" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "flashcards" ALTER COLUMN "definitions" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "flashcards" DROP CONSTRAINT "flashcards_word_id_words_id_fk";
--> statement-breakpoint
DROP INDEX "flashcard_user_word_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "flashcard_user_term_idx" ON "flashcards" USING btree ("user_id","language_code","target_text");--> statement-breakpoint
ALTER TABLE "flashcards" DROP COLUMN "word_id";--> statement-breakpoint
ALTER TABLE "flashcards" DROP COLUMN "target_text_override";--> statement-breakpoint
ALTER TABLE "flashcards" DROP COLUMN "phonetic_reading_override";--> statement-breakpoint
ALTER TABLE "flashcards" DROP COLUMN "definitions_override";--> statement-breakpoint
DROP TABLE "words";
