import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertPassageSchema, insertTestResultSchema } from "@shared/schema";

export async function registerRoutes(app: Express) {
  // Passages routes
  app.get("/api/passages", async (_req, res) => {
    const passages = await storage.getPassages();
    res.json(passages);
  });

  app.get("/api/passages/:id", async (req, res) => {
    const passage = await storage.getPassage(Number(req.params.id));
    if (!passage) {
      return res.status(404).json({ message: "Passage not found" });
    }
    res.json(passage);
  });

  app.post("/api/passages", async (req, res) => {
    const parsed = insertPassageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid passage data" });
    }
    const passage = await storage.createPassage(parsed.data);
    res.json(passage);
  });

  app.delete("/api/passages/:id", async (req, res) => {
    await storage.deletePassage(Number(req.params.id));
    res.status(204).end();
  });

  // Test results routes
  app.get("/api/results", async (_req, res) => {
    const results = await storage.getTestResults();
    res.json(results);
  });

  app.get("/api/results/:id", async (req, res) => {
    const result = await storage.getTestResult(Number(req.params.id));
    if (!result) {
      return res.status(404).json({ message: "Test result not found" });
    }
    res.json(result);
  });

  app.post("/api/results", async (req, res) => {
    const parsed = insertTestResultSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid test result data" });
    }
    const result = await storage.createTestResult(parsed.data);
    res.json(result);
  });

  // Statistics routes
  app.get("/api/passages/:id/stats", async (req, res) => {
    const stats = await storage.getPassageStats(Number(req.params.id));
    res.json(stats);
  });

  app.get("/api/master-errors", async (_req, res) => {
    const errors = await storage.getMasterErrorList();
    res.json(errors);
  });

  const httpServer = createServer(app);
  return httpServer;
}