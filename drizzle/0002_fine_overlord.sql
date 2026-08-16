CREATE TABLE "dictionary_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"release_id" text NOT NULL,
	"source_entry_id" text NOT NULL,
	"traditional" text NOT NULL,
	"simplified" text NOT NULL,
	"pinyin" text NOT NULL,
	"definitions" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dictionary_releases" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"source_version" text NOT NULL,
	"source_url" text NOT NULL,
	"license_url" text NOT NULL,
	"source_released_at" timestamp NOT NULL,
	"source_entry_count" integer NOT NULL,
	"source_sha256" text NOT NULL,
	"imported_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dictionary_entries" ADD CONSTRAINT "dictionary_entries_release_id_dictionary_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."dictionary_releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dictionary_entry_release_source_idx" ON "dictionary_entries" USING btree ("release_id","source_entry_id");--> statement-breakpoint
CREATE INDEX "dictionary_entry_simplified_idx" ON "dictionary_entries" USING btree ("simplified");--> statement-breakpoint
CREATE INDEX "dictionary_entry_traditional_idx" ON "dictionary_entries" USING btree ("traditional");--> statement-breakpoint
CREATE UNIQUE INDEX "dictionary_release_source_version_idx" ON "dictionary_releases" USING btree ("source","source_version");