import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { ExampleContext } from "@/lib/example-contexts";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  theme: text("theme", { enum: ["light", "dark"] })
    .notNull()
    .default("dark"),
  importLanguage: text("import_language", {
    enum: ["zh-CN", "zh-HK", "fr-FR", "und"],
  })
    .notNull()
    .default("zh-CN"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const flashcards = pgTable(
  "flashcards",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    languageCode: text("language_code").notNull(),
    targetText: text("target_text").notNull(),
    phoneticReading: jsonb("phonetic_reading").$type<string[]>().notNull(),
    definitions: jsonb("definitions").$type<string[]>().notNull(),
    linguisticMeta: jsonb("linguistic_meta").$type<{
      alternatives?: string[];
      partOfSpeech?: string[];
    }>(),
    interval: integer("interval").default(0).notNull(),
    repetition: integer("repetition").default(0).notNull(),
    easiness: integer("easiness").default(250).notNull(),
    aiExampleContext: jsonb("ai_example_context").$type<
      ExampleContext[] | ExampleContext
    >(),
    archivedAt: timestamp("archived_at"),
    nextReviewAt: timestamp("next_review_at").defaultNow().notNull(),
    lastReviewedAt: timestamp("last_reviewed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("flashcard_user_term_idx").on(
      table.userId,
      table.languageCode,
      table.targetText,
    ),
    index("user_review_queue_idx").on(table.userId, table.nextReviewAt),
    index("user_archived_cards_idx").on(table.userId, table.archivedAt),
  ],
);

export const dictionaryReleases = pgTable(
  "dictionary_releases",
  {
    id: text("id").primaryKey(),
    source: text("source").notNull(),
    sourceVersion: text("source_version").notNull(),
    sourceUrl: text("source_url").notNull(),
    licenseUrl: text("license_url").notNull(),
    sourceReleasedAt: timestamp("source_released_at").notNull(),
    sourceEntryCount: integer("source_entry_count").notNull(),
    sourceSha256: text("source_sha256").notNull(),
    isActive: boolean("is_active").default(false).notNull(),
    importedAt: timestamp("imported_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("dictionary_release_source_version_idx").on(
      table.source,
      table.sourceVersion,
    ),
    uniqueIndex("dictionary_active_release_source_idx")
      .on(table.source)
      .where(sql`${table.isActive} = true`),
  ],
);

export const dictionaryEntries = pgTable(
  "dictionary_entries",
  {
    id: text("id").primaryKey(),
    releaseId: text("release_id")
      .notNull()
      .references(() => dictionaryReleases.id, { onDelete: "cascade" }),
    sourceEntryId: text("source_entry_id").notNull(),
    traditional: text("traditional").notNull(),
    simplified: text("simplified").notNull(),
    pinyin: text("pinyin").notNull(),
    definitions: jsonb("definitions").$type<string[]>().notNull(),
  },
  (table) => [
    uniqueIndex("dictionary_entry_release_source_idx").on(
      table.releaseId,
      table.sourceEntryId,
    ),
    index("dictionary_entry_simplified_idx").on(table.simplified),
    index("dictionary_entry_traditional_idx").on(table.traditional),
  ],
);

export const aiSessions = pgTable(
  "ai_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sessionType: text("session_type", {
      enum: ["story_sandbox", "helper_chat"],
    }).notNull(),
    languageCode: text("language_code").notNull(),
    seedWordIds: jsonb("seed_word_ids").$type<string[]>().notNull(),
    seedSnapshot: jsonb("seed_snapshot")
      .$type<
        {
          cardId: string;
          targetText: string;
          phoneticReading: string[];
          definitions: string[];
          languageCode: string;
        }[]
      >()
      .notNull()
      .default([]),
    contentHistory: jsonb("content_history")
      .$type<{
        storyParagraph?: string;
        messages?: {
          role: "system" | "user" | "assistant";
          content: string;
          timestamp: string;
        }[];
      }>()
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("user_ai_session_feed_idx").on(
      table.userId,
      table.createdAt,
      table.id,
    ),
    index("user_ai_session_type_feed_idx").on(
      table.userId,
      table.sessionType,
      table.createdAt,
      table.id,
    ),
  ],
);
