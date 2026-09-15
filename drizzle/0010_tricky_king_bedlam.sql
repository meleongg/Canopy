ALTER TABLE "user_preferences" ADD COLUMN "onboarding_completed_at" timestamp;--> statement-breakpoint
UPDATE "user_preferences"
SET "onboarding_completed_at" = now()
WHERE "onboarding_completed_at" IS NULL;
