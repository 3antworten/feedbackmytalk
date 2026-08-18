import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PORT } from "./config.js";
import { attachSpeaker, attachParticipant } from "./auth.js";
import authRoutes from "./routes/auth.js";
import deckRoutes from "./routes/decks.js";
import sessionRoutes from "./routes/sessions.js";
import joinRoutes from "./routes/join.js";
import { commentsBySlideRouter, commentByIdRouter } from "./routes/comments.js";
import { questionsBySlideRouter, questionByIdRouter } from "./routes/questions.js";
import {
  preparedQuestionsBySessionRouter,
  preparedQuestionByIdRouter,
  preparedQuestionResponseRouter,
} from "./routes/preparedQuestions.js";
import adminRoutes from "./routes/admin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : true;

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use(attachSpeaker);
app.use(attachParticipant);

app.use("/api/auth", authRoutes);
app.use("/api/decks", deckRoutes);
app.use("/api/sessions/:sessionId/slides/:slideId/comments", commentsBySlideRouter);
app.use("/api/sessions/:sessionId/slides/:slideId/questions", questionsBySlideRouter);
app.use("/api/sessions/:sessionId/prepared-questions/:id/response", preparedQuestionResponseRouter);
app.use("/api/sessions/:sessionId/prepared-questions", preparedQuestionsBySessionRouter);
app.use("/api/sessions", sessionRoutes);
app.use("/api/join", joinRoutes);
app.use("/api/comments", commentByIdRouter);
app.use("/api/questions", questionByIdRouter);
app.use("/api/prepared-questions", preparedQuestionByIdRouter);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal error" });
});

app.listen(PORT, () => {
  console.log(`Feedback My Talk API listening on http://localhost:${PORT}`);
});
