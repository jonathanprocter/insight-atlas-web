import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Books table - stores uploaded book metadata and extracted text
 */
export const books = mysqlTable("books", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  author: varchar("author", { length: 255 }),
  fileUrl: text("fileUrl"),
  fileKey: varchar("fileKey", { length: 255 }),
  fileType: varchar("fileType", { length: 20 }),
  extractedText: text("extractedText"), // Full extracted text content
  wordCount: int("wordCount").default(0),
  pageCount: int("pageCount"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Book = typeof books.$inferSelect;
export type InsertBook = typeof books.$inferInsert;

/**
 * Insights table - stores AI-generated insights for books
 */
export const insights = mysqlTable("insights", {
  id: int("id").autoincrement().primaryKey(),
  bookId: int("bookId").notNull(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  summary: text("summary"),
  keyThemes: text("keyThemes"), // JSON array of theme strings
  audioScript: text("audioScript"), // Script for audio narration
  audioUrl: text("audioUrl"),
  audioKey: varchar("audioKey", { length: 255 }),
  audioDuration: int("audioDuration"), // Duration in seconds
  pdfUrl: text("pdfUrl"),
  pdfKey: varchar("pdfKey", { length: 255 }),
  recommendedVisuals: text("recommendedVisuals"), // JSON array of visual types
  status: mysqlEnum("status", ["pending", "generating", "completed", "failed"]).default("pending").notNull(),
  wordCount: int("wordCount").default(0),
  generationProgress: int("generationProgress").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Insight = typeof insights.$inferSelect;
export type InsertInsight = typeof insights.$inferInsert;

/**
 * Library items table - user's personal library with favorites and status
 */
export const libraryItems = mysqlTable("library_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  bookId: int("bookId").notNull(),
  insightId: int("insightId"),
  isFavorite: boolean("isFavorite").default(false).notNull(),
  readingStatus: mysqlEnum("readingStatus", ["new", "reading", "completed"]).default("new").notNull(),
  lastAccessedAt: timestamp("lastAccessedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LibraryItem = typeof libraryItems.$inferSelect;
export type InsertLibraryItem = typeof libraryItems.$inferInsert;

/**
 * Content blocks table - stores structured content blocks within insights
 */
export const contentBlocks = mysqlTable("content_blocks", {
  id: int("id").autoincrement().primaryKey(),
  insightId: int("insightId").notNull(),
  blockType: varchar("blockType", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }),
  content: text("content"),
  visualType: varchar("visualType", { length: 50 }),
  visualData: text("visualData"), // JSON string for visual configuration
  listItems: text("listItems"), // JSON array for list items
  orderIndex: int("orderIndex").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContentBlock = typeof contentBlocks.$inferSelect;
export type InsertContentBlock = typeof contentBlocks.$inferInsert;
