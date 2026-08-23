CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "dictionary_entry_pinyin_idx" ON "dictionary_entries" USING btree ("pinyin");--> statement-breakpoint
CREATE INDEX "dictionary_entry_english_trgm_idx" ON "dictionary_entries" USING gin ((lower("definitions"::text)) gin_trgm_ops);
