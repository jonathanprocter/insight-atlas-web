import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const errorLogs = sqliteTable("error_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
  errorType: text("error_type").notNull(), // 'mutation', 'query', 'generation', etc.
  errorMessage: text("error_message").notNull(),
  errorStack: text("error_stack"),
  requestPath: text("request_path"),
  requestInput: text("request_input"), // JSON stringified
  userId: integer("user_id"),
  insightId: integer("insight_id"),
  bookId: integer("book_id"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
});
