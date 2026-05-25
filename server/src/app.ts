import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import passport from "passport";
import healthRouter from "./routes/health";
import authRouter from "./routes/auth";
import projectsRouter from "./routes/projects";
import milestonesRouter from "./routes/milestones";
import todosRouter from "./routes/todos";
import journalRouter from "./routes/journal";
import timelineRouter from "./routes/timeline";
import parkingLotRouter from "./routes/parkingLot";
import githubRouter from "./routes/github";
import shareRouter from "./routes/share";
import publicShareRouter from "./routes/publicShare";
import notificationsRouter from "./routes/notifications";
import usersRouter from "./routes/users";
import usersGithubRouter from "./routes/usersGithub";
import aiRouter from "./routes/ai";
import { configurePassport } from "./config/passport";
import { requireAuth } from "./middleware/requireAuth";
import { errorHandler, AppError } from "./middleware/errorHandler";

const app = express();

app.use(morgan("dev"));
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
configurePassport();

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/share", publicShareRouter);

/* --- Protected routes below this line --- */
app.use("/api", requireAuth);

app.use("/api/projects", projectsRouter);
app.use("/api/projects/:id/milestones", milestonesRouter);
app.use("/api/projects/:id/todos", todosRouter);
app.use("/api/projects/:id/journal", journalRouter);
app.use("/api/projects/:id/timeline", timelineRouter);
app.use("/api/projects/:id/parking-lot", parkingLotRouter);
app.use("/api/projects/:id/github", githubRouter);
app.use("/api/projects/:id/share", shareRouter);
app.use("/api/projects/:id/ai", aiRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/users/me/github", usersGithubRouter);
app.use("/api/users", usersRouter);

/** Catch-all for unmatched routes */
app.use((_req, _res, next) => {
  next(new AppError("Not found", 404));
});

app.use(errorHandler);

export default app;
