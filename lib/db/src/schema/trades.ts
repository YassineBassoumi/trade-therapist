import { pgTable, serial, text, real, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const tradesTable = pgTable("trades", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  ticker: text("ticker").notNull(),
  side: text("side", { enum: ["long", "short"] }).notNull(),
  entryPrice: real("entry_price").notNull(),
  exitPrice: real("exit_price"),
  size: real("size").notNull(),
  pnl: real("pnl"),
  openedAt: timestamp("opened_at").notNull(),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const journalsTable = pgTable("journals", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id").notNull().references(() => tradesTable.id, { onDelete: "cascade" }),
  transcript: text("transcript").notNull(),
  emotion: text("emotion", {
    enum: ["calm", "fomo", "fear", "greed", "revenge", "hope", "frustration", "confidence"],
  }).notNull(),
  emotionScore: real("emotion_score").notNull(),
  planFollowingScore: real("plan_following_score").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  verdict: text("verdict").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  markdown: text("markdown").notNull(),
  weekStart: timestamp("week_start").notNull(),
  weekEnd: timestamp("week_end").notNull(),
  tradeCount: integer("trade_count").notNull().default(0),
  totalPnl: real("total_pnl"),
  dominantEmotion: text("dominant_emotion"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

export type Trade = typeof tradesTable.$inferSelect;
export type InsertTrade = typeof tradesTable.$inferInsert;
export type Journal = typeof journalsTable.$inferSelect;
export type InsertJournal = typeof journalsTable.$inferInsert;
export type Report = typeof reportsTable.$inferSelect;
export type InsertReport = typeof reportsTable.$inferInsert;
