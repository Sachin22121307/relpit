import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const passages = pgTable("passages", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export type Passage = typeof passages.$inferSelect;

export const insertPassageSchema = createInsertSchema(passages).omit({ 
  id: true,
  createdAt: true
});

export type InsertPassage = z.infer<typeof insertPassageSchema>;

export const testResults = pgTable("test_results", {
  id: serial("id").primaryKey(),
  passageId: integer("passage_id").references(() => passages.id),
  typedContent: text("typed_content").notNull(),
  duration: integer("duration").notNull(), // in seconds
  wpm: integer("wpm").notNull(),
  accuracy: integer("accuracy").notNull(),
  mistakes: jsonb("mistakes").notNull().default({
    missed: [],
    wrong: [],
    misspelled: []
  }),
  timestamp: timestamp("timestamp").defaultNow()
});

export type TestResult = typeof testResults.$inferSelect;

export const insertTestResultSchema = createInsertSchema(testResults).omit({
  id: true,
  timestamp: true
});

export type InsertTestResult = z.infer<typeof insertTestResultSchema>;

// Add back the WordMistakes type for frontend usage
export type WordMistakes = {
  missed: string[];
  wrong: string[];
  misspelled: string[];
};

export type WordFrequency = {
  word: string;
  frequency: number;
  type: 'missed' | 'wrong' | 'misspelled';
};

export type PassageStats = {
  totalAttempts: number;
  averageWPM: number;
  averageAccuracy: number;
  frequentMistakes: WordFrequency[];
};