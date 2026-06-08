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

export const words = pgTable(
  "words",
  {
    id: text("id").primaryKey(),
    languageCode: text("language_code").notNull(),
    targetText: text("target_text").notNull(),
    phoneticReading: jsonb("phonetic_reading").$type<string[]>().notNull(),
    definitions: jsonb("definitions").$type<string[]>().notNull(),
    linguisticMeta: jsonb("linguistic_meta").$type<{
      alternatives?: string[];
      partOfSpeech?: string[];
    }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("word_lang_target_idx").on(
      table.languageCode,
      table.targetText,
    ),
  ],
);

export const flashcards = pgTable(
  "flashcards",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    wordId: text("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    interval: integer("interval").default(0).notNull(),
    repetition: integer("repetition").default(0).notNull(),
    easiness: integer("easiness").default(250).notNull(),
    aiExampleContext: jsonb("ai_example_context").$type<{
      sentence: string;
      phonetic: string;
      translation: string;
      generatedAt: string;
    }>(),
    nextReviewAt: timestamp("next_review_at").defaultNow().notNull(),
    lastReviewedAt: timestamp("last_reviewed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("flashcard_user_word_idx").on(table.userId, table.wordId),
    index("user_review_queue_idx").on(table.userId, table.nextReviewAt),
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
  (table) => [index("user_ai_session_idx").on(table.userId, table.sessionType)],
);
