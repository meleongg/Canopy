UPDATE "user_preferences"
SET "chinese_script" = 'simplified'
WHERE "chinese_script" = 'match-cards';--> statement-breakpoint
ALTER TABLE "user_preferences" ALTER COLUMN "chinese_script" SET DEFAULT 'simplified';
