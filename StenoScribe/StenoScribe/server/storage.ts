import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from '@neondatabase/serverless';
import { 
  passages, type Passage, type InsertPassage,
  testResults, type TestResult, type InsertTestResult,
  type WordFrequency, type PassageStats
} from "@shared/schema";
import { eq } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

// Configure neon to use fetch API
neonConfig.fetchConnectionCache = true;

// Initialize neon SQL connection with proper client setup
const sql = neon(process.env.DATABASE_URL);
// Create drizzle database instance with neon-http
const db = drizzle(sql);

export interface IStorage {
  // Passage operations
  getPassages(): Promise<Passage[]>;
  getPassage(id: number): Promise<Passage | undefined>;
  createPassage(passage: InsertPassage): Promise<Passage>;
  deletePassage(id: number): Promise<void>;

  // Test result operations
  getTestResults(): Promise<TestResult[]>;
  getTestResult(id: number): Promise<TestResult | undefined>;
  getPassageTestResults(passageId: number): Promise<TestResult[]>;
  createTestResult(result: InsertTestResult): Promise<TestResult>;

  // Statistics operations
  getPassageStats(passageId: number): Promise<PassageStats>;
  getMasterErrorList(): Promise<WordFrequency[]>;
}

export class PostgresStorage implements IStorage {
  async getPassages(): Promise<Passage[]> {
    try {
      return await db.select().from(passages);
    } catch (error) {
      console.error('Error fetching passages:', error);
      throw error;
    }
  }

  async getPassage(id: number): Promise<Passage | undefined> {
    try {
      const results = await db.select().from(passages).where(eq(passages.id, id));
      return results[0];
    } catch (error) {
      console.error(`Error fetching passage ${id}:`, error);
      throw error;
    }
  }

  async createPassage(passage: InsertPassage): Promise<Passage> {
    try {
      const [result] = await db.insert(passages).values(passage).returning();
      return result;
    } catch (error) {
      console.error('Error creating passage:', error);
      throw error;
    }
  }

  async deletePassage(id: number): Promise<void> {
    try {
      await db.delete(passages).where(eq(passages.id, id));
    } catch (error) {
      console.error(`Error deleting passage ${id}:`, error);
      throw error;
    }
  }

  async getTestResults(): Promise<TestResult[]> {
    try {
      return await db.select().from(testResults);
    } catch (error) {
      console.error('Error fetching test results:', error);
      throw error;
    }
  }

  async getTestResult(id: number): Promise<TestResult | undefined> {
    try {
      const results = await db.select().from(testResults).where(eq(testResults.id, id));
      return results[0];
    } catch (error) {
      console.error(`Error fetching test result ${id}:`, error);
      throw error;
    }
  }

  async getPassageTestResults(passageId: number): Promise<TestResult[]> {
    try {
      return await db.select()
        .from(testResults)
        .where(eq(testResults.passageId, passageId));
    } catch (error) {
      console.error(`Error fetching test results for passage ${passageId}:`, error);
      throw error;
    }
  }

  async createTestResult(result: InsertTestResult): Promise<TestResult> {
    try {
      const [newResult] = await db.insert(testResults).values(result).returning();
      return newResult;
    } catch (error) {
      console.error('Error creating test result:', error);
      throw error;
    }
  }

  async getPassageStats(passageId: number): Promise<PassageStats> {
    try {
      const results = await this.getPassageTestResults(passageId);

      if (results.length === 0) {
        return {
          totalAttempts: 0,
          averageWPM: 0,
          averageAccuracy: 0,
          frequentMistakes: []
        };
      }

      const totalWPM = results.reduce((sum, result) => sum + result.wpm, 0);
      const totalAccuracy = results.reduce((sum, result) => sum + result.accuracy, 0);

      // Compile mistake frequencies
      const mistakeFrequencies = new Map<string, number>();
      results.forEach(result => {
        const mistakes = result.mistakes as any;
        [...mistakes.missed, ...mistakes.wrong, ...mistakes.misspelled].forEach(word => {
          mistakeFrequencies.set(word, (mistakeFrequencies.get(word) || 0) + 1);
        });
      });

      const frequentMistakes = Array.from(mistakeFrequencies.entries())
        .map(([word, frequency]) => ({ word, frequency }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 10); // Top 10 most frequent mistakes

      return {
        totalAttempts: results.length,
        averageWPM: Math.round(totalWPM / results.length),
        averageAccuracy: Math.round(totalAccuracy / results.length),
        frequentMistakes
      };
    } catch (error) {
      console.error(`Error getting stats for passage ${passageId}:`, error);
      throw error;
    }
  }

  async getMasterErrorList(): Promise<WordFrequency[]> {
    try {
      const allResults = await this.getTestResults();
      const masterFrequencies = new Map<string, { frequency: number; type: string }>();

      allResults.forEach(result => {
        const mistakes = result.mistakes as any;
        Object.entries(mistakes).forEach(([type, words]: [string, string[]]) => {
          words.forEach(word => {
            const key = `${word}-${type}`;
            const current = masterFrequencies.get(key) || { frequency: 0, type };
            masterFrequencies.set(key, {
              ...current,
              frequency: current.frequency + 1
            });
          });
        });
      });

      return Array.from(masterFrequencies.entries())
        .map(([key, { frequency, type }]) => ({
          word: key.split('-')[0],
          frequency,
          type: type as 'missed' | 'wrong' | 'misspelled'
        }))
        .sort((a, b) => b.frequency - a.frequency);
    } catch (error) {
      console.error('Error getting master error list:', error);
      throw error;
    }
  }
}

export const storage = new PostgresStorage();