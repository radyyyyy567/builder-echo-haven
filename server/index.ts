import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { testConnection, createTables, seedDatabase } from "./db/schema";

// Import route handlers
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  addUserToGroup,
  removeUserFromGroup,
} from "./routes/users";

import {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
} from "./routes/groups";

import { getDashboardStats, getRecentActivity } from "./routes/dashboard";

import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  addEventToGroup,
  removeEventFromGroup,
} from "./routes/events";

import {
  getSurveys,
  getSurveyById,
  createSurvey,
  updateSurvey,
  deleteSurvey,
  addSurveyToEvent,
  removeSurveyFromEvent,
} from "./routes/surveys";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Dashboard routes
  app.get("/api/dashboard/stats", getDashboardStats);
  app.get("/api/dashboard/activity", getRecentActivity);

  // Users routes
  app.get("/api/users", getUsers);
  app.get("/api/users/:id", getUserById);
  app.post("/api/users", createUser);
  app.put("/api/users/:id", updateUser);
  app.delete("/api/users/:id", deleteUser);
  app.post("/api/users/group", addUserToGroup);
  app.delete("/api/users/group", removeUserFromGroup);

  // Groups routes
  app.get("/api/groups", getGroups);
  app.get("/api/groups/:id", getGroupById);
  app.post("/api/groups", createGroup);
  app.put("/api/groups/:id", updateGroup);
  app.delete("/api/groups/:id", deleteGroup);

  // Events routes
  app.get("/api/events", getEvents);
  app.get("/api/events/:id", getEventById);
  app.post("/api/events", createEvent);
  app.put("/api/events/:id", updateEvent);
  app.delete("/api/events/:id", deleteEvent);
  app.post("/api/events/group", addEventToGroup);
  app.delete("/api/events/group", removeEventFromGroup);

  // Surveys routes
  app.get("/api/surveys", getSurveys);
  app.get("/api/surveys/:id", getSurveyById);
  app.post("/api/surveys", createSurvey);
  app.put("/api/surveys/:id", updateSurvey);
  app.delete("/api/surveys/:id", deleteSurvey);
  app.post("/api/surveys/event", addSurveyToEvent);
  app.delete("/api/surveys/event", removeSurveyFromEvent);

  // Initialize database
  initializeDatabase().catch(console.error);

  return app;
}

async function initializeDatabase() {
  console.log("🔄 Initializing database...");

  // Test connection
  const connected = await testConnection();
  if (!connected) {
    console.error(
      "❌ Database connection failed. Please check your connection settings.",
    );
    return;
  }

  try {
    // Create tables
    await createTables();

    // Seed with initial data
    await seedDatabase();

    console.log("✅ Database initialization completed successfully");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
  }
}
