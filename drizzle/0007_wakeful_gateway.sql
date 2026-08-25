CREATE TABLE "dictionary_lookup_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"query" text NOT NULL,
	"scope" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dictionary_lookup_history" ADD CONSTRAINT "dictionary_lookup_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_dictionary_lookup_history_idx" ON "dictionary_lookup_history" USING btree ("user_id","created_at");