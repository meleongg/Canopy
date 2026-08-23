DROP INDEX "user_ai_session_idx";--> statement-breakpoint
CREATE INDEX "user_ai_session_feed_idx" ON "ai_sessions" USING btree ("user_id","created_at","id");--> statement-breakpoint
CREATE INDEX "user_ai_session_type_feed_idx" ON "ai_sessions" USING btree ("user_id","session_type","created_at","id");